import { CurrencyUtil } from './currency.util';

describe('CurrencyUtil', () => {
  describe('formatFCFA', () => {
    it('should format positive amounts correctly', () => {
      expect(CurrencyUtil.formatFCFA(100000)).toMatch(/100.000 FCFA/);
      expect(CurrencyUtil.formatFCFA(1000)).toMatch(/1.000 FCFA/);
      expect(CurrencyUtil.formatFCFA(500)).toBe('500 FCFA');
      expect(CurrencyUtil.formatFCFA(1)).toBe('1 FCFA');
    });

    it('should handle zero amount', () => {
      expect(CurrencyUtil.formatFCFA(0)).toBe('0 FCFA');
    });

    it('should handle negative amounts', () => {
      expect(CurrencyUtil.formatFCFA(-100)).toBe('0 FCFA');
      expect(CurrencyUtil.formatFCFA(-1000)).toBe('0 FCFA');
    });

    it('should handle decimal amounts by rounding', () => {
      expect(CurrencyUtil.formatFCFA(100000.4)).toMatch(/100.000 FCFA/);
      expect(CurrencyUtil.formatFCFA(100000.5)).toMatch(/100.001 FCFA/);
      expect(CurrencyUtil.formatFCFA(100000.9)).toMatch(/100.001 FCFA/);
    });

    it('should handle NaN values', () => {
      expect(CurrencyUtil.formatFCFA(NaN)).toBe('0 FCFA');
    });

    it('should handle very large amounts', () => {
      expect(CurrencyUtil.formatFCFA(1000000000)).toMatch(/1.000.000.000 FCFA/);
    });
  });

  describe('parseFCFA', () => {
    it('should parse formatted FCFA strings', () => {
      expect(CurrencyUtil.parseFCFA('100 000 FCFA')).toBe(100000);
      expect(CurrencyUtil.parseFCFA('1 000 FCFA')).toBe(1000);
      expect(CurrencyUtil.parseFCFA('500 FCFA')).toBe(500);
      expect(CurrencyUtil.parseFCFA('1 FCFA')).toBe(1);
    });

    it('should parse strings without spaces', () => {
      expect(CurrencyUtil.parseFCFA('100000 FCFA')).toBe(100000);
      expect(CurrencyUtil.parseFCFA('1000FCFA')).toBe(1000);
    });

    it('should handle case insensitive FCFA', () => {
      expect(CurrencyUtil.parseFCFA('100 000 fcfa')).toBe(100000);
      expect(CurrencyUtil.parseFCFA('100 000 Fcfa')).toBe(100000);
    });

    it('should handle invalid inputs', () => {
      expect(CurrencyUtil.parseFCFA('')).toBe(0);
      expect(CurrencyUtil.parseFCFA(null as any)).toBe(0);
      expect(CurrencyUtil.parseFCFA(undefined as any)).toBe(0);
      expect(CurrencyUtil.parseFCFA('invalid')).toBe(0);
    });

    it('should handle strings with extra characters', () => {
      expect(CurrencyUtil.parseFCFA('Prix: 100 000 FCFA')).toBe(100000);
      expect(CurrencyUtil.parseFCFA('100,000 FCFA')).toBe(100000);
    });
  });

  describe('calculateProcessingFee', () => {
    it('should calculate processing fees correctly', () => {
      expect(CurrencyUtil.calculateProcessingFee(100000, 2.5)).toBe(2500);
      expect(CurrencyUtil.calculateProcessingFee(50000, 1.5)).toBe(750);
      expect(CurrencyUtil.calculateProcessingFee(10000, 0)).toBe(0);
    });

    it('should round fees to nearest integer', () => {
      expect(CurrencyUtil.calculateProcessingFee(100001, 2.5)).toBe(2500); // 2500.025 -> 2500
      expect(CurrencyUtil.calculateProcessingFee(100003, 2.5)).toBe(2500); // 2500.075 -> 2500
    });

    it('should handle invalid inputs', () => {
      expect(CurrencyUtil.calculateProcessingFee(NaN, 2.5)).toBe(0);
      expect(CurrencyUtil.calculateProcessingFee(100000, NaN)).toBe(0);
      expect(CurrencyUtil.calculateProcessingFee(-100000, 2.5)).toBe(0);
      expect(CurrencyUtil.calculateProcessingFee(100000, -2.5)).toBe(0);
      expect(CurrencyUtil.calculateProcessingFee(0, 2.5)).toBe(0);
    });
  });

  describe('calculateTotalWithFee', () => {
    it('should calculate total with processing fee', () => {
      expect(CurrencyUtil.calculateTotalWithFee(100000, 2.5)).toBe(102500);
      expect(CurrencyUtil.calculateTotalWithFee(50000, 1.5)).toBe(50750);
      expect(CurrencyUtil.calculateTotalWithFee(10000, 0)).toBe(10000);
    });

    it('should handle edge cases', () => {
      expect(CurrencyUtil.calculateTotalWithFee(0, 2.5)).toBe(0);
      expect(CurrencyUtil.calculateTotalWithFee(100000, 0)).toBe(100000);
    });

    it('should handle invalid inputs', () => {
      expect(CurrencyUtil.calculateTotalWithFee(NaN, 2.5)).toBe(NaN);
      expect(CurrencyUtil.calculateTotalWithFee(100000, NaN)).toBe(100000);
      expect(CurrencyUtil.calculateTotalWithFee(-100000, 2.5)).toBe(-100000);
    });
  });
});