export interface AnnualCategoryBudget {
  id: string;
  name: string;
  annualLimit: number;
  iconName: string;
  colorHex: string;
  bgLightClass: string;
  textClass: string;
  badgeClass: string;
  description: string;
  subItems?: string[];
}

export interface CategoryAnnualMetric {
  id: string;
  name: string;
  annualLimit: number;
  monthlyEquivalentLimit: number;
  spentYTD: number;
  remaining: number; // positive = amount remaining before hitting limit; negative = exceeded
  isExceeded: boolean;
  overAmount: number;
  percentUsed: number;
  monthlyAverageSpent: number;
  projectedYearEndSpent: number;
  paceStatus: 'safe' | 'warning' | 'critical' | 'exceeded';
  iconName: string;
  colorHex: string;
  bgLightClass: string;
  textClass: string;
  badgeClass: string;
  description: string;
  subItems?: string[];
}

export interface OverallAnnualBudgetMetric {
  totalAnnualLimit: number;
  totalMonthlyLimit: number;
  totalSpentYTD: number;
  totalRemaining: number;
  isTotalExceeded: boolean;
  overallPercentUsed: number;
  elapsedYearPercent: number; // e.g. 83.3% in October (month 10 of 12)
  categoriesSafeCount: number;
  categoriesWarningCount: number;
  categoriesCriticalCount: number;
  categoriesExceededCount: number;
  totalCategoriesCount: number;
}

export const DEFAULT_ANNUAL_CATEGORY_BUDGETS: AnnualCategoryBudget[] = [
  {
    id: 'habitacao',
    name: 'Habitação',
    annualLimit: 14400, // R$ 1.200/mês
    iconName: 'Home',
    colorHex: '#0284c7', // Sky 600
    bgLightClass: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900',
    textClass: 'text-sky-700 dark:text-sky-300',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300',
    description: 'Aluguel, luz, condomínio, internet, IPTU e manutenção do lar',
    subItems: ['Aluguel/Prestação Imóvel', 'Luz', 'Telefones', 'Internet', 'Condomínio', 'IPTU']
  },
  {
    id: 'cartoes',
    name: 'Cartões de Crédito',
    annualLimit: 12000, // R$ 1.000/mês
    iconName: 'CreditCard',
    colorHex: '#8b5cf6', // Violet 500
    bgLightClass: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900',
    textClass: 'text-violet-700 dark:text-violet-300',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300',
    description: 'Faturas Nubank, Inter, Next, Carrefour e parcelamentos',
    subItems: ['NUBANK MASTER', 'INTER MASTER', 'NEXT VISA', 'Carrefour (Mercado)', 'Magalu']
  },
  {
    id: 'bancos',
    name: 'Bancos & Tarifas',
    annualLimit: 6000, // R$ 500/mês
    iconName: 'Landmark',
    colorHex: '#0d9488', // Teal 600
    bgLightClass: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900',
    textClass: 'text-teal-700 dark:text-teal-300',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
    description: 'Previdência Icatu, tarifas bancárias, previdência privada e DAS',
    subItems: ['Icatu prev', 'Brasil Prev', 'Pacote Caixa', 'Tarifa Santander', 'Receita DAS']
  },
  {
    id: 'transporte',
    name: 'Transporte',
    annualLimit: 4800, // R$ 400/mês
    iconName: 'Car',
    colorHex: '#f59e0b', // Amber 500
    bgLightClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    textClass: 'text-amber-700 dark:text-amber-300',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
    description: 'Condução diária, combustível, Uber, estacionamento e manutenção',
    subItems: ['Condução', 'Combustível', 'Uber', 'Estacionamento', 'Prestação carro']
  },
  {
    id: 'alimentacao',
    name: 'Alimentação & Feira',
    annualLimit: 12000, // R$ 1.000/mês
    iconName: 'Utensils',
    colorHex: '#10b981', // Emerald 500
    bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
    description: 'Supermercado, hortifrúti/feira, padaria e açougue',
    subItems: ['Supermercado', 'Feira', 'Padaria']
  },
  {
    id: 'saude',
    name: 'Saúde & Cuidados',
    annualLimit: 3600, // R$ 300/mês
    iconName: 'HeartPulse',
    colorHex: '#ec4899', // Pink 500
    bgLightClass: 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-900',
    textClass: 'text-pink-700 dark:text-pink-300',
    badgeClass: 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-300',
    description: 'Plano de saúde, farmácia, dentista e consultas médicas',
    subItems: ['Plano de saúde', 'Medicamentos', 'Dentista']
  },
  {
    id: 'lazer',
    name: 'Lazer & Experiências',
    annualLimit: 4800, // R$ 400/mês
    iconName: 'Smile',
    colorHex: '#6366f1', // Indigo 500
    bgLightClass: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
    description: 'Restaurantes, cafés, passeios de fim de semana e cinema',
    subItems: ['Cafés & Restaurantes', 'Passeios', 'Streaming & Eventos']
  },
  {
    id: 'educacao',
    name: 'Educação & Cursos',
    annualLimit: 2400, // R$ 200/mês
    iconName: 'GraduationCap',
    colorHex: '#3b82f6', // Blue 500
    bgLightClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    textClass: 'text-blue-700 dark:text-blue-300',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
    description: 'Cursos profissionalizantes, livros técnicos e faculdade',
    subItems: ['Cursos', 'Livros', 'Faculdade/Pós']
  },
  {
    id: 'cuidados_pessoais',
    name: 'Cuidados Pessoais',
    annualLimit: 2400, // R$ 200/mês
    iconName: 'Sparkles',
    colorHex: '#a855f7', // Purple 500
    bgLightClass: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
    textClass: 'text-purple-700 dark:text-purple-300',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
    description: 'Higiene pessoal, cosméticos, academia, vestuário e barbearia/salão',
    subItems: ['Higiene & Cosméticos', 'Vestuário/Calçados', 'Academia', 'Estética']
  },
  {
    id: 'reserva',
    name: 'Reserva & Imprevistos',
    annualLimit: 4000,
    iconName: 'ShieldCheck',
    colorHex: '#14b8a6', // Teal 500
    bgLightClass: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900',
    textClass: 'text-teal-700 dark:text-teal-300',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
    description: 'Gastos emergenciais, imprevistos domésticos e manutenções surpresa',
    subItems: ['Imprevistos domésticos', 'Manutenções pontuais']
  }
];

/**
 * Calculates metrics for an individual category annual budget
 * @param budget Category configuration with annual limit
 * @param spentYTD Amount spent in the current year
 * @param elapsedMonths Number of months elapsed in the year (1 - 12)
 */
export function calculateCategoryMetric(
  budget: AnnualCategoryBudget,
  spentYTD: number,
  elapsedMonths: number = 10
): CategoryAnnualMetric {
  const annualLimit = Math.max(0, budget.annualLimit);
  const remaining = annualLimit - spentYTD;
  const isExceeded = remaining < 0;
  const overAmount = isExceeded ? Math.abs(remaining) : 0;
  const percentUsed = annualLimit > 0 ? (spentYTD / annualLimit) * 100 : 0;
  const monthlyEquivalentLimit = annualLimit / 12;

  const validElapsed = Math.min(12, Math.max(1, elapsedMonths));
  const monthlyAverageSpent = spentYTD / validElapsed;
  const projectedYearEndSpent = monthlyAverageSpent * 12;

  let paceStatus: 'safe' | 'warning' | 'critical' | 'exceeded';
  if (isExceeded) {
    paceStatus = 'exceeded';
  } else if (percentUsed >= 90 || projectedYearEndSpent > annualLimit * 1.1) {
    paceStatus = 'critical';
  } else if (percentUsed >= 75 || projectedYearEndSpent > annualLimit) {
    paceStatus = 'warning';
  } else {
    paceStatus = 'safe';
  }

  return {
    id: budget.id,
    name: budget.name,
    annualLimit,
    monthlyEquivalentLimit,
    spentYTD,
    remaining,
    isExceeded,
    overAmount,
    percentUsed,
    monthlyAverageSpent,
    projectedYearEndSpent,
    paceStatus,
    iconName: budget.iconName,
    colorHex: budget.colorHex,
    bgLightClass: budget.bgLightClass,
    textClass: budget.textClass,
    badgeClass: budget.badgeClass,
    description: budget.description,
    subItems: budget.subItems
  };
}

/**
 * Calculates global metrics across all categories for the year
 */
export function calculateOverallAnnualBudgetMetrics(
  categoryMetrics: CategoryAnnualMetric[],
  elapsedMonths: number = 10
): OverallAnnualBudgetMetric {
  const totalAnnualLimit = categoryMetrics.reduce((acc, c) => acc + c.annualLimit, 0);
  const totalSpentYTD = categoryMetrics.reduce((acc, c) => acc + c.spentYTD, 0);
  const totalRemaining = totalAnnualLimit - totalSpentYTD;
  const isTotalExceeded = totalRemaining < 0;
  const overallPercentUsed = totalAnnualLimit > 0 ? (totalSpentYTD / totalAnnualLimit) * 100 : 0;
  const elapsedYearPercent = (Math.min(12, Math.max(1, elapsedMonths)) / 12) * 100;

  let safeCount = 0;
  let warningCount = 0;
  let criticalCount = 0;
  let exceededCount = 0;

  categoryMetrics.forEach(c => {
    if (c.paceStatus === 'exceeded') exceededCount++;
    else if (c.paceStatus === 'critical') criticalCount++;
    else if (c.paceStatus === 'warning') warningCount++;
    else safeCount++;
  });

  return {
    totalAnnualLimit,
    totalMonthlyLimit: totalAnnualLimit / 12,
    totalSpentYTD,
    totalRemaining,
    isTotalExceeded,
    overallPercentUsed,
    elapsedYearPercent,
    categoriesSafeCount: safeCount,
    categoriesWarningCount: warningCount,
    categoriesCriticalCount: criticalCount,
    categoriesExceededCount: exceededCount,
    totalCategoriesCount: categoryMetrics.length
  };
}
