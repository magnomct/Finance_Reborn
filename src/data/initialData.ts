import { Transaction, DreamGoal, RecurringExpense, AutoCategoryRule, JarInfo } from '../types';

export const JAR_DEFINITIONS: Record<string, JarInfo> = {
  NEC_55: {
    id: 'NEC_55',
    name: 'Necessidades Básicas',
    shortName: 'Necessidades',
    desc: 'Moradia, alimentação, contas de casa, saúde, transporte essencial',
    pct: 0.55,
    colorHex: '#3B82F6', // Blue
    bgClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    textClass: 'text-blue-600 dark:text-blue-400',
    iconName: 'Home'
  },
  DIV_10: {
    id: 'DIV_10',
    name: 'Diversão & Estilo',
    shortName: 'Lazer',
    desc: 'Passeios, jantares, compras livres, lazer no cartão C6',
    pct: 0.10,
    colorHex: '#A855F7', // Purple
    bgClass: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
    textClass: 'text-purple-600 dark:text-purple-400',
    iconName: 'Smile'
  },
  PLP_10: {
    id: 'PLP_10',
    name: 'Reserva & Poupança Longo Prazo',
    shortName: 'Reserva & Sonhos',
    desc: 'Fundo de emergência, segurança familiar, grandes metas futuras',
    pct: 0.10,
    colorHex: '#6366F1', // Indigo
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    iconName: 'PiggyBank'
  },
  LIF_10: {
    id: 'LIF_10',
    name: 'Liberdade Financeira',
    shortName: 'Investimentos',
    desc: 'Renda passiva, dividendos, tesouro direto, independência',
    pct: 0.10,
    colorHex: '#10B981', // Emerald
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    iconName: 'Wallet'
  },
  EDU_10: {
    id: 'EDU_10',
    name: 'Educação Continuada',
    shortName: 'Educação',
    desc: 'Livros, capacitações, pós-graduação, cursos e ferramentas',
    pct: 0.10,
    colorHex: '#F59E0B', // Amber
    bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    textClass: 'text-amber-600 dark:text-amber-400',
    iconName: 'BookOpen'
  },
  FER_5: {
    id: 'FER_5',
    name: 'Férias & Generosidade',
    shortName: 'Férias & Doações',
    desc: 'Viagens anuais de lazer, presentes especiais e doações',
    pct: 0.05,
    colorHex: '#F43F5E', // Rose
    bgClass: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
    textClass: 'text-rose-600 dark:text-rose-400',
    iconName: 'Plane'
  },
  PJ_EXCLUIDO: {
    id: 'PJ_EXCLUIDO',
    name: 'Operação PJ (Corporativo)',
    shortName: 'PJ Operação',
    desc: 'Custos diretos da empresa, impostos DAS e convênio corporativo',
    pct: 0.0,
    colorHex: '#EA580C', // Orange
    bgClass: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900',
    textClass: 'text-orange-600 dark:text-orange-400',
    iconName: 'Building2'
  }
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // 1. Entradas Separadas de Trabalho
  { 
    id: 'tx-1', 
    date: '2026-10-10', 
    description: 'Salário CLT (Magno)', 
    amount: 2060.00, 
    type: 'receita', 
    jar: 'NEC_55', 
    costCenter: 'Magno', 
    account: 'Inter PF', 
    status: 'liquidado',
    isRecurring: true,
    category: 'Salário'
  },
  { 
    id: 'tx-2', 
    date: '2026-10-05', 
    description: 'Serviço PJ / Faturamento', 
    amount: 3060.86, 
    type: 'receita', 
    jar: 'PJ_EXCLUIDO', 
    costCenter: 'PJ', 
    account: 'Inter PJ', 
    status: 'liquidado',
    isRecurring: true,
    category: 'Faturamento PJ'
  },
  
  // 2. Financiamento Habitacional & Reembolso Nathan & Juros Cheque Especial
  { 
    id: 'tx-3', 
    date: '2026-10-15', 
    description: 'Reembolso Financiamento Apto (Nathan)', 
    amount: 858.00, 
    type: 'reembolso', 
    jar: 'NEC_55', 
    costCenter: 'Nathan', 
    account: 'Inter PF', 
    status: 'liquidado',
    isRecurring: true,
    category: 'Reembolso Moradia',
    notes: 'Nathan 60%'
  },
  { 
    id: 'tx-4', 
    date: '2026-10-25', 
    description: 'Financiamento Apto - Parcela Habitacional', 
    amount: -1290.00, 
    type: 'despesa', 
    jar: 'NEC_55', 
    costCenter: 'Magno', 
    account: 'Inter PF', 
    status: 'agendado',
    isRecurring: true,
    category: 'Moradia',
    reminderDaysBefore: 3
  },
  { 
    id: 'tx-5', 
    date: '2026-10-25', 
    description: 'Juros de Cheque Especial (Apto / Conta PF)', 
    amount: -140.00, 
    type: 'despesa', 
    jar: 'NEC_55', 
    costCenter: 'Magno', 
    account: 'Inter PF', 
    status: 'liquidado',
    isRecurring: true,
    category: 'Juros / Tarifas',
    notes: 'Evitável'
  },
  
  // 3. Despesas Essenciais do Dia a Dia (Necessidades 55%)
  { 
    id: 'tx-6', 
    date: '2026-10-07', 
    description: 'Condução Semanal (Total Mês)', 
    amount: -120.00, 
    type: 'despesa', 
    jar: 'NEC_55', 
    costCenter: 'Magno', 
    account: 'Passe', 
    status: 'liquidado',
    isRecurring: true,
    category: 'Transporte'
  },
  { 
    id: 'tx-7', 
    date: '2026-10-15', 
    description: 'Shopee / Despesas Básicas do Lar', 
    amount: -142.00, 
    type: 'despesa', 
    jar: 'NEC_55', 
    costCenter: 'Magno', 
    account: 'Inter PF', 
    status: 'liquidado',
    category: 'Casa & Utilidades'
  },
  
  // 4. Adiantamentos Salariais / Antecipação de Fluxo (Necessidades 55%)
  { 
    id: 'tx-8', 
    date: '2026-10-16', 
    description: 'Adiantamento de Salário (Blipay)', 
    amount: -126.00, 
    type: 'despesa', 
    jar: 'NEC_55', 
    costCenter: 'Magno', 
    account: 'Inter PF', 
    status: 'liquidado',
    category: 'Adiantamento'
  },
  { 
    id: 'tx-9', 
    date: '2026-10-15', 
    description: 'Adiantamento de Salário (99Pay)', 
    amount: -90.00, 
    type: 'despesa', 
    jar: 'NEC_55', 
    costCenter: 'Magno', 
    account: 'Inter PF', 
    status: 'liquidado',
    category: 'Adiantamento'
  },
  
  // 5. Cartão C6 Concentrador (Contas de Casa, Assinaturas, Transporte e Lazer)
  { 
    id: 'tx-10', 
    date: '2026-10-22', 
    description: 'Fatura Cartão C6 (Contas, Assinaturas, Transp.)', 
    amount: -2000.00, 
    type: 'despesa', 
    jar: 'NEC_55', 
    costCenter: 'Magno', 
    account: 'C6', 
    status: 'liquidado',
    isRecurring: true,
    category: 'Cartão de Crédito'
  },
  { 
    id: 'tx-11', 
    date: '2026-10-22', 
    time: '21:30',
    description: 'Fatura Cartão C6 (Lazer & Estilo)', 
    amount: -600.00, 
    type: 'despesa', 
    jar: 'DIV_10', 
    costCenter: 'Magno', 
    account: 'C6', 
    status: 'liquidado', 
    isRecurring: true, 
    category: 'Lazer'
  },
  
  // 6. Custos Operacionais PJ (Conta Inter PJ)
  { 
    id: 'tx-12', 
    date: '2026-10-23', 
    description: 'Convênio Médico PJ', 
    amount: -1296.45, 
    type: 'despesa', 
    jar: 'PJ_EXCLUIDO', 
    costCenter: 'PJ', 
    account: 'Inter PJ', 
    status: 'liquidado',
    isRecurring: true,
    category: 'Saúde PJ'
  },
  { 
    id: 'tx-13', 
    date: '2026-10-20', 
    description: 'Tributos DAS Simples Nacional', 
    amount: -172.10, 
    type: 'despesa', 
    jar: 'PJ_EXCLUIDO', 
    costCenter: 'PJ', 
    account: 'Inter PJ', 
    status: 'agendado',
    isRecurring: true,
    category: 'Impostos PJ',
    reminderDaysBefore: 2
  }
];

export const INITIAL_RECURRING: RecurringExpense[] = [
  {
    id: 'rec-1',
    description: 'Salário CLT Líquido',
    amount: 2060.00,
    amountPlanned: 2060.00,
    amountRealized: 2060.00,
    type: 'receita',
    frequency: 'mensal',
    dayOfMonth: 10,
    jar: 'NEC_55',
    account: 'Inter PF',
    costCenter: 'Magno',
    isActive: true,
    category: 'Salário',
    notes: 'Creditado todo dia 10 na conta Inter PF'
  },
  {
    id: 'rec-2',
    description: 'Serviço PJ / Faturamento',
    amount: 3060.86,
    amountPlanned: 3000.00,
    amountRealized: 3060.86,
    type: 'receita',
    frequency: 'mensal',
    dayOfMonth: 5,
    jar: 'PJ_EXCLUIDO',
    account: 'Inter PJ',
    costCenter: 'PJ',
    isActive: true,
    category: 'Faturamento',
    notes: 'Superávit realizado de +R$ 60,86 acima do orçado'
  },
  {
    id: 'rec-3',
    description: 'Reembolso Financiamento (Nathan)',
    amount: 858.00,
    amountPlanned: 858.00,
    amountRealized: 858.00,
    type: 'reembolso',
    frequency: 'mensal',
    dayOfMonth: 15,
    jar: 'NEC_55',
    account: 'Inter PF',
    costCenter: 'Nathan',
    isActive: true,
    category: 'Moradia'
  },
  {
    id: 'rec-4',
    description: 'Parcela Financiamento Apto Habitacional',
    amount: -1290.00,
    amountPlanned: 1290.00,
    amountRealized: 1290.00,
    type: 'despesa',
    frequency: 'mensal',
    dayOfMonth: 25,
    jar: 'NEC_55',
    account: 'Inter PF',
    costCenter: 'Magno',
    isActive: true,
    category: 'Moradia'
  },
  {
    id: 'rec-5',
    description: 'Fatura C6 (Contas do Lar, Luz, Água, Net)',
    amount: -2000.00,
    amountPlanned: 1950.00,
    amountRealized: 2000.00,
    type: 'despesa',
    frequency: 'mensal',
    dayOfMonth: 22,
    jar: 'NEC_55',
    account: 'C6',
    costCenter: 'Magno',
    isActive: true,
    category: 'Cartão de Crédito',
    notes: 'Variação de +R$ 50,00 no fechamento'
  },
  {
    id: 'rec-6',
    description: 'Fatura C6 (Lazer e Saídas)',
    amount: -600.00,
    amountPlanned: 600.00,
    amountRealized: 600.00,
    type: 'despesa',
    frequency: 'mensal',
    dayOfMonth: 22,
    jar: 'DIV_10',
    account: 'C6',
    costCenter: 'Magno',
    isActive: true,
    category: 'Lazer'
  },
  {
    id: 'rec-7',
    description: 'Convênio Médico Empresarial',
    amount: -1296.45,
    amountPlanned: 1250.00,
    amountRealized: 1296.45,
    type: 'despesa',
    frequency: 'mensal',
    dayOfMonth: 23,
    jar: 'PJ_EXCLUIDO',
    account: 'Inter PJ',
    costCenter: 'PJ',
    isActive: true,
    category: 'Saúde',
    notes: 'Reajuste contratual de +R$ 46,45'
  },
  {
    id: 'rec-8',
    description: 'Guia DAS Simples Nacional',
    amount: -172.10,
    amountPlanned: 180.00,
    amountRealized: 172.10,
    type: 'despesa',
    frequency: 'mensal',
    dayOfMonth: 20,
    jar: 'PJ_EXCLUIDO',
    account: 'Inter PJ',
    costCenter: 'PJ',
    isActive: true,
    category: 'Impostos',
    notes: 'Economia de R$ 7,90 em relação ao previsto'
  },
  {
    id: 'rec-9',
    description: 'Condução Semanal Recarga Passe',
    amount: -120.00,
    amountPlanned: 120.00,
    amountRealized: 120.00,
    type: 'despesa',
    frequency: 'semanal',
    dayOfWeek: 1, // Segunda-feira
    jar: 'NEC_55',
    account: 'Passe',
    costCenter: 'Magno',
    isActive: true,
    category: 'Transporte',
    notes: 'Recarga toda segunda-feira (R$ 30/semana)'
  },
  {
    id: 'rec-10',
    description: 'Almoço Diário Dias Úteis',
    amount: -22.50,
    amountPlanned: 25.00,
    amountRealized: 22.50,
    type: 'despesa',
    frequency: 'diaria',
    jar: 'NEC_55',
    account: 'Inter PF',
    costCenter: 'Magno',
    isActive: true,
    category: 'Alimentação',
    notes: 'Média diária: economizando R$ 2,50/dia'
  },
  {
    id: 'rec-11',
    description: 'Consultoria PJ Adiantamento Quinzenal',
    amount: 1000.00,
    amountPlanned: 1000.00,
    amountRealized: 1000.00,
    type: 'receita',
    frequency: 'quinzenal',
    dayOfMonth: 15,
    jar: 'PJ_EXCLUIDO',
    account: 'Inter PJ',
    costCenter: 'PJ',
    isActive: false,
    category: 'Consultoria',
    notes: 'Repasse quinzenal a cada 15 dias'
  }
];

export const INITIAL_DREAMS: DreamGoal[] = [
  {
    id: 'dream-1',
    title: 'Eliminar Juros de Cheque Especial',
    target: 1000.00,
    current: 450.00,
    monthlyDeposit: 250.00,
    category: 'Economia Imediata',
    impact: 'Estanca sangria de R$ 140,00/mês (R$ 1.680/ano economizados)',
    targetDate: '2026-12-31',
    urgencyDaysThreshold: 60,
    priority: 'alta',
    iconName: 'Zap',
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    id: 'dream-2',
    title: 'Reserva de Emergência Familiar (6 meses)',
    target: 18300.00,
    current: 1200.00,
    monthlyDeposit: 350.00,
    category: 'Segurança (PLP 10%)',
    impact: 'Proteção financeira total para família e moradia',
    targetDate: '2027-12-31',
    urgencyDaysThreshold: 90,
    priority: 'alta',
    iconName: 'ShieldAlert',
    gradient: 'from-blue-600 to-indigo-600'
  },
  {
    id: 'dream-3',
    title: 'Férias de Fim de Ano & Viagem em Família',
    target: 2500.00,
    current: 850.00,
    monthlyDeposit: 200.00,
    category: 'Experiências (FER 5%)',
    impact: 'Viagem planejada à vista, sem contrair dívidas no cartão',
    targetDate: '2026-12-20',
    urgencyDaysThreshold: 60,
    priority: 'media',
    iconName: 'Plane',
    gradient: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'dream-4',
    title: 'Carteira de Liberdade Financeira',
    target: 10000.00,
    current: 600.00,
    monthlyDeposit: 200.00,
    category: 'Renda Passiva (LIF 10%)',
    impact: 'Primeiros R$ 10.000 gerando rendimentos automáticos',
    targetDate: '2028-06-30',
    priority: 'baixa',
    iconName: 'Wallet',
    gradient: 'from-violet-500 to-purple-600'
  }
];

export const INITIAL_AUTO_RULES: AutoCategoryRule[] = [
  { id: 'rule-1', keyword: 'shopee', jar: 'NEC_55', category: 'Casa & Utilidades', costCenter: 'Magno', account: 'Inter PF' },
  { id: 'rule-2', keyword: 'uber', jar: 'NEC_55', category: 'Transporte', costCenter: 'Magno', account: 'C6' },
  { id: 'rule-3', keyword: 'restaurante', jar: 'DIV_10', category: 'Lazer', costCenter: 'Magno', account: 'C6' },
  { id: 'rule-4', keyword: 'bar', jar: 'DIV_10', category: 'Lazer', costCenter: 'Magno', account: 'C6' },
  { id: 'rule-5', keyword: 'ifood', jar: 'DIV_10', category: 'Alimentação / Lazer', costCenter: 'Magno', account: 'C6' },
  { id: 'rule-6', keyword: 'salário', jar: 'NEC_55', category: 'Salário', costCenter: 'Magno', account: 'Inter PF' },
  { id: 'rule-7', keyword: 'nathan', jar: 'NEC_55', category: 'Reembolso Moradia', costCenter: 'Nathan', account: 'Inter PF' },
  { id: 'rule-8', keyword: 'das', jar: 'PJ_EXCLUIDO', category: 'Impostos PJ', costCenter: 'PJ', account: 'Inter PJ' },
  { id: 'rule-9', keyword: 'convênio', jar: 'PJ_EXCLUIDO', category: 'Saúde PJ', costCenter: 'PJ', account: 'Inter PJ' },
  { id: 'rule-10', keyword: 'curso', jar: 'EDU_10', category: 'Educação', costCenter: 'Magno', account: 'Inter PF' },
  { id: 'rule-11', keyword: 'livro', jar: 'EDU_10', category: 'Educação', costCenter: 'Magno', account: 'Inter PF' }
];
