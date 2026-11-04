import { JarType, JarInfo, Transaction } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';

export interface PoteDonutSlice {
  id: JarType;
  name: string;
  shortName: string;
  colorHex: string;
  budgetLimit: number;
  spent: number;
  remaining: number;
  overspent: number;
  usagePercent: number; // (spent / budgetLimit) * 100
  shareOfTotalSpent: number; // fraction between 0 and 1
  startAngle: number; // degrees
  endAngle: number; // degrees
  status: 'OK' | 'ALERTA_80' | 'EXCEDIDO';
}

export interface PotesDonutSummary {
  slices: PoteDonutSlice[];
  totalBudgetLimit: number;
  totalSpent: number;
  totalRemaining: number;
  totalOverspent: number;
  overallUsagePercent: number;
  criticalJarsCount: number;
}

export interface PoteInputJar {
  name?: string;
  shortName?: string;
  budget?: number;
  spent?: number;
  colorHex?: string;
}

/**
 * Computes interactive donut chart geometry and consumption metrics for the 6 Jars.
 */
export function calculatePotesDonutData(
  jars: Record<JarType, PoteInputJar | any>,
  jarLimits?: Record<JarType, number>
): PotesDonutSummary {
  const jarKeys: JarType[] = ['NEC_55', 'DIV_10', 'PLP_10', 'EDU_10', 'LIF_10', 'FER_5'];

  let totalBudgetLimit = 0;
  let totalSpent = 0;
  let totalRemaining = 0;
  let totalOverspent = 0;
  let criticalJarsCount = 0;

  const rawItems = jarKeys.map(key => {
    const jar = jars[key] || {
      id: key,
      name: JAR_DEFINITIONS[key]?.name || key,
      shortName: JAR_DEFINITIONS[key]?.shortName || key,
      budget: 0,
      spent: 0,
      colorHex: JAR_DEFINITIONS[key]?.colorHex || '#64748B'
    };

    const budgetLimit = jarLimits && jarLimits[key] !== undefined && jarLimits[key] > 0
      ? jarLimits[key]
      : jar.budget;

    const spent = Math.max(0, jar.spent);
    const remaining = Math.max(0, budgetLimit - spent);
    const overspent = Math.max(0, spent - budgetLimit);
    const usagePercent = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0;

    let status: 'OK' | 'ALERTA_80' | 'EXCEDIDO' = 'OK';
    if (usagePercent > 100) {
      status = 'EXCEDIDO';
      criticalJarsCount++;
    } else if (usagePercent >= 80) {
      status = 'ALERTA_80';
      criticalJarsCount++;
    }

    totalBudgetLimit += budgetLimit;
    totalSpent += spent;
    totalRemaining += remaining;
    totalOverspent += overspent;

    return {
      id: key,
      name: jar.name,
      shortName: jar.shortName,
      colorHex: jar.colorHex || JAR_DEFINITIONS[key]?.colorHex || '#3B82F6',
      budgetLimit,
      spent,
      remaining,
      overspent,
      usagePercent,
      status
    };
  });

  const overallUsagePercent = totalBudgetLimit > 0
    ? (totalSpent / totalBudgetLimit) * 100
    : 0;

  // Calculate angles for donut chart based on proportion of spent
  // If no spending at all, distribute slices evenly by budget
  const useSpentForAngles = totalSpent > 0;
  const baseTotal = useSpentForAngles ? totalSpent : (totalBudgetLimit || 1);

  let currentAngle = -90; // Start at 12 o'clock

  const slices: PoteDonutSlice[] = rawItems.map(item => {
    const valueForAngle = useSpentForAngles ? item.spent : item.budgetLimit;
    const share = baseTotal > 0 ? valueForAngle / baseTotal : 0;
    const sweep = share * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle;

    return {
      ...item,
      shareOfTotalSpent: share,
      startAngle,
      endAngle
    };
  });

  return {
    slices,
    totalBudgetLimit,
    totalSpent,
    totalRemaining,
    totalOverspent,
    overallUsagePercent,
    criticalJarsCount
  };
}

/**
 * Converts polar coordinates to SVG Cartesian path
 */
export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

/**
 * Generates an SVG donut arc path string (annulus segment)
 */
export function describeDonutArc(
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  // Clamp angle sweep to avoid zero or negative
  let sweep = endAngle - startAngle;
  if (sweep <= 0.01) return '';
  if (sweep >= 359.99) {
    sweep = 359.99;
    endAngle = startAngle + sweep;
  }

  const startOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, endAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = sweep <= 180 ? '0' : '1';

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
    'Z'
  ].join(' ');
}
