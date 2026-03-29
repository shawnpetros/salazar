import { describe, it, expect } from 'vitest';
import * as indexExports from './index.js';

describe('F012: Module entry point re-exports leftPad and rightPad', () => {
  it('exports a named export leftPad that is a function', () => {
    expect(typeof indexExports.leftPad).toBe('function');
  });

  it('exports a named export rightPad that is a function', () => {
    expect(typeof indexExports.rightPad).toBe('function');
  });

  it('leftPad export behaves as the leftPad function', () => {
    expect(indexExports.leftPad('hello', 10)).toBe('     hello');
  });

  it('rightPad export behaves as the rightPad function', () => {
    expect(indexExports.rightPad('hello', 10)).toBe('hello     ');
  });
});
