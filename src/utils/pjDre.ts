import { Transaction } from '../types';

export interface DreExpenseDetail {
  id: string;
  description: string;
  amount: number;
  category: string;
  isFixed: boolean;
}

export interface MonthDreBreakdown {
  month: string; // YYYY-MM
  monthLabel: string; // e.g. "Outubro/2026"
  grossRevenue: number; // Receita Operacional Bruta (Faturamento)
  dasTaxes: number; // Tributos DAS Simples Nacional
  netRevenue: number; // Receita Líquida (Bruta - DAS)
  fixedExpenses: number; // Despesas Fixas (Convênio Médico, Contabilidade, Assinaturas)
  variableExpenses: number; // Despesas Variáveis (Tarifas, transporte, alimentação PJ, custos eventuais)
  healthInsurance: number; // Convênio Médico PJ
  bankAndSoftwareFees: number; // Tarifas bancárias, licenças, softwares
  otherExpenses: number; // Outros custos operacionais PJ
  totalOperatingExpenses: number; // Soma de despesas operacionais (Fixas + Variáveis)
  netProfit: number; // Lucro Líquido (Receita Líquida - Despesas Operacionais)
  netMarginPct: number; // (Lucro Líquido / Receita Bruta) * 100
  effectiveTaxRatePct: number; // (DAS / Receita Bruta) * 100
  transactionCount: number;
  fixedDetails?: DreExpenseDetail[];
  variableDetails?: DreExpenseDetail[];
}

export type DreLineCategory = 'receita' | 'deducao' | 'subtotal' | 'despesa' | 'subdespesa' | 'resultado' | 'indicador';
export type VariancePolarity = 'favorable' | 'unfavorable' | 'neutral';

export interface DreLineItem {
  id: string;
  code: string; // e.g. "1.", "2.", "2.1", "3.", "4.", "4.1", "4.2", "5.", "6."
  title: string;
  category: DreLineCategory;
  isSubItem?: boolean;
  isSubtotal?: boolean;
  isHighlighted?: boolean;
  currentMonthValue: number;
  avg3MonthsValue: number;
  nominalVariance: number; // current - avg3
  percentVariance: number; // ((current - avg3) / avg3) * 100
  isPercentage?: boolean; // For Margem Líquida
  polarity: VariancePolarity;
  note?: string;
}

export interface PjDreComparisonResult {
  referenceMonth: string; // YYYY-MM
  referenceMonthLabel: string;
  precedingMonths: string[]; // YYYY-MM[]
  precedingPeriodLabel: string; // e.g. "Média Jul - Set/2026"
  currentMonth: MonthDreBreakdown;
  avg3Months: MonthDreBreakdown;
  lines: DreLineItem[];
  kpis: {
    revenueVariance: { nominal: number; percent: number; polarity: VariancePolarity };
    taxVariance: { nominal: number; percent: number; polarity: VariancePolarity };
    expenseVariance: { nominal: number; percent: number; polarity: VariancePolarity };
    profitVariance: { nominal: number; percent: number; polarity: VariancePolarity };
    marginDiffPoints: number; // p.p. difference
  };
  insights: string[];
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_SHORT_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * Formats YYYY-MM into full label like "Outubro / 2026"
 */
export function formatMonthLabel(yearMonth: string, short: boolean = false): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (isNaN(year) || isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return yearMonth;
  }
  const name = short ? MONTH_SHORT_PT[monthIdx] : MONTH_NAMES_PT[monthIdx];
  return `${name}/${year}`;
}

/**
 * Returns previous N months in chronological order.
 * E.g. for ('2026-10', 3) returns ['2026-07', '2026-08', '2026-09'].
 */
export function getPrecedingMonths(referenceYearMonth: string, count: number = 3): string[] {
  const [yearStr, monthStr] = referenceYearMonth.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month)) {
    year = 2026;
    month = 10;
  }

  const result: string[] = [];
  for (let i = count; i >= 1; i--) {
    let targetMonth = month - i;
    let targetYear = year;
    while (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    const formattedMonth = String(targetMonth).padStart(2, '0');
    result.push(`${targetYear}-${formattedMonth}`);
  }
  return result;
}

export const DEFAULT_PJ_HISTORY: Record<string, Partial<MonthDreBreakdown>> = {
  '2026-07': {
    grossRevenue: 2850.00,
    dasTaxes: 160.00,
    healthInsurance: 1210.00,
    bankAndSoftwareFees: 0,
    otherExpenses: 0,
    transactionCount: 3
  },
  '2026-08': {
    grossRevenue: 2950.00,
    dasTaxes: 165.50,
    healthInsurance: 1210.00,
    bankAndSoftwareFees: 35.00,
    otherExpenses: 0,
    transactionCount: 4
  },
  '2026-09': {
    grossRevenue: 3000.00,
    dasTaxes: 168.00,
    healthInsurance: 1296.45,
    bankAndSoftwareFees: 0,
    otherExpenses: 0,
    transactionCount: 3
  }
};

/**
 * Extracts and categorizes PJ transactions for a specific month (YYYY-MM).
 */
export function calculateMonthDre(
  transactions: Transaction[],
  yearMonth: string
): MonthDreBreakdown {
  const monthTransactions = transactions.filter(t => {
    const isPj = t.costCenter === 'PJ' || t.account === 'Inter PJ' || t.jar === 'PJ_EXCLUIDO';
    const matchesMonth = t.date && t.date.startsWith(yearMonth);
    return isPj && matchesMonth;
  });

  // If no transactions exist for a historical month, use default baseline history if available
  if (monthTransactions.length === 0 && DEFAULT_PJ_HISTORY[yearMonth]) {
    const hist = DEFAULT_PJ_HISTORY[yearMonth];
    const grossRevenue = hist.grossRevenue || 0;
    const dasTaxes = hist.dasTaxes || 0;
    const healthInsurance = hist.healthInsurance || 0;
    const bankAndSoftwareFees = hist.bankAndSoftwareFees || 0;
    const otherExpenses = hist.otherExpenses || 0;
    const fixedExpenses = healthInsurance;
    const variableExpenses = bankAndSoftwareFees + otherExpenses;
    const netRevenue = Math.max(0, grossRevenue - dasTaxes);
    const totalOperatingExpenses = fixedExpenses + variableExpenses;
    const netProfit = netRevenue - totalOperatingExpenses;
    const netMarginPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
    const effectiveTaxRatePct = grossRevenue > 0 ? (dasTaxes / grossRevenue) * 100 : 0;

    return {
      month: yearMonth,
      monthLabel: formatMonthLabel(yearMonth),
      grossRevenue,
      dasTaxes,
      netRevenue,
      fixedExpenses,
      variableExpenses,
      healthInsurance,
      bankAndSoftwareFees,
      otherExpenses,
      totalOperatingExpenses,
      netProfit,
      netMarginPct,
      effectiveTaxRatePct,
      transactionCount: hist.transactionCount || 0,
      fixedDetails: [
        { id: `hist-health-${yearMonth}`, description: 'Convênio Médico PJ', amount: healthInsurance, category: 'Saúde & Benefícios', isFixed: true }
      ],
      variableDetails: bankAndSoftwareFees > 0 ? [
        { id: `hist-fees-${yearMonth}`, description: 'Tarifas Bancárias & Softwares', amount: bankAndSoftwareFees, category: 'Tarifas Bancárias', isFixed: false }
      ] : []
    };
  }

  let grossRevenue = 0;
  let dasTaxes = 0;
  let healthInsurance = 0;
  let bankAndSoftwareFees = 0;
  let otherExpenses = 0;
  let fixedExpenses = 0;
  let variableExpenses = 0;
  const fixedDetails: DreExpenseDetail[] = [];
  const variableDetails: DreExpenseDetail[] = [];

  for (const t of monthTransactions) {
    const desc = (t.description || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    const amountAbs = Math.abs(t.amount);

    if (t.type === 'receita') {
      grossRevenue += amountAbs;
    } else if (t.type === 'despesa') {
      // 1. Tributos DAS Simples Nacional (Dedução da Receita)
      if (desc.includes('das') || desc.includes('simples') || desc.includes('imposto') || cat.includes('imposto')) {
        dasTaxes += amountAbs;
      }
      // 2. Despesas Fixas (Convênio Médico / Saúde Corporativa)
      else if (desc.includes('convênio') || desc.includes('convenio') || desc.includes('saúde') || desc.includes('saude') || cat.includes('saúde') || cat.includes('saude')) {
        healthInsurance += amountAbs;
        fixedExpenses += amountAbs;
        fixedDetails.push({
          id: t.id,
          description: t.description || 'Convênio Médico PJ',
          amount: amountAbs,
          category: 'Saúde & Benefícios',
          isFixed: true
        });
      }
      // 3. Despesas Fixas (Contabilidade, Assinaturas Fixas de Software, Licenças)
      else if (desc.includes('contabilidade') || desc.includes('software fixo') || desc.includes('assinatura') || desc.includes('hospedagem') || cat.includes('contabilidade')) {
        bankAndSoftwareFees += amountAbs;
        fixedExpenses += amountAbs;
        fixedDetails.push({
          id: t.id,
          description: t.description || 'Software / Contabilidade Fixa',
          amount: amountAbs,
          category: 'Contabilidade & Softwares',
          isFixed: true
        });
      }
      // 4. Despesas Variáveis (Tarifas Bancárias por Operação, Manutenção Inter PJ)
      else if (desc.includes('tarifa') || desc.includes('banco') || desc.includes('software') || desc.includes('inter') || cat.includes('tarifa')) {
        bankAndSoftwareFees += amountAbs;
        variableExpenses += amountAbs;
        variableDetails.push({
          id: t.id,
          description: t.description || 'Tarifa Bancária Inter PJ',
          amount: amountAbs,
          category: 'Tarifas Bancárias',
          isFixed: false
        });
      }
      // 5. Outras Despesas Variáveis (Deslocamento, alimentação PJ, equipamentos eventuais)
      else {
        otherExpenses += amountAbs;
        variableExpenses += amountAbs;
        variableDetails.push({
          id: t.id,
          description: t.description || 'Outros Custos PJ',
          amount: amountAbs,
          category: cat || 'Despesas Variáveis',
          isFixed: false
        });
      }
    }
  }

  const netRevenue = Math.max(0, grossRevenue - dasTaxes);
  const totalOperatingExpenses = fixedExpenses + variableExpenses;
  const netProfit = netRevenue - totalOperatingExpenses;
  const netMarginPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
  const effectiveTaxRatePct = grossRevenue > 0 ? (dasTaxes / grossRevenue) * 100 : 0;

  return {
    month: yearMonth,
    monthLabel: formatMonthLabel(yearMonth),
    grossRevenue,
    dasTaxes,
    netRevenue,
    fixedExpenses,
    variableExpenses,
    healthInsurance,
    bankAndSoftwareFees,
    otherExpenses,
    totalOperatingExpenses,
    netProfit,
    netMarginPct,
    effectiveTaxRatePct,
    transactionCount: monthTransactions.length,
    fixedDetails,
    variableDetails
  };
}

/**
 * Calculates percentage variation safely.
 * Returns percentage change ((current - avg3) / avg3) * 100.
 */
export function calculatePercentVariance(current: number, baseline: number): number {
  if (Math.abs(baseline) < 0.0001) {
    if (Math.abs(current) < 0.0001) return 0;
    return current > 0 ? 100 : -100;
  }
  return ((current - baseline) / Math.abs(baseline)) * 100;
}

/**
 * Determines financial polarity:
 * - For revenues/margins/profits: higher is favorable.
 * - For expenses/taxes: lower is favorable.
 */
export function determinePolarity(
  category: DreLineCategory,
  nominalVariance: number
): VariancePolarity {
  const threshold = 0.001;
  if (Math.abs(nominalVariance) <= threshold) {
    return 'neutral';
  }

  if (category === 'receita' || category === 'subtotal' || category === 'resultado' || category === 'indicador') {
    return nominalVariance > 0 ? 'favorable' : 'unfavorable';
  }

  // Deductions and Expenses: lower is favorable
  return nominalVariance < 0 ? 'favorable' : 'unfavorable';
}

/**
 * Calculates comparative DRE between the reference month and the rolling 3 preceding months.
 */
export function calculatePjDreComparison(
  transactions: Transaction[],
  referenceMonth: string = '2026-10',
  monthsCount: number = 3
): PjDreComparisonResult {
  const preceding = getPrecedingMonths(referenceMonth, monthsCount);
  const currentMonth = calculateMonthDre(transactions, referenceMonth);

  // Calculate preceding months breakdowns
  const precedingBreakdowns = preceding.map(m => calculateMonthDre(transactions, m));

  // Compute 3-month averages
  const denominator = precedingBreakdowns.length || 1;
  const avgGrossRevenue = precedingBreakdowns.reduce((sum, b) => sum + b.grossRevenue, 0) / denominator;
  const avgDasTaxes = precedingBreakdowns.reduce((sum, b) => sum + b.dasTaxes, 0) / denominator;
  const avgNetRevenue = precedingBreakdowns.reduce((sum, b) => sum + b.netRevenue, 0) / denominator;
  const avgHealthInsurance = precedingBreakdowns.reduce((sum, b) => sum + b.healthInsurance, 0) / denominator;
  const avgBankAndSoftwareFees = precedingBreakdowns.reduce((sum, b) => sum + b.bankAndSoftwareFees, 0) / denominator;
  const avgOtherExpenses = precedingBreakdowns.reduce((sum, b) => sum + b.otherExpenses, 0) / denominator;
  const avgFixedExpenses = precedingBreakdowns.reduce((sum, b) => sum + (b.fixedExpenses || 0), 0) / denominator;
  const avgVariableExpenses = precedingBreakdowns.reduce((sum, b) => sum + (b.variableExpenses || 0), 0) / denominator;
  const avgTotalOperatingExpenses = precedingBreakdowns.reduce((sum, b) => sum + b.totalOperatingExpenses, 0) / denominator;
  const avgNetProfit = precedingBreakdowns.reduce((sum, b) => sum + b.netProfit, 0) / denominator;
  const avgNetMarginPct = avgGrossRevenue > 0 ? (avgNetProfit / avgGrossRevenue) * 100 : 0;
  const avgEffectiveTaxRatePct = avgGrossRevenue > 0 ? (avgDasTaxes / avgGrossRevenue) * 100 : 0;

  const avg3Months: MonthDreBreakdown = {
    month: 'AVG-3M',
    monthLabel: `Média (${monthsCount}M)`,
    grossRevenue: avgGrossRevenue,
    dasTaxes: avgDasTaxes,
    netRevenue: avgNetRevenue,
    healthInsurance: avgHealthInsurance,
    bankAndSoftwareFees: avgBankAndSoftwareFees,
    otherExpenses: avgOtherExpenses,
    fixedExpenses: avgFixedExpenses,
    variableExpenses: avgVariableExpenses,
    totalOperatingExpenses: avgTotalOperatingExpenses,
    netProfit: avgNetProfit,
    netMarginPct: avgNetMarginPct,
    effectiveTaxRatePct: avgEffectiveTaxRatePct,
    transactionCount: Math.round(precedingBreakdowns.reduce((sum, b) => sum + b.transactionCount, 0) / denominator)
  };

  // Build the lines of DRE
  const createLine = (
    id: string,
    code: string,
    title: string,
    category: DreLineCategory,
    currVal: number,
    avgVal: number,
    options: {
      isSubItem?: boolean;
      isSubtotal?: boolean;
      isHighlighted?: boolean;
      isPercentage?: boolean;
      note?: string;
    } = {}
  ): DreLineItem => {
    const nominalVariance = currVal - avgVal;
    const percentVariance = options.isPercentage
      ? nominalVariance // Percentage points difference (p.p.)
      : calculatePercentVariance(currVal, avgVal);
    const polarity = determinePolarity(category, nominalVariance);

    return {
      id,
      code,
      title,
      category,
      isSubItem: options.isSubItem,
      isSubtotal: options.isSubtotal,
      isHighlighted: options.isHighlighted,
      isPercentage: options.isPercentage,
      currentMonthValue: currVal,
      avg3MonthsValue: avgVal,
      nominalVariance,
      percentVariance,
      polarity,
      note: options.note
    };
  };

  const lines: DreLineItem[] = [
    createLine(
      'receita_bruta',
      '1.',
      'Receita Bruta Operacional (Faturamento de Serviços)',
      'receita',
      currentMonth.grossRevenue,
      avg3Months.grossRevenue,
      { isHighlighted: true, note: 'Notas fiscais de serviços de TI / Consultoria' }
    ),
    createLine(
      'das_tributos',
      '2.',
      '(-) Deduções da Receita Bruta (DAS Simples Nacional)',
      'deducao',
      currentMonth.dasTaxes,
      avg3Months.dasTaxes,
      { isSubItem: false, note: 'Alíquota efetiva Simples Nacional Anexo III' }
    ),
    createLine(
      'receita_liquida',
      '3.',
      '(=) Receita Operacional Líquida',
      'subtotal',
      currentMonth.netRevenue,
      avg3Months.netRevenue,
      { isSubtotal: true, note: 'Receita Bruta deduzida de impostos diretos' }
    ),
    createLine(
      'despesas_operacionais_total',
      '4.',
      '(-) Despesas Operacionais Totais',
      'despesa',
      currentMonth.totalOperatingExpenses,
      avg3Months.totalOperatingExpenses,
      { isHighlighted: true, note: 'Custos recorrentes da operação PJ' }
    ),
    createLine(
      'convenio_saude',
      '4.1',
      'Convênio Médico Empresarial',
      'subdespesa',
      currentMonth.healthInsurance,
      avg3Months.healthInsurance,
      { isSubItem: true, note: 'Plano de saúde corporativo titular e dependentes' }
    ),
    createLine(
      'tarifas_softwares',
      '4.2',
      'Tarifas Bancárias & Softwares de Gestão',
      'subdespesa',
      currentMonth.bankAndSoftwareFees,
      avg3Months.bankAndSoftwareFees,
      { isSubItem: true, note: 'Custos de manutenção de conta PJ e ferramentas' }
    )
  ];

  if (currentMonth.otherExpenses > 0 || avg3Months.otherExpenses > 0) {
    lines.push(
      createLine(
        'outras_despesas',
        '4.3',
        'Outros Custos Operacionais',
        'subdespesa',
        currentMonth.otherExpenses,
        avg3Months.otherExpenses,
        { isSubItem: true, note: 'Despesas diversas e eventuais da PJ' }
      )
    );
  }

  lines.push(
    createLine(
      'lucro_liquido',
      '5.',
      '(=) Lucro Líquido do Exercício (Disponível p/ Distribuição PF)',
      'resultado',
      currentMonth.netProfit,
      avg3Months.netProfit,
      { isHighlighted: true, isSubtotal: true, note: 'Saldo isento disponível para transferência à PF' }
    ),
    createLine(
      'margem_liquida',
      '6.',
      'Margem Líquida Operacional (%)',
      'indicador',
      currentMonth.netMarginPct,
      avg3Months.netMarginPct,
      { isPercentage: true, isHighlighted: true, note: 'Percentual do faturamento convertido em lucro líquido' }
    )
  );

  // Preceding period label
  const firstPreceding = preceding[0];
  const lastPreceding = preceding[preceding.length - 1];
  const precedingPeriodLabel = `Média ${formatMonthLabel(firstPreceding, true)} a ${formatMonthLabel(lastPreceding, true)}`;

  // Generate Automated Insights
  const insights: string[] = [];
  const revVarPct = calculatePercentVariance(currentMonth.grossRevenue, avg3Months.grossRevenue);
  const profitVarPct = calculatePercentVariance(currentMonth.netProfit, avg3Months.netProfit);
  const expVarPct = calculatePercentVariance(currentMonth.totalOperatingExpenses, avg3Months.totalOperatingExpenses);

  if (revVarPct > 1) {
    insights.push(`Faturamento do mês cresceu +${revVarPct.toFixed(1)}% acima da média trimestral, impulsionando a geração de caixa.`);
  } else if (revVarPct < -1) {
    insights.push(`Faturamento recuou ${revVarPct.toFixed(1)}% em relação à média dos últimos 3 meses.`);
  } else {
    insights.push(`Faturamento manteve-se estável em linha com a média histórica recente.`);
  }

  if (expVarPct > 3) {
    insights.push(`Custos operacionais aumentaram +${expVarPct.toFixed(1)}% comparados à média dos últimos 3 meses. Atenção aos reajustes de benefícios.`);
  } else if (expVarPct < -3) {
    insights.push(`Custos operacionais foram reduzidos em ${Math.abs(expVarPct).toFixed(1)}% abaixo da média trimestral.`);
  }

  if (profitVarPct > 0) {
    insights.push(`O Lucro Líquido livre para distribuição à PF superou a média em +${profitVarPct.toFixed(1)}%.`);
  } else {
    insights.push(`Lucro Líquido do mês ficou ${Math.abs(profitVarPct).toFixed(1)}% abaixo da média trimestral.`);
  }

  return {
    referenceMonth,
    referenceMonthLabel: formatMonthLabel(referenceMonth),
    precedingMonths: preceding,
    precedingPeriodLabel,
    currentMonth,
    avg3Months,
    lines,
    kpis: {
      revenueVariance: {
        nominal: currentMonth.grossRevenue - avg3Months.grossRevenue,
        percent: revVarPct,
        polarity: determinePolarity('receita', currentMonth.grossRevenue - avg3Months.grossRevenue)
      },
      taxVariance: {
        nominal: currentMonth.dasTaxes - avg3Months.dasTaxes,
        percent: calculatePercentVariance(currentMonth.dasTaxes, avg3Months.dasTaxes),
        polarity: determinePolarity('deducao', currentMonth.dasTaxes - avg3Months.dasTaxes)
      },
      expenseVariance: {
        nominal: currentMonth.totalOperatingExpenses - avg3Months.totalOperatingExpenses,
        percent: expVarPct,
        polarity: determinePolarity('despesa', currentMonth.totalOperatingExpenses - avg3Months.totalOperatingExpenses)
      },
      profitVariance: {
        nominal: currentMonth.netProfit - avg3Months.netProfit,
        percent: profitVarPct,
        polarity: determinePolarity('resultado', currentMonth.netProfit - avg3Months.netProfit)
      },
      marginDiffPoints: currentMonth.netMarginPct - avg3Months.netMarginPct
    },
    insights
  };
}

/**
 * Returns distinct available YYYY-MM months from PJ transactions.
 */
export function getAvailablePjMonths(transactions: Transaction[], includeHistory: boolean = true): string[] {
  const monthsSet = new Set<string>();
  if (includeHistory) {
    Object.keys(DEFAULT_PJ_HISTORY).forEach(m => monthsSet.add(m));
    monthsSet.add('2026-10');
  }

  transactions.forEach(t => {
    const isPj = t.costCenter === 'PJ' || t.account === 'Inter PJ' || t.jar === 'PJ_EXCLUIDO';
    if (isPj && t.date && t.date.length >= 7) {
      monthsSet.add(t.date.substring(0, 7));
    }
  });

  return Array.from(monthsSet).sort().reverse();
}
