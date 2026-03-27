"""Evaluator agent — adversarial code reviewer with graded rubrics."""

import json
import logging
from pathlib import Path

from claude_agent_sdk import query, ResultMessage, AssistantMessage, TextBlock

from harness.client import make_options, OUTPUT_DIR

logger = logging.getLogger("harness.evaluator")

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "evaluator.md"

# Minimum overall score to pass
MIN_PASSING_SCORE = 7.0

# Rubric dimension weights
WEIGHTS = {
    "specCompliance": 0.35,
    "codeQuality": 0.25,
    "security": 0.25,
    "usability": 0.15,
}


def _parse_evaluation(text: str) -> dict | None:
    """Extract the JSON evaluation from the evaluator's response."""
    # Try to find JSON block in the text
    # Look for ```json ... ``` blocks first
    import re
    json_match = re.search(r'```json\s*\n(.*?)\n```', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find raw JSON object
    # Find the first { and match to its closing }
    brace_depth = 0
    start = None
    for i, ch in enumerate(text):
        if ch == '{':
            if start is None:
                start = i
            brace_depth += 1
        elif ch == '}':
            brace_depth -= 1
            if brace_depth == 0 and start is not None:
                try:
                    return json.loads(text[start:i + 1])
                except json.JSONDecodeError:
                    start = None

    return None


def _compute_weighted_score(dimension_scores: dict[str, float]) -> float:
    """Compute the weighted overall score from dimension scores."""
    total = 0.0
    for dim, weight in WEIGHTS.items():
        score = dimension_scores.get(dim, 0.0)
        total += score * weight
    return round(total, 2)


async def run_evaluator(feature: dict) -> dict:
    """Run the evaluator agent to review a feature implementation.

    Args:
        feature: The feature dict from feature_list.json.

    Returns:
        Dict with evaluation results: score, passed, feedback, dimension_scores, issues, recommendations
    """
    feature_id = feature.get("id", "unknown")
    description = feature.get("description", "no description")
    steps = feature.get("steps", [])

    logger.info(f"[evaluator] Evaluating feature {feature_id}: {description}")

    system_prompt = PROMPT_PATH.read_text()

    steps_text = "\n".join(f"  - {s}" for s in steps) if steps else "  (no BDD steps defined)"

    prompt = (
        f"Evaluate the implementation of feature **{feature_id}**: {description}\n\n"
        f"### BDD Scenario\n{steps_text}\n\n"
        f"Review the code in the current directory. The feature was just implemented. "
        f"Use `git diff HEAD~1` to see what changed. Run tests, check types, and "
        f"score the implementation using your rubric.\n\n"
        f"Return your evaluation as a JSON object."
    )

    options = make_options(
        system_prompt=system_prompt,
        role="evaluator",
        max_budget_usd=15.0,
    )

    response_text = ""
    cost_usd = 0.0

    try:
        async for message in query(prompt=prompt, options=options):
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        response_text += block.text
            elif isinstance(message, ResultMessage):
                cost_usd = message.total_cost_usd or 0.0
                logger.info(f"[evaluator] Feature {feature_id} evaluation complete: cost=${cost_usd:.4f}, turns={message.num_turns}")
    except Exception as e:
        logger.error(f"[evaluator] Feature {feature_id} evaluation failed: {e}")
        return {
            "score": 0.0,
            "passed": False,
            "feedback": f"Evaluator crashed: {e}",
            "dimensionScores": {k: 0.0 for k in WEIGHTS},
            "issues": [],
            "recommendations": [],
            "cost_usd": cost_usd,
        }

    # Parse the evaluation
    evaluation = _parse_evaluation(response_text)

    if evaluation is None:
        logger.warning(f"[evaluator] Could not parse evaluation JSON from response")
        return {
            "score": 0.0,
            "passed": False,
            "feedback": f"Could not parse evaluator response. Raw text:\n{response_text[:1000]}",
            "dimensionScores": {k: 0.0 for k in WEIGHTS},
            "issues": [],
            "recommendations": [],
            "cost_usd": cost_usd,
        }

    # Extract and validate scores
    dimension_scores = evaluation.get("dimensionScores", {})
    overall_score = _compute_weighted_score(dimension_scores)
    issues = evaluation.get("issues", [])

    # Check for automatic failure conditions
    has_critical_security = any(
        i.get("severity") == "high" and i.get("dimension") == "security"
        for i in issues
    )

    passed = overall_score >= MIN_PASSING_SCORE and not has_critical_security

    if has_critical_security and overall_score >= MIN_PASSING_SCORE:
        logger.warning(
            f"[evaluator] Feature {feature_id} scored {overall_score} but has critical security issues — auto-fail"
        )

    # Format feedback for the generator
    feedback_parts = [f"Score: {overall_score}/10 ({'PASS' if passed else 'FAIL'})"]
    feedback_parts.append(f"Spec Compliance: {dimension_scores.get('specCompliance', 0)}/10")
    feedback_parts.append(f"Code Quality: {dimension_scores.get('codeQuality', 0)}/10")
    feedback_parts.append(f"Security: {dimension_scores.get('security', 0)}/10")
    feedback_parts.append(f"Usability: {dimension_scores.get('usability', 0)}/10")

    if issues:
        feedback_parts.append("\nIssues:")
        for issue in issues:
            sev = issue.get("severity", "unknown")
            desc = issue.get("description", "no description")
            file = issue.get("file", "")
            line = issue.get("line", "")
            loc = f" ({file}:{line})" if file else ""
            feedback_parts.append(f"  [{sev}]{loc} {desc}")

    recommendations = evaluation.get("recommendations", [])
    if recommendations:
        feedback_parts.append("\nRecommendations:")
        for rec in recommendations:
            feedback_parts.append(f"  - {rec}")

    feedback = "\n".join(feedback_parts)

    logger.info(f"[evaluator] Feature {feature_id}: score={overall_score}, passed={passed}")

    return {
        "score": overall_score,
        "passed": passed,
        "feedback": feedback,
        "dimensionScores": dimension_scores,
        "issues": issues,
        "recommendations": recommendations,
        "cost_usd": cost_usd,
    }
