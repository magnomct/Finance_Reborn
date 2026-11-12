import { Transaction } from '../types';
import { calculatePJMarginMetrics } from './pjMarginMetrics';

export type SimplesCeilingPreset = 'mei' | 'simples_faixa1' | 'simples_faixa2';

export interface SimplesCeilingConfig {
  id: SimplesCeilingPreset;
  title: string;
  limit: number;
  description: string;
}

export const SIMPLES_CEILING_PRESETS: Record<SimplesCeilingPreset, SimplesCeilingConfig> = {
  mei: {
    id: 'mei',
    title: 'MEI (Microempreendedor)',
    limit: 81000,
    description: 'Teto anual de faturamento MEI (R$ 81.000 / ano)',
  },
  simples_faixa1: {
    id: 'simples_faixa1',
    title: 'Simples 1ª Faixa',
    limit: 180000,
    description: '1ª Faixa do Simples Nacional (R$ 180.000 / ano)',
  },
  simples_faixa2: {
    id: 'simples_faixa2',
    title: 'Simples 2ª Faixa',
    limit: 360000,
    description: '2ª Faixa do Simples Nacional (R$ 360.000 / ano)',
  },
};

export interface PayoutDestinationItem {
  id: string;
  name: string;
  amount: number;
  pct: number;
  color: string;
  description: string;
}

export interface PJTaxOptimizationMetrics {
  rbt12: number; // Receita Bruta Total 12 Meses
  fs12: number; // Folha de Salários / Pró-Labore Total 12 Meses
  fatorR: number; // (fs12 / rbt12) * 100
  fatorRTargetPct: number; // 28.0%
  isAnexoIII: boolean; // fatorR >= 28.0%
  anexo: 'III' | 'V';
  effectiveTaxRatePct: number; // 6.0% or 15.5%
  proLaboreShortfallFor28Pct: number; // R$ needed in pro-labore to hit 28%
  currentMonthRevenue: number;
  currentMonthOperatingCosts: number;
  ceiling: {
    preset: SimplesCeilingPreset;
    limit: number;
    consumedPct: number;
    remainingAmount: number;
    projectedAnnualPace: number;
    riskOfExceeding: boolean;
  };
  payout: {
    grossRevenue: number;
    dasEstimated: number;
    operatingCosts: number;
    pjReservePct: number;
    pjReserveAmount: number;
    proLaboreGross: number;
    inssDeduction: number;
    irrfDeduction: number;
    proLaboreNet: number;
    exemptProfitDistribution: number;
    totalPartnerPayout: number; // proLaboreNet + exemptProfitDistribution
    destinations: PayoutDestinationItem[];
  };
  taxSavings: {
    monthlySavings: number;
    annualProjectedSavings: number;
    anexoIIIRate: number;
    anexoVRate: number;
  };
}

/**
 * Calculates progressive IRRF based on Brazilian 2026 progressive brackets:
 * - Up to R$ 2.259,20: Isento
 * - R$ 2.259,21 to R$ 2.826,65: 7.5% (Dedução R$ 169,44)
 * - R$ 2.826,66 to R$ 3.751,05: 15% (Dedução R$ 381,44)
 * - R$ 3.751,06 to R$ 4.664,68: 22.5% (Dedução R$ 662,77)
 * - Above R$ 4.664,68: 27.5% (Dedução R$ 896,00)
 */
export function calculateIRRF(taxableBase: number): number {
  if (taxableBase <= 2259.20) return 0;
  if (taxableBase <= 2826.65) return Math.max(0, taxableBase * 0.075 - 169.44);
  if (taxableBase <= 3751.05) return Math.max(0, taxableBase * 0.15 - 381.44);
  if (taxableBase <= 4664.68) return Math.max(0, taxableBase * 0.225 - 662.77);
  return Math.max(0, taxableBase * 0.275 - 896.00);
}

/**
 * Calculates INSS for managing partner (contribuinte individual):
 * 11% sobre o pró-labore até o teto do INSS (~R$ 7.786,02 = máx R$ 856,46).
 */
export function calculatePartnerINSS(proLaboreGross: number): number {
  const inssCeiling = 7786.02;
  const base = Math.min(proLaboreGross, inssCeiling);
  return base * 0.11;
}

export interface PJTaxOptimizationOptions {
  referenceMonth?: string;
  ceilingPreset?: SimplesCeilingPreset;
  pjReservePct?: number; // 0 to 30%
  proLaborePct?: number; // 10% to 50%
}

/**
 * Calculates Fator R, tax annex classification, annual revenue limit consumption,
 * partner payout division (Pró-Labore Líquido vs Lucro Isento), and tax savings.
 */
export function calculatePJTaxOptimization(
  transactions: Transaction[] = [],
  options: PJTaxOptimizationOptions = {}
): PJTaxOptimizationMetrics {
  const {
    referenceMonth = '2026-10',
    ceilingPreset = 'simples_faixa1',
    pjReservePct = 10,
    proLaborePct,
  } = options;

  const marginMetrics = calculatePJMarginMetrics(transactions, referenceMonth, 12);
  const rbt12 = marginMetrics.totalGrossRevenue;

  // Approximate historical 12-month payroll/pró-labore (FS12):
  // Typically structured by tax accountants at ~28.5% of gross revenue to safely guarantee Anexo III.
  const fs12 = rbt12 * 0.285;

  const fatorR = rbt12 > 0 ? (fs12 / rbt12) * 100 : 0;
  const fatorRTargetPct = 28.0;
  const isAnexoIII = fatorR >= fatorRTargetPct;
  const anexo: 'III' | 'V' = isAnexoIII ? 'III' : 'V';

  // Effective tax rate in Anexo III is ~6.0% (Faixa 1), in Anexo V is ~15.5%
  const effectiveTaxRatePct = isAnexoIII ? 6.0 : 15.5;

  // Shortfall to reach 28% in RBT12
  const targetFS12 = (rbt12 * 0.28);
  const proLaboreShortfallFor28Pct = Math.max(0, targetFS12 - fs12);

  // Current month revenue & costs
  const currentMonthRevenue = marginMetrics.currentMonth.grossRevenue;
  const currentMonthOperatingCosts = marginMetrics.currentMonth.operatingCosts;

  // Ceiling thermometer
  const ceilingConfig = SIMPLES_CEILING_PRESETS[ceilingPreset] || SIMPLES_CEILING_PRESETS.simples_faixa1;
  const limit = ceilingConfig.limit;
  const consumedPct = limit > 0 ? Math.min(100, (rbt12 / limit) * 100) : 0;
  const remainingAmount = Math.max(0, limit - rbt12);
  const projectedAnnualPace = (rbt12 / 12) * 12; // Annual run-rate
  const riskOfExceeding = projectedAnnualPace > limit;

  // Payout Split Calculation
  // 1. Estimated DAS
  const dasEstimated = currentMonthRevenue * (effectiveTaxRatePct / 100);

  // 2. PJ Cash Reserve
  const clampedReservePct = Math.max(0, Math.min(30, pjReservePct));
  const pjReserveAmount = currentMonthRevenue * (clampedReservePct / 100);

  // 3. Partner Pró-Labore
  // Default pro-labore percentage: 28% of current month revenue to match Fator R ideal split
  const chosenProLaborePct = proLaborePct !== undefined ? proLaborePct : 28.0;
  const proLaboreGross = Math.max(0, currentMonthRevenue * (chosenProLaborePct / 100));

  // 4. Partner Deductions on Pró-Labore
  const inssDeduction = calculatePartnerINSS(proLaboreGross);
  const irrfBase = Math.max(0, proLaboreGross - inssDeduction);
  const irrfDeduction = calculateIRRF(irrfBase);
  const proLaboreNet = Math.max(0, proLaboreGross - inssDeduction - irrfDeduction);

  // 5. Exempt Profit Distribution (Distribuição de Lucros Isenta)
  // Revenue - DAS - Operational Costs - PJ Reserve - Gross Pró-Labore
  const exemptProfitDistribution = Math.max(
    0,
    currentMonthRevenue - dasEstimated - currentMonthOperatingCosts - pjReserveAmount - proLaboreGross
  );

  const totalPartnerPayout = proLaboreNet + exemptProfitDistribution;

  // Destination Breakdown for chart
  const destinations: PayoutDestinationItem[] = [
    {
      id: 'impostos_das',
      name: 'Tributos (DAS Simples)',
      amount: dasEstimated,
      pct: currentMonthRevenue > 0 ? (dasEstimated / currentMonthRevenue) * 100 : 0,
      color: '#f43f5e', // Rose
      description: `Alíquota ${anexo === 'III' ? 'Anexo III (6,0%)' : 'Anexo V (15,5%)'}`,
    },
    {
      id: 'custos_pj',
      name: 'Custos & Despesas PJ',
      amount: currentMonthOperatingCosts,
      pct: currentMonthRevenue > 0 ? (currentMonthOperatingCosts / currentMonthRevenue) * 100 : 0,
      color: '#64748b', // Slate
      description: 'Convênio médico, tarifas e despesas operacionais',
    },
    {
      id: 'reserva_pj',
      name: 'Reserva de Caixa PJ',
      amount: pjReserveAmount,
      pct: currentMonthRevenue > 0 ? (pjReserveAmount / currentMonthRevenue) * 100 : 0,
      color: '#3b82f6', // Blue
      description: `Provisão de ${clampedReservePct}% para estabilidade da empresa`,
    },
    {
      id: 'pro_labore',
      name: 'Pró-Labore Líquido (PF)',
      amount: proLaboreNet,
      pct: currentMonthRevenue > 0 ? (proLaboreNet / currentMonthRevenue) * 100 : 0,
      color: '#8b5cf6', // Violet
      description: 'Remuneração formal com INSS e previdência recolhidos',
    },
    {
      id: 'lucro_isento',
      name: 'Lucro Isento p/ PF',
      amount: exemptProfitDistribution,
      pct: currentMonthRevenue > 0 ? (exemptProfitDistribution / currentMonthRevenue) * 100 : 0,
      color: '#10b981', // Emerald
      description: 'Distribuição 100% isenta de IR na conta da Pessoa Física',
    },
  ];

  // Tax Savings (Anexo III vs Anexo V)
  const anexoIIIRate = 6.0;
  const anexoVRate = 15.5;
  const rateDiff = (anexoVRate - anexoIIIRate) / 100;
  const monthlySavings = currentMonthRevenue * rateDiff;
  const annualProjectedSavings = monthlySavings * 12;

  return {
    rbt12,
    fs12,
    fatorR: parseFloat(fatorR.toFixed(1)),
    fatorRTargetPct,
    isAnexoIII,
    anexo,
    effectiveTaxRatePct,
    proLaboreShortfallFor28Pct,
    currentMonthRevenue,
    currentMonthOperatingCosts,
    ceiling: {
      preset: ceilingPreset,
      limit,
      consumedPct: parseFloat(consumedPct.toFixed(1)),
      remainingAmount,
      projectedAnnualPace,
      riskOfExceeding,
    },
    payout: {
      grossRevenue: currentMonthRevenue,
      dasEstimated,
      operatingCosts: currentMonthOperatingCosts,
      pjReservePct: clampedReservePct,
      pjReserveAmount,
      proLaboreGross,
      inssDeduction,
      irrfDeduction,
      proLaboreNet,
      exemptProfitDistribution,
      totalPartnerPayout,
      destinations,
    },
    taxSavings: {
      monthlySavings,
      annualProjectedSavings,
      anexoIIIRate,
      anexoVRate,
    },
  };
}
