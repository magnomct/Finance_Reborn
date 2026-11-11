import React, { useState, useMemo } from 'react';
import { 
  Zap, Calendar, RefreshCw, Plus, CheckCircle2, AlertTriangle, 
  Trash2, ArrowRight, ShieldCheck, HelpCircle, Sparkles, Filter, 
  SlidersHorizontal, Check, Edit3, TrendingUp, TrendingDown,
  Clock, DollarSign, ArrowUpRight, ArrowDownRight, Layers, X
} from 'lucide-react';
import { Transaction, RecurringExpense, AutoCategoryRule, RecurrenceFrequency, JarType, AccountType, CostCenter } from '../types';
import { 
  formatBRL, 
  formatNumber,
  calculateDailySafeSpend, 
  generateRecurringTransactions,
  getMonthlyProjection,
  calculateRecurringVariance
} from '../utils/finance';
import { JAR_DEFINITIONS } from '../data/initialData';
import { getAllAvailableAccounts } from '../utils/customAccounts';
import { findCategoryRuleSuggestions, CategorySuggestion } from '../utils/categorySuggestions';
import { RecurringTopCategoriesCard } from './RecurringTopCategoriesCard';

interface AutomationsViewProps {
  transactions?: Transaction[];
  recurringList: RecurringExpense[];
  setRecurringList: React.Dispatch<React.SetStateAction<RecurringExpense[]>>;
  autoRules: AutoCategoryRule[];
  setAutoRules: React.Dispatch<React.SetStateAction<AutoCategoryRule[]>>;
  onGenerateRecurringForMonth: (yearMonth: string) => void;
  selectedMonth: string;
  totalBudget: number;
  totalSpent: number;
  onApplyCushionStrategy: () => void;
  cushionApplied: boolean;
}

const FREQUENCY_LABELS: Record<RecurrenceFrequency, { label: string; icon: string; cycleText: string }> = {
  mensal: { label: 'Mensal', icon: '📅', cycleText: 'por mês' },
  semanal: { label: 'Semanal', icon: '🔁', cycleText: 'por semana' },
  quinzenal: { label: 'Quinzenal', icon: '🌓', cycleText: 'por quinzena' },
  diaria: { label: 'Diária', icon: '⏰', cycleText: 'por dia' },
};

const DAY_OF_WEEK_NAMES = ['', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  transactions = [],
  recurringList,
  setRecurringList,
  autoRules,
  setAutoRules,
  onGenerateRecurringForMonth,
  selectedMonth,
  totalBudget,
  totalSpent,
  onApplyCushionStrategy,
  cushionApplied,
}) => {
  const [activeTab, setActiveTab] = useState<'recorrencias' | 'regras' | 'cheque_especial'>('recorrencias');
  const [ruleNotification, setRuleNotification] = useState<string | null>(null);

  // Category rule suggestions for unautomated common transactions
  const categorySuggestions = useMemo(() => {
    return findCategoryRuleSuggestions(transactions, autoRules);
  }, [transactions, autoRules]);

  const handleApplySuggestion = (sug: CategorySuggestion) => {
    const newRule: AutoCategoryRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      keyword: sug.keyword,
      jar: sug.jar,
      category: sug.category,
      costCenter: sug.costCenter,
      account: sug.account,
    };
    setAutoRules(prev => [...prev, newRule]);
    setRuleNotification(`Regra criada com 1 clique para "${sug.keyword}" (${sug.category})!`);
    setTimeout(() => {
      setRuleNotification(null);
    }, 4000);
  };
  
  // Filters
  const [frequencyFilter, setFrequencyFilter] = useState<'todas' | RecurrenceFrequency>('todas');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'despesa' | 'receita'>('todos');

  // New Recurring modal state
  const [isNewRecModalOpen, setIsNewRecModalOpen] = useState(false);
  const [recDesc, setRecDesc] = useState('');
  const [recAmountPlanned, setRecAmountPlanned] = useState('');
  const [recAmountRealized, setRecAmountRealized] = useState('');
  const [recFrequency, setRecFrequency] = useState<RecurrenceFrequency>('mensal');
  const [recDay, setRecDay] = useState(10);
  const [recDayOfWeek, setRecDayOfWeek] = useState(5); // Sexta
  const [recType, setRecType] = useState<'receita' | 'despesa' | 'reembolso'>('despesa');
  const [recJar, setRecJar] = useState<JarType>('NEC_55');
  const [recAccount, setRecAccount] = useState<AccountType>('Inter PF');
  const [recCostCenter, setRecCostCenter] = useState<CostCenter>('Magno');
  const [recNotes, setRecNotes] = useState('');

  // Edit Realized modal state
  const [editingItem, setEditingItem] = useState<RecurringExpense | null>(null);
  const [editRealizedInput, setEditRealizedInput] = useState('');

  // New Rule state
  const [isNewRuleModalOpen, setIsNewRuleModalOpen] = useState(false);
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleJar, setRuleJar] = useState<JarType>('NEC_55');

  // Safe daily spend calculation
  const safeDaily = calculateDailySafeSpend(totalBudget, totalSpent, 27, 31);

  // Filtered recurring list
  const filteredList = useMemo(() => {
    return recurringList.filter(item => {
      const matchFreq = frequencyFilter === 'todas' || (item.frequency || 'mensal') === frequencyFilter;
      const matchType = typeFilter === 'todos' || item.type === typeFilter;
      return matchFreq && matchType;
    });
  }, [recurringList, frequencyFilter, typeFilter]);

  // Aggregate metrics (Planned vs Realized projected to monthly scale)
  const monthlyMetrics = useMemo(() => {
    let plannedIncome = 0;
    let realizedIncome = 0;
    let plannedExpense = 0;
    let realizedExpense = 0;

    recurringList.filter(r => r.isActive).forEach(r => {
      const freq = r.frequency || 'mensal';
      const p = getMonthlyProjection(r.amountPlanned ?? r.amount, freq);
      const rVal = r.amountRealized !== undefined 
        ? getMonthlyProjection(r.amountRealized, freq) 
        : p;

      if (r.type === 'receita') {
        plannedIncome += p;
        realizedIncome += rVal;
      } else {
        plannedExpense += p;
        realizedExpense += rVal;
      }
    });

    const plannedBalance = plannedIncome - plannedExpense;
    const realizedBalance = realizedIncome - realizedExpense;
    const expenseDiff = realizedExpense - plannedExpense; // > 0 = estouro, < 0 = economia
    const incomeDiff = realizedIncome - plannedIncome;     // > 0 = superávit, < 0 = deficit
    const netVariance = realizedBalance - plannedBalance;

    return {
      plannedIncome,
      realizedIncome,
      incomeDiff,
      plannedExpense,
      realizedExpense,
      expenseDiff,
      plannedBalance,
      realizedBalance,
      netVariance,
    };
  }, [recurringList]);

  const toggleRecurringActive = (id: string) => {
    setRecurringList(prev => prev.map(item => 
      item.id === id ? { ...item, isActive: !item.isActive } : item
    ));
  };

  const deleteRecurring = (id: string) => {
    setRecurringList(prev => prev.filter(item => item.id !== id));
  };

  const handleAddRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recDesc || !recAmountPlanned) return;

    const plannedVal = parseFloat(recAmountPlanned);
    const realizedVal = recAmountRealized ? parseFloat(recAmountRealized) : undefined;

    const newRec: RecurringExpense = {
      id: `rec-${Date.now()}`,
      description: recDesc,
      amount: recType === 'despesa' ? -Math.abs(plannedVal) : Math.abs(plannedVal),
      amountPlanned: Math.abs(plannedVal),
      amountRealized: realizedVal !== undefined ? Math.abs(realizedVal) : undefined,
      type: recType,
      frequency: recFrequency,
      dayOfMonth: recFrequency === 'semanal' ? undefined : recDay,
      dayOfWeek: recFrequency === 'semanal' ? recDayOfWeek : undefined,
      jar: recJar,
      account: recAccount,
      costCenter: recCostCenter,
      isActive: true,
      category: recDesc,
      notes: recNotes.trim() || undefined,
    };

    setRecurringList([...recurringList, newRec]);
    setRecDesc('');
    setRecAmountPlanned('');
    setRecAmountRealized('');
    setRecNotes('');
    setIsNewRecModalOpen(false);
  };

  const openEditRealizedModal = (item: RecurringExpense) => {
    setEditingItem(item);
    setEditRealizedInput(item.amountRealized !== undefined ? String(item.amountRealized) : '');
  };

  const handleSaveRealized = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const parsed = editRealizedInput.trim() === '' ? undefined : parseFloat(editRealizedInput);
    setRecurringList(prev => prev.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          amountRealized: parsed,
          // Mantém compatibilidade com amount antigo
          amount: item.type === 'despesa' 
            ? -Math.abs(parsed ?? item.amountPlanned) 
            : Math.abs(parsed ?? item.amountPlanned)
        };
      }
      return item;
    }));

    setEditingItem(null);
    setEditRealizedInput('');
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleKeyword) return;

    const newRule: AutoCategoryRule = {
      id: `rule-${Date.now()}`,
      keyword: ruleKeyword.trim(),
      jar: ruleJar,
      category: ruleCategory || 'Geral',
      costCenter: 'Magno',
      account: 'Inter PF',
    };

    setAutoRules([...autoRules, newRule]);
    setRuleKeyword('');
    setRuleCategory('');
    setIsNewRuleModalOpen(false);
  };

  const deleteRule = (id: string) => {
    setAutoRules(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6">
      
      {/* Header com Diária Segura Automática */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white p-5 rounded-3xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-white/20 text-white">
              <Zap className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-blue-100">
              Controle Automático & Inteligência
            </span>
          </div>
          <h2 className="text-xl font-black">Automação de Gastos Mensais & Recorrências</h2>
          <p className="text-xs text-blue-100 mt-0.5 max-w-xl">
            Acompanhe o <strong>Previsto x Realizado</strong> de despesas e receitas em todas as frequências (diária, semanal, quinzenal e mensal) com cálculo de desvios e sincronização automática.
          </p>
        </div>

        {/* Card Diária Segura */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl shrink-0 text-right">
          <span className="text-[10px] text-blue-200 uppercase font-bold block">
            Diária Segura Recomendada
          </span>
          <span className="text-xl font-black text-white">
            {formatBRL(safeDaily.safePerDay)} / dia
          </span>
          <span className="text-[10px] text-blue-100 block mt-0.5">
            Pelos próximos {safeDaily.remainingDays} dias sem ultrapassar a meta
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm gap-1">
        <button
          onClick={() => setActiveTab('recorrencias')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'recorrencias'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Previsto x Realizado ({recurringList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('regras')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'regras'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
          data-testid="tab-regras"
        >
          <Sparkles className="w-4 h-4" />
          <span>Regras de Categorização ({autoRules.length})</span>
          {categorySuggestions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse">
              {categorySuggestions.length} sugestõ{categorySuggestions.length === 1 ? 'e' : 'es'}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('cheque_especial')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'cheque_especial'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Escudo Cheque Especial</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* ABA 1: RECORRÊNCIAS COM PREVISTO X REALIZADO               */}
      {/* ========================================================= */}
      {activeTab === 'recorrencias' && (
        <div className="space-y-4">

          {/* KPI Dashboard: Resumo Mensal Previsto x Realizado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card 1: Receitas Recorrentes */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Receitas Recorrentes (Mês)
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  monthlyMetrics.incomeDiff >= 0 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                }`}>
                  {monthlyMetrics.incomeDiff >= 0 ? '+' : ''}{formatBRL(monthlyMetrics.incomeDiff)}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Realizado</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatBRL(monthlyMetrics.realizedIncome)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold">Previsto</span>
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {formatBRL(monthlyMetrics.plannedIncome)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (monthlyMetrics.realizedIncome / (monthlyMetrics.plannedIncome || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Card 2: Despesas Recorrentes */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  Despesas Recorrentes (Mês)
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  monthlyMetrics.expenseDiff <= 0 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                }`}>
                  {monthlyMetrics.expenseDiff > 0 ? `+${formatBRL(monthlyMetrics.expenseDiff)} Estouro` : `${formatBRL(Math.abs(monthlyMetrics.expenseDiff))} Economia`}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Realizado</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {formatBRL(monthlyMetrics.realizedExpense)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold">Previsto (Teto)</span>
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {formatBRL(monthlyMetrics.plannedExpense)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    monthlyMetrics.realizedExpense > monthlyMetrics.plannedExpense ? 'bg-rose-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, (monthlyMetrics.realizedExpense / (monthlyMetrics.plannedExpense || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Card 3: Saldo Projetado Previsto x Realizado */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-indigo-400" />
                  Saldo Líquido Recorrente
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  monthlyMetrics.netVariance >= 0 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  Desvio: {monthlyMetrics.netVariance >= 0 ? '+' : ''}{formatBRL(monthlyMetrics.netVariance)}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <div>
                  <span className="text-[10px] text-indigo-200 block font-semibold">Saldo Real</span>
                  <span className="text-xl font-black text-white">
                    {formatBRL(monthlyMetrics.realizedBalance)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-indigo-200 block font-semibold">Saldo Previsto</span>
                  <span className="text-sm font-bold text-indigo-300">
                    {formatBRL(monthlyMetrics.plannedBalance)}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-indigo-200/80 mt-2.5">
                {monthlyMetrics.netVariance >= 0 
                  ? '✨ Seu resultado recorrente está superior ao orçado inicialmente.'
                  : '⚠️ Atenção: gastos recorrentes estão superando as projeções previstas.'}
              </p>
            </div>
          </div>

          {/* Gráfico de Barras Horizontal: 3 Maiores Categorias Recorrentes */}
          <RecurringTopCategoriesCard recurringList={recurringList} />

          {/* Action & Filter Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pt-2">
            {/* Frequency Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Frequência:
              </span>
              {(['todas', 'mensal', 'semanal', 'quinzenal', 'diaria'] as const).map(freq => {
                const count = freq === 'todas' 
                  ? recurringList.length 
                  : recurringList.filter(r => (r.frequency || 'mensal') === freq).length;

                return (
                  <button
                    key={freq}
                    onClick={() => setFrequencyFilter(freq)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      frequencyFilter === freq
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{freq === 'todas' ? 'Todas' : FREQUENCY_LABELS[freq].icon + ' ' + FREQUENCY_LABELS[freq].label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      frequencyFilter === freq ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 self-end lg:self-auto">
              <button
                onClick={() => onGenerateRecurringForMonth(selectedMonth || '2026-10')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                title="Lançar automaticamente as recorrências no mês selecionado"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sincronizar no Mês</span>
              </button>

              <button
                onClick={() => setIsNewRecModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Recorrência</span>
              </button>
            </div>
          </div>

          {/* List of Recurring Expenses (Previsto x Realizado) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredList.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">Nenhuma recorrência encontrada para este filtro.</p>
              </div>
            ) : (
              filteredList.map(item => {
                const jarDef = JAR_DEFINITIONS[item.jar] || JAR_DEFINITIONS.NEC_55;
                const isPositive = item.type === 'receita';
                const frequency = item.frequency || 'mensal';
                const freqInfo = FREQUENCY_LABELS[frequency];

                const plannedCycle = Math.abs(item.amountPlanned ?? item.amount);
                const realizedCycle = item.amountRealized !== undefined ? Math.abs(item.amountRealized) : undefined;
                
                const plannedMonthly = getMonthlyProjection(plannedCycle, frequency);
                const realizedMonthly = realizedCycle !== undefined ? getMonthlyProjection(realizedCycle, frequency) : undefined;

                const variance = realizedCycle !== undefined 
                  ? calculateRecurringVariance(plannedCycle, realizedCycle, item.type)
                  : null;

                return (
                  <div 
                    key={item.id}
                    className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* Left: Icon, Frequency Badge, Description & Tags */}
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Frequency Badge */}
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex flex-col items-center justify-center font-bold text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                        <span className="text-base">{freqInfo.icon}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">
                          {frequency === 'semanal' 
                            ? `D${item.dayOfWeek ?? 5}` 
                            : frequency === 'diaria' 
                            ? '30d' 
                            : `D${item.dayOfMonth ?? 10}`}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {item.description}
                          </h4>
                          <span 
                            className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                            style={{ backgroundColor: `${jarDef.colorHex}15`, color: jarDef.colorHex }}
                          >
                            {jarDef.shortName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {freqInfo.label} • {frequency === 'semanal' 
                              ? (item.dayOfWeek ? DAY_OF_WEEK_NAMES[item.dayOfWeek] : 'Toda Sexta')
                              : frequency === 'quinzenal'
                              ? `Dias ${item.dayOfMonth ?? 5} e ${(item.dayOfMonth ?? 5) + 15}`
                              : frequency === 'diaria'
                              ? 'Diário (x30)'
                              : `Dia ${item.dayOfMonth ?? 10}`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <span className="font-semibold text-slate-500">{item.account}</span>
                          <span>•</span>
                          <span>{item.costCenter}</span>
                          <span>•</span>
                          <span>{item.category || item.description}</span>
                          {item.notes && (
                            <>
                              <span>•</span>
                              <span className="italic text-slate-400">{item.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Center / Right: Previsto vs Realizado & Desvio */}
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                      
                      {/* Previsto */}
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                          Valor Previsto
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-300">
                          {formatBRL(plannedCycle)}
                        </span>
                        {frequency !== 'mensal' && (
                          <span className="text-[10px] text-slate-400 block font-medium">
                            ≈ {formatBRL(plannedMonthly)}/mês
                          </span>
                        )}
                      </div>

                      {/* Realizado */}
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                          Valor Realizado
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs sm:text-sm font-black ${
                            realizedCycle !== undefined
                              ? isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                              : 'text-amber-500 italic font-semibold text-xs'
                          }`}>
                            {realizedCycle !== undefined ? formatBRL(realizedCycle) : 'Não informado'}
                          </span>
                          
                          {/* Quick Edit Realized Button */}
                          <button
                            onClick={() => openEditRealizedModal(item)}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition"
                            title="Ajustar valor efetivamente realizado"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {frequency !== 'mensal' && realizedMonthly !== undefined && (
                          <span className="text-[10px] text-slate-400 block font-medium">
                            ≈ {formatBRL(realizedMonthly)}/mês
                          </span>
                        )}
                      </div>

                      {/* Desvio (Previsto x Realizado) */}
                      <div className="min-w-[120px] text-right">
                        {variance ? (
                          <div>
                            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold ${
                              variance.isEqual
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                : variance.isFavorable
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}>
                              {variance.isEqual ? (
                                <span>No teto (0%)</span>
                              ) : (
                                <>
                                  {variance.isFavorable ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                                  <span>
                                    {variance.diff > 0 ? '+' : ''}{formatBRL(variance.diff)} ({variance.percentage > 0 ? '+' : ''}{formatNumber(variance.percentage)}%)
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="text-[9px] block text-slate-400 font-medium mt-0.5">
                              {variance.statusText}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => openEditRealizedModal(item)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 transition"
                          >
                            + Informar Real
                          </button>
                        )}
                      </div>

                      {/* Actions: Pause & Delete */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => toggleRecurringActive(item.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            item.isActive 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                              : 'bg-slate-100 text-slate-400 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {item.isActive ? <Check className="w-3 h-3" /> : null}
                          <span>{item.isActive ? 'Ativa' : 'Pausada'}</span>
                        </button>

                        <button
                          onClick={() => deleteRecurring(item.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Excluir recorrência"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 2: REGRAS INTELIGENTES DE CATEGORIZAÇÃO               */}
      {/* ========================================================= */}
      {activeTab === 'regras' && (
        <div className="space-y-5">
          {/* Feedback banner ao criar regra com 1 clique */}
          {ruleNotification && (
            <div 
              className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-emerald-800 dark:text-emerald-200 text-xs font-semibold animate-in fade-in"
              data-testid="notification-rule-created"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{ruleNotification}</span>
              </div>
              <button 
                onClick={() => setRuleNotification(null)}
                className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* PAINEL DE SUGESTÕES DE CATEGORIAS / REGRAS COM 1 CLIQUE */}
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-300 dark:border-amber-800/80 rounded-3xl p-5 shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      Sugestões Automáticas de Categorização
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      1 Clique
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Identificamos padrões em transações comuns que ainda não possuem regra. Adicione com um clique:
                  </p>
                </div>
              </div>

              {categorySuggestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    categorySuggestions.forEach(sug => {
                      const newRule: AutoCategoryRule = {
                        id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        keyword: sug.keyword,
                        jar: sug.jar,
                        category: sug.category,
                        costCenter: sug.costCenter,
                        account: sug.account,
                      };
                      setAutoRules(prev => [...prev, newRule]);
                    });
                    setRuleNotification(`Todas as ${categorySuggestions.length} regras sugeridas foram criadas!`);
                    setTimeout(() => setRuleNotification(null), 4000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm hover:shadow"
                  data-testid="btn-add-all-suggestions"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Adicionar Todas ({categorySuggestions.length})</span>
                </button>
              )}
            </div>

            {categorySuggestions.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Todas as transações comuns já estão automatizadas!
                </h4>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-0.5">
                  Conforme você cadastrar novos gastos no Extrato ou lançamentos rápidos, novas sugestões inteligentes aparecerão aqui para otimizar sua rotina.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {categorySuggestions.map(sug => {
                  const jarDef = JAR_DEFINITIONS[sug.jar] || JAR_DEFINITIONS.NEC_55;
                  return (
                    <div
                      key={sug.keyword}
                      className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-600 transition shadow-sm flex flex-col justify-between gap-3 group"
                      data-testid={`card-suggestion-${sug.keyword}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                            "{sug.keyword}"
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {sug.frequency}x nas transações
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-400 font-medium">Categoria:</span>
                            <strong className="text-slate-800 dark:text-white font-bold truncate">
                              {sug.category}
                            </strong>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[11px]">Pote:</span>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{ backgroundColor: `${jarDef.colorHex}15`, color: jarDef.colorHex }}
                            >
                              {jarDef.shortName}
                            </span>
                          </div>

                          {sug.sampleDescriptions.length > 0 && (
                            <div className="text-[10px] text-slate-400 truncate italic pt-0.5">
                              Ex: {sug.sampleDescriptions[0]}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplySuggestion(sug)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 hover:text-white dark:bg-amber-950/40 dark:hover:bg-amber-600 text-amber-900 dark:text-amber-200 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-amber-300 dark:border-amber-800 group-hover:border-transparent cursor-pointer active:scale-95"
                        data-testid={`btn-apply-suggestion-${sug.keyword}`}
                        title={`Criar regra para classificar automaticamente "${sug.keyword}" como ${sug.category} (${jarDef.shortName})`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Criar Regra com 1 Clique</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LISTA DE REGRAS ATIVAS */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Regras de Auto-categorização Ativas ({autoRules.length})
              </h3>
              <p className="text-xs text-slate-500">
                Ao digitar uma palavra-chave no lançamento rápido, o Yupee pré-seleciona o pote e a categoria.
              </p>
            </div>

            <button
              onClick={() => setIsNewRuleModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-sm transition"
              data-testid="btn-nova-regra-manual"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Regra Manual</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {autoRules.map(rule => {
              const jarDef = JAR_DEFINITIONS[rule.jar] || JAR_DEFINITIONS.NEC_55;
              return (
                <div 
                  key={rule.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-200">
                          "{rule.keyword}"
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span 
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: `${jarDef.colorHex}15`, color: jarDef.colorHex }}
                        >
                          {jarDef.shortName}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Categoria sugerida: <strong className="text-slate-600 dark:text-slate-300">{rule.category}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 3: ESCUDO CHEQUE ESPECIAL                             */}
      {/* ========================================================= */}
      {activeTab === 'cheque_especial' && (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-3xl">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-2xl bg-amber-500 text-white shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Proteção Ativa contra Juros e Cheque Especial
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Quando despesas fixas vencem antes das receitas do mês (como dia 10 ou 20), o saldo diário pode ficar negativo temporariamente. O Yupee calcula uma almofada de segurança para você nunca pagar tarifas bancárias desnecessárias.
                </p>

                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    onClick={onApplyCushionStrategy}
                    disabled={cushionApplied}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      cushionApplied 
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{cushionApplied ? 'Estratégia de Almofada Aplicada!' : 'Ativar Almofada Protetora (+R$ 1.000)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NOVA RECORRÊNCIA COM PREVISTO X REALIZADO           */}
      {/* ========================================================= */}
      {isNewRecModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full p-6 rounded-3xl shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Nova Recorrência Prevista x Realizada
                </h3>
                <p className="text-xs text-slate-500">
                  Configure frequências (diária, semanal, quinzenal ou mensal) e compare valores previstos com realizados.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddRecurring} className="space-y-4 text-xs">
              
              {/* Descrição */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fatura C6, Aluguel, Condução Semanal, Almoço Diário"
                  value={recDesc}
                  onChange={e => setRecDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Frequência */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Frequência da Recorrência</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['mensal', 'semanal', 'quinzenal', 'diaria'] as const).map(freq => (
                    <button
                      type="button"
                      key={freq}
                      onClick={() => setRecFrequency(freq)}
                      className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition ${
                        recFrequency === freq
                          ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-sm">{FREQUENCY_LABELS[freq].icon}</span>
                      <span>{FREQUENCY_LABELS[freq].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data / Dia de acordo com a frequência */}
              <div className="grid grid-cols-2 gap-3">
                {recFrequency === 'semanal' ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Dia da Semana</label>
                    <select
                      value={recDayOfWeek}
                      onChange={e => setRecDayOfWeek(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                    >
                      <option value="1">Segunda-feira</option>
                      <option value="2">Terça-feira</option>
                      <option value="3">Quarta-feira</option>
                      <option value="4">Quinta-feira</option>
                      <option value="5">Sexta-feira</option>
                      <option value="6">Sábado</option>
                      <option value="7">Domingo</option>
                    </select>
                  </div>
                ) : recFrequency === 'quinzenal' ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Dia Inicial da Quinzena</label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={recDay}
                      onChange={e => setRecDay(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">Repetirá dia {recDay} e dia {recDay + 15}</span>
                  </div>
                ) : recFrequency === 'diaria' ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Ciclo Diário</label>
                    <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs">
                      Todos os dias (x30 no mês)
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Dia do Mês (Vencimento)</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={recDay}
                      onChange={e => setRecDay(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Tipo de Operação</label>
                  <select
                    value={recType}
                    onChange={e => setRecType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="despesa">Despesa (-)</option>
                    <option value="receita">Receita (+)</option>
                    <option value="reembolso">Reembolso</option>
                  </select>
                </div>
              </div>

              {/* Valores: Previsto (Orçado) e Realizado Atual */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    Valor Previsto (Orçado) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={recAmountPlanned}
                      onChange={e => setRecAmountPlanned(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Meta de custo/receita
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    Valor Realizado (Opcional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00 (se já ocorreu)"
                      value={recAmountRealized}
                      onChange={e => setRecAmountRealized(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Efetivamente cobrado/pago
                  </span>
                </div>
              </div>

              {/* Live Projection Banner */}
              {recAmountPlanned && !isNaN(parseFloat(recAmountPlanned)) && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200 flex items-center gap-2.5">
                  <span className="text-base">💡</span>
                  <div className="text-[11px] leading-tight">
                    <strong>Projeção Orçamentária Mensal:</strong> {formatBRL(parseFloat(recAmountPlanned))} {FREQUENCY_LABELS[recFrequency].cycleText} equivalerá a aproximadamente{' '}
                    <strong className="underline text-blue-900 dark:text-blue-100">
                      {formatBRL(getMonthlyProjection(parseFloat(recAmountPlanned), recFrequency))}
                    </strong>{' '}
                    no seu mês!
                  </div>
                </div>
              )}

              {/* Classificação: Pote, Conta e Centro de Custo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Pote</label>
                  <select
                    value={recJar}
                    onChange={e => setRecJar(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="NEC_55">55% Necessidades</option>
                    <option value="DIV_10">10% Lazer / Estilo</option>
                    <option value="PLP_10">10% Reserva</option>
                    <option value="LIF_10">10% Liberdade</option>
                    <option value="EDU_10">10% Educação</option>
                    <option value="FER_5">5% Férias</option>
                    <option value="PJ_EXCLUIDO">PJ Operação</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Conta Bancária</label>
                  <select
                    value={recAccount}
                    onChange={e => setRecAccount(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    {getAllAvailableAccounts().map(acc => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Centro de Custo</label>
                  <select
                    value={recCostCenter}
                    onChange={e => setRecCostCenter(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Magno">Magno</option>
                    <option value="Nathan">Nathan</option>
                    <option value="Suzy">Suzy</option>
                    <option value="PJ">PJ</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Notas / Detalhes (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Vencimento todo dia útil, reajuste em janeiro"
                  value={recNotes}
                  onChange={e => setRecNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewRecModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold shadow-md hover:bg-blue-700 transition"
                >
                  Salvar Recorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AJUSTAR VALOR REALIZADO EFETIVO                     */}
      {/* ========================================================= */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full p-6 rounded-3xl shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Edit3 className="w-4 h-4" />
                </span>
                <span className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400">
                  Ajuste de Execução
                </span>
              </div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Informar Realizado: {editingItem.description}
              </h3>
              <p className="text-xs text-slate-500">
                Frequência: {FREQUENCY_LABELS[editingItem.frequency || 'mensal'].label} ({FREQUENCY_LABELS[editingItem.frequency || 'mensal'].cycleText})
              </p>
            </div>

            <form onSubmit={handleSaveRealized} className="space-y-4 text-xs">
              
              {/* Resumo do Previsto */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Valor Previsto (Orçado)</span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">
                    {formatBRL(editingItem.amountPlanned ?? editingItem.amount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Projeção Mensal Prevista</span>
                  <span className="text-xs font-bold text-slate-500">
                    {formatBRL(getMonthlyProjection(editingItem.amountPlanned ?? editingItem.amount, editingItem.frequency))}
                  </span>
                </div>
              </div>

              {/* Input Realizado */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  Valor Efetivamente Realizado (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Deixe em branco para remover o realizado"
                    value={editRealizedInput}
                    onChange={e => setEditRealizedInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm"
                    autoFocus
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Informe o valor que foi de fato cobrado ou recebido neste ciclo.
                </span>
              </div>

              {/* Desvio Resultante Preview */}
              {editRealizedInput !== '' && !isNaN(parseFloat(editRealizedInput)) && (
                (() => {
                  const p = editingItem.amountPlanned ?? editingItem.amount;
                  const r = parseFloat(editRealizedInput);
                  const previewVar = calculateRecurringVariance(p, r, editingItem.type);
                  return (
                    <div className={`p-3 rounded-2xl border ${
                      previewVar.isFavorable
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-200'
                    }`}>
                      <div className="flex items-center justify-between font-bold">
                        <span>Desvio Apurado:</span>
                        <span>{previewVar.diff > 0 ? '+' : ''}{formatBRL(previewVar.diff)} ({previewVar.percentage > 0 ? '+' : ''}{formatNumber(previewVar.percentage)}%)</span>
                      </div>
                      <span className="text-[11px] block mt-0.5 opacity-90">{previewVar.statusText}</span>
                    </div>
                  );
                })()
              )}

              <div className="pt-2 flex justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditRealizedInput('');
                  }}
                  className="text-rose-500 hover:text-rose-600 font-semibold text-xs"
                >
                  Limpar Realizado
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded-xl text-slate-500 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm"
                  >
                    Salvar Realizado
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Regra */}
      {isNewRuleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full p-6 rounded-3xl shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Nova Regra de Auto-categorização
            </h3>

            <form onSubmit={handleAddRule} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Se a descrição contiver a palavra-chave:
                </label>
                <input
                  type="text"
                  placeholder="Ex: netflix, spotify, drogaria, posto"
                  value={ruleKeyword}
                  onChange={e => setRuleKeyword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Categorizar no Pote:
                </label>
                <select
                  value={ruleJar}
                  onChange={e => setRuleJar(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="NEC_55">55% Necessidades Básicas</option>
                  <option value="DIV_10">10% Diversão & Estilo</option>
                  <option value="PLP_10">10% Reserva & Poupança Longo Prazo</option>
                  <option value="LIF_10">10% Liberdade Financeira</option>
                  <option value="EDU_10">10% Educação Continuada</option>
                  <option value="FER_5">5% Férias & Generosidade</option>
                  <option value="PJ_EXCLUIDO">PJ Operacional</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Nome da Categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Assinaturas Digitais, Farmácia, Combustível"
                  value={ruleCategory}
                  onChange={e => setRuleCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-500 text-white font-bold shadow-md hover:bg-blue-600 transition"
                >
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
