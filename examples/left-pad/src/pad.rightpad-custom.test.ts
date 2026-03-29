import { describe, it, expect } from 'vitest';
import { rightPad } from './pad.js';

describe('F008: rightPad pads string on the right with a custom character', () => {
  it("returns 'hello.....' when called with rightPad('hello', 10, '.')", () => {
    expect(rightPad('hello', 10, '.')).toBe('hello.....');
  });
});
