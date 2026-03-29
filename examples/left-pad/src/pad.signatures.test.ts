import { describe, it, expect } from 'vitest';
import { leftPad, rightPad } from './pad.js';

describe('F002: pad.ts function signatures', () => {
  describe('leftPad', () => {
    it('is exported as a function', () => {
      expect(typeof leftPad).toBe('function');
    });

    it('accepts (str: string, length: number) and returns a string', () => {
      const result = leftPad('hi', 5);
      expect(typeof result).toBe('string');
    });

    it('accepts (str: string, length: number, char: string) and returns a string', () => {
      const result = leftPad('hi', 5, '*');
      expect(typeof result).toBe('string');
    });
  });

  describe('rightPad', () => {
    it('is exported as a function', () => {
      expect(typeof rightPad).toBe('function');
    });

    it('accepts (str: string, length: number) and returns a string', () => {
      const result = rightPad('hi', 5);
      expect(typeof result).toBe('string');
    });

    it('accepts (str: string, length: number, char: string) and returns a string', () => {
      const result = rightPad('hi', 5, '*');
      expect(typeof result).toBe('string');
    });
  });
});
