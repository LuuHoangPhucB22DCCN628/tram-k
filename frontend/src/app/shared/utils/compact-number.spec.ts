import { describe, expect, it } from 'vitest';

import { formatCompactCount, formatCompactVnd } from './compact-number';

describe('compact number formatting', () => {
  it('uses Vietnamese money units without overflowing statistic cards', () => {
    expect(formatCompactVnd('20350000')).toBe('20,4 triệu');
    expect(formatCompactVnd('12800000000')).toBe('12,8 tỷ');
    expect(formatCompactVnd('850000')).toBe('850.000 đ');
  });

  it('compacts large counts and marks estimates explicitly', () => {
    expect(formatCompactCount(26)).toBe('26');
    expect(formatCompactCount(4268)).toBe('4,3 nghìn');
    expect(formatCompactCount(1250, true)).toBe('1,3 nghìn+');
    expect(formatCompactCount(0, true)).toBe('0');
  });
});
