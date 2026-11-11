import { DreamGoal, DreamSortOption, DreamPriority } from '../types';
import { getCalendarDaysRemaining, formatTargetDate } from './dreamCountdown';
import { formatBRL } from './finance';

export interface DreamDonutSlice {
  id: string;
  title: string;
  current: number;
  target: number;
  monthlyDeposit: number;
  completionPct: number; // (current / target) * 100
  fraction: number; // share of total accumulated
  startFraction: number;
  endFraction: number;
  colorHex: string;
  category: string;
  targetDate?: string;
  suggestedDeposit: number;
  monthsRemaining: number;
}

export const DREAM_COLORS = [
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

/**
 * Calculates remaining months between reference date and target date string (YYYY-MM-DD or YYYY-MM)
 */
export function calculateRemainingMonths(
  targetDateStr: string,
  referenceDateInput?: Date | string
): number {
  if (!targetDateStr) return 0;

  const ref = referenceDateInput 
    ? (typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : referenceDateInput)
    : new Date();

  const [tYear, tMonth, tDay] = targetDateStr.split('-').map(Number);
  if (!tYear || !tMonth) return 0;

  const refYear = ref.getFullYear();
  const refMonth = ref.getMonth() + 1; // 1-12
  const refDay = ref.getDate();

  // Difference in calendar months
  const monthDiff = (tYear - refYear) * 12 + (tMonth - refMonth);

  if (monthDiff < 0) return 0;
  if (monthDiff === 0) {
    // Same month: if deadline day has passed, 0; otherwise 1 month remaining
    if (tDay && tDay < refDay) return 0;
    return 1;
  }

  // If there are future months, count current month + remaining full months
  return monthDiff + 1;
}

/**
 * Calculates suggested monthly deposit to reach target by targetDate
 */
export function calculateSuggestedMonthlyDeposit(
  target: number,
  current: number,
  targetDateStr?: string,
  referenceDateInput?: Date | string
): {
  remainingAmount: number;
  remainingMonths: number;
  suggestedMonthlyDeposit: number;
  isCompleted: boolean;
  isPastDeadline: boolean;
} {
  const remainingAmount = Math.max(0, target - current);
  const isCompleted = remainingAmount === 0;

  if (isCompleted) {
    return {
      remainingAmount: 0,
      remainingMonths: 0,
      suggestedMonthlyDeposit: 0,
      isCompleted: true,
      isPastDeadline: false,
    };
  }

  if (!targetDateStr) {
    return {
      remainingAmount,
      remainingMonths: 0,
      suggestedMonthlyDeposit: 0,
      isCompleted: false,
      isPastDeadline: false,
    };
  }

  const remainingMonths = calculateRemainingMonths(targetDateStr, referenceDateInput);

  if (remainingMonths <= 0) {
    return {
      remainingAmount,
      remainingMonths: 0,
      suggestedMonthlyDeposit: remainingAmount,
      isCompleted: false,
      isPastDeadline: true,
    };
  }

  // Recommended monthly contribution rounded to 2 decimals
  const suggestedMonthlyDeposit = Math.round((remainingAmount / remainingMonths) * 100) / 100;

  return {
    remainingAmount,
    remainingMonths,
    suggestedMonthlyDeposit,
    isCompleted: false,
    isPastDeadline: false,
  };
}

export interface ContributionSuggestionResult {
  remainingAmount: number;
  remainingMonths: number;
  remainingDays: number;
  suggestedMonthlyDeposit: number;
  isCompleted: boolean;
  hasTargetDate: boolean;
  isPastDeadline: boolean;
  formattedTargetDate: string;
  differenceVsCurrentDeposit: number;
  status: 'completed' | 'no_deadline' | 'past_deadline' | 'on_track' | 'needs_increase' | 'can_decrease';
  recommendationMessage: string;
  // 6 Potes Integration
  targetJar: 'PLP_10' | 'LIF_10' | 'FER_5';
  jarName: string;
  jarShortName: string;
}

/**
 * Maps dream category or title to the best matching Harv Eker 6 Potes bucket.
 * Reserva/Sonhos -> PLP_10 (10% Poupança de Longo Prazo)
 * Investimentos/Renda Passiva -> LIF_10 (10% Liberdade Financeira)
 * Viagem/Férias -> FER_5 (5% Férias & Generosidade)
 */
export function mapDreamTo6Jar(category?: string, title?: string): {
  jar: 'PLP_10' | 'LIF_10' | 'FER_5';
  jarName: string;
  jarShortName: string;
} {
  const text = `${category || ''} ${title || ''}`.toLowerCase();

  if (text.includes('viagem') || text.includes('férias') || text.includes('ferias') || text.includes('intercâmbio') || text.includes('carro')) {
    return {
      jar: 'FER_5',
      jarName: '5% Férias & Grandes Desejos (FER 5%)',
      jarShortName: 'Pote Férias (5%)'
    };
  }

  if (text.includes('passiva') || text.includes('independência') || text.includes('investimento') || text.includes('liberdade') || text.includes('lif')) {
    return {
      jar: 'LIF_10',
      jarName: '10% Liberdade Financeira (LIF 10%)',
      jarShortName: 'Pote Liberdade (10%)'
    };
  }

  return {
    jar: 'PLP_10',
    jarName: '10% Reserva & Poupança Longo Prazo (PLP 10%)',
    jarShortName: 'Pote Reserva & Metas (10%)'
  };
}

/**
 * Calculates a monthly contribution suggestion ('Sugestão de Aporte')
 * based on the remaining deadline (prazo restante) to achieve the target amount.
 */
export function calculateContributionSuggestion(
  target: number,
  current: number,
  currentMonthlyDeposit: number = 0,
  targetDateStr?: string,
  referenceDateInput?: Date | string,
  category?: string,
  title?: string
): ContributionSuggestionResult {
  // If 5th argument looks like a category rather than a date, shift arguments gracefully
  let refDate: Date | string | undefined = referenceDateInput;
  let cat = category;
  let tit = title;

  if (typeof referenceDateInput === 'string' && (isNaN(Date.parse(referenceDateInput)) || !/^\d{4}-\d{2}-\d{2}/.test(referenceDateInput))) {
    cat = referenceDateInput;
    tit = category;
    refDate = undefined;
  }

  const remainingAmount = Math.max(0, target - current);
  const isCompleted = remainingAmount === 0;
  const jarMapping = mapDreamTo6Jar(cat, tit);

  if (isCompleted) {
    return {
      remainingAmount: 0,
      remainingMonths: 0,
      remainingDays: 0,
      suggestedMonthlyDeposit: 0,
      isCompleted: true,
      hasTargetDate: !!targetDateStr,
      isPastDeadline: false,
      formattedTargetDate: targetDateStr ? formatTargetDate(targetDateStr) : '',
      differenceVsCurrentDeposit: 0,
      status: 'completed',
      recommendationMessage: 'Meta atingida! O valor total já foi 100% acumulado.',
      targetJar: jarMapping.jar,
      jarName: jarMapping.jarName,
      jarShortName: jarMapping.jarShortName
    };
  }

  if (!targetDateStr) {
    return {
      remainingAmount,
      remainingMonths: 0,
      remainingDays: 0,
      suggestedMonthlyDeposit: 0,
      isCompleted: false,
      hasTargetDate: false,
      isPastDeadline: false,
      formattedTargetDate: '',
      differenceVsCurrentDeposit: 0,
      status: 'no_deadline',
      recommendationMessage: 'Defina uma data alvo para calcular a sugestão de aporte mensal ideal.',
      targetJar: jarMapping.jar,
      jarName: jarMapping.jarName,
      jarShortName: jarMapping.jarShortName
    };
  }

  const remainingMonths = calculateRemainingMonths(targetDateStr, refDate);
  const remainingDays = getCalendarDaysRemaining(targetDateStr, refDate);
  const formattedTargetDate = formatTargetDate(targetDateStr);

  if (remainingMonths <= 0 || remainingDays <= 0) {
    const diff = remainingAmount - currentMonthlyDeposit;
    return {
      remainingAmount,
      remainingMonths: 0,
      remainingDays: Math.max(0, remainingDays),
      suggestedMonthlyDeposit: remainingAmount,
      isCompleted: false,
      hasTargetDate: true,
      isPastDeadline: true,
      formattedTargetDate,
      differenceVsCurrentDeposit: diff,
      status: 'past_deadline',
      recommendationMessage: `Prazo alvo expirou em ${formattedTargetDate}. Necessário aporte de ${formatBRL(remainingAmount)} para liquidar a meta.`,
      targetJar: jarMapping.jar,
      jarName: jarMapping.jarName,
      jarShortName: jarMapping.jarShortName
    };
  }

  // Recommended monthly contribution rounded to 2 decimals
  const suggestedMonthlyDeposit = Math.round((remainingAmount / remainingMonths) * 100) / 100;
  const differenceVsCurrentDeposit = Math.round((suggestedMonthlyDeposit - currentMonthlyDeposit) * 100) / 100;

  let status: 'on_track' | 'needs_increase' | 'can_decrease';
  let recommendationMessage: string;

  if (Math.abs(differenceVsCurrentDeposit) < 1) {
    status = 'on_track';
    recommendationMessage = `Seu aporte atual de ${formatBRL(currentMonthlyDeposit)}/mês está perfeitamente alinhado com o prazo de ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}.`;
  } else if (differenceVsCurrentDeposit > 0) {
    status = 'needs_increase';
    recommendationMessage = `Aporte atual está ${formatBRL(differenceVsCurrentDeposit)}/mês abaixo do ideal para cumprir a meta até ${formattedTargetDate}.`;
  } else {
    status = 'can_decrease';
    const excess = Math.abs(differenceVsCurrentDeposit);
    recommendationMessage = `Aporte atual está ${formatBRL(excess)}/mês acima do necessário (${formatBRL(suggestedMonthlyDeposit)}/mês).`;
  }

  return {
    remainingAmount,
    remainingMonths,
    remainingDays,
    suggestedMonthlyDeposit,
    isCompleted: false,
    hasTargetDate: true,
    isPastDeadline: false,
    formattedTargetDate,
    differenceVsCurrentDeposit,
    status,
    recommendationMessage,
    targetJar: jarMapping.jar,
    jarName: jarMapping.jarName,
    jarShortName: jarMapping.jarShortName
  };
}

/**
 * Computes donut chart segments and summary for dreams
 */
export function calculateDreamsDonutData(
  dreams: DreamGoal[],
  referenceDateInput?: Date | string
): {
  slices: DreamDonutSlice[];
  totalCurrent: number;
  totalTarget: number;
  overallCompletionPct: number;
} {
  const totalCurrent = dreams.reduce((acc, d) => acc + d.current, 0);
  const totalTarget = dreams.reduce((acc, d) => acc + d.target, 0);
  const overallCompletionPct = totalTarget > 0 
    ? Math.round((totalCurrent / totalTarget) * 100) 
    : 0;

  // If no savings yet, distribute evenly for visualization
  const effectiveBase = totalCurrent > 0 ? totalCurrent : dreams.length;

  let cumulativeFraction = 0;
  const slices: DreamDonutSlice[] = dreams.map((dream, index) => {
    const rawVal = totalCurrent > 0 ? dream.current : 1;
    const fraction = rawVal / effectiveBase;
    const startFraction = cumulativeFraction;
    const endFraction = cumulativeFraction + fraction;
    cumulativeFraction = endFraction;

    const completionPct = dream.target > 0 
      ? Math.round((dream.current / dream.target) * 1000) / 10 
      : 0;

    const { suggestedMonthlyDeposit, remainingMonths } = calculateSuggestedMonthlyDeposit(
      dream.target,
      dream.current,
      dream.targetDate,
      referenceDateInput
    );

    return {
      id: dream.id,
      title: dream.title,
      current: dream.current,
      target: dream.target,
      monthlyDeposit: dream.monthlyDeposit,
      completionPct,
      fraction,
      startFraction,
      endFraction,
      colorHex: DREAM_COLORS[index % DREAM_COLORS.length],
      category: dream.category,
      targetDate: dream.targetDate,
      suggestedDeposit: suggestedMonthlyDeposit,
      monthsRemaining: remainingMonths,
    };
  });

  return {
    slices,
    totalCurrent,
    totalTarget,
    overallCompletionPct,
  };
}

export interface EstimatedTimeToGoalResult {
  remainingAmount: number;
  monthlySavings: number;
  estimatedMonths: number;
  formattedEstimatedTime: string;
  estimatedCompletionDateStr: string;
  formattedCompletionMonthYear: string;
  isCompleted: boolean;
  hasTargetDate: boolean;
  targetMonths: number;
  statusVsTargetDate: 'ahead' | 'on_track' | 'delayed' | 'no_target_date' | 'completed';
  statusMessage: string;
  delayMonths: number;
  requiredMonthlyForTargetDate: number;
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Calculates the estimated time to reach a dream/goal based on user monthly savings
 * and compares it against the planned target date (data alvo).
 */
export function calculateEstimatedTimeToGoal(
  target: number,
  current: number,
  monthlySavings: number,
  targetDateStr?: string,
  referenceDateInput?: Date | string
): EstimatedTimeToGoalResult {
  const remainingAmount = Math.max(0, target - current);
  const isCompleted = remainingAmount === 0;

  const refDate = referenceDateInput 
    ? (typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : referenceDateInput)
    : new Date();

  const hasTargetDate = !!targetDateStr;
  const targetMonths = hasTargetDate ? calculateRemainingMonths(targetDateStr!, referenceDateInput) : 0;
  const requiredMonthlyForTargetDate = hasTargetDate
    ? (targetMonths > 0 ? Math.round((remainingAmount / targetMonths) * 100) / 100 : remainingAmount)
    : 0;

  if (isCompleted) {
    return {
      remainingAmount: 0,
      monthlySavings,
      estimatedMonths: 0,
      formattedEstimatedTime: 'Meta concluída!',
      estimatedCompletionDateStr: refDate.toISOString().slice(0, 10),
      formattedCompletionMonthYear: 'Concluído',
      isCompleted: true,
      hasTargetDate,
      targetMonths,
      statusVsTargetDate: 'completed',
      statusMessage: 'Parabéns! O valor alvo já foi 100% acumulado.',
      delayMonths: 0,
      requiredMonthlyForTargetDate: 0
    };
  }

  if (monthlySavings <= 0) {
    return {
      remainingAmount,
      monthlySavings: 0,
      estimatedMonths: 0,
      formattedEstimatedTime: 'Defina uma economia mensal',
      estimatedCompletionDateStr: '',
      formattedCompletionMonthYear: 'Indefinido',
      isCompleted: false,
      hasTargetDate,
      targetMonths,
      statusVsTargetDate: hasTargetDate ? 'delayed' : 'no_target_date',
      statusMessage: hasTargetDate
        ? `Meta sem aportes ativos. Economize R$ ${requiredMonthlyForTargetDate.toFixed(2).replace('.', ',')}/mês para cumprir o prazo.`
        : 'Defina uma economia mensal para calcular a previsão de conclusão.',
      delayMonths: hasTargetDate ? targetMonths : 0,
      requiredMonthlyForTargetDate
    };
  }

  const estimatedMonths = Math.ceil(remainingAmount / monthlySavings);
  
  // Format human-friendly time duration
  let formattedEstimatedTime: string;
  if (estimatedMonths === 1) {
    formattedEstimatedTime = '1 mês';
  } else if (estimatedMonths < 12) {
    formattedEstimatedTime = `${estimatedMonths} meses`;
  } else {
    const years = Math.floor(estimatedMonths / 12);
    const remMonths = estimatedMonths % 12;
    if (remMonths === 0) {
      formattedEstimatedTime = `${estimatedMonths} meses (~${years} ${years === 1 ? 'ano' : 'anos'})`;
    } else {
      formattedEstimatedTime = `${estimatedMonths} meses (~${years} ${years === 1 ? 'ano' : 'anos'} e ${remMonths} ${remMonths === 1 ? 'mês' : 'meses'})`;
    }
  }

  // Estimated completion calendar date
  const compYear = refDate.getFullYear() + Math.floor((refDate.getMonth() + estimatedMonths) / 12);
  const compMonthIdx = (refDate.getMonth() + estimatedMonths) % 12;
  const estimatedCompletionDateStr = `${compYear}-${String(compMonthIdx + 1).padStart(2, '0')}-01`;
  const formattedCompletionMonthYear = `${MONTH_NAMES_PT[compMonthIdx]} de ${compYear}`;

  let statusVsTargetDate: 'ahead' | 'on_track' | 'delayed' | 'no_target_date' = 'no_target_date';
  let statusMessage: string;
  let delayMonths = 0;

  if (hasTargetDate) {
    if (targetMonths <= 0) {
      statusVsTargetDate = 'delayed';
      delayMonths = estimatedMonths;
      statusMessage = `Prazo alvo já expirou. Na economia de R$ ${monthlySavings.toFixed(2).replace('.', ',')}/mês, a conclusão será em ${formattedCompletionMonthYear}.`;
    } else if (estimatedMonths <= targetMonths) {
      if (targetMonths - estimatedMonths >= 2) {
        statusVsTargetDate = 'ahead';
        const monthsAhead = targetMonths - estimatedMonths;
        statusMessage = `Adiantado! Conclusão em ${formattedCompletionMonthYear} (~${monthsAhead} ${monthsAhead === 1 ? 'mês' : 'meses'} antes do prazo).`;
      } else {
        statusVsTargetDate = 'on_track';
        statusMessage = `No prazo! Conclusão prevista para ${formattedCompletionMonthYear}.`;
      }
    } else {
      statusVsTargetDate = 'delayed';
      delayMonths = estimatedMonths - targetMonths;
      statusMessage = `Atrasará ~${delayMonths} ${delayMonths === 1 ? 'mês' : 'meses'} da data alvo. Necessário: R$ ${requiredMonthlyForTargetDate.toFixed(2).replace('.', ',')}/mês.`;
    }
  } else {
    statusMessage = `Conclusão estimada em ${formattedCompletionMonthYear} com economia mensal de R$ ${monthlySavings.toFixed(2).replace('.', ',')}.`;
  }

  return {
    remainingAmount,
    monthlySavings,
    estimatedMonths,
    formattedEstimatedTime,
    estimatedCompletionDateStr,
    formattedCompletionMonthYear,
    isCompleted: false,
    hasTargetDate,
    targetMonths,
    statusVsTargetDate,
    statusMessage,
    delayMonths,
    requiredMonthlyForTargetDate
  };
}

/**
 * Sorts dream goals by urgency, priority, target date, estimated time or progress.
 */
export function sortDreams(
  dreams: DreamGoal[],
  sortOption: DreamSortOption = 'urgency',
  referenceDateInput?: Date | string
): DreamGoal[] {
  const list = [...dreams];

  const getPriorityWeight = (p?: DreamPriority): number => {
    if (p === 'alta') return 3;
    if (p === 'media') return 2;
    if (p === 'baixa') return 1;
    return 2; // Default to 'media'
  };

  switch (sortOption) {
    case 'urgency':
      return list.sort((a, b) => {
        const aCompleted = a.current >= a.target;
        const bCompleted = b.current >= b.target;
        if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

        // Calculate days remaining
        const aDays = a.targetDate ? getCalendarDaysRemaining(a.targetDate, referenceDateInput) : 99999;
        const bDays = b.targetDate ? getCalendarDaysRemaining(b.targetDate, referenceDateInput) : 99999;

        // Score based on overdue (< 0), urgency threshold (<= 60 days) and priority
        const calculateScore = (dream: DreamGoal, days: number): number => {
          const pWeight = getPriorityWeight(dream.priority) * 1000;
          if (!dream.targetDate) return pWeight;
          if (days < 0) return 100000 + Math.abs(days) * 10 + pWeight; // Overdue highest urgency
          if (days <= 60) return 50000 + (60 - days) * 50 + pWeight; // Critical window
          return Math.max(0, 20000 - days) + pWeight;
        };

        const scoreA = calculateScore(a, aDays);
        const scoreB = calculateScore(b, bDays);

        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Highest score first
        }

        // Secondary tie-breaker: closer deadline
        return aDays - bDays;
      });

    case 'priority':
      return list.sort((a, b) => {
        const pDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
        if (pDiff !== 0) return pDiff;
        // Tie-breaker: targetDate
        const aDate = a.targetDate || '9999-12-31';
        const bDate = b.targetDate || '9999-12-31';
        return aDate.localeCompare(bDate);
      });

    case 'targetDate':
      return list.sort((a, b) => {
        if (!a.targetDate && !b.targetDate) return 0;
        if (!a.targetDate) return 1;
        if (!b.targetDate) return -1;
        return a.targetDate.localeCompare(b.targetDate);
      });

    case 'estimatedTime':
      return list.sort((a, b) => {
        const aCompleted = a.current >= a.target;
        const bCompleted = b.current >= b.target;
        if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

        const aMonths = a.monthlyDeposit > 0 ? (a.target - a.current) / a.monthlyDeposit : 99999;
        const bMonths = b.monthlyDeposit > 0 ? (b.target - b.current) / b.monthlyDeposit : 99999;
        return aMonths - bMonths;
      });

    case 'progress':
      return list.sort((a, b) => {
        const pctA = a.target > 0 ? (a.current / a.target) * 100 : 0;
        const pctB = b.target > 0 ? (b.current / b.target) * 100 : 0;
        return pctB - pctA;
      });

    case 'default':
    default:
      return list;
  }
}

