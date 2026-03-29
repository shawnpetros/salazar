import { describe, it, expect } from 'vitest';
import { leftPad } from './pad.js';

describe('leftPad: handle empty string input', () => {
  it("returns all pad characters when input is empty string", () => {
    expect(leftPad('', 5, '-')).toBe('-----');
  });
});
