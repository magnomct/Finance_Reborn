export type JarType = 'NEC_55' | 'LIF_10' | 'PLP_10' | 'EDU_10' | 'DIV_10' | 'FER_5' | 'PJ_EXCLUIDO';
export type CostCenter = 'Magno' | 'Nathan' | 'Suzy' | 'PJ';
export type AccountType = 'Inter PF' | 'Inter PJ' | 'C6' | 'Passe' | 'Outro' | (string & {});
export type ActiveScreen = 'dashboard' | 'agenda' | 'graficos' | 'potes' | 'sonhos' | 'automacoes' | 'extratos' | 'pj' | 'hub';

export interface AnnualItem {
  id: string;
  name: string;
  category: string;
  group: 'rendas' | 'investimentos' | 'despesas';
  subgroup?: string; // e.g. 'Habitação', 'Transporte', 'Bancos', 'Cartões'
  pctTotal?: number;
  monthlyValues: number[]; // 12 numbers (Jan to Dec)
}

export type RecurrenceFrequency = 'diaria' | 'semanal' | 'quinzenal' | 'mensal';
export type PaymentMethodType = 'Dinheiro' | 'Cartão de Crédito' | 'Conta Corrente';
export type ExpenseNature = 'fixed' | 'variable' | 'income';

export interface SubcategoryItem {
  id: string;
  name: string; // e.g., "Supermercado", "Delivery", "Combustível"
  parentId: string; // e.g., "cat-alimentacao"
  parentName: string; // e.g., "Alimentação"
  nature: ExpenseNature; // 'fixed' | 'variable' | 'income'
  type?: ExpenseNature; // alias for nature: 'fixed' | 'variable' | 'income'
  color?: string;
  keywords: string[]; // Termos gatilho (ex: ["IFOOD", "UBER EATS"])
  icon?: string;
  jarDefault?: JarType;
}

export interface ParentCategoryItem {
  id: string;
  name: string; // e.g., "Moradia", "Alimentação", "Transporte"
  nature: ExpenseNature; // 'fixed' | 'variable' | 'income'
  type?: ExpenseNature; // alias for nature: 'fixed' | 'variable' | 'income'
  subcategories: SubcategoryItem[];
  icon?: string;
  colorHex?: string;
  color?: string; // alias for colorHex
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positive for income/refund, negative for expense
  amountPlanned?: number; // Valor Previsto / Orçado
  amountRealized?: number; // Valor Efetivamente Realizado
  type: 'receita' | 'despesa' | 'reembolso';
  jar: JarType;
  costCenter: CostCenter;
  account: AccountType;
  status: 'liquidado' | 'agendado';
  paymentMethod?: PaymentMethodType | string;
  isRecurring?: boolean;
  recurringId?: string;
  recurrenceFrequency?: RecurrenceFrequency;
  category?: string;
  parentCategory?: string; // Categoria Pai (ex: "Alimentação")
  subcategory?: string; // Subcategoria (ex: "Delivery")
  nature?: ExpenseNature; // 'fixed' | 'variable'
  notes?: string; // Observações / notas adicionais (ex: 'Nathan 60%')
  reminderDaysBefore?: number; // Dias de antecedência para lembrete visual de vencimento
  time?: string; // Horário da transação (ex: '21:30', '14:00')
}


export type DreamPriority = 'alta' | 'media' | 'baixa';
export type DreamSortOption = 'urgency' | 'priority' | 'targetDate' | 'estimatedTime' | 'progress' | 'default';

export interface DreamGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  monthlyDeposit: number;
  category: string;
  impact: string;
  targetDate?: string;
  urgencyDaysThreshold?: number; // Prazo de urgência em dias de antecedência para aviso de meta crítica (ex: 30, 60, 90)
  priority?: DreamPriority; // Prioridade do sonho: Alta, Média ou Baixa
  iconName: string;
  gradient: string;
}

export interface MonthlyDepositCheckitem {
  dreamId: string;
  month: string; // YYYY-MM
  amount: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface MonthlyChecklistProgress {
  totalPlanned: number;
  totalCompleted: number;
  completedCount: number;
  totalCount: number;
  completionPercent: number;
}

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  amountPlanned: number; // Valor Previsto / Orçado
  amountRealized?: number; // Valor Efetivamente Realizado
  type: 'receita' | 'despesa' | 'reembolso';
  frequency: RecurrenceFrequency; // 'diaria' | 'semanal' | 'quinzenal' | 'mensal'
  dayOfMonth?: number; // 1 - 31
  dayOfWeek?: number; // 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb, 7 = Dom
  jar: JarType;
  account: AccountType;
  costCenter: CostCenter;
  isActive: boolean;
  category?: string;
  notes?: string;
}

export interface AutoCategoryRule {
  id: string;
  keyword: string;
  jar: JarType;
  category: string;
  costCenter: CostCenter;
  account: AccountType;
}

export interface JarInfo {
  id: JarType;
  name: string;
  shortName: string;
  desc: string;
  pct: number;
  colorHex: string;
  bgClass: string;
  textClass: string;
  iconName: string;
}

export type BudgetAlertStatus = 'OK' | 'WARNING' | 'EXCEEDED';

export interface JarBudgetLimit {
  jarId: JarType;
  limit: number;
}

export interface JarBudgetAlert {
  jarId: JarType;
  jarName: string;
  shortName: string;
  colorHex: string;
  limit: number;
  spent: number;
  remaining: number;
  usagePercent: number;
  threshold80: number; // 80% of limit
  status: BudgetAlertStatus; // 'OK' | 'WARNING' | 'EXCEEDED'
}

export interface JarSavingsProgress {
  jarId: JarType;
  savingsTarget: number;
  currentSavings: number;
  remainingToTarget: number;
  progressPercent: number;
  isTargetReached: boolean;
}


