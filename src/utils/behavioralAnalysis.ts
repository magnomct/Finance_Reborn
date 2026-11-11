import { Transaction } from '../types';
import { formatBRL } from './finance';

export type DayPeriodType = 'manha' | 'tarde' | 'noite';

export interface DayPeriodStat {
  period: DayPeriodType;
  label: string;
  timeRange: string;
  iconName: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  averageTicket: number;
  isPeak: boolean;
  colorClass: string;
  badgeClass: string;
  transactions: Transaction[];
  hourlyDistribution: { hour: number; hourLabel: string; amount: number; count: number }[];
}

export interface MentalLockoutRecommendation {
  recommendedWindow: string; // Ex: '20:00 às 23:59'
  startHour: number;
  endHour: number;
  peakPeriodLabel: string;
  concentrationPercent: number;
  reason: string;
  neuroTrigger: string;
  potentialMonthlySavings: number;
  annualSavings: number;
  guardrails: {
    title: string;
    description: string;
    icon: string;
  }[];
}

export interface BehavioralAnalysisResult {
  hasData: boolean;
  totalLeisureSpent: number;
  transactionCount: number;
  periods: Record<DayPeriodType, DayPeriodStat>;
  periodsList: DayPeriodStat[];
  peakPeriod: DayPeriodStat;
  mentalLockout: MentalLockoutRecommendation;
  behavioralInsights: string[];
}

/**
 * Checks if a transaction is classified as Leisure ('Lazer', 'DIV_10', or variable leisure)
 */
export function isLeisureExpense(tx: Transaction): boolean {
  // Only negative or despesa
  if (tx.type !== 'despesa' && tx.amount >= 0) {
    return false;
  }

  // 6-Potes jar for leisure / fun
  if (tx.jar === 'DIV_10') {
    return true;
  }

  const category = (tx.category || '').toLowerCase().trim();
  const description = (tx.description || '').toLowerCase().trim();

  // Match category
  if (
    category.includes('lazer') ||
    category.includes('diversão') ||
    category.includes('diversao') ||
    category.includes('entretenimento') ||
    category.includes('variável') ||
    category.includes('variavel') ||
    category.includes('estilo')
  ) {
    return true;
  }

  // Match keywords in description
  if (
    description.includes('lazer') ||
    description.includes('cinema') ||
    description.includes('restaurante') ||
    description.includes('bar ') ||
    description.includes('bar/') ||
    description.includes('balada') ||
    description.includes('delivery') ||
    description.includes('ifood') ||
    description.includes('churrasco') ||
    description.includes('lanche') ||
    description.includes('happy hour') ||
    description.includes('cafeteria') ||
    description.includes('streaming') ||
    description.includes('jogos') ||
    description.includes('game')
  ) {
    return true;
  }

  return false;
}

/**
 * Stable string hash to produce a deterministic number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Extracts or infers the hour of the day (0-23) for a transaction
 */
export function extractTransactionHour(tx: Transaction): number {
  // 1. Explicit time field (e.g. '21:30' or '14:00')
  if (tx.time && typeof tx.time === 'string') {
    const match = tx.time.match(/^(\d{1,2})(?::(\d{2}))?/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 23) {
        return parsed;
      }
    }
  }

  // 2. Date string with ISO or timestamp (e.g. '2026-10-22T21:30:00' or '2026-10-22 21:30')
  if (tx.date && typeof tx.date === 'string' && (tx.date.includes('T') || tx.date.includes(' '))) {
    const timePart = tx.date.split(/[T ]/)[1];
    if (timePart) {
      const match = timePart.match(/^(\d{1,2})/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 23) {
          return parsed;
        }
      }
    }
  }

  // 3. Time hints inside description or notes (e.g. 'às 21h', '21:30', '14h')
  const textToScan = `${tx.description} ${tx.notes || ''}`.toLowerCase();
  const timeHintMatch = textToScan.match(/(?:às|as|\b)\s*(\d{1,2})\s*(?:h|:|hrs)/i);
  if (timeHintMatch) {
    const parsed = parseInt(timeHintMatch[1], 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 23) {
      return parsed;
    }
  }

  // 4. Semantic contextual defaults
  if (textToScan.includes('café') || textToScan.includes('padaria') || textToScan.includes('manhã')) {
    return 9;
  }
  if (textToScan.includes('almoço') || textToScan.includes('tarde') || textToScan.includes('cafeteria')) {
    return 14;
  }
  if (
    textToScan.includes('jantar') ||
    textToScan.includes('happy hour') ||
    textToScan.includes('bar') ||
    textToScan.includes('delivery') ||
    textToScan.includes('ifood') ||
    textToScan.includes('cinema') ||
    textToScan.includes('balada') ||
    textToScan.includes('noite')
  ) {
    return 21;
  }

  // 5. Deterministic fallback for leisure: cluster around realistic evening leisure hours (19:00 - 22:00)
  const h = hashString(tx.id || tx.description);
  return 19 + (h % 4);
}

/**
 * Classifies an hour (0-23) into one of the 3 requested periods:
 * - Manhã: 06:00 às 11:59 (6h - 11h)
 * - Tarde: 12:00 às 17:59 (12h - 17h)
 * - Noite: 18:00 às 05:59 (18h - 23h e 00h - 05h)
 */
export function getTimePeriodFromHour(hour: number): DayPeriodType {
  const normalizedHour = Math.min(23, Math.max(0, Math.floor(hour)));
  if (normalizedHour >= 6 && normalizedHour < 12) {
    return 'manha';
  }
  if (normalizedHour >= 12 && normalizedHour < 18) {
    return 'tarde';
  }
  return 'noite';
}

/**
 * Calculates behavioral leisure analysis crossing transactions with time of day
 */
export function calculateBehavioralAnalysis(transactions: Transaction[]): BehavioralAnalysisResult {
  const leisureTxs = transactions.filter(isLeisureExpense);

  const initialPeriods: Record<DayPeriodType, DayPeriodStat> = {
    manha: {
      period: 'manha',
      label: 'Manhã',
      timeRange: '06:00 - 11:59',
      iconName: 'Sun',
      totalAmount: 0,
      transactionCount: 0,
      percentage: 0,
      averageTicket: 0,
      isPeak: false,
      colorClass: 'from-amber-500 to-yellow-400',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      transactions: [],
      hourlyDistribution: Array.from({ length: 6 }, (_, i) => ({
        hour: 6 + i,
        hourLabel: `${(6 + i).toString().padStart(2, '0')}:00`,
        amount: 0,
        count: 0
      }))
    },
    tarde: {
      period: 'tarde',
      label: 'Tarde',
      timeRange: '12:00 - 17:59',
      iconName: 'CloudSun',
      totalAmount: 0,
      transactionCount: 0,
      percentage: 0,
      averageTicket: 0,
      isPeak: false,
      colorClass: 'from-blue-500 to-cyan-400',
      badgeClass: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
      transactions: [],
      hourlyDistribution: Array.from({ length: 6 }, (_, i) => ({
        hour: 12 + i,
        hourLabel: `${(12 + i).toString().padStart(2, '0')}:00`,
        amount: 0,
        count: 0
      }))
    },
    noite: {
      period: 'noite',
      label: 'Noite',
      timeRange: '18:00 - 05:59',
      iconName: 'Moon',
      totalAmount: 0,
      transactionCount: 0,
      percentage: 0,
      averageTicket: 0,
      isPeak: false,
      colorClass: 'from-purple-600 to-indigo-500',
      badgeClass: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
      transactions: [],
      hourlyDistribution: [
        18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5
      ].map(h => ({
        hour: h,
        hourLabel: `${h.toString().padStart(2, '0')}:00`,
        amount: 0,
        count: 0
      }))
    }
  };

  let totalLeisureSpent = 0;

  for (const tx of leisureTxs) {
    const positiveVal = Math.abs(tx.amount);
    totalLeisureSpent += positiveVal;

    const hour = extractTransactionHour(tx);
    const periodKey = getTimePeriodFromHour(hour);
    const stat = initialPeriods[periodKey];

    stat.totalAmount += positiveVal;
    stat.transactionCount += 1;
    stat.transactions.push(tx);

    const hourSlot = stat.hourlyDistribution.find(h => h.hour === hour);
    if (hourSlot) {
      hourSlot.amount += positiveVal;
      hourSlot.count += 1;
    }
  }

  // Calculate percentages and average tickets
  let peakPeriodKey: DayPeriodType = 'noite';
  let maxAmount = 0;

  if (totalLeisureSpent > 0) {
    for (const k of ['manha', 'tarde', 'noite'] as DayPeriodType[]) {
      const stat = initialPeriods[k];
      stat.percentage = Math.round((stat.totalAmount / totalLeisureSpent) * 100);
      stat.averageTicket = stat.transactionCount > 0 ? stat.totalAmount / stat.transactionCount : 0;

      if (stat.totalAmount > maxAmount) {
        maxAmount = stat.totalAmount;
        peakPeriodKey = k;
      }
    }

    initialPeriods[peakPeriodKey].isPeak = true;
  } else {
    for (const k of ['manha', 'tarde', 'noite'] as DayPeriodType[]) {
      initialPeriods[k].percentage = 0;
      initialPeriods[k].averageTicket = 0;
      initialPeriods[k].isPeak = false;
    }
  }

  const peakPeriod = initialPeriods[peakPeriodKey];

  // Derive Mental Lockout Window
  let startHour = 20;
  let endHour = 24;
  let recommendedWindow = '20:00 às 23:59';
  let neuroTrigger = 'Fadiga Decisória & Busca por Dopamina Noturna';
  let reason =
    'Ao final do dia, a exaustão cognitiva reduz o autocontrole em até 60%, facilitando pedidos por impulso em delivery, compras de e-commerce e pequenos agrados compensatórios.';

  if (peakPeriodKey === 'tarde') {
    startHour = 14;
    endHour = 17;
    recommendedWindow = '14:00 às 17:00';
    neuroTrigger = 'Queda de Energia Pós-Almoço & Tédio no Trabalho';
    reason =
      'O pico de compras à tarde geralmente decorre de pausas para descompressão no trabalho (cafés caros, lanches rápidos e navegação desatenta em marketplaces).';
  } else if (peakPeriodKey === 'manha') {
    startHour = 8;
    endHour = 11;
    recommendedWindow = '08:00 às 11:00';
    neuroTrigger = 'Aceleração Matinal & Compras por Rotina Automática';
    reason =
      'Compras matinais frequentes ocorrem por conveniência automatizada sem conferência prévia do saldo do pote de Lazer (DIV_10).';
  }

  // Potential monthly savings: avoiding 40% of impulse purchases in the peak period
  const potentialMonthlySavings = Math.round((peakPeriod.totalAmount * 0.4) * 100) / 100;
  const annualSavings = potentialMonthlySavings * 12;

  const mentalLockout: MentalLockoutRecommendation = {
    recommendedWindow,
    startHour,
    endHour,
    peakPeriodLabel: peakPeriod.label,
    concentrationPercent: peakPeriod.percentage,
    neuroTrigger,
    reason,
    potentialMonthlySavings,
    annualSavings,
    guardrails: [
      {
        title: 'Regra das 24 Horas',
        description: 'Adicione o item à lista de desejos ou carrinho e só decida a compra após as 09:00 do dia seguinte.',
        icon: 'Hourglass'
      },
      {
        title: 'Trava Temporária de Cartão Virtual',
        description: `Bloqueie o cartão virtual ou defina limite noturno reduzido no app do C6/Inter entre ${recommendedWindow}.`,
        icon: 'CreditCard'
      },
      {
        title: 'Silenciar Notificações de Delivery',
        description: 'Desative alertas push de cupons relâmpago de iFood/delivery para cortar gatilhos visuais de fome emocional.',
        icon: 'BellOff'
      }
    ]
  };

  const behavioralInsights = [
    `${peakPeriod.percentage}% dos gastos com lazer concentram-se no período da ${peakPeriod.label} (${peakPeriod.timeRange}).`,
    `Ticket médio na ${peakPeriod.label}: ${formatBRL(peakPeriod.averageTicket)} por compra impulsiva.`,
    `Ao bloquear compras impulsivas entre ${recommendedWindow}, você pode poupar até ${formatBRL(potentialMonthlySavings)} por mês.`
  ];

  const periodsList: DayPeriodStat[] = [
    initialPeriods.manha,
    initialPeriods.tarde,
    initialPeriods.noite
  ];

  return {
    hasData: leisureTxs.length > 0,
    totalLeisureSpent,
    transactionCount: leisureTxs.length,
    periods: initialPeriods,
    periodsList,
    peakPeriod,
    mentalLockout,
    behavioralInsights
  };
}
