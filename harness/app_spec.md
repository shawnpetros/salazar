# Agent Identity Token (AIT) — Product Specification

## Overview

The Agent Identity Token (AIT) is an open standard for AI agent identity and trust attestation. It defines a JWT profile that lets any platform — discovery tools, policy engines, data governance systems, MCP servers — identify, verify, and trust an AI agent without proprietary integration.

AIT is connective tissue, not a security platform. Cisco's MCP enforcement, CrowdStrike's agent discovery, and Cyera's data lineage can all consume AITs. The standard is small, the position is strategic.

## Three Deliverables

This specification defines three outputs that must be built:

### 1. TypeScript Reference SDK (`@agent-id/sdk`)

A zero-dependency TypeScript library that mints, verifies, delegates, and introspects Agent Identity Tokens.

### 2. Verification Service (Next.js API)

A stateless HTTP service that verifies AITs and publishes discovery metadata (JWKS, issuer config). Deployable on Vercel.

### 3. Spec Document

A machine-readable schema definition (JSON Schema) and human-readable specification document describing the AIT format, claims, attestation flow, and protocol bindings.

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

### Middleware

#### `withAgentIdentity(options: { privateKey: CryptoKey, claims: Partial<AITClaims> }): (request: Request) => Request`

Returns a function that adds an AIT to outgoing requests as `Authorization: AIT <token>`. For use in MCP clients, HTTP clients, etc.

#### `verifyAITMiddleware(options: { publicKey: CryptoKey | JWKS | (() => Promise<JWKS>), audience?: string, onError?: (error: AITVerifyResult) => Response }): (request: Request) => Promise<AITVerifyResult | Response>`

Middleware that extracts and verifies AITs from incoming requests. Looks for:
1. `Authorization: AIT <token>` header
2. `X-Agent-Identity: <token>` header (MCP compatibility)

Returns the verified claims or an error response.

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

## Verification Service (Next.js API)

A stateless Next.js application deployed on Vercel that provides AIT verification and key discovery.

### Project Setup

- Next.js 16 with App Router
- TypeScript strict mode
- Uses `@agent-id/sdk` as a dependency (local workspace reference)
- Minimal — no UI beyond a landing page with API docs

### Endpoints

#### `POST /api/verify`

Verify an AIT and return its claims.

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
  "errors": []
}
```

Response (401):
```json
{
  "valid": false,
  "claims": null,
  "errors": ["Token expired", "Invalid signature"]
}
```

#### `POST /api/issue`

Issue a new AIT. Requires admin authentication via `Authorization: Bearer <ADMIN_API_KEY>`.

Request:
```json
{
  "claims": {
    "agent_type": "assistant",
    "agent_name": "My Agent",
    "agent_checksum": "abc123...",
    "owner": { "type": "user", "id": "user-1", "name": "Alice" },
    "trust_domain": "agents.example.com",
    "capabilities": ["ait:cap:read:files"],
    "aud": "https://api.example.com"
  },
  "expiresIn": 3600
}
```

Response (200):
```json
{
  "token": "eyJhbGciOiJFUzI1NiIs...",
  "claims": { ... },
  "expiresAt": "2026-04-01T00:00:00Z"
}
```

#### `GET /api/.well-known/ait-configuration`

OpenID-style discovery document.

Response:
```json
{
  "issuer": "https://verify.agent-id.dev",
  "jwks_uri": "https://verify.agent-id.dev/api/.well-known/jwks.json",
  "token_endpoint": "https://verify.agent-id.dev/api/issue",
  "verification_endpoint": "https://verify.agent-id.dev/api/verify",
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
- Performance tests:
  - Token creation: <5ms
  - Token verification: <10ms
  - Delegation: <15ms

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
│       │   ├── middleware.ts   # withAgentIdentity, verifyAITMiddleware
│       │   └── uuid.ts        # UUIDv7 generation
│       ├── tests/
│       │   ├── create.test.ts
│       │   ├── verify.test.ts
│       │   ├── delegate.test.ts
│       │   ├── introspect.test.ts
│       │   ├── checksum.test.ts
│       │   ├── keys.test.ts
│       │   ├── middleware.test.ts
│       │   └── edge-cases.test.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
├── apps/
│   └── verify/                 # Verification service
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx        # Landing page with API docs
│       │   └── api/
│       │       ├── verify/route.ts
│       │       ├── issue/route.ts
│       │       └── .well-known/
│       │           ├── ait-configuration/route.ts
│       │           └── jwks.json/route.ts
│       ├── lib/
│       │   ├── keys.ts         # Key management (env vars → CryptoKey)
│       │   └── auth.ts         # Admin auth middleware
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
