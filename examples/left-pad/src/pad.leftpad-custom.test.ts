import { describe, it, expect } from 'vitest';
import { leftPad } from './pad.js';

describe('F004: leftPad with custom character', () => {
  it('pads string on the left with a custom character to reach target length', () => {
    expect(leftPad('hello', 10, '.')).toBe('.....hello');
  });
});
