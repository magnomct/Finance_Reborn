import { Transaction } from '../types';
import { calculateFinancialMetrics } from './finance';

export interface CumulativeMonthData {
  monthIndex: number;
  month: string; // e.g. "Mai/26"
  fullName: string; // e.g. "Maio 2026"
  yearMonth: string; // e.g. "2026-05"
  
  // Monthly values
  receitaMensal: number;
  despesaMensal: number;
  poupancaMensal: number; // receitaMensal - despesaMensal
  margemMensalPct: number; // (poupancaMensal / receitaMensal) * 100

  // Cumulative values
  faturamentoAcumulado: number; // Cumulative sum of revenue
  despesasAcumuladas: number; // Cumulative sum of expenses
  margemPoupancaAcumulada: number; // faturamentoAcumulado - despesasAcumuladas
  margemPoupancaPct: number; // (margemPoupancaAcumulada / faturamentoAcumulado) * 100

  isSuperavit: boolean;
}

export type SavingsMarginStatus = 'excelente' | 'saudavel' | 'atencao' | 'critico';

export interface CumulativeSavingsSummary {
  months: CumulativeMonthData[];
  windowMonths: 6 | 12;
  
  // Total Accumulations
  totalFaturamento: number;
  totalDespesas: number;
  totalPoupanca: number;
  margemPoupancaGeralPct: number;

  // Monthly Averages
  mediaMensalFaturamento: number;
  mediaMensalDespesas: number;
  mediaMensalPoupanca: number;
  mediaMensalMargemPct: number;

  // Best & Lowest
  melhorMes: CumulativeMonthData;
  piorMes: CumulativeMonthData;

  // Diagnosis & Insights
  statusDiagnostico: SavingsMarginStatus;
  statusLabel: string;
  statusBadgeClass: string;
  tendenciaMargem: 'expansao' | 'estavel' | 'compressao';
  insightTexto: string;
}

/**
 * Standard 12-month baseline data for realistic simulation if transaction history is incomplete.
 * Values reflect the actual financial profile of Yupee (CLT + PJ revenue and expenses).
 */
export const DEFAULT_SAVINGS_HISTORY_12M = [
  { ym: '2025-11', short: 'Nov/25', full: 'Novembro 2025', rec: 4700, desp: 4350 },
  { ym: '2025-12', short: 'Dez/25', full: 'Dezembro 2025', rec: 5200, desp: 4800 },
  { ym: '2026-01', short: 'Jan/26', full: 'Janeiro 2026', rec: 4850, desp: 4500 },
  { ym: '2026-02', short: 'Fev/26', full: 'Fevereiro 2026', rec: 4750, desp: 4380 },
  { ym: '2026-03', short: 'Mar/26', full: 'Março 2026', rec: 4900, desp: 4420 },
  { ym: '2026-04', short: 'Abr/26', full: 'Abril 2026', rec: 4800, desp: 4390 },
  { ym: '2026-05', short: 'Mai/26', full: 'Maio 2026', rec: 4800, desp: 4450 },
  { ym: '2026-06', short: 'Jun/26', full: 'Junho 2026', rec: 4900, desp: 4520 },
  { ym: '2026-07', short: 'Jul/26', full: 'Julho 2026', rec: 4850, desp: 4700 },
  { ym: '2026-08', short: 'Ago/26', full: 'Agosto 2026', rec: 4800, desp: 4650 },
  { ym: '2026-09', short: 'Set/26', full: 'Setembro 2026', rec: 5050, desp: 4820 },
  { ym: '2026-10', short: 'Out/26', full: 'Outubro 2026', rec: 5082.31, desp: 5080.00 },
];

/**
 * Pure function to extract actual monthly totals from transaction array.
 */
export function extractMonthlyTotalsFromTransactions(
  transactions: Transaction[],
  usePjProfitInPf: boolean = true
): Record<string, { receita: number; despesa: number }> {
  const map: Record<string, { receita: number; despesa: number }> = {};

  transactions.forEach(t => {
    if (!t.date) return;
    const ym = t.date.slice(0, 7); // YYYY-MM
    if (!map[ym]) {
      map[ym] = { receita: 0, despesa: 0 };
    }

    const amt = t.amount;
    if (t.type === 'receita' || amt > 0) {
      // If PJ excluded is not included
      if (!usePjProfitInPf && t.jar === 'PJ_EXCLUIDO') {
        return;
      }
      map[ym].receita += Math.abs(amt);
    } else if (t.type === 'despesa' || amt < 0) {
      if (!usePjProfitInPf && t.jar === 'PJ_EXCLUIDO') {
        return;
      }
      map[ym].despesa += Math.abs(amt);
    }
  });

  return map;
}

/**
 * Pure calculation function: Compares month-by-month Cumulative Revenue vs Cumulative Expenses,
 * highlighting the Savings Margin (Margem de Poupança) between them.
 */
export function calculateCumulativeSavingsMetrics(options?: {
  transactions?: Transaction[];
  windowMonths?: 6 | 12;
  usePjProfitInPf?: boolean;
  selectedMonth?: string;
  customHistory?: { ym: string; short: string; full: string; rec: number; desp: number }[];
}): CumulativeSavingsSummary {
  const {
    transactions = [],
    windowMonths = 6,
    usePjProfitInPf = true,
    selectedMonth = '2026-10',
    customHistory,
  } = options || {};

  // Extract from transactions
  const txTotals = extractMonthlyTotalsFromTransactions(transactions, usePjProfitInPf);

  // Current month active dynamic metrics
  let currentMonthIncome = 5082.31;
  let currentMonthExpenses = 5080.00;
  if (transactions.length > 0) {
    const fin = calculateFinancialMetrics(transactions, usePjProfitInPf);
    if (fin.totalReceipts > 0) currentMonthIncome = fin.totalReceipts;
    if (fin.totalPayments > 0) currentMonthExpenses = fin.totalPayments;
  }

  // Base raw series
  const rawList = customHistory || DEFAULT_SAVINGS_HISTORY_12M;

  // Window slice (last 6 or last 12)
  const windowList = windowMonths === 6 ? rawList.slice(-6) : rawList.slice(-12);

  // Compute month by month and accumulate
  let accFaturamento = 0;
  let accDespesas = 0;

  const months: CumulativeMonthData[] = windowList.map((item, idx) => {
    let rec = item.rec;
    let desp = item.desp;

    // If customHistory is explicitly provided without transactions, respect customHistory
    if (!customHistory && transactions.length > 0) {
      if (item.ym === selectedMonth || idx === windowList.length - 1) {
        if (txTotals[item.ym]) {
          rec = txTotals[item.ym].receita > 0 ? txTotals[item.ym].receita : currentMonthIncome;
          desp = txTotals[item.ym].despesa > 0 ? txTotals[item.ym].despesa : currentMonthExpenses;
        } else {
          rec = currentMonthIncome;
          desp = currentMonthExpenses;
        }
      } else if (txTotals[item.ym]) {
        if (txTotals[item.ym].receita > 0) rec = txTotals[item.ym].receita;
        if (txTotals[item.ym].despesa > 0) desp = txTotals[item.ym].despesa;
      }
    } else if (txTotals[item.ym]) {
      if (txTotals[item.ym].receita > 0) rec = txTotals[item.ym].receita;
      if (txTotals[item.ym].despesa > 0) desp = txTotals[item.ym].despesa;
    }

    rec = Math.round(rec * 100) / 100;
    desp = Math.round(desp * 100) / 100;

    const poupancaMensal = Math.round((rec - desp) * 100) / 100;
    const margemMensalPct = rec > 0 ? Math.round((poupancaMensal / rec) * 1000) / 10 : 0;

    accFaturamento = Math.round((accFaturamento + rec) * 100) / 100;
    accDespesas = Math.round((accDespesas + desp) * 100) / 100;
    const margemPoupancaAcumulada = Math.round((accFaturamento - accDespesas) * 100) / 100;
    const margemPoupancaPct = accFaturamento > 0 ? Math.round((margemPoupancaAcumulada / accFaturamento) * 1000) / 10 : 0;

    return {
      monthIndex: idx,
      month: item.short,
      fullName: item.full,
      yearMonth: item.ym,
      receitaMensal: rec,
      despesaMensal: desp,
      poupancaMensal,
      margemMensalPct,
      faturamentoAcumulado: accFaturamento,
      despesasAcumuladas: accDespesas,
      margemPoupancaAcumulada,
      margemPoupancaPct,
      isSuperavit: margemPoupancaAcumulada >= 0,
    };
  });

  const count = months.length;
  const totalFaturamento = months[count - 1]?.faturamentoAcumulado || 0;
  const totalDespesas = months[count - 1]?.despesasAcumuladas || 0;
  const totalPoupanca = months[count - 1]?.margemPoupancaAcumulada || 0;
  const margemPoupancaGeralPct = totalFaturamento > 0 
    ? Math.round((totalPoupanca / totalFaturamento) * 1000) / 10 
    : 0;

  const mediaMensalFaturamento = Math.round((totalFaturamento / count) * 100) / 100;
  const mediaMensalDespesas = Math.round((totalDespesas / count) * 100) / 100;
  const mediaMensalPoupanca = Math.round((totalPoupanca / count) * 100) / 100;
  const mediaMensalMargemPct = mediaMensalFaturamento > 0
    ? Math.round((mediaMensalPoupanca / mediaMensalFaturamento) * 1000) / 10
    : 0;

  // Best and lowest months
  let melhorMes = months[0];
  let piorMes = months[0];

  months.forEach(m => {
    if (m.poupancaMensal > melhorMes.poupancaMensal) melhorMes = m;
    if (m.poupancaMensal < piorMes.poupancaMensal) piorMes = m;
  });

  // Trend detection: Compare the second half savings rate vs first half
  const mid = Math.floor(count / 2);
  const firstHalfSavings = months.slice(0, mid).reduce((acc, m) => acc + m.poupancaMensal, 0);
  const secondHalfSavings = months.slice(mid).reduce((acc, m) => acc + m.poupancaMensal, 0);

  let tendenciaMargem: 'expansao' | 'estavel' | 'compressao' = 'estavel';
  if (secondHalfSavings > firstHalfSavings * 1.08) {
    tendenciaMargem = 'expansao';
  } else if (secondHalfSavings < firstHalfSavings * 0.92) {
    tendenciaMargem = 'compressao';
  }

  // Diagnosis classification
  let statusDiagnostico: SavingsMarginStatus = 'saudavel';
  let statusLabel = 'Margem Saudável';
  let statusBadgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300';
  let insightTexto = '';

  if (margemPoupancaGeralPct >= 18) {
    statusDiagnostico = 'excelente';
    statusLabel = 'Excelente Margem de Poupança';
    statusBadgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300';
    insightTexto = `No período acumulado de ${windowMonths} meses, seu faturamento total superou as despesas em expressivos R$ ${totalPoupanca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, gerando uma margem de poupança acumulada de ${margemPoupancaGeralPct}%.`;
  } else if (margemPoupancaGeralPct >= 8) {
    statusDiagnostico = 'saudavel';
    statusLabel = 'Margem Consistente';
    statusBadgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300';
    insightTexto = `O faturamento total acumulado manteve uma distância segura das despesas, preservando uma margem de poupança líquida de R$ ${totalPoupanca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${margemPoupancaGeralPct}% de retenção média).`;
  } else if (margemPoupancaGeralPct >= 0) {
    statusDiagnostico = 'atencao';
    statusLabel = 'Margem Estreita (Atenção)';
    statusBadgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300';
    insightTexto = `Atenção: A curva de despesas acumuladas está muito próxima ao faturamento total. A margem de poupança acumulada é de ${margemPoupancaGeralPct}% (+R$ ${totalPoupanca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}), deixando pouca folga contra imprevistos.`;
  } else {
    statusDiagnostico = 'critico';
    statusLabel = 'Déficit Acumulado';
    statusBadgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300';
    insightTexto = `Alerta: As despesas totais acumuladas superaram o faturamento no período, resultando em um déficit acumulado de R$ ${Math.abs(totalPoupanca).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. É urgente cortar custos variáveis.`;
  }

  return {
    months,
    windowMonths,
    totalFaturamento,
    totalDespesas,
    totalPoupanca,
    margemPoupancaGeralPct,
    mediaMensalFaturamento,
    mediaMensalDespesas,
    mediaMensalPoupanca,
    mediaMensalMargemPct,
    melhorMes,
    piorMes,
    statusDiagnostico,
    statusLabel,
    statusBadgeClass,
    tendenciaMargem,
    insightTexto,
  };
}
