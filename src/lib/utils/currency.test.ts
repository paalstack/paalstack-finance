import { describe, expect, it } from 'vitest';

import { parseCurrencyInput, roundCurrency, sumAmounts } from './currency';

describe('roundCurrency', () => {
  it('rounds to 2 decimal places by default', () => {
    expect(roundCurrency(10.005)).toBe(10.01);
    expect(roundCurrency(10.004)).toBe(10);
  });

  it('supports a custom decimal precision', () => {
    expect(roundCurrency(1.23456, 3)).toBe(1.235);
  });
});

describe('sumAmounts', () => {
  it('sums a list of amounts and rounds the result to 2 decimals', () => {
    expect(sumAmounts([10.5, 20.25, 5.125])).toBe(35.88);
  });

  it('returns 0 for an empty list', () => {
    expect(sumAmounts([])).toBe(0);
  });
});

describe('parseCurrencyInput', () => {
  it('strips currency symbols and formatting', () => {
    expect(parseCurrencyInput('₹1,234.56')).toBe(1234.56);
  });

  it('falls back to 0 for unparsable input', () => {
    expect(parseCurrencyInput('abc')).toBe(0);
  });
});
