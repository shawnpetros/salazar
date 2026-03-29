import { describe, it, expect } from 'vitest';
import { leftPad, rightPad } from './pad.js';

describe('F011: leftPad and rightPad handle edge case where target length is 0 or negative', () => {
  describe('leftPad with target length of 0', () => {
    it("returns 'hi' unmodified when called with leftPad('hi', 0)", () => {
      expect(leftPad('hi', 0)).toBe('hi');
    });
  });

  describe('leftPad with negative target length', () => {
    it("returns 'hi' unmodified when called with leftPad('hi', -1)", () => {
      expect(leftPad('hi', -1)).toBe('hi');
    });

    it("returns 'hi' unmodified when called with leftPad('hi', -100)", () => {
      expect(leftPad('hi', -100)).toBe('hi');
    });
  });

  describe('rightPad with target length of 0', () => {
    it("returns 'hi' unmodified when called with rightPad('hi', 0)", () => {
      expect(rightPad('hi', 0)).toBe('hi');
    });
  });

  describe('rightPad with negative target length', () => {
    it("returns 'hi' unmodified when called with rightPad('hi', -1)", () => {
      expect(rightPad('hi', -1)).toBe('hi');
    });

    it("returns 'hi' unmodified when called with rightPad('hi', -100)", () => {
      expect(rightPad('hi', -100)).toBe('hi');
    });
  });
});
