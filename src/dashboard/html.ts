/**
 * Dashboard HTML — single-page app served as a template literal.
 *
 * Dark theme (Catppuccin Mocha palette), vanilla JS, no build step.
 * Polls /api/sessions every 5 seconds, connects to /api/live for SSE push.
 */

export function getDashboardHtml(port: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Salazar Dashboard</title>
<style>
  :root {
    --base: #1e1e2e;
    --mantle: #181825;
    --crust: #11111b;
    --surface0: #313244;
    --surface1: #45475a;
    --surface2: #585b70;
    --overlay0: #6c7086;
    --text: #cdd6f4;
    --subtext0: #a6adc8;
    --subtext1: #bac2de;
    --green: #a6e3a1;
    --red: #f38ba8;
    --blue: #89b4fa;
    --mauve: #cba6f7;
    --yellow: #f9e2af;
    --peach: #fab387;
    --teal: #94e2d5;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--base);
    color: var(--text);
    font-family: "SF Mono", "Cascadia Code", "Fira Code", "JetBrains Mono", monospace;
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: var(--mantle);
    border-bottom: 1px solid var(--surface0);
  }
  .header h1 {
    font-size: 16px;
    font-weight: 600;
    color: var(--mauve);
    letter-spacing: 0.5px;
  }
  .header .url {
    font-size: 12px;
    color: var(--overlay0);
  }
  .header .status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }
  .header .status-dot.connected { background: var(--green); }
  .header .status-dot.disconnected { background: var(--red); }

  /* Layout */
  .layout {
    display: flex;
    height: calc(100vh - 49px);
  }

  /* Sidebar */
  .sidebar {
    width: 260px;
    min-width: 200px;
    background: var(--mantle);
    border-right: 1px solid var(--surface0);
    overflow-y: auto;
    flex-shrink: 0;
  }
  .sidebar-section {
    padding: 12px 16px 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--overlay0);
  }
  .session-item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    cursor: pointer;
    border-left: 3px solid transparent;
    transition: background 0.1s;
  }
  .session-item:hover { background: var(--surface0); }
  .session-item.active {
    background: var(--surface0);
    border-left-color: var(--blue);
  }
  .session-item .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 10px;
    flex-shrink: 0;
  }
  .session-item .dot.running { background: var(--green); }
  .session-item .dot.complete { background: var(--blue); }
  .session-item .dot.error { background: var(--red); }
  .session-item .info { overflow: hidden; }
  .session-item .name {
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .session-item .meta {
    font-size: 11px;
    color: var(--overlay0);
  }
  .no-sessions {
    padding: 20px 16px;
    color: var(--overlay0);
    font-size: 13px;
    text-align: center;
  }

  /* Main panel */
  .main {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--overlay0);
  }
  .empty-state .icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
  .empty-state p { font-size: 14px; }

  /* Detail view */
  .detail-header {
    margin-bottom: 24px;
  }
  .detail-header h2 {
    font-size: 18px;
    color: var(--text);
    margin-bottom: 4px;
  }
  .detail-header .spec-desc {
    font-size: 13px;
    color: var(--subtext0);
    margin-bottom: 12px;
  }
  .detail-header .status-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .status-badge.running { background: rgba(166,227,161,0.15); color: var(--green); }
  .status-badge.complete { background: rgba(137,180,250,0.15); color: var(--blue); }
  .status-badge.error { background: rgba(243,139,168,0.15); color: var(--red); }

  /* Progress bar */
  .progress-section { margin-bottom: 24px; }
  .progress-label {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    margin-bottom: 6px;
  }
  .progress-label .pct { color: var(--mauve); font-weight: 600; }
  .progress-bar {
    height: 10px;
    background: var(--surface0);
    border-radius: 5px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--mauve), var(--blue));
    border-radius: 5px;
    transition: width 0.3s ease;
  }

  /* Stats grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
  }
  .stat-card {
    background: var(--surface0);
    border-radius: 8px;
    padding: 14px;
  }
  .stat-card .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--overlay0);
    margin-bottom: 4px;
  }
  .stat-card .value {
    font-size: 20px;
    font-weight: 700;
  }
  .stat-card .value.cost { color: var(--yellow); }
  .stat-card .value.features { color: var(--green); }
  .stat-card .value.model { color: var(--teal); font-size: 13px; }

  /* Cost breakdown */
  .cost-breakdown {
    display: flex;
    gap: 16px;
    margin-top: 6px;
  }
  .cost-breakdown .item {
    font-size: 11px;
    color: var(--subtext0);
  }
  .cost-breakdown .item span { color: var(--yellow); }

  /* Feature list */
  .section-title {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--overlay0);
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--surface0);
  }
  .feature-list { margin-bottom: 24px; }
  .feature-row {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 4px;
  }
  .feature-row:hover { background: var(--surface0); }
  .feature-row .check {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    margin-right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    flex-shrink: 0;
  }
  .feature-row .check.pass { background: rgba(166,227,161,0.2); color: var(--green); }
  .feature-row .check.fail { background: rgba(243,139,168,0.15); color: var(--red); }
  .feature-row .check.pending { background: var(--surface0); color: var(--overlay0); }
  .feature-row .desc {
    flex: 1;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .feature-row .fid {
    font-size: 11px;
    color: var(--overlay0);
    margin-right: 10px;
    min-width: 50px;
  }
  .feature-row .dur {
    font-size: 11px;
    color: var(--subtext0);
    min-width: 60px;
    text-align: right;
  }
  .feature-row .score {
    font-size: 11px;
    color: var(--peach);
    min-width: 40px;
    text-align: right;
    margin-left: 8px;
  }

  /* Timeline */
  .timeline-section { margin-bottom: 24px; }
  .timeline-list {
    max-height: 300px;
    overflow-y: auto;
  }
  .timeline-row {
    display: flex;
    align-items: baseline;
    padding: 4px 12px;
    font-size: 12px;
  }
  .timeline-row .ts {
    color: var(--overlay0);
    min-width: 80px;
    margin-right: 12px;
  }
  .timeline-row .lbl {
    flex: 1;
    color: var(--subtext1);
  }
  .timeline-row .lbl.pass { color: var(--green); }
  .timeline-row .lbl.fail { color: var(--red); }
  .timeline-row .tdur {
    color: var(--overlay0);
    min-width: 60px;
    text-align: right;
  }

  /* Commits */
  .commit-row {
    display: flex;
    align-items: baseline;
    padding: 4px 12px;
    font-size: 12px;
  }
  .commit-row .sha {
    color: var(--peach);
    font-family: inherit;
    margin-right: 12px;
    min-width: 70px;
  }
  .commit-row .msg {
    flex: 1;
    color: var(--subtext1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Responsive */
  @media (max-width: 700px) {
    .layout { flex-direction: column; }
    .sidebar {
      width: 100%;
      max-height: 200px;
      border-right: none;
      border-bottom: 1px solid var(--surface0);
    }
  }
</style>
</head>
<body>

<div class="header">
  <h1>Salazar Dashboard</h1>
  <div>
    <span class="status-dot disconnected" id="sse-dot"></span>
    <span class="url">localhost:${port}</span>
  </div>
</div>

<div class="layout">
  <div class="sidebar" id="sidebar">
    <div class="no-sessions" id="no-sessions">No sessions found</div>
  </div>
  <div class="main" id="main">
    <div class="empty-state">
      <div class="icon">_</div>
      <p>Select a session or run <code>salazar run &lt;spec&gt;</code></p>
    </div>
  </div>
</div>

<script>
(function() {
  const API = "http://localhost:${port}";
  let selectedId = null;
  let sessions = { active: [], completed: [] };

  // ---- SSE ----
  function connectSSE() {
    const dot = document.getElementById("sse-dot");
    const es = new EventSource(API + "/api/live");
    es.onopen = () => { dot.className = "status-dot connected"; };
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        // Live update: refresh session list and detail if active
        fetchSessions();
        if (selectedId && data.session && data.session.id === selectedId) {
          renderDetail(data);
        }
      } catch {}
    };
    es.onerror = () => {
      dot.className = "status-dot disconnected";
      es.close();
      setTimeout(connectSSE, 3000);
    };
  }

  // ---- Fetch ----
  async function fetchSessions() {
    try {
      const res = await fetch(API + "/api/sessions");
      sessions = await res.json();
      renderSidebar();
    } catch {}
  }

  async function fetchDetail(id) {
    try {
      const res = await fetch(API + "/api/sessions/" + encodeURIComponent(id));
      if (!res.ok) return;
      const data = await res.json();
      renderDetail(data);
    } catch {}
  }

  // ---- Render sidebar ----
  function renderSidebar() {
    const sidebar = document.getElementById("sidebar");
    const noSessions = document.getElementById("no-sessions");
    const all = [...sessions.active, ...sessions.completed];

    if (all.length === 0) {
      noSessions.style.display = "block";
      return;
    }
    noSessions.style.display = "none";

    let html = "";
    if (sessions.active.length > 0) {
      html += '<div class="sidebar-section">Active</div>';
      for (const s of sessions.active) {
        html += sessionItem(s, "running");
      }
    }
    if (sessions.completed.length > 0) {
      html += '<div class="sidebar-section">Completed</div>';
      for (const s of sessions.completed) {
        html += sessionItem(s, s.state);
      }
    }

    // Preserve no-sessions div
    sidebar.innerHTML = '<div class="no-sessions" id="no-sessions" style="display:none">No sessions found</div>' + html;

    // Auto-select most recent active or first session
    if (!selectedId) {
      const first = sessions.active[0] || sessions.completed[0];
      if (first) selectSession(first.id);
    }

    // Highlight selected
    document.querySelectorAll(".session-item").forEach(el => {
      el.classList.toggle("active", el.dataset.id === selectedId);
    });
  }

  function sessionItem(s, state) {
    const name = s.spec_name || s.id;
    const time = s.started_at ? new Date(s.started_at).toLocaleTimeString() : "";
    const sel = s.id === selectedId ? " active" : "";
    return '<div class="session-item' + sel + '" data-id="' + esc(s.id) + '" onclick="window.__selectSession(\\'' + esc(s.id) + '\\')">'
      + '<div class="dot ' + state + '"></div>'
      + '<div class="info"><div class="name">' + esc(name) + '</div>'
      + '<div class="meta">' + esc(s.id.slice(0,8)) + ' / ' + esc(time) + '</div></div></div>';
  }

  function selectSession(id) {
    selectedId = id;
    renderSidebar();
    fetchDetail(id);
  }
  window.__selectSession = selectSession;

  // ---- Render detail ----
  function renderDetail(data) {
    const main = document.getElementById("main");
    const s = data.session;
    const features = data.features || [];
    const timeline = data.timeline || [];
    const commits = data.commits || [];
    const summary = data.summary || { total: 0, passing: 0 };

    const pct = summary.total > 0 ? Math.round((summary.passing / summary.total) * 100) : 0;
    const cost = (s.total_cost || 0).toFixed(2);
    const elapsed = s.started_at ? formatElapsed(s.started_at, s.completed_at) : "--";

    let html = '';

    // Header
    html += '<div class="detail-header">';
    html += '<h2>' + esc(s.spec_name || s.id) + '</h2>';
    if (s.spec_description) {
      html += '<div class="spec-desc">' + esc(s.spec_description) + '</div>';
    }
    html += '<span class="status-badge ' + s.state + '">' + esc(s.state) + '</span>';
    html += '</div>';

    // Progress
    html += '<div class="progress-section">';
    html += '<div class="progress-label"><span>Features: ' + summary.passing + '/' + summary.total + '</span><span class="pct">' + pct + '%</span></div>';
    html += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>';
    html += '</div>';

    // Stats
    html += '<div class="stats-grid">';
    html += statCard("Cost", "$" + cost, "cost");
    html += statCard("Duration", elapsed, "");
    html += statCard("Features", summary.passing + " / " + summary.total, "features");
    html += statCard("Phase", s.phase || "--", "");
    html += '</div>';

    // Cost breakdown
    if (s.total_cost > 0) {
      html += '<div class="cost-breakdown">';
      html += '<div class="item">planner <span>$' + (s.cost_planner || 0).toFixed(2) + '</span></div>';
      html += '<div class="item">generator <span>$' + (s.cost_generator || 0).toFixed(2) + '</span></div>';
      html += '<div class="item">evaluator <span>$' + (s.cost_evaluator || 0).toFixed(2) + '</span></div>';
      html += '</div><br/>';
    }

    // Model info
    if (s.model_generator || s.model_evaluator) {
      html += '<div class="stats-grid">';
      if (s.model_generator) html += statCard("Generator Model", s.model_generator, "model");
      if (s.model_evaluator) html += statCard("Evaluator Model", s.model_evaluator, "model");
      html += '</div>';
    }

    // Features
    if (features.length > 0) {
      html += '<div class="feature-list">';
      html += '<div class="section-title">Features</div>';
      for (const f of features) {
        const passed = f.passes === 1;
        const pending = !f.completed_at && !passed;
        const checkClass = passed ? "pass" : pending ? "pending" : "fail";
        const checkIcon = passed ? "&#10003;" : pending ? "&#8226;" : "&#10007;";
        const dur = f.duration_ms ? formatMs(f.duration_ms) : "";
        const score = f.evaluator_score != null ? f.evaluator_score.toFixed(1) : "";

        html += '<div class="feature-row">';
        html += '<div class="check ' + checkClass + '">' + checkIcon + '</div>';
        html += '<span class="fid">' + esc(f.feature_id) + '</span>';
        html += '<span class="desc">' + esc(f.description || "") + '</span>';
        if (dur) html += '<span class="dur">' + dur + '</span>';
        if (score) html += '<span class="score">' + score + '</span>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Timeline
    if (timeline.length > 0) {
      html += '<div class="timeline-section">';
      html += '<div class="section-title">Timeline</div>';
      html += '<div class="timeline-list">';
      for (const t of timeline) {
        const ts = t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : "";
        const lbl = t.label || "";
        const cls = lbl.includes("passed") || lbl.includes("PASS") ? "pass" : lbl.includes("FAIL") ? "fail" : "";
        const dur = t.duration_ms ? formatMs(t.duration_ms) : "";
        html += '<div class="timeline-row">';
        html += '<span class="ts">' + esc(ts) + '</span>';
        html += '<span class="lbl ' + cls + '">' + esc(lbl) + '</span>';
        if (dur) html += '<span class="tdur">' + dur + '</span>';
        html += '</div>';
      }
      html += '</div></div>';
    }

    // Commits
    if (commits.length > 0) {
      html += '<div class="section-title">Commits</div>';
      for (const c of commits) {
        html += '<div class="commit-row">';
        html += '<span class="sha">' + esc((c.sha || "").slice(0, 7)) + '</span>';
        html += '<span class="msg">' + esc(c.message || "") + '</span>';
        html += '</div>';
      }
    }

    main.innerHTML = html;
  }

  // ---- Helpers ----
  function statCard(label, value, cls) {
    return '<div class="stat-card"><div class="label">' + esc(label) + '</div><div class="value ' + cls + '">' + esc(value) + '</div></div>';
  }

  function formatMs(ms) {
    if (ms < 1000) return ms + "ms";
    const s = Math.round(ms / 1000);
    if (s < 60) return s + "s";
    return Math.floor(s / 60) + "m " + (s % 60) + "s";
  }

  function formatElapsed(start, end) {
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    const diff = Math.round((e - s) / 1000);
    if (diff < 60) return diff + "s";
    if (diff < 3600) return Math.floor(diff / 60) + "m " + (diff % 60) + "s";
    return Math.floor(diff / 3600) + "h " + Math.floor((diff % 3600) / 60) + "m";
  }

  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  // ---- Init ----
  fetchSessions();
  connectSSE();
  setInterval(fetchSessions, 5000);
})();
</script>
</body>
</html>`;
}
