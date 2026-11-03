/**
 * Compound Interest calculation utility for Yupee Reborn.
 * Formulas adhere to standard financial market equivalence:
 * i_m = (1 + i_a)^(1/12) - 1
 */

export interface CompoundInterestInput {
  initialAmount: number;
  monthlyDeposit: number;
  annualRatePercent: number; // e.g. 10.75 for 10.75% a.a.
  periodValue: number; // duration number
  periodType: 'years' | 'months';
}

export interface YearMilestone {
  year: number;
  month: number;
  totalInvested: number;
  totalInterest: number;
  totalAccumulated: number;
  interestInYear: number;
}

export interface MonthPoint {
  month: number;
  totalInvested: number;
  totalInterest: number;
  totalAccumulated: number;
}

export interface CompoundInterestResult {
  totalMonths: number;
  totalInvested: number;
  totalInterest: number;
  totalAccumulated: number;
  monthlyRatePercent: number;
  annualRatePercent: number;
  interestSharePercent: number; // totalInterest / totalAccumulated * 100
  yearlyProgression: YearMilestone[];
  monthlyProgression: MonthPoint[];
}

export interface MarketBenchmark {
  id: string;
  label: string;
  rateAnnual: number;
  desc: string;
}

export const MARKET_BENCHMARKS: MarketBenchmark[] = [
  { id: 'poupanca', label: 'Poupança', rateAnnual: 6.17, desc: '6,17% a.a. (TR + 0,5% a.m.)' },
  { id: 'selic', label: 'Tesouro Selic / 100% CDI', rateAnnual: 10.75, desc: '10,75% a.a. (Renda Fixa Pós-Fixada)' },
  { id: 'ipca', label: 'Tesouro IPCA+ (Longo Prazo)', rateAnnual: 11.50, desc: '11,50% a.a. (Proteção contra inflação)' },
  { id: 'multimercado', label: 'Fundos / Multimercado', rateAnnual: 12.00, desc: '12,00% a.a. (Carteira balanceada)' },
  { id: 'acoes', label: 'Ações & FIIs (Dividendos)', rateAnnual: 13.50, desc: '13,50% a.a. (Renda variável histórica)' },
];

/**
 * Calculates compound interest month by month and year by year.
 */
export function calculateCompoundInterest(
  input: CompoundInterestInput
): CompoundInterestResult {
  const initial = Math.max(0, input.initialAmount || 0);
  const deposit = Math.max(0, input.monthlyDeposit || 0);
  const annualRate = Math.max(0, input.annualRatePercent || 0);
  
  const totalMonths = input.periodType === 'years' 
    ? Math.max(1, Math.round((input.periodValue || 1) * 12))
    : Math.max(1, Math.round(input.periodValue || 1));

  // Equivalent monthly interest rate: (1 + i_a)^(1/12) - 1
  const decimalAnnual = annualRate / 100;
  const decimalMonthly = decimalAnnual > 0 
    ? Math.pow(1 + decimalAnnual, 1 / 12) - 1 
    : 0;

  const monthlyProgression: MonthPoint[] = [];
  const yearlyProgression: YearMilestone[] = [];

  let currentBalance = initial;
  let previousYearBalance = initial;

  for (let m = 1; m <= totalMonths; m++) {
    // 1. Interest gained on current balance
    const interestMonth = currentBalance * decimalMonthly;
    // 2. Add monthly deposit + interest
    currentBalance = currentBalance + interestMonth + deposit;

    const totalInvested = initial + m * deposit;
    const totalInterest = Math.max(0, currentBalance - totalInvested);

    monthlyProgression.push({
      month: m,
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalAccumulated: Math.round(currentBalance * 100) / 100
    });

    // Capture year milestones every 12 months or at the final month
    if (m % 12 === 0 || m === totalMonths) {
      const yearIndex = Math.ceil(m / 12);
      const interestInYear = Math.max(0, currentBalance - previousYearBalance - (deposit * (m % 12 === 0 ? 12 : (m % 12))));

      yearlyProgression.push({
        year: yearIndex,
        month: m,
        totalInvested: Math.round(totalInvested * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalAccumulated: Math.round(currentBalance * 100) / 100,
        interestInYear: Math.round(interestInYear * 100) / 100
      });

      previousYearBalance = currentBalance;
    }
  }

  const finalInvested = initial + totalMonths * deposit;
  const finalAccumulated = currentBalance;
  const finalInterest = Math.max(0, finalAccumulated - finalInvested);
  const interestSharePercent = finalAccumulated > 0 
    ? (finalInterest / finalAccumulated) * 100 
    : 0;

  return {
    totalMonths,
    totalInvested: Math.round(finalInvested * 100) / 100,
    totalInterest: Math.round(finalInterest * 100) / 100,
    totalAccumulated: Math.round(finalAccumulated * 100) / 100,
    monthlyRatePercent: Math.round(decimalMonthly * 100 * 1000) / 1000,
    annualRatePercent: annualRate,
    interestSharePercent: Math.round(interestSharePercent * 10) / 10,
    yearlyProgression,
    monthlyProgression
  };
}
