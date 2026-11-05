/**
 * Pure utility functions for animated numeric and currency counters.
 */

export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

export function easeInOutQuad(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
}

export function calculateCounterStep(
  startVal: number,
  endVal: number,
  progress: number,
  easing: (t: number) => number = easeOutCubic
): number {
  const eased = easing(progress);
  return startVal + (endVal - startVal) * eased;
}

export function getCounterDirection(prev: number, next: number, epsilon = 0.005): 'up' | 'down' | 'same' {
  const diff = next - prev;
  if (Math.abs(diff) <= epsilon) return 'same';
  return diff > 0 ? 'up' : 'down';
}

export function formatCounterCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCounterNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
