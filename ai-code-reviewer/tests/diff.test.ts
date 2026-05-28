import { describe, it, expect } from 'vitest';
import { shouldSkipFile } from '../src/github/diff.js';

describe('shouldSkipFile', () => {
  it('skips lock files', () => {
    expect(shouldSkipFile('package-lock.json')).toBe(true);
    expect(shouldSkipFile('frontend/yarn.lock')).toBe(true);
  });

  it('skips dist and minified assets', () => {
    expect(shouldSkipFile('build/dist/bundle.js')).toBe(true);
    expect(shouldSkipFile('app.min.js')).toBe(true);
  });

  it('allows normal source files', () => {
    expect(shouldSkipFile('src/auth/login.ts')).toBe(false);
  });

  it('respects custom ignored paths', () => {
    expect(shouldSkipFile('docs/guide.md', ['docs/'])).toBe(true);
  });
});
