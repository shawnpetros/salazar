import { describe, it, expect } from 'vitest';
import { leftPad, rightPad } from './pad.js';

describe('leftPad', () => {
  describe('default space padding', () => {
    it('pads a string on the left with spaces to reach the target length', () => {
      expect(leftPad('hello', 10)).toBe('     hello');
    });

    it('pads a single character string with spaces', () => {
      expect(leftPad('a', 5)).toBe('    a');
    });

    it('returns the string unchanged when already at target length', () => {
      expect(leftPad('hello', 5)).toBe('hello');
    });
  });

  describe('custom character padding', () => {
    it('pads a string on the left with a custom character', () => {
      expect(leftPad('hello', 10, '.')).toBe('.....hello');
    });

    it('pads with a custom character when string is shorter than target', () => {
      expect(leftPad('hi', 6, '-')).toBe('----hi');
    });
  });

  describe('no truncation', () => {
    it('does not truncate when string length exceeds target length', () => {
      expect(leftPad('hello', 3)).toBe('hello');
    });

    it('does not truncate when string length greatly exceeds target length', () => {
      expect(leftPad('toolongstring', 5)).toBe('toolongstring');
    });
  });

  describe('empty string input', () => {
    it('pads an empty string entirely with the pad character', () => {
      expect(leftPad('', 5, '-')).toBe('-----');
    });

    it('pads an empty string with default spaces', () => {
      expect(leftPad('', 3)).toBe('   ');
    });
  });

  describe('edge cases', () => {
    it('returns the original string when target length is 0', () => {
      expect(leftPad('hi', 0)).toBe('hi');
    });

    it('returns the original string when target length is negative', () => {
      expect(leftPad('hi', -1)).toBe('hi');
    });

    it('returns empty string unchanged when target length is 0', () => {
      expect(leftPad('', 0)).toBe('');
    });
  });
});

describe('rightPad', () => {
  describe('default space padding', () => {
    it('pads a string on the right with spaces to reach the target length', () => {
      expect(rightPad('hello', 10)).toBe('hello     ');
    });

    it('pads a single character string with spaces', () => {
      expect(rightPad('a', 5)).toBe('a    ');
    });

    it('returns the string unchanged when already at target length', () => {
      expect(rightPad('hello', 5)).toBe('hello');
    });
  });

  describe('custom character padding', () => {
    it('pads a string on the right with a custom character', () => {
      expect(rightPad('hello', 10, '.')).toBe('hello.....');
    });

    it('pads with a custom character when string is shorter than target', () => {
      expect(rightPad('hi', 6, '-')).toBe('hi----');
    });
  });

  describe('no truncation', () => {
    it('does not truncate when string length exceeds target length', () => {
      expect(rightPad('hello', 3)).toBe('hello');
    });

    it('does not truncate when string length greatly exceeds target length', () => {
      expect(rightPad('toolongstring', 5)).toBe('toolongstring');
    });
  });

  describe('empty string input', () => {
    it('pads an empty string entirely with the pad character', () => {
      expect(rightPad('', 5, '-')).toBe('-----');
    });

    it('pads an empty string with default spaces', () => {
      expect(rightPad('', 3)).toBe('   ');
    });
  });

  describe('edge cases', () => {
    it('returns the original string when target length is 0', () => {
      expect(rightPad('hi', 0)).toBe('hi');
    });

    it('returns the original string when target length is negative', () => {
      expect(rightPad('hi', -1)).toBe('hi');
    });

    it('returns empty string unchanged when target length is 0', () => {
      expect(rightPad('', 0)).toBe('');
    });
  });
});
