import { Transaction } from '../types';
import { MONTH_NAMES } from '../data/annualDashboardData';

export interface C6MonthlyInvoice {
  monthIndex: number;
  monthName: string;
  year: number;
  amount: number; // positive total spend on C6
  isClosed: boolean;
  closingDay: number;
  dueDate: string;
}

export interface C6InvoiceAnalysis {
  closingDay: number;
  dueDay: number;
  isClosed: boolean;
  currentInvoiceAmount: number;
  last3MonthsAverage: number;
  last3Months: Array<{ monthName: string; amount: number }>;
  differenceAmount: number;
  differencePercentage: number;
  isAboveTrend: boolean;
  trendStatus: 'alerta' | 'atencao' | 'dentro_da_media' | 'abaixo_da_media';
  alertTitle: string;
  alertDescription: string;
  recommendation: string;
  referenceDate: string;
}

// Historical default monthly C6 invoices leading up to October 2026:
// Julho: R$ 2.450 | Agosto: R$ 2.400 | Setembro: R$ 2.520 (Média = R$ 2.456,67)
const DEFAULT_HISTORICAL_C6: Record<number, number> = {
  6: 2450.00, // Julho
  7: 2400.00, // Agosto
  8: 2520.00, // Setembro
};

/**
 * Calculates current C6 card invoice total and compares it against the average of the last 3 months.
 * Closing date (fechamento da fatura) for C6 is traditionally around day 20-22 with payment on day 28-30.
 */
export function analyzeC6InvoiceComparison(params?: {
  transactions?: Transaction[];
  referenceDate?: string; // YYYY-MM-DD (defaults to '2026-10-27')
  closingDay?: number;
  dueDay?: number;
}): C6InvoiceAnalysis {
  const {
    transactions = [],
    referenceDate = '2026-10-27',
    closingDay = 22,
    dueDay = 30,
  } = params || {};

  const refDateObj = new Date(referenceDate);
  const currentDay = refDateObj.getDate() || 27;
  const currentMonthIdx = refDateObj.getMonth(); // 9 = Outubro
  const isClosed = currentDay >= closingDay;

  // 1. Calculate C6 spend for current month from transactions
  // Filter transactions with account = 'C6' and type = 'despesa'
  const currentMonthPrefix = referenceDate.slice(0, 7); // '2026-10'

  const c6CurrentTransactions = transactions.filter(t => {
    const isC6Account = t.account === 'C6';
    const isDespesa = t.type === 'despesa';
    const isCurrentMonth = t.date ? t.date.startsWith(currentMonthPrefix) : true;
    return isC6Account && isDespesa && isCurrentMonth;
  });

  let currentInvoiceAmount = c6CurrentTransactions.reduce(
    (acc, t) => acc + Math.abs(t.amount),
    0
  );

  // If no transactions specifically found for this month, fallback to all current C6 expenses or baseline R$ 2.600
  if (currentInvoiceAmount === 0) {
    const allC6Despesas = transactions
      .filter(t => t.account === 'C6' && t.type === 'despesa')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    currentInvoiceAmount = allC6Despesas > 0 ? allC6Despesas : 2600.00;
  }

  // 2. Identify the last 3 prior months (e.g. Setembro, Agosto, Julho)
  // Check if transactions contain records for these prior months, or use baseline historical data
  const last3MonthsData: Array<{ monthName: string; amount: number; monthIdx: number }> = [];

  for (let i = 1; i <= 3; i++) {
    let pastMonthIdx = currentMonthIdx - i;
    let pastYear = refDateObj.getFullYear();
    if (pastMonthIdx < 0) {
      pastMonthIdx += 12;
      pastYear -= 1;
    }

    const pastMonthStr = String(pastMonthIdx + 1).padStart(2, '0');
    const pastPrefix = `${pastYear}-${pastMonthStr}`;

    const pastTxs = transactions.filter(
      t => t.account === 'C6' && t.type === 'despesa' && t.date && t.date.startsWith(pastPrefix)
    );

    const pastTotal = pastTxs.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const amount = pastTotal > 0 ? pastTotal : (DEFAULT_HISTORICAL_C6[pastMonthIdx] ?? 2450.00);

    last3MonthsData.push({
      monthName: MONTH_NAMES[pastMonthIdx] || `Mês ${pastMonthIdx + 1}`,
      amount,
      monthIdx: pastMonthIdx,
    });
  }

  // 3. Compute 3 months average
  const totalLast3 = last3MonthsData.reduce((acc, m) => acc + m.amount, 0);
  const last3MonthsAverage = Math.round((totalLast3 / 3) * 100) / 100;

  // 4. Difference and trend analysis
  const differenceAmount = Math.round((currentInvoiceAmount - last3MonthsAverage) * 100) / 100;
  const differencePercentage = last3MonthsAverage > 0
    ? Math.round(((currentInvoiceAmount - last3MonthsAverage) / last3MonthsAverage) * 1000) / 10
    : 0;

  const isAboveTrend = currentInvoiceAmount > last3MonthsAverage;

  let trendStatus: C6InvoiceAnalysis['trendStatus'] = 'dentro_da_media';
  let alertTitle = 'Fatura Dentro da Média Histórica';
  let alertDescription = `O total da fatura está alinhado com o padrão de consumo dos últimos 3 meses (${last3MonthsData.map(m => m.monthName).join(', ')}).`;
  let recommendation = 'Mantenha o acompanhamento semanal dos potes para garantir que o próximo ciclo continue sob controle.';

  if (differencePercentage > 10) {
    trendStatus = 'alerta';
    alertTitle = 'Atenção: Fatura Acima da Média Histórica';
    alertDescription = `A fatura fechada do Cartão C6 está R$ ${Math.abs(differenceAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (+${differencePercentage}%) acima da média dos últimos 3 meses (R$ ${last3MonthsAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`;
    recommendation = 'Revise gastos com lazer e compras parceladas impulsivas antes do vencimento para evitar pressão no fluxo de caixa.';
  } else if (differencePercentage > 2) {
    trendStatus = 'atencao';
    alertTitle = 'Consumo Levemente Acima do Histórico';
    alertDescription = `A fatura fechou +${differencePercentage}% (R$ ${differenceAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) acima da média recente de R$ ${last3MonthsAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
    recommendation = 'Monitore os lançamentos de delivery e pequenos gastos avulsos no C6.';
  } else if (differencePercentage < -5) {
    trendStatus = 'abaixo_da_media';
    alertTitle = 'Economia: Fatura Abaixo da Média Histórica';
    alertDescription = `Excelente controle! O fechamento deste mês está R$ ${Math.abs(differenceAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${differencePercentage}%) abaixo da média dos últimos 3 meses.`;
    recommendation = 'O saldo economizado pode ser direcionado para acelerar o aporte na sua Reserva de Emergência ou Metas.';
  }

  return {
    closingDay,
    dueDay,
    isClosed,
    currentInvoiceAmount,
    last3MonthsAverage,
    last3Months: last3MonthsData.map(d => ({ monthName: d.monthName, amount: d.amount })),
    differenceAmount,
    differencePercentage,
    isAboveTrend,
    trendStatus,
    alertTitle,
    alertDescription,
    recommendation,
    referenceDate,
  };
}
