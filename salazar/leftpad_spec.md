# left-pad

A tiny string padding utility in TypeScript. Zero dependencies.

## Functions

### `leftPad(str: string, length: number, char?: string): string`

Pad a string on the left side to a given length. Default pad character is a space.

```typescript
leftPad('hello', 10)       // '     hello'
leftPad('hello', 10, '.')  // '.....hello'
leftPad('hello', 3)        // 'hello' (no truncation)
leftPad('', 5, '-')        // '-----'
```

### `rightPad(str: string, length: number, char?: string): string`

Pad a string on the right side. Same API.

## Project Setup

- TypeScript strict mode
- Vitest for testing
- tsup for bundling
- ESM output
- Package name: `left-pad`

## Directory Structure

```
src/
  index.ts      # exports both functions
  pad.ts        # implementation
  pad.test.ts   # tests
package.json
tsconfig.json
vitest.config.ts
```
