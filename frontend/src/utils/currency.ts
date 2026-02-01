/**
 * Format amount in FCFA currency
 * @param amount - The numeric amount to format
 * @returns Formatted currency string
 */
export function formatFCFA(amount: number): string {
  if (isNaN(amount) || amount < 0) {
    return '0 FCFA';
  }

  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  
  return `${formatted} FCFA`;
}

/**
 * Parse FCFA currency string to number
 * @param currencyString - String like "1 000 FCFA" or "1000 FCFA"
 * @returns Numeric amount
 */
export function parseFCFA(currencyString: string): number {
  if (!currencyString || typeof currencyString !== 'string') {
    return 0;
  }

  // Remove FCFA and any non-numeric characters except spaces
  const numericString = currencyString
    .replace(/FCFA/gi, '')
    .replace(/[^\d\s]/g, '')
    .replace(/\s+/g, '');

  const amount = parseInt(numericString, 10);
  return isNaN(amount) ? 0 : amount;
}

/**
 * Calculate processing fee for payment method
 * @param amount - Base amount
 * @param feePercentage - Fee percentage (e.g., 2.5 for 2.5%)
 * @returns Processing fee amount
 */
export function calculateProcessingFee(amount: number, feePercentage: number): number {
  if (isNaN(amount) || isNaN(feePercentage) || amount <= 0 || feePercentage < 0) {
    return 0;
  }

  return Math.round((amount * feePercentage) / 100);
}

/**
 * Calculate total amount including processing fee
 * @param baseAmount - Base amount
 * @param feePercentage - Fee percentage
 * @returns Total amount including fee
 */
export function calculateTotalWithFee(baseAmount: number, feePercentage: number): number {
  const fee = calculateProcessingFee(baseAmount, feePercentage);
  return baseAmount + fee;
}

/**
 * Format delivery fee with estimation
 * @param baseFee - Base delivery fee
 * @param estimatedDays - Estimated delivery days
 * @returns Formatted delivery info string
 */
export function formatDeliveryInfo(baseFee: number, estimatedDays: number): string {
  const formattedFee = formatFCFA(baseFee);
  const dayText = estimatedDays === 1 ? 'jour' : 'jours';
  return `${formattedFee} - ${estimatedDays} ${dayText}`;
}