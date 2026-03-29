import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

describe('F015: package.json exports map', () => {
  let pkg: Record<string, unknown>;

  function loadPkg(): Record<string, unknown> {
    return JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8')) as Record<string, unknown>;
  }

  describe('exports field', () => {
    it('package.json has an "exports" field', () => {
      pkg = loadPkg();
      expect(pkg['exports']).toBeDefined();
    });

    it('"exports" field has a "." entry pointing to the ESM dist output', () => {
      pkg = loadPkg();
      const exports = pkg['exports'] as Record<string, unknown>;
      const dot = exports['.'] as Record<string, unknown>;
      expect(dot).toBeDefined();
      const importField = dot['import'] as string;
      expect(importField).toMatch(/dist\/index\.js/);
    });

    it('"exports["."].types" points to the dist .d.ts file', () => {
      pkg = loadPkg();
      const exports = pkg['exports'] as Record<string, unknown>;
      const dot = exports['.'] as Record<string, unknown>;
      const typesField = dot['types'] as string;
      expect(typesField).toMatch(/dist\/index\.d\.ts/);
    });
  });

  describe('types field', () => {
    it('package.json has a top-level "types" field', () => {
      pkg = loadPkg();
      expect(pkg['types']).toBeDefined();
    });

    it('"types" field points to the generated .d.ts file', () => {
      pkg = loadPkg();
      expect(pkg['types'] as string).toMatch(/dist\/index\.d\.ts/);
    });
  });

  describe('scripts', () => {
    it('package.json has a "build" script that runs tsup', () => {
      pkg = loadPkg();
      const scripts = pkg['scripts'] as Record<string, string>;
      expect(scripts).toBeDefined();
      expect(scripts['build']).toBeDefined();
      expect(scripts['build']).toMatch(/tsup/);
    });

    it('package.json has a "test" script that runs vitest', () => {
      pkg = loadPkg();
      const scripts = pkg['scripts'] as Record<string, string>;
      expect(scripts['test']).toBeDefined();
      expect(scripts['test']).toMatch(/vitest/);
    });
  });
});
