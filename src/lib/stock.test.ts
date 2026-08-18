import { describe, expect, it } from 'vitest';
import { getStockStatus } from './stock';

describe('getStockStatus', () => {
  it('marks a product as out of stock when quantity is 0 or negative', () => {
    expect(getStockStatus(0, 5)).toBe('out');
    expect(getStockStatus(-3, 5)).toBe('out');
  });

  it('marks stock as low at or below the minimum, and ok when above it', () => {
    expect(getStockStatus(2, 5)).toBe('low');
    expect(getStockStatus(5, 5)).toBe('low');
    expect(getStockStatus(12, 5)).toBe('ok');
  });
});
