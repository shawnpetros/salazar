import { describe, it, expect } from 'vitest';
import { rightPad } from './pad.js';

describe('F010: rightPad: handle empty string input by padding entirely with the pad character', () => {
  it("returns all pad characters when input is empty string", () => {
    expect(rightPad('', 5, '-')).toBe('-----');
  });
});
