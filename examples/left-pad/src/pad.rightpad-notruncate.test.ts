import { describe, it, expect } from 'vitest';
import { rightPad } from './pad.js';

describe('rightPad: no truncation when input length >= target length', () => {
  it('returns the original string unchanged when its length exceeds the target', () => {
    expect(rightPad('hello', 3)).toBe('hello');
  });
});
