import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

describe('F001: Project initialization', () => {
  describe('package.json', () => {
    const pkgPath = resolve(root, 'package.json');
    let pkg: Record<string, unknown>;

    it('package.json exists', () => {
      expect(existsSync(pkgPath)).toBe(true);
    });

    it('package.json has name "left-pad"', () => {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      expect(pkg['name']).toBe('left-pad');
    });

    it('package.json has type "module" (ESM)', () => {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      expect(pkg['type']).toBe('module');
    });

    it('package.json has devDependencies for typescript', () => {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      const devDeps = pkg['devDependencies'] as Record<string, string>;
      expect(devDeps).toBeDefined();
      expect(devDeps['typescript']).toBeDefined();
    });

    it('package.json has devDependencies for vitest', () => {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      const devDeps = pkg['devDependencies'] as Record<string, string>;
      expect(devDeps['vitest']).toBeDefined();
    });

    it('package.json has devDependencies for tsup', () => {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      const devDeps = pkg['devDependencies'] as Record<string, string>;
      expect(devDeps['tsup']).toBeDefined();
    });
  });

  describe('tsconfig.json', () => {
    const tsconfigPath = resolve(root, 'tsconfig.json');

    it('tsconfig.json exists', () => {
      expect(existsSync(tsconfigPath)).toBe(true);
    });

    it('tsconfig.json enables strict mode', () => {
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8')) as {
        compilerOptions: Record<string, unknown>;
      };
      expect(tsconfig.compilerOptions['strict']).toBe(true);
    });

    it('tsconfig.json targets ESM output (module: ESNext)', () => {
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8')) as {
        compilerOptions: Record<string, unknown>;
      };
      const mod = (tsconfig.compilerOptions['module'] as string).toLowerCase();
      expect(mod).toMatch(/esnext|es2020|es2022/);
    });
  });

  describe('vitest.config.ts', () => {
    it('vitest.config.ts exists', () => {
      const vitestConfigPath = resolve(root, 'vitest.config.ts');
      expect(existsSync(vitestConfigPath)).toBe(true);
    });
  });

  describe('node_modules (dependencies installed)', () => {
    it('node_modules directory exists', () => {
      const nmPath = resolve(root, 'node_modules');
      expect(existsSync(nmPath)).toBe(true);
    });

    it('typescript is installed', () => {
      const tsPath = resolve(root, 'node_modules', 'typescript');
      expect(existsSync(tsPath)).toBe(true);
    });

    it('vitest is installed', () => {
      const vitestPath = resolve(root, 'node_modules', 'vitest');
      expect(existsSync(vitestPath)).toBe(true);
    });

    it('tsup is installed', () => {
      const tsupPath = resolve(root, 'node_modules', 'tsup');
      expect(existsSync(tsupPath)).toBe(true);
    });
  });
});
