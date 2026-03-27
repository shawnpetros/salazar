# Mini JWT Library — Test Specification

## Overview

Build a minimal JWT (JSON Web Token) library in TypeScript. Zero runtime dependencies — all crypto via Web Crypto API. This is a test run for the harness, not a production library.

## Scope

Only ES256 (ECDSA P-256 + SHA-256). No other algorithms. No JWE (encryption). Just JWS (signing).

## Deliverables

### TypeScript Library

Project setup:
- TypeScript strict mode
- Vitest for testing
- tsup for bundling
- Package name: `mini-jwt`
- ESM output

### Core Types

```typescript
interface JWTHeader {
  alg: "ES256";
  typ: "JWT";
  kid?: string;
}

interface JWTPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nbf?: number;
  jti?: string;
  [key: string]: unknown;
}

interface VerifyResult {
  valid: boolean;
  payload: JWTPayload;
  errors: string[];
}

interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}
```

### Functions

#### `generateKeyPair(): Promise<KeyPair>`
Generate an ES256 key pair using Web Crypto API.

#### `sign(payload: JWTPayload, privateKey: CryptoKey): Promise<string>`
Create and sign a JWT. Auto-sets `iat` to now if not provided. Returns compact JWS string (header.payload.signature).

#### `verify(token: string, publicKey: CryptoKey, options?: { audience?: string }): Promise<VerifyResult>`
Verify signature and validate claims:
- Signature must be valid
- `exp` must be in the future (if present)
- `nbf` must be in the past (if present)
- `aud` must match options.audience (if provided)
- Returns structured result with errors array

#### `decode(token: string): JWTPayload`
Decode without verification. Throws on malformed tokens.

### Utilities

- `base64UrlEncode(data: Uint8Array): string`
- `base64UrlDecode(str: string): Uint8Array`

### Directory Structure

```
output/
├── src/
│   ├── index.ts        # Public exports
│   ├── types.ts        # All types
│   ├── sign.ts         # sign function
│   ├── verify.ts       # verify function
│   ├── decode.ts       # decode function
│   ├── keys.ts         # generateKeyPair
│   └── base64url.ts    # base64url utilities
├── tests/
│   ├── sign.test.ts
│   ├── verify.test.ts
│   ├── decode.test.ts
│   └── edge-cases.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Edge Cases to Test

- Expired token
- Token not yet valid (nbf in future)
- Wrong audience
- Tampered payload (signature mismatch)
- Malformed token (wrong number of segments)
- Empty payload
- Missing signature
