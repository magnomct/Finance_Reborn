import { DreamGoal } from '../types';

export interface DreamsDashboardSummary {
  activeCount: number;
  completedCount: number;
  totalCount: number;
  totalAccumulated: number;
  totalTarget: number;
  totalRemaining: number;
  overallPercentage: number;
  formattedPercentage: string;
  monthlyDepositSum: number;
  statusHeadline: string;
}

/**
 * Calculates the cumulative progress of all active dream goals.
 * Active dreams are those that have a target > 0 (or all dreams in the user's list).
 */
export function calculateDreamsDashboardSummary(dreams: DreamGoal[] = []): DreamsDashboardSummary {
  const activeDreams = dreams.filter(d => (d.target || 0) > 0);
  const totalCount = activeDreams.length;

  if (totalCount === 0) {
    return {
      activeCount: 0,
      completedCount: 0,
      totalCount: 0,
      totalAccumulated: 0,
      totalTarget: 0,
      totalRemaining: 0,
      overallPercentage: 0,
      formattedPercentage: '0,0%',
      monthlyDepositSum: 0,
      statusHeadline: 'Nenhum sonho cadastrado'
    };
  }

  const totalAccumulated = activeDreams.reduce((acc, d) => acc + Math.max(0, d.current || 0), 0);
  const totalTarget = activeDreams.reduce((acc, d) => acc + Math.max(0, d.target || 0), 0);
  const totalRemaining = Math.max(0, totalTarget - totalAccumulated);
  const monthlyDepositSum = activeDreams.reduce((acc, d) => acc + Math.max(0, d.monthlyDeposit || 0), 0);

  const completedCount = activeDreams.filter(d => (d.current || 0) >= (d.target || 0)).length;
  const activeCount = totalCount - completedCount;

  const rawPct = totalTarget > 0 ? (totalAccumulated / totalTarget) * 100 : 0;
  // Round to 1 decimal place, max 100% for progress bar visualization
  const overallPercentage = Math.round(rawPct * 10) / 10;
  const formattedPercentage = `${overallPercentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  let statusHeadline = 'Em progresso';
  if (overallPercentage >= 100) {
    statusHeadline = '100% Concluído! 🎉';
  } else if (overallPercentage >= 75) {
    statusHeadline = 'Reta Final 🚀';
  } else if (overallPercentage >= 50) {
    statusHeadline = 'Mais da Metade 🎯';
  } else if (overallPercentage >= 25) {
    statusHeadline = 'Ritmo Consistente 🌱';
  } else {
    statusHeadline = 'Primeiros Passos 🏁';
  }

  return {
    activeCount,
    completedCount,
    totalCount,
    totalAccumulated,
    totalTarget,
    totalRemaining,
    overallPercentage,
    formattedPercentage,
    monthlyDepositSum,
    statusHeadline
  };
}
