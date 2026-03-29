import { describe, it, expect } from 'vitest';
import { leftPad } from './pad.js';

describe('F003: leftPad pads string on the left with spaces by default', () => {
  it("returns '     hello' when called with leftPad('hello', 10)", () => {
    expect(leftPad('hello', 10)).toBe('     hello');
  });
});
