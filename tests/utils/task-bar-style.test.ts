/**
 * Tests for resolveTaskBarStyle (tentative/done branching)
 */

import { describe, it, expect } from 'vitest';
import { resolveTaskBarStyle } from '../../src/utils/task-bar-style';

describe('resolveTaskBarStyle', () => {
  it('should resolve neither when nothing is set', () => {
    expect(resolveTaskBarStyle({})).toEqual({ isDone: false, isTentative: false });
  });

  it('should resolve tentative only when tentative is true', () => {
    expect(resolveTaskBarStyle({ tentative: true })).toEqual({ isDone: false, isTentative: true });
  });

  it('should resolve done via completed field', () => {
    expect(resolveTaskBarStyle({ completed: true })).toEqual({ isDone: true, isTentative: false });
  });

  it('should resolve done via status field', () => {
    expect(resolveTaskBarStyle({ status: 'done' })).toEqual({ isDone: true, isTentative: false });
  });

  it('should not treat non-done status as done', () => {
    expect(resolveTaskBarStyle({ status: 'doing' })).toEqual({ isDone: false, isTentative: false });
  });

  it('should prioritize done over tentative when both are set', () => {
    expect(resolveTaskBarStyle({ status: 'done', tentative: true })).toEqual({ isDone: true, isTentative: false });
    expect(resolveTaskBarStyle({ completed: true, tentative: true })).toEqual({ isDone: true, isTentative: false });
  });
});
