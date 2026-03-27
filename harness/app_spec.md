# Agent Identity Token (AIT) — Product Specification

## Overview

Think of AIT as **Okta/PAM for non-human coworkers**: every agent gets a persistent identity, an owner, a purpose, bounded permissions, and a full action trail. The Agent Identity Token is an open standard that lets any platform — discovery tools, policy engines, data governance systems, MCP servers — identify, verify, and trust an AI agent without proprietary integration.

AIT is connective tissue, not a security platform. Cisco's MCP enforcement, CrowdStrike's agent discovery, and Cyera's data lineage can all consume AITs. The standard is small, the position is strategic.

## Core Problems AIT Solves

| Problem | Description | AIT Answer |
|---------|-------------|------------|
| **Discovery** | What agents exist in my environment? | Agent registry with persistent identities, queryable by trust domain |
| **Binding** | Who owns/authorized this agent? | `owner` claim binding every agent to a human/team, with registration proof |
| **Delegation** | What can it do, on whose behalf, under what conditions? | Capability-attenuated delegation chains with depth limits and constraint propagation |
| **Runtime Enforcement** | Tool/API calls, MCP actions, data access, step-up auth, kill switch | Middleware that verifies AITs at every boundary + revocation via JTI blocklist |
| **Audit** | Replayable chain of custody for every decision and side effect | `workflow_id` + `jti` chain enabling full action trail reconstruction |

## POC Success Criteria

The proof-of-concept must demonstrate five things:

1. **Register an agent** — mint a persistent identity with owner binding and approved capabilities
2. **Map it to a human/team + approved tools** — `owner` claim + `capabilities` array with tool-level granularity
3. **Issue short-lived credentials/tokens** — AITs with max 24h expiry, renewable, revocable by JTI
4. **Inspect/control every action at the MCP/API boundary** — middleware that intercepts and verifies before forwarding
5. **Log a replayable chain of custody** — every decision and side effect traceable through the delegation chain

**The acid test:** Can the system answer "which agents touched customer data, with whose approval, using what permissions, and can we shut one off in 30 seconds?"

## Four Deliverables

This specification defines four outputs that must be built:

### 1. TypeScript Reference SDK (`@agent-id/sdk`)

A zero-dependency TypeScript library that registers agents, mints/verifies/delegates/revokes Agent Identity Tokens, and provides middleware for MCP and HTTP boundaries.

### 2. Verification & Registry Service (Next.js API)

A stateless HTTP service that:
- **Registers** agents (persistent identity with owner binding)
- **Issues** short-lived AITs for registered agents
- **Verifies** AITs and returns claims + trust chain
- **Revokes** tokens by JTI (blocklist)
- **Publishes** discovery metadata (JWKS, issuer config, registered agents)
- Deployable on Vercel.

### 3. Enforcement Middleware (MCP + HTTP)

Runtime enforcement layer that:
- Intercepts every tool call / API request at the MCP boundary
- Verifies the calling agent's AIT before forwarding
- Checks capabilities against the requested action
- Supports step-up auth (require fresh token for sensitive operations)
- Kill switch: revoke a token and all downstream delegated tokens
- Logs every action with agent identity, timestamp, and outcome

### 4. Spec Document

A machine-readable schema definition (JSON Schema) and human-readable specification document describing the AIT format, claims, attestation flow, delegation model, enforcement rules, and protocol bindings.

---

## AIT Token Format

An AIT is a signed JWT (JWS) using the compact serialization format. Algorithm: `ES256` (ECDSA with P-256 and SHA-256) as default, with `EdDSA` (Ed25519) as an alternative.

### Header

```json
{
  "alg": "ES256",
  "typ": "ait+jwt",
  "kid": "issuer-key-id-1"
}
```

The `typ` header MUST be `ait+jwt` to distinguish from regular JWTs.

### Standard Claims

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `iss` | string | Yes | Issuer identifier (URI). The Agent IdP that issued this token. |
| `sub` | string | Yes | Subject identifier. Unique ID for this agent instance. Format: `ait:{trust_domain}:{agent_id}` |
| `aud` | string or string[] | Yes | Intended audience(s). The service(s) this token is presented to. |
| `exp` | number | Yes | Expiration time (Unix timestamp). Tokens MUST expire. Max lifetime: 24 hours. |
| `iat` | number | Yes | Issued-at time (Unix timestamp). |
| `nbf` | number | No | Not-before time. Token is invalid before this time. |
| `jti` | string | Yes | Unique token ID. Used for revocation and replay prevention. Format: UUIDv7. |

### Agent-Specific Claims

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_type` | string | Yes | Agent classification. One of: `autonomous`, `assistant`, `tool`, `service`, `orchestrator`. |
| `agent_name` | string | Yes | Human-readable agent name (e.g., "Code Review Agent"). |
| `agent_version` | string | No | Semantic version of the agent software (e.g., "2.1.0"). |
| `agent_checksum` | string | Yes | SHA-256 hash of the agent's configuration (system prompt + tools + model config). Hex-encoded. Used for attestation — proves the agent hasn't been modified since registration. |
| `owner` | object | Yes | Human/org binding. `{ "type": "user" \| "org" \| "service_account", "id": "string", "name": "string" }` |
| `trust_domain` | string | Yes | Trust domain this agent belongs to (e.g., "agents.acme.com"). Analogous to SPIFFE trust domains. |
| `capabilities` | string[] | Yes | List of capability URIs the agent is authorized for (e.g., `["ait:cap:read:files", "ait:cap:execute:code", "ait:cap:access:api:github"]`). |
| `delegation` | object | No | Delegation metadata. Present if this token was delegated from a parent. `{ "parent_jti": "string", "depth": number, "max_depth": number, "chain": ["jti1", "jti2"] }` |
| `workflow_id` | string | No | ID of the workflow or task this agent is operating within. Enables audit trail correlation. |
| `attestation` | object | No | Platform attestation. `{ "method": "spiffe" \| "oidc" \| "mtls" \| "api_key", "evidence": "string" }` |
| `constraints` | object | No | Runtime constraints. `{ "max_tokens": number, "allowed_models": string[], "rate_limit": number, "ip_allowlist": string[] }` |

### Example Token Payload

```json
{
  "iss": "https://idp.acme.com",
  "sub": "ait:agents.acme.com:code-review-agent-001",
  "aud": "https://api.github.com",
  "exp": 1711900800,
  "iat": 1711814400,
  "jti": "019520f4-7b3a-7000-8000-abcdef123456",
  "agent_type": "assistant",
  "agent_name": "Code Review Agent",
  "agent_version": "2.1.0",
  "agent_checksum": "a1b2c3d4e5f6...",
  "owner": {
    "type": "org",
    "id": "org-acme-123",
    "name": "Acme Corp Engineering"
  },
  "trust_domain": "agents.acme.com",
  "capabilities": [
    "ait:cap:read:repos",
    "ait:cap:write:comments",
    "ait:cap:execute:analysis"
  ],
  "workflow_id": "pr-review-workflow-789",
  "attestation": {
    "method": "spiffe",
    "evidence": "spiffe://acme.com/agent/code-review"
  }
}
```

---

## SDK API (`@agent-id/sdk`)

The SDK must be a TypeScript library with zero runtime dependencies. All cryptographic operations use the Web Crypto API (available in Node.js 18+, Deno, Cloudflare Workers, browsers).

### Project Setup

- TypeScript strict mode
- ES2022 target, ESM output
- Vitest for testing
- tsup for bundling
- Exports both ESM and CJS
- Package name: `@agent-id/sdk`

### Core Types

```typescript
// AIT claim types
interface AITHeader {
  alg: "ES256" | "EdDSA";
  typ: "ait+jwt";
  kid: string;
}

interface AITOwner {
  type: "user" | "org" | "service_account";
  id: string;
  name: string;
}

interface AITDelegation {
  parent_jti: string;
  depth: number;
  max_depth: number;
  chain: string[];
}

interface AITAttestation {
  method: "spiffe" | "oidc" | "mtls" | "api_key";
  evidence: string;
}

interface AITConstraints {
  max_tokens?: number;
  allowed_models?: string[];
  rate_limit?: number;
  ip_allowlist?: string[];
}

type AgentType = "autonomous" | "assistant" | "tool" | "service" | "orchestrator";

interface AITClaims {
  // Standard JWT
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nbf?: number;
  jti: string;
  // Agent-specific
  agent_type: AgentType;
  agent_name: string;
  agent_version?: string;
  agent_checksum: string;
  owner: AITOwner;
  trust_domain: string;
  capabilities: string[];
  delegation?: AITDelegation;
  workflow_id?: string;
  attestation?: AITAttestation;
  constraints?: AITConstraints;
}

interface AITVerifyResult {
  valid: boolean;
  claims: AITClaims;
  errors: string[];
}

interface AITKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  kid: string;
}
```

### Core Functions

#### `generateKeyPair(algorithm?: "ES256" | "EdDSA"): Promise<AITKeyPair>`

Generate a new signing key pair. Returns public key, private key, and a generated `kid`.

#### `createAIT(claims: Partial<AITClaims> & Required<Pick<AITClaims, "iss" | "sub" | "aud" | "agent_type" | "agent_name" | "agent_checksum" | "owner" | "trust_domain" | "capabilities">>, privateKey: CryptoKey, options?: { kid?: string, expiresIn?: number }): Promise<string>`

Create and sign an AIT. Auto-generates `iat`, `exp` (default: 1 hour), and `jti` (UUIDv7) if not provided. Returns the compact JWS string.

#### `verifyAIT(token: string, publicKey: CryptoKey | JWKS, options?: { audience?: string, clockTolerance?: number }): Promise<AITVerifyResult>`

Verify an AIT's signature, expiration, and required claims. If a JWKS is provided, automatically selects the correct key by `kid`. Returns structured result with `valid`, `claims`, and `errors`.

Validation rules:
- Signature must be valid
- `exp` must be in the future (with optional clock tolerance)
- `nbf` must be in the past (if present)
- `typ` header must be `ait+jwt`
- All required claims must be present
- `agent_type` must be a valid enum value
- `capabilities` must be a non-empty array
- `sub` must match the format `ait:{trust_domain}:{id}`
- If `audience` option is provided, `aud` must match

#### `delegateAIT(parentToken: string, childClaims: Partial<AITClaims>, parentPrivateKey: CryptoKey, options?: { maxDepth?: number }): Promise<string>`

Create a delegated AIT from a parent token. The child token:
- Inherits the parent's `trust_domain`
- Gets a `delegation` claim with `parent_jti`, incremented `depth`, and extended `chain`
- Has capabilities that are a **subset** of the parent (capability attenuation — child cannot have caps parent doesn't)
- Fails if `depth >= max_depth` (default max_depth: 5)

#### `introspectAIT(token: string): AITClaims`

Decode an AIT without verification. For logging, debugging, and inspection. Does NOT validate signature or expiration. Throws if the token is malformed.

#### `computeAgentChecksum(config: { systemPrompt: string, tools: string[], modelConfig: Record<string, unknown> }): Promise<string>`

Compute the SHA-256 checksum of an agent's configuration. Deterministic: same input always produces same hash. Used during registration and attestation.

### Registration & Lifecycle

#### `createRegistryClient(baseUrl: string, adminKey: string): RegistryClient`

Client for the registry service. Methods:

```typescript
interface RegistryClient {
  // Register a new agent
  register(agent: RegisterAgentRequest): Promise<RegisteredAgent>;
  // List agents (filterable)
  list(filters?: { trust_domain?: string, owner_id?: string, agent_type?: AgentType }): Promise<RegisteredAgent[]>;
  // Get agent details
  get(agentId: string): Promise<RegisteredAgent>;
  // Deactivate agent + revoke all tokens (kill switch)
  deactivate(agentId: string): Promise<{ tokens_revoked: number }>;
  // Issue a token for a registered agent
  issueToken(agentId: string, options?: { audience?: string, expiresIn?: number, workflowId?: string }): Promise<{ token: string, jti: string, expiresAt: string }>;
  // Revoke a specific token (+ cascade to delegated tokens)
  revokeToken(jti: string, cascade?: boolean): Promise<{ revoked: string[] }>;
  // Query audit log
  audit(filters?: { agentId?: string, workflowId?: string, since?: string, until?: string }): Promise<AuditEvent[]>;
}
```

### Enforcement Middleware

#### `withAgentIdentity(options: { privateKey: CryptoKey, claims: Partial<AITClaims> }): (request: Request) => Request`

Returns a function that adds an AIT to outgoing requests as `Authorization: AIT <token>`. For use in MCP clients, HTTP clients, etc.

#### `createEnforcementMiddleware(options: EnforcementOptions): EnforcementMiddleware`

The core enforcement layer. Intercepts every request, verifies the AIT, checks capabilities against the action, logs the decision, and forwards or rejects.

```typescript
interface EnforcementOptions {
  // Key source for verification
  publicKey: CryptoKey | JWKS | (() => Promise<JWKS>);
  // Expected audience
  audience?: string;
  // Revocation check — called for every request
  isRevoked?: (jti: string) => Promise<boolean>;
  // Capability check — maps request to required capability
  resolveCapability: (request: Request) => string;
  // Audit logger — called for every enforcement decision
  onAudit?: (event: AuditEvent) => void | Promise<void>;
  // Error handler
  onError?: (error: AITVerifyResult, request: Request) => Response;
  // Step-up auth — require fresh token for sensitive operations
  requireFreshToken?: (request: Request) => boolean;
  freshTokenMaxAge?: number; // seconds, default 300 (5 min)
}

interface EnforcementMiddleware {
  // For HTTP servers (Express, Hono, Next.js)
  handle(request: Request): Promise<{ allowed: boolean, claims?: AITClaims, response?: Response }>;
  // For MCP servers — same logic, different extraction point
  handleMCP(request: MCPRequest): Promise<{ allowed: boolean, claims?: AITClaims, error?: string }>;
}

interface AuditEvent {
  timestamp: string;
  agent_id: string;
  jti: string;
  action: string;
  target: string;
  method: string;
  capability_used: string;
  capability_required: string;
  outcome: "allowed" | "denied" | "step_up_required";
  denial_reason?: string;
  delegation_chain: string[];
  workflow_id?: string;
}
```

The middleware does:
1. Extract AIT from `Authorization: AIT <token>` or `X-Agent-Identity` header
2. Verify signature + expiration + required claims
3. Check revocation status (if `isRevoked` provided)
4. Map request to required capability via `resolveCapability`
5. Check if agent's `capabilities` include the required one
6. If `requireFreshToken` returns true, verify `iat` is within `freshTokenMaxAge`
7. Log the audit event via `onAudit`
8. Return allowed/denied with claims

### JWKS Support

```typescript
interface JWKS {
  keys: JWK[];
}

// Fetch and cache a remote JWKS
function createJWKSClient(url: string, options?: { cacheMaxAge?: number }): {
  getKey(kid: string): Promise<CryptoKey>;
  refresh(): Promise<void>;
}
```

---

## Verification & Registry Service (Next.js API)

A Next.js application deployed on Vercel that provides agent registration, token issuance, verification, revocation, and key discovery. Uses Upstash Redis for the agent registry and revocation blocklist.

### Project Setup

- Next.js 16 with App Router
- TypeScript strict mode
- Uses `@agent-id/sdk` as a dependency (local workspace reference)
- Upstash Redis for agent registry + revocation state
- Minimal — no UI beyond a landing page with API docs

### Endpoints

#### `POST /api/agents/register`

Register a new agent identity. This is the "onboarding" step — before an agent can get tokens, it must be registered.

Request (requires admin auth):
```json
{
  "agent_name": "Code Review Agent",
  "agent_type": "assistant",
  "agent_checksum": "sha256-of-config...",
  "owner": { "type": "org", "id": "org-acme-123", "name": "Acme Corp Engineering" },
  "trust_domain": "agents.acme.com",
  "capabilities": ["ait:cap:read:repos", "ait:cap:write:comments"],
  "constraints": { "rate_limit": 100 }
}
```

Response (201):
```json
{
  "agent_id": "ait:agents.acme.com:code-review-agent-001",
  "registered_at": "2026-03-27T12:00:00Z",
  "status": "active"
}
```

The agent_id (which becomes the `sub` claim) is auto-generated as `ait:{trust_domain}:{slug}`.

#### `GET /api/agents`

List registered agents. Filterable by `trust_domain`, `owner.id`, `agent_type`, and `status`.

Response:
```json
{
  "agents": [
    {
      "agent_id": "ait:agents.acme.com:code-review-agent-001",
      "agent_name": "Code Review Agent",
      "agent_type": "assistant",
      "owner": { "type": "org", "id": "org-acme-123", "name": "Acme Corp Engineering" },
      "status": "active",
      "registered_at": "2026-03-27T12:00:00Z",
      "last_token_issued": "2026-03-27T14:30:00Z"
    }
  ],
  "total": 1
}
```

#### `GET /api/agents/:agentId`

Get details for a specific registered agent, including recent activity.

#### `DELETE /api/agents/:agentId`

Deactivate an agent. Revokes all outstanding tokens for this agent (adds all known JTIs to blocklist). This is the **kill switch**.

Response:
```json
{
  "agent_id": "ait:agents.acme.com:code-review-agent-001",
  "status": "revoked",
  "tokens_revoked": 3,
  "revoked_at": "2026-03-27T15:00:00Z"
}
```

#### `POST /api/tokens/issue`

Issue a new AIT for a registered agent. The agent must be registered and active.

Request (requires admin auth):
```json
{
  "agent_id": "ait:agents.acme.com:code-review-agent-001",
  "audience": "https://api.github.com",
  "expires_in": 3600,
  "workflow_id": "pr-review-789"
}
```

Response (200):
```json
{
  "token": "eyJhbGciOiJFUzI1NiIs...",
  "claims": { ... },
  "expires_at": "2026-03-27T16:00:00Z",
  "jti": "019520f4-7b3a-7000-8000-abcdef123456"
}
```

#### `POST /api/tokens/verify`

Verify an AIT and return its claims. Also checks the revocation blocklist.

Request:
```json
{
  "token": "eyJhbGciOiJFUzI1NiIs..."
}
```

Response (200):
```json
{
  "valid": true,
  "claims": { ... },
  "agent_status": "active",
  "errors": []
}
```

Response (401):
```json
{
  "valid": false,
  "claims": null,
  "agent_status": "revoked",
  "errors": ["Token revoked", "Agent deactivated"]
}
```

#### `POST /api/tokens/revoke`

Revoke a specific token by JTI. Also revokes all tokens in the delegation chain downstream of this token.

Request (requires admin auth):
```json
{
  "jti": "019520f4-7b3a-7000-8000-abcdef123456",
  "cascade": true
}
```

Response:
```json
{
  "revoked": ["019520f4-7b3a-7000-8000-abcdef123456", "019520f5-..."],
  "revoked_at": "2026-03-27T15:00:00Z"
}
```

#### `GET /api/audit`

Query the audit log. Filterable by `agent_id`, `workflow_id`, `action`, time range.

Response:
```json
{
  "events": [
    {
      "timestamp": "2026-03-27T14:30:01Z",
      "agent_id": "ait:agents.acme.com:code-review-agent-001",
      "jti": "019520f4-...",
      "action": "api_call",
      "target": "https://api.github.com/repos/acme/app/pulls/42/reviews",
      "method": "POST",
      "capability_used": "ait:cap:write:comments",
      "outcome": "allowed",
      "delegation_chain": []
    }
  ],
  "total": 1
}
```

#### `GET /api/.well-known/ait-configuration`

OpenID-style discovery document.

Response:
```json
{
  "issuer": "https://verify.agent-id.dev",
  "jwks_uri": "https://verify.agent-id.dev/api/.well-known/jwks.json",
  "registration_endpoint": "https://verify.agent-id.dev/api/agents/register",
  "token_endpoint": "https://verify.agent-id.dev/api/tokens/issue",
  "verification_endpoint": "https://verify.agent-id.dev/api/tokens/verify",
  "revocation_endpoint": "https://verify.agent-id.dev/api/tokens/revoke",
  "audit_endpoint": "https://verify.agent-id.dev/api/audit",
  "supported_algorithms": ["ES256", "EdDSA"],
  "token_type": "ait+jwt",
  "documentation": "https://agent-id.dev/docs"
}
```

#### `GET /api/.well-known/jwks.json`

Public keys in JWKS format.

Response:
```json
{
  "keys": [
    {
      "kty": "EC",
      "crv": "P-256",
      "x": "...",
      "y": "...",
      "kid": "key-1",
      "use": "sig",
      "alg": "ES256"
    }
  ]
}
```

### Key Management

The service reads signing keys from environment variables:
- `AIT_SIGNING_KEY` — JWK-encoded private key for signing issued tokens
- `AIT_ADMIN_KEY` — API key for the `/api/issue` endpoint
- Public keys are derived from the signing key and exposed via JWKS

For production, keys should be stored in Vercel Edge Config for rotation without redeployment.

---

## Spec Document

A Markdown document describing the AIT standard, formatted for eventual submission as an IETF Internet-Draft. Must include:

1. **Abstract** — One-paragraph summary
2. **Introduction** — Problem statement, motivation, relationship to existing standards
3. **Terminology** — Definitions of key terms (Agent, Trust Domain, Capability, Delegation)
4. **Token Format** — Complete JWT profile specification with all claims
5. **Attestation Flow** — Step-by-step flow from agent registration to token issuance to verification
6. **Delegation Model** — How tokens are delegated with capability attenuation
7. **Protocol Bindings** — How AITs are transported in MCP, A2A, and HTTP
8. **Security Considerations** — Threat model, mitigations, key management requirements
9. **IANA Considerations** — Registration of `ait+jwt` media type and claim names
10. **References** — SPIFFE, OAuth 2.0, JWT (RFC 7519), JWS (RFC 7515), JWK (RFC 7517)

Also create a JSON Schema file (`ait-claims.schema.json`) that formally defines the AIT claims structure.

---

## Protocol Bindings

### HTTP

AITs are transported via the `Authorization` header:
```
Authorization: AIT eyJhbGciOiJFUzI1NiIs...
```

The `AIT` scheme is distinct from `Bearer` to signal that the token is an agent identity, not a user session.

### MCP (Model Context Protocol)

AITs are transported via the `X-Agent-Identity` header on MCP requests:
```
X-Agent-Identity: eyJhbGciOiJFUzI1NiIs...
```

MCP servers that support AIT verification should advertise this in their capability negotiation.

### A2A (Agent-to-Agent)

For agent-to-agent communication, AITs are included in the message envelope:
```json
{
  "from": "eyJhbGciOiJFUzI1NiIs...",
  "to": "ait:agents.acme.com:target-agent",
  "payload": { ... }
}
```

---

## Testing Requirements

- Unit tests for every SDK function
- Integration tests for the verification service endpoints
- Edge case tests:
  - Expired tokens
  - Tokens not yet valid (nbf in future)
  - Missing required claims
  - Invalid signatures
  - Tampered payloads
  - Delegation depth exceeded
  - Capability escalation attempts (child requesting caps parent doesn't have)
  - Clock skew handling
  - Malformed JWTs (bad base64, missing segments, empty payload)
  - Algorithm confusion attacks (alg: none, RSA/EC mismatch)
  - Revoked token rejection
  - Revoked agent rejection (kill switch)
  - Cascade revocation of delegation chain
  - Step-up auth enforcement (fresh token required)
  - Capability mismatch (agent lacks required cap for action)
  - Unregistered agent attempting token issuance
- Integration tests:
  - Full lifecycle: register → issue → verify → use → revoke
  - Delegation chain: parent issues → child delegates → grandchild uses → revoke parent cascades
  - Kill switch: deactivate agent → all tokens immediately invalid
  - Audit trail: verify all actions logged with correct agent, capability, outcome
- Performance tests:
  - Token creation: <5ms
  - Token verification: <10ms
  - Delegation: <15ms
  - Revocation check: <5ms

---

## Directory Structure

```
output/
├── packages/
│   └── sdk/                    # @agent-id/sdk
│       ├── src/
│       │   ├── index.ts        # Public API exports
│       │   ├── types.ts        # All TypeScript types
│       │   ├── create.ts       # createAIT
│       │   ├── verify.ts       # verifyAIT
│       │   ├── delegate.ts     # delegateAIT
│       │   ├── introspect.ts   # introspectAIT
│       │   ├── checksum.ts     # computeAgentChecksum
│       │   ├── keys.ts         # generateKeyPair, JWKS client
│       │   ├── jwt.ts          # Low-level JWT encode/decode/sign
│       │   ├── registry.ts     # createRegistryClient
│       │   ├── enforcement.ts  # createEnforcementMiddleware
│       │   ├── middleware.ts   # withAgentIdentity (outgoing)
│       │   └── uuid.ts        # UUIDv7 generation
│       ├── tests/
│       │   ├── create.test.ts
│       │   ├── verify.test.ts
│       │   ├── delegate.test.ts
│       │   ├── introspect.test.ts
│       │   ├── checksum.test.ts
│       │   ├── keys.test.ts
│       │   ├── enforcement.test.ts
│       │   ├── registry.test.ts
│       │   ├── lifecycle.test.ts    # Full register→issue→use→revoke
│       │   └── edge-cases.test.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
├── apps/
│   └── verify/                 # Registry & verification service
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx        # Landing page with API docs
│       │   └── api/
│       │       ├── agents/
│       │       │   ├── register/route.ts
│       │       │   ├── route.ts           # GET list
│       │       │   └── [agentId]/route.ts # GET detail, DELETE deactivate
│       │       ├── tokens/
│       │       │   ├── issue/route.ts
│       │       │   ├── verify/route.ts
│       │       │   └── revoke/route.ts
│       │       ├── audit/route.ts
│       │       └── .well-known/
│       │           ├── ait-configuration/route.ts
│       │           └── jwks.json/route.ts
│       ├── lib/
│       │   ├── keys.ts         # Key management (env vars → CryptoKey)
│       │   ├── auth.ts         # Admin auth middleware
│       │   ├── redis.ts        # Upstash Redis client (registry + revocation)
│       │   └── audit.ts        # Audit log writer
│       ├── package.json
│       ├── tsconfig.json
│       └── next.config.ts
├── spec/
│   ├── ait-spec.md             # IETF Internet-Draft format
│   └── ait-claims.schema.json  # JSON Schema
├── package.json                # Root workspace config
├── tsconfig.json               # Root TypeScript config
└── turbo.json                  # Turborepo config (if using workspaces)
```
