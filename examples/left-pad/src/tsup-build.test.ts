import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

describe('F014: tsup build configuration', () => {
  describe('tsup.config.ts', () => {
    it('tsup.config.ts exists', () => {
      const configPath = resolve(root, 'tsup.config.ts');
      expect(existsSync(configPath)).toBe(true);
    });

    it('tsup.config.ts specifies ESM format', () => {
      const configPath = resolve(root, 'tsup.config.ts');
      const content = readFileSync(configPath, 'utf-8');
      expect(content).toMatch(/format.*esm/i);
    });

    it('tsup.config.ts enables dts (declaration file) generation', () => {
      const configPath = resolve(root, 'tsup.config.ts');
      const content = readFileSync(configPath, 'utf-8');
      expect(content).toMatch(/dts\s*:\s*true/);
    });
  });

  describe('dist/ ESM output', () => {
    it('dist/index.js exists', () => {
      const distJs = resolve(root, 'dist', 'index.js');
      expect(existsSync(distJs)).toBe(true);
    });

    it('dist/index.js is ESM (contains export statement)', () => {
      const distJs = resolve(root, 'dist', 'index.js');
      const content = readFileSync(distJs, 'utf-8');
      expect(content).toMatch(/export\s*\{/);
    });
  });

  describe('dist/ TypeScript declaration files', () => {
    it('dist/index.d.ts exists', () => {
      const distDts = resolve(root, 'dist', 'index.d.ts');
      expect(existsSync(distDts)).toBe(true);
    });

    it('dist/index.d.ts contains TypeScript declarations', () => {
      const distDts = resolve(root, 'dist', 'index.d.ts');
      const content = readFileSync(distDts, 'utf-8');
      // Should export the pad functions as typed declarations
      expect(content).toMatch(/declare\s+function\s+(leftPad|rightPad)/);
    });
  });
});
