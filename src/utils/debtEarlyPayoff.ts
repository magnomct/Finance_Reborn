/**
 * Types and mathematical models for early debt / credit card installment payoff simulation.
 */

export type AmortizationMethod = 'price' | 'sac' | 'card_discount';

export interface DebtPreset {
  id: string;
  name: string;
  category: 'cartao' | 'financiamento' | 'emprestimo';
  installmentAmount: number;
  totalInstallments: number;
  remainingInstallments: number;
  monthlyInterestRatePct: number; // e.g. 1.8% per month or card discount rate
  method: AmortizationMethod;
  description: string;
}

export interface EarlyPayoffSimulationInput {
  installmentAmount: number; // Valor da Parcela Atual (R$)
  remainingInstallments: number; // Quantidade de parcelas restantes
  installmentsToPrepay: number; // Quantas parcelas o usuário deseja antecipar
  monthlyInterestRatePct: number; // Taxa de juros mensal ou taxa de desconto de antecipação (% a.m.)
  method?: AmortizationMethod; // Default 'card_discount' or 'price'
}

export interface EarlyPayoffSimulationResult {
  installmentAmount: number;
  remainingInstallments: number;
  installmentsToPrepay: number;
  monthlyInterestRatePct: number;
  method: AmortizationMethod;

  // Sem Antecipação (fluxo normal até o fim)
  totalWithoutPrepay: number; // remainingInstallments * installmentAmount

  // Com Antecipação
  prepaidInstallmentsNominal: number; // installmentsToPrepay * installmentAmount
  prepaidDiscountedAmount: number; // Valor presente efetivo pago pelas parcelas antecipadas com desconto
  discountSaved: number; // Economia bruta de juros / desconto obtido
  discountPercentage: number; // % economizado sobre as parcelas antecipadas

  // Resumo pós-antecipação
  newRemainingInstallments: number; // remainingInstallments - installmentsToPrepay
  futureRemainingAmount: number; // newRemainingInstallments * installmentAmount
  totalWithPrepay: number; // prepaidDiscountedAmount + futureRemainingAmount
  totalNetSavings: number; // totalWithoutPrepay - totalWithPrepay

  // Meses e tempo economizado
  monthsSaved: number;
  roiAnnualized: number; // Retorno financeiro anualizado sobre o capital antecipado (%)
}

/**
 * Pre-configured realistic presets from the user's financial profile.
 */
export const DEFAULT_DEBT_PRESETS: DebtPreset[] = [
  {
    id: 'c6_parcelas',
    name: 'Cartão C6 - Compras Parceladas',
    category: 'cartao',
    installmentAmount: 320.0,
    totalInstallments: 10,
    remainingInstallments: 8,
    monthlyInterestRatePct: 1.5, // Desconto típico Nubank/C6 de antecipação de compras parceladas (~1.5% a.m.)
    method: 'card_discount',
    description: 'Antecipação com desconto de juros futuros de compras parceladas sem juros no cartão de crédito.'
  },
  {
    id: 'habitacional_apto',
    name: 'Financiamento Habitacional (Caixa/Apto)',
    category: 'financiamento',
    installmentAmount: 1290.0,
    totalInstallments: 360,
    remainingInstallments: 240,
    monthlyInterestRatePct: 0.85, // ~10.5% a.a. taxa média habitacional
    method: 'price',
    description: 'Amortização de parcelas no final do contrato abatendo diretamente juros da Tabela Price/SAC.'
  },
  {
    id: 'cheque_especial',
    name: 'Renegociação de Cheque Especial / Empréstimo',
    category: 'emprestimo',
    installmentAmount: 450.0,
    totalInstallments: 12,
    remainingInstallments: 9,
    monthlyInterestRatePct: 3.8, // Taxa de juros de empréstimo pessoal
    method: 'price',
    description: 'Quitação antecipada de dívidas com juros bancários elevados para estancar encargos.'
  }
];

/**
 * Calculates the exact discounted present value for antecipating installments.
 * For each installment i (1 ... k) ahead, present value PV_i = PMT / (1 + r)^i
 */
export function calculateEarlyPayoff(input: EarlyPayoffSimulationInput): EarlyPayoffSimulationResult {
  const installmentAmount = Math.max(0, input.installmentAmount);
  const remainingInstallments = Math.max(1, Math.round(input.remainingInstallments));
  const installmentsToPrepay = Math.min(
    remainingInstallments,
    Math.max(1, Math.round(input.installmentsToPrepay))
  );
  const monthlyRate = Math.max(0, input.monthlyInterestRatePct) / 100;
  const method = input.method || 'card_discount';

  // 1. Total pago sem antecipação
  const totalWithoutPrepay = remainingInstallments * installmentAmount;

  // 2. Cálculo do valor presente das parcelas antecipadas (desconto composto)
  // Cada parcela antecipada no futuro trazido a valor presente: PV_t = PMT / (1 + r)^t
  // Quando antecipa as últimas parcelas do contrato (da última para trás):
  let prepaidDiscountedAmount = 0;
  const nominalPrepay = installmentsToPrepay * installmentAmount;

  if (monthlyRate === 0) {
    prepaidDiscountedAmount = nominalPrepay;
  } else {
    // Traz a valor presente cada parcela antecipada (do final do contrato ou do próximo mês)
    // No caso de amortização (como cartão ou financiamento), antecipa-se as N parcelas finais:
    // onde o tempo de desconto varia de (remainingInstallments - installmentsToPrepay + 1) até remainingInstallments
    for (let i = 0; i < installmentsToPrepay; i++) {
      // Período no tempo até o vencimento original da parcela
      const monthsAhead = remainingInstallments - i;
      const pv = installmentAmount / Math.pow(1 + monthlyRate, monthsAhead);
      prepaidDiscountedAmount += pv;
    }
  }

  prepaidDiscountedAmount = Math.round(prepaidDiscountedAmount * 100) / 100;
  const discountSaved = Math.max(0, Math.round((nominalPrepay - prepaidDiscountedAmount) * 100) / 100);
  const discountPercentage = nominalPrepay > 0
    ? Math.round((discountSaved / nominalPrepay) * 1000) / 10
    : 0;

  // 3. Resumo pós-antecipação
  const newRemainingInstallments = remainingInstallments - installmentsToPrepay;
  const futureRemainingAmount = newRemainingInstallments * installmentAmount;
  const totalWithPrepay = Math.round((prepaidDiscountedAmount + futureRemainingAmount) * 100) / 100;
  const totalNetSavings = Math.max(0, Math.round((totalWithoutPrepay - totalWithPrepay) * 100) / 100);

  // 4. Retorno anualizado aproximado sobre o capital investido na antecipação
  const roiAnnualized = prepaidDiscountedAmount > 0 && installmentsToPrepay > 0
    ? Math.round((Math.pow(1 + monthlyRate, 12) - 1) * 1000) / 10
    : 0;

  return {
    installmentAmount,
    remainingInstallments,
    installmentsToPrepay,
    monthlyInterestRatePct: input.monthlyInterestRatePct,
    method,
    totalWithoutPrepay,
    prepaidInstallmentsNominal: nominalPrepay,
    prepaidDiscountedAmount,
    discountSaved,
    discountPercentage,
    newRemainingInstallments,
    futureRemainingAmount,
    totalWithPrepay,
    totalNetSavings,
    monthsSaved: installmentsToPrepay,
    roiAnnualized
  };
}
