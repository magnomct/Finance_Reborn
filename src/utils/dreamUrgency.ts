import { DreamGoal } from '../types';
import { calculateRemainingMonths } from './dreamCalculations';

export interface DreamUrgencyStatus {
  isCritical: boolean;
  isOverdue: boolean;
  isCompleted: boolean;
  daysRemaining: number;
  monthsRemaining: number;
  urgencyDaysThreshold: number; // Dias de antecedência configurados para urgência
  remainingAmount: number;
  currentMonthlyDeposit: number;
  recalculatedMonthlyDeposit: number;
  monthlyDepositDeficit: number; // Quanto a mais por mês é necessário
  statusLabel: string;
  urgencyLevel: 'critical' | 'warning' | 'normal' | 'overdue' | 'completed';
  urgencyMessage: string;
}

export const DEFAULT_URGENCY_DAYS_THRESHOLD = 60; // 60 dias de antecedência por padrão

/**
 * UTC-safe calculation of calendar day difference between target date and reference date.
 */
export function getCalendarDaysDiff(targetDateStr: string, referenceDateStr?: string): number {
  if (!targetDateStr) return 0;
  
  const [tY, tM, tD] = targetDateStr.split('-').map(Number);
  if (!tY || !tM) return 0;

  const targetUtc = Date.UTC(tY, tM - 1, tD || 1);

  let refUtc: number;
  if (referenceDateStr) {
    const [rY, rM, rD] = referenceDateStr.split('-').map(Number);
    refUtc = Date.UTC(rY, rM - 1, rD || 1);
  } else {
    const now = new Date();
    refUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((targetUtc - refUtc) / MS_PER_DAY);
}

/**
 * Calculates complete urgency status and recalculates the required monthly contribution
 * to hit the target amount within the remaining planned timeframe.
 */
export function calculateDreamUrgency(
  dream: DreamGoal,
  referenceDateStr: string = '2026-10-25',
  customDefaultThreshold: number = DEFAULT_URGENCY_DAYS_THRESHOLD
): DreamUrgencyStatus {
  const remainingAmount = Math.max(0, dream.target - dream.current);
  const isCompleted = remainingAmount === 0;

  if (isCompleted) {
    return {
      isCritical: false,
      isOverdue: false,
      isCompleted: true,
      daysRemaining: 0,
      monthsRemaining: 0,
      urgencyDaysThreshold: dream.urgencyDaysThreshold ?? customDefaultThreshold,
      remainingAmount: 0,
      currentMonthlyDeposit: dream.monthlyDeposit,
      recalculatedMonthlyDeposit: 0,
      monthlyDepositDeficit: 0,
      statusLabel: 'Meta Concluída 🎉',
      urgencyLevel: 'completed',
      urgencyMessage: 'Parabéns! O objetivo já foi 100% atingido.'
    };
  }

  if (!dream.targetDate) {
    return {
      isCritical: false,
      isOverdue: false,
      isCompleted: false,
      daysRemaining: 0,
      monthsRemaining: 0,
      urgencyDaysThreshold: dream.urgencyDaysThreshold ?? customDefaultThreshold,
      remainingAmount,
      currentMonthlyDeposit: dream.monthlyDeposit,
      recalculatedMonthlyDeposit: dream.monthlyDeposit,
      monthlyDepositDeficit: 0,
      statusLabel: 'Sem data limite',
      urgencyLevel: 'normal',
      urgencyMessage: 'Defina uma data limite para calcular o prazo de urgência e aportes ideais.'
    };
  }

  const daysRemaining = getCalendarDaysDiff(dream.targetDate, referenceDateStr);
  const urgencyDaysThreshold = dream.urgencyDaysThreshold && dream.urgencyDaysThreshold > 0
    ? dream.urgencyDaysThreshold
    : customDefaultThreshold;

  const isOverdue = daysRemaining < 0;
  const isCritical = !isOverdue && daysRemaining <= urgencyDaysThreshold;

  // Calculate remaining months based on reference date
  const monthsRemaining = Math.max(1, calculateRemainingMonths(dream.targetDate, referenceDateStr));

  // Recalculated deposit: distribute remaining balance across remaining months
  let recalculatedMonthlyDeposit: number;
  if (isOverdue) {
    // If deadline has already passed, the full remaining amount is needed immediately
    recalculatedMonthlyDeposit = remainingAmount;
  } else {
    recalculatedMonthlyDeposit = Math.round((remainingAmount / monthsRemaining) * 100) / 100;
  }

  const monthlyDepositDeficit = Math.max(0, Math.round((recalculatedMonthlyDeposit - dream.monthlyDeposit) * 100) / 100);

  let urgencyLevel: 'critical' | 'warning' | 'normal' | 'overdue' | 'completed';
  let statusLabel: string;
  let urgencyMessage: string;

  if (isOverdue) {
    urgencyLevel = 'overdue';
    statusLabel = `Prazo Vencido (${Math.abs(daysRemaining)}d atrás)`;
    urgencyMessage = `O prazo da meta expirou. Aporte de emergência recomendado: ${remainingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`;
  } else if (isCritical) {
    if (daysRemaining <= 30) {
      urgencyLevel = 'critical';
      statusLabel = `Meta Crítica (${daysRemaining} dias restantes)`;
    } else {
      urgencyLevel = 'warning';
      statusLabel = `Atenção: Prazo de Urgência (${daysRemaining} dias)`;
    }

    if (monthlyDepositDeficit > 0) {
      urgencyMessage = `Prazo limite próximo! Aumente o aporte em +${monthlyDepositDeficit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês (total de ${recalculatedMonthlyDeposit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês) para atingir no prazo.`;
    } else {
      urgencyMessage = `Prazo limite próximo! Seu aporte atual de ${dream.monthlyDeposit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês já cobre a meta no prazo.`;
    }
  } else {
    urgencyLevel = 'normal';
    statusLabel = `No Prazo (${daysRemaining} dias)`;
    urgencyMessage = `Meta com prazo regular. Faltam ~${monthsRemaining} meses.`;
  }

  return {
    isCritical,
    isOverdue,
    isCompleted: false,
    daysRemaining,
    monthsRemaining,
    urgencyDaysThreshold,
    remainingAmount,
    currentMonthlyDeposit: dream.monthlyDeposit,
    recalculatedMonthlyDeposit,
    monthlyDepositDeficit,
    statusLabel,
    urgencyLevel,
    urgencyMessage
  };
}

/**
 * Filters all dreams that require critical attention (critical urgency window or overdue).
 */
export function getCriticalDreams(
  dreams: DreamGoal[],
  referenceDateStr?: string
): { dream: DreamGoal; urgency: DreamUrgencyStatus }[] {
  return dreams
    .map(dream => ({ dream, urgency: calculateDreamUrgency(dream, referenceDateStr) }))
    .filter(item => item.urgency.isCritical || item.urgency.isOverdue)
    .sort((a, b) => a.urgency.daysRemaining - b.urgency.daysRemaining);
}
