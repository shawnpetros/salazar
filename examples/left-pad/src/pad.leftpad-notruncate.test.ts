import { describe, it, expect } from 'vitest';
import { leftPad } from './pad.js';

describe('leftPad: no truncation when input length >= target length', () => {
  it('returns the original string unchanged when its length exceeds the target', () => {
    expect(leftPad('hello', 3)).toBe('hello');
  });
});
