import { describe, expect, it } from 'vitest';
import { assertDestructiveSeedIsAllowed } from './seed-safety.js';

describe('assertDestructiveSeedIsAllowed', () => {
  it('rejects the destructive demo seed in production', () => {
    expect(() => assertDestructiveSeedIsAllowed('production')).toThrow(
      'Refusing to seed production',
    );
  });

  it('allows the demo seed outside production', () => {
    expect(() => assertDestructiveSeedIsAllowed('development')).not.toThrow();
    expect(() => assertDestructiveSeedIsAllowed('test')).not.toThrow();
  });
});
