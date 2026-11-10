import React, { useState, useMemo } from 'react';
import { 
  Cloud, Plus, Zap, ShieldAlert, Plane, Wallet, PiggyBank, 
  BookOpen, Smile, TrendingUp, CheckCircle2, Calendar, Target,
  Sparkles, DollarSign, Clock, AlertTriangle, AlertOctagon, Flame,
  Hourglass, X, Filter
} from 'lucide-react';
import { DreamGoal, DreamPriority, Transaction, DreamSortOption, RecurringExpense } from '../types';
import { formatBRL } from '../utils/finance';
import { DreamDepositChecklist } from './DreamDepositChecklist';
import { DreamsDonutChart } from './DreamsDonutChart';
import { DeadlineSimulatorModal } from './DeadlineSimulatorModal';
import { CompoundInterestCalculator } from './CompoundInterestCalculator';
import { 
  calculateSuggestedMonthlyDeposit, 
  calculateEstimatedTimeToGoal, 
  calculateContributionSuggestion,
  mapDreamTo6Jar,
  sortDreams 
} from '../utils/dreamCalculations';
import { 
  calculateDreamUrgency, 
  getCriticalDreams, 
  DEFAULT_URGENCY_DAYS_THRESHOLD,
  URGENCY_PRESET_DAYS 
} from '../utils/dreamUrgency';
import { 
  calculateDreamCountdown, 
  updateDreamPriority, 
  updateDreamTargetDate,
  getPriorityConfig 
} from '../utils/dreamCountdown';

interface SonhosViewProps {
  dreams: DreamGoal[];
  setDreams: React.Dispatch<React.SetStateAction<DreamGoal[]>>;
  onAddTransaction: (tx: Partial<Transaction>) => void;
  recurringList?: RecurringExpense[];
  setRecurringList?: React.Dispatch<React.SetStateAction<RecurringExpense[]>>;
  onNavigateToScreen?: (screen: string) => void;
}

export const SonhosView: React.FC<SonhosViewProps> = ({
  dreams,
  setDreams,
  onAddTransaction,
  recurringList = [],
  setRecurringList,
  onNavigateToScreen
}) => {
  const [selectedDreamForDeposit, setSelectedDreamForDeposit] = useState<DreamGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [isNewDreamModalOpen, setIsNewDreamModalOpen] = useState(false);
  const [simulatorDream, setSimulatorDream] = useState<DreamGoal | null>(null);
  const [activeCalculatorDream, setActiveCalculatorDream] = useState<DreamGoal | null>(null);

  // New dream fields
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [monthlyDeposit, setMonthlyDeposit] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<DreamPriority>('media');
  const [category, setCategory] = useState('Reserva (PLP 10%)');
  const [impact, setImpact] = useState('');
  const [urgencyThreshold, setUrgencyThreshold] = useState<number>(DEFAULT_URGENCY_DAYS_THRESHOLD);
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | DreamPriority>('ALL');
  const [sortOption, setSortOption] = useState<DreamSortOption>('urgency');

  const criticalGoals = useMemo(() => getCriticalDreams(dreams), [dreams]);

  const displayedDreams = useMemo(() => {
    const filtered = priorityFilter === 'ALL'
      ? dreams
      : dreams.filter(d => (d.priority || 'media') === priorityFilter);
    return sortDreams(filtered, sortOption);
  }, [dreams, priorityFilter, sortOption]);

  const handleUpdatePriority = (dreamId: string, newPriority: DreamPriority) => {
    setDreams(prev => updateDreamPriority(prev, dreamId, newPriority));
  };

  const handleUpdateTargetDate = (dreamId: string, newDate: string) => {
    setDreams(prev => updateDreamTargetDate(prev, dreamId, newDate));
  };

  const handleUpdateMonthlyDeposit = (dreamId: string, newDeposit: number) => {
    setDreams(prev => prev.map(d => d.id === dreamId ? { ...d, monthlyDeposit: Math.max(0, newDeposit) } : d));
  };

  const handleApplyAllCriticalDeposits = () => {
    setDreams(prev => prev.map(d => {
      const urg = calculateDreamUrgency(d);
      if (urg.isCritical && urg.requiredMonthlyDeposit > 0) {
        return { ...d, monthlyDeposit: urg.requiredMonthlyDeposit };
      }
      return d;
    }));
  };

  const handleApplySuggestedDeposit = (dreamId: string, suggestedAmount: number) => {
    setDreams(prev => prev.map(d => {
      if (d.id === dreamId) {
        return { ...d, monthlyDeposit: suggestedAmount };
      }
      return d;
    }));
  };

  /**
   * Integrates the dream's suggested monthly contribution as a recurring item in the 6 Potes system.
   */
  const handleIntegrateWith6Jars = (dream: DreamGoal, suggestedAmount: number) => {
    if (suggestedAmount <= 0) return;
    const jarInfo = mapDreamTo6Jar(dream.category, dream.title);

    // 1. Update dream's monthlyDeposit
    setDreams(prev => prev.map(d => d.id === dream.id ? { ...d, monthlyDeposit: suggestedAmount } : d));

    // 2. Add or update recurring item in recurringList if setter is provided
    if (setRecurringList) {
      setRecurringList(prev => {
        const existingIdx = prev.findIndex(r => r.id === `rec-dream-${dream.id}` || r.description.includes(dream.title));
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            amount: -Math.abs(suggestedAmount),
            amountPlanned: suggestedAmount,
            jar: jarInfo.jar,
            isActive: true,
          };
          return updated;
        } else {
          const newRecurring: RecurringExpense = {
            id: `rec-dream-${dream.id}`,
            description: `Aporte Recorrente: ${dream.title}`,
            amount: -Math.abs(suggestedAmount),
            amountPlanned: suggestedAmount,
            type: 'despesa',
            frequency: 'mensal',
            dayOfMonth: 10,
            jar: jarInfo.jar,
            account: 'Inter PF',
            costCenter: 'Magno',
            isActive: true,
            category: dream.category || 'Sonhos & Poupança',
            notes: `Integrado aos 6 Potes (${jarInfo.jarShortName})`
          };
          return [...prev, newRecurring];
        }
      });
    }

    setNotification(`Aporte de ${formatBRL(suggestedAmount)}/mês integrado com sucesso ao ${jarInfo.jarName}!`);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSaveSimulatedDream = (updatedDream: DreamGoal) => {
    setDreams(prev => prev.map(d => d.id === updatedDream.id ? updatedDream : d));
    setSimulatorDream(null);
  };

  // Dynamic suggested monthly deposit for new dream modal
  const newDreamCalc = useMemo(() => {
    const t = parseFloat(target) || 0;
    return calculateSuggestedMonthlyDeposit(t, 0, targetDate);
  }, [target, targetDate]);

  const handleDirectDeposit = (dream: DreamGoal, val: number) => {
    if (val <= 0) return;
    setDreams(prev => prev.map(d => {
      if (d.id === dream.id) {
        return { ...d, current: d.current + val };
      }
      return d;
    }));

    onAddTransaction({
      description: `Aporte Mensal: ${dream.title}`,
      amount: -Math.abs(val),
      type: 'despesa',
      jar: 'PLP_10',
      account: 'Inter PF',
      costCenter: 'Magno',
      status: 'liquidado',
      category: 'Sonhos & Poupança'
    });
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDreamForDeposit || !depositAmount) return;

    const val = parseFloat(depositAmount);
    if (isNaN(val) || val <= 0) return;

    // 1. Update dream state
    setDreams(prev => prev.map(d => {
      if (d.id === selectedDreamForDeposit.id) {
        return { ...d, current: d.current + val };
      }
      return d;
    }));

    // 2. Also record a transaction in PLP_10
    onAddTransaction({
      description: `Aporte Sonho: ${selectedDreamForDeposit.title}`,
      amount: -Math.abs(val),
      type: 'despesa',
      jar: 'PLP_10',
      account: 'Inter PF',
      costCenter: 'Magno',
      status: 'liquidado',
      category: 'Sonhos & Poupança'
    });

    setDepositAmount('');
    setSelectedDreamForDeposit(null);
  };

  const handleCreateDream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !target) return;

    const targetVal = parseFloat(target);
    const depositVal = parseFloat(monthlyDeposit) || (newDreamCalc.suggestedMonthlyDeposit > 0 ? newDreamCalc.suggestedMonthlyDeposit : 100);

    const newDream: DreamGoal = {
      id: `dream-${Date.now()}`,
      title,
      target: targetVal,
      current: 0,
      monthlyDeposit: depositVal,
      category,
      impact: impact || 'Meta financeira planejada',
      targetDate: targetDate || undefined,
      urgencyDaysThreshold: targetDate ? urgencyThreshold : undefined,
      priority,
      iconName: 'Target',
      gradient: 'from-blue-500 to-indigo-600',
    };

    setDreams([...dreams, newDream]);
    setTitle('');
    setTarget('');
    setMonthlyDeposit('');
    setTargetDate('');
    setPriority('media');
    setUrgencyThreshold(DEFAULT_URGENCY_DAYS_THRESHOLD);
    setImpact('');
    setIsNewDreamModalOpen(false);
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'Zap': return Zap;
      case 'ShieldAlert': return ShieldAlert;
      case 'Plane': return Plane;
      case 'Wallet': return Wallet;
      default: return PiggyBank;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-sky-500 text-white">
              <Cloud className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-sky-600 dark:text-sky-400">
              Módulo Sonhos & Metas Yupee
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Planejamento de Sonhos
          </h2>
          <p className="text-xs text-slate-500">
            Transforme metas financeiras em conquistas reais com aportes mensais consistentes dos seus potes.
          </p>
        </div>

        <button
          onClick={() => setIsNewDreamModalOpen(true)}
          className="w-full sm:w-auto justify-center flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Sonho</span>
        </button>
      </div>

      {/* Notificação de Integração com 6 Potes */}
      {notification && (
        <div 
          className="p-3.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-100 text-xs font-semibold animate-in fade-in"
          data-testid="notification-6jars-integrated"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Banner de Metas Críticas com Alerta de Urgência */}
      {criticalGoals.length > 0 && (
        <div 
          className="p-5 rounded-3xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 border-2 border-rose-300 dark:border-rose-900/80 shadow-sm space-y-3"
          data-testid="banner-metas-criticas"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-rose-500 text-white shrink-0 shadow-md">
                <Flame className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-sm text-rose-900 dark:text-rose-100 flex items-center gap-1.5">
                    <span>🚨</span>
                    <span>Aviso: {criticalGoals.length} {criticalGoals.length === 1 ? 'Meta Crítica Requer' : 'Metas Críticas Requerem'} Atenção Imediata</span>
                  </h3>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    Prazo de Urgência Ativo
                  </span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  Estas metas estão a menos de seu prazo de urgência da data limite. O app recalculou automaticamente o aporte mensal necessário para atingir o objetivo no prazo planejado.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyAllCriticalDeposits}
              className="px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
              data-testid="btn-ajustar-todos-criticos"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ajustar Todos os Aportes Críticos</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-rose-200/60 dark:border-rose-900/50">
            {criticalGoals.map(({ dream, urgency }) => (
              <div 
                key={dream.id} 
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {dream.title}
                    </span>
                    <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 shrink-0">
                      {urgency.daysRemaining} dias
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Meta: {formatBRL(dream.target)} • Acumulado: {formatBRL(dream.current)}
                  </p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                    Aporte recalculado: <strong className="text-rose-700 dark:text-rose-300">{formatBRL(urgency.requiredMonthlyDeposit)}/mês</strong>
                    {urgency.deficitPerMonth > 0 && (
                      <span className="text-[10px] text-slate-400 ml-1 font-normal">(+{formatBRL(urgency.deficitPerMonth)})</span>
                    )}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSimulatorDream(dream)}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Simular Prazo
                  </button>
                  {dream.monthlyDeposit !== urgency.requiredMonthlyDeposit && (
                    <button
                      type="button"
                      onClick={() => handleApplySuggestedDeposit(dream.id, urgency.requiredMonthlyDeposit)}
                      className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shadow-2xs transition cursor-pointer"
                    >
                      Aplicar {formatBRL(urgency.requiredMonthlyDeposit)}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico de Rosca de Conclusão dos Sonhos */}
      <DreamsDonutChart 
        dreams={dreams} 
        onSelectDream={(d) => setSimulatorDream(d)}
        onApplySuggestedDeposit={handleApplySuggestedDeposit}
      />

      {/* Calculadora de Juros Compostos & Crescimento de Patrimônio */}
      <CompoundInterestCalculator 
        dreams={dreams}
        onApplyDepositToDream={handleApplySuggestedDeposit}
        selectedDreamInitial={activeCalculatorDream}
      />

      {/* Componente de Checklist de Aportes Mensais */}
      <DreamDepositChecklist 
        dreams={dreams}
        onDepositCustom={(dream) => setSelectedDreamForDeposit(dream)}
        onRecordDeposit={handleDirectDeposit}
      />

      {/* Grid de Sonhos com Filtro e Controles de Prioridade */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Metas & Objetivos Planejados</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {displayedDreams.length} {displayedDreams.length === 1 ? 'meta' : 'metas'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Gerencie prazos estimados, prioridades e acompanhe a contagem regressiva em tempo real.
            </p>
          </div>

          {/* Ordenação por Urgência & Filtro por Prioridade */}
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            {/* Seletor de Ordenação */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold shrink-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 pl-2">Ordenar:</span>
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value as DreamSortOption)}
                className="bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-2 py-1 border-none shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                data-testid="select-dream-sort"
              >
                <option value="urgency">🔥 Maior Urgência</option>
                <option value="priority">⚡ Prioridade (Alta → Baixa)</option>
                <option value="targetDate">📅 Data Alvo (Mais Próxima)</option>
                <option value="estimatedTime">⏱️ Menor Tempo Restante</option>
                <option value="progress">📈 Maior Progresso</option>
                <option value="default">📋 Ordem Padrão</option>
              </select>
            </div>

            {/* Filtro por Prioridade */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold overflow-x-auto no-scrollbar max-w-full shrink-0">
              <button
                type="button"
                onClick={() => setPriorityFilter('ALL')}
                className={`px-2.5 py-1 rounded-xl transition text-[11px] cursor-pointer whitespace-nowrap ${
                  priorityFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                data-testid="filter-priority-all"
              >
                Todos ({dreams.length})
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter('alta')}
                className={`px-2.5 py-1 rounded-xl transition text-[11px] cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  priorityFilter === 'alta'
                    ? 'bg-rose-600 text-white shadow-2xs font-black'
                    : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'
                }`}
                data-testid="filter-priority-alta"
              >
                <Flame className="w-3 h-3 text-rose-500" />
                <span>Alta</span>
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter('media')}
                className={`px-2.5 py-1 rounded-xl transition text-[11px] cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  priorityFilter === 'media'
                    ? 'bg-amber-500 text-white shadow-2xs font-black'
                    : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
                data-testid="filter-priority-media"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Média</span>
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter('baixa')}
                className={`px-2.5 py-1 rounded-xl transition text-[11px] cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  priorityFilter === 'baixa'
                    ? 'bg-emerald-600 text-white shadow-2xs font-black'
                    : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
                data-testid="filter-priority-baixa"
              >
                <Clock className="w-3 h-3 text-emerald-500" />
                <span>Baixa</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedDreams.map(dream => {
            const Icon = getIcon(dream.iconName);
            const pct = Math.min(100, (dream.current / (dream.target || 1)) * 100);
            const remainingAmount = Math.max(0, dream.target - dream.current);
            const monthsRemaining = dream.monthlyDeposit > 0 ? Math.ceil(remainingAmount / dream.monthlyDeposit) : 0;

            const urgency = calculateDreamUrgency(dream);
            const countdown = calculateDreamCountdown(dream.targetDate);
            const currentPriority: DreamPriority = dream.priority || 'media';

            const {
              suggestedMonthlyDeposit,
              remainingMonths: calcRemainingMonths,
              isPastDeadline
            } = calculateSuggestedMonthlyDeposit(dream.target, dream.current, dream.targetDate);

            const contributionSuggestion = calculateContributionSuggestion(
              dream.target,
              dream.current,
              dream.monthlyDeposit,
              dream.targetDate,
              dream.category,
              dream.title
            );

            return (
              <div 
                key={dream.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div>
                  {/* Top Row: Icon + Priority Selector + Badges */}
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl bg-gradient-to-tr ${dream.gradient} text-white shadow-sm shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Seletor de Prioridade Interativo no Cartão */}
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Prioridade</span>
                        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-bold border border-slate-200/70 dark:border-slate-700/70">
                          <button
                            type="button"
                            onClick={() => handleUpdatePriority(dream.id, 'alta')}
                            className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                              currentPriority === 'alta'
                                ? 'bg-rose-600 text-white shadow-2xs font-black'
                                : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-300'
                            }`}
                            title="Definir Prioridade Alta"
                            data-testid={`btn-priority-alta-${dream.id}`}
                          >
                            <Flame className="w-2.5 h-2.5" />
                            <span>Alta</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdatePriority(dream.id, 'media')}
                            className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                              currentPriority === 'media'
                                ? 'bg-amber-500 text-white shadow-2xs font-black'
                                : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-300'
                            }`}
                            title="Definir Prioridade Média"
                            data-testid={`btn-priority-media-${dream.id}`}
                          >
                            <Zap className="w-2.5 h-2.5" />
                            <span>Média</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdatePriority(dream.id, 'baixa')}
                            className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                              currentPriority === 'baixa'
                                ? 'bg-emerald-600 text-white shadow-2xs font-black'
                                : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-300'
                            }`}
                            title="Definir Prioridade Baixa"
                            data-testid={`btn-priority-baixa-${dream.id}`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>Baixa</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {urgency.isCritical && (
                        <span 
                          className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 shadow-2xs animate-pulse"
                          title={urgency.description}
                        >
                          <AlertOctagon className="w-3 h-3 text-rose-600" />
                          <span>Meta Crítica</span>
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {dream.category}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {dream.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {dream.impact}
                  </p>

                  {/* Gráfico de Barra de Progresso Individual da Meta */}
                  <div 
                    className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5"
                    data-testid={`dream-progress-chart-${dream.id}`}
                  >
                    {/* Header do Progresso: Percentual Concluído + Destaque de Quanto Falta */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${pct >= 100 ? 'bg-emerald-500 animate-ping' : 'bg-indigo-500'}`} />
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          Progresso: <span className="text-indigo-600 dark:text-indigo-400 font-black">{pct.toFixed(1)}%</span>
                        </span>
                      </div>
                      <span 
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                          pct >= 100
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                        }`}
                        data-testid={`dream-remaining-badge-${dream.id}`}
                      >
                        {pct >= 100 ? 'Meta Concluída! 🎉' : `Faltam ${formatBRL(remainingAmount)}`}
                      </span>
                    </div>

                    {/* Gráfico de Barra Visual com Marcadores de Meta (25%, 50%, 75%) */}
                    <div className="relative pt-1">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden relative shadow-inner">
                        {/* Marcadores de Etapa no Trilho */}
                        <div className="absolute top-0 bottom-0 left-[25%] w-[1px] bg-slate-300 dark:bg-slate-700 z-10 opacity-70" title="25% da meta" />
                        <div className="absolute top-0 bottom-0 left-[50%] w-[1px] bg-slate-300 dark:bg-slate-700 z-10 opacity-70" title="50% da meta" />
                        <div className="absolute top-0 bottom-0 left-[75%] w-[1px] bg-slate-300 dark:bg-slate-700 z-10 opacity-70" title="75% da meta" />

                        {/* Barra Gradiente de Preenchimento do Saldo Atual */}
                        <div 
                          className={`h-full bg-gradient-to-r ${dream.gradient} transition-all duration-700 rounded-full shadow-sm relative`}
                          style={{ width: `${Math.min(100, Math.max(pct, 2))}%` }}
                          data-testid={`dream-progress-bar-${dream.id}`}
                        />
                      </div>

                      {/* Ticks e Legendas dos Marcos da Barra de Progresso */}
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-1 px-0.5 select-none">
                        <span>0%</span>
                        <span className={pct >= 25 ? 'text-indigo-600 dark:text-indigo-400' : ''}>25%</span>
                        <span className={pct >= 50 ? 'text-indigo-600 dark:text-indigo-400' : ''}>50%</span>
                        <span className={pct >= 75 ? 'text-indigo-600 dark:text-indigo-400' : ''}>75%</span>
                        <span className={pct >= 100 ? 'text-emerald-600 dark:text-emerald-400 font-black' : ''}>100%</span>
                      </div>
                    </div>

                    {/* Box de Saldo Acumulado vs Alvo com Detalhe do Quanto Falta */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Acumulado Guardado</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400" data-testid={`dream-current-balance-${dream.id}`}>
                          {formatBRL(dream.current)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Valor Alvo</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {formatBRL(dream.target)}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Target className="w-3 h-3 text-indigo-500" />
                          <span>Distância da Meta:</span>
                        </span>
                        <span 
                          className={pct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                          data-testid={`dream-remaining-amount-${dream.id}`}
                        >
                          {pct >= 100 ? 'Meta atingida!' : `Faltam ${formatBRL(remainingAmount)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Campo de Prazo (Data Estimada) & Bloco de Contagem Regressiva */}
                  <div className="mt-3.5 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Prazo (Data Alvo Estimada):</span>
                      </label>

                      {/* Input de Data Estimada com Edição Direta no Cartão */}
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <input
                          type="date"
                          value={dream.targetDate || ''}
                          onChange={e => handleUpdateTargetDate(dream.id, e.target.value)}
                          className="w-full sm:w-auto px-2.5 py-1 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          title="Alterar ou definir data limite estimada"
                          data-testid={`input-prazo-${dream.id}`}
                        />
                        {dream.targetDate && (
                          <button
                            type="button"
                            onClick={() => handleUpdateTargetDate(dream.id, '')}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer shrink-0"
                            title="Remover prazo estimado"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Botões de Atalhos de Prazo (+6m, +1 ano, +2 anos) */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-slate-400 font-bold">Atalhos:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setMonth(d.getMonth() + 6);
                          handleUpdateTargetDate(dream.id, d.toISOString().slice(0, 10));
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-bold transition cursor-pointer"
                      >
                        +6 meses
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setFullYear(d.getFullYear() + 1);
                          handleUpdateTargetDate(dream.id, d.toISOString().slice(0, 10));
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-bold transition cursor-pointer"
                      >
                        +1 ano
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setFullYear(d.getFullYear() + 2);
                          handleUpdateTargetDate(dream.id, d.toISOString().slice(0, 10));
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-bold transition cursor-pointer"
                      >
                        +2 anos
                      </button>
                    </div>

                    {/* Bloco de Contagem Regressiva Visual */}
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${countdown.badgeColorClass}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Hourglass className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                        <div className="truncate">
                          <div className="font-black text-[11px] flex items-center gap-1.5 truncate">
                            <span>Contagem Regressiva:</span>
                            <strong>{countdown.countdownLabel}</strong>
                          </div>
                          <p className="text-[10px] opacity-80 truncate">
                            {countdown.hasDeadline
                              ? `Alvo: ${countdown.formattedTargetDate} • ${countdown.countdownSubtext}`
                              : 'Escolha uma data estimada acima para calcular a contagem'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSimulatorDream(dream)}
                          className="px-2 py-1 rounded-lg bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 text-[10px] font-bold shadow-2xs border border-current/10 cursor-pointer transition active:scale-95"
                          title="Simular cenários de prazo e aportes"
                        >
                          Simular
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ============================================================== */}
                  {/* CAMPO DE SUGESTÃO DE APORTE BASEADO NO PRAZO RESTANTE            */}
                  {/* ============================================================== */}
                  <div 
                    className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-300/70 dark:border-emerald-800/80 space-y-2.5 text-xs relative overflow-hidden"
                    data-testid={`campo-sugestao-aporte-${dream.id}`}
                  >
                    {/* Header: Label 'Sugestão de Aporte' + Ícone + Valor Sugerido */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-emerald-500 text-white shadow-2xs shrink-0">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">
                            Sugestão de Aporte
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            Baseada no prazo restante da meta
                          </span>
                        </div>
                      </div>

                      {/* Valor do Aporte Sugerido em Destaque */}
                      <div className="text-right">
                        <div 
                          className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight"
                          data-testid={`valor-sugestao-aporte-${dream.id}`}
                        >
                          {contributionSuggestion.hasTargetDate && !contributionSuggestion.isCompleted
                            ? `${formatBRL(contributionSuggestion.suggestedMonthlyDeposit)}/mês`
                            : contributionSuggestion.isCompleted
                            ? 'Meta Concluída 🎉'
                            : 'Defina o Prazo'}
                        </div>
                        {contributionSuggestion.hasTargetDate && !contributionSuggestion.isCompleted && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                            valor mensal sugerido
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Linha com Detalhamento do Prazo Restante e Saldo Necessário */}
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-emerald-200/60 dark:border-emerald-900/50 flex items-center justify-between gap-2 text-[11px] flex-wrap">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300">
                          {contributionSuggestion.hasTargetDate ? (
                            <>
                              Prazo restante: <strong className="text-slate-900 dark:text-white font-bold">{contributionSuggestion.remainingMonths} {contributionSuggestion.remainingMonths === 1 ? 'mês' : 'meses'}</strong> ({contributionSuggestion.remainingDays} dias)
                            </>
                          ) : (
                            <span className="text-slate-500">Defina uma data alvo no campo acima para gerar a sugestão automática de aporte.</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {contributionSuggestion.jarShortName}
                        </span>
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                          Falta: <strong className="text-slate-800 dark:text-slate-200 font-bold">{formatBRL(contributionSuggestion.remainingAmount)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Recomendação de Ação & Botão de 1 Clique para Adotar e Integrar aos 6 Potes */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-1 min-w-0 flex-1">
                        <span>💡 {contributionSuggestion.recommendationMessage}</span>
                      </p>

                      {contributionSuggestion.hasTargetDate && !contributionSuggestion.isCompleted && contributionSuggestion.suggestedMonthlyDeposit > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Botão de Integração Direta aos 6 Potes */}
                          <button
                            type="button"
                            onClick={() => handleIntegrateWith6Jars(dream, contributionSuggestion.suggestedMonthlyDeposit)}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-[11px] shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                            title={`Integrar aporte recorrente de ${formatBRL(contributionSuggestion.suggestedMonthlyDeposit)} aos 6 Potes (${contributionSuggestion.jarName})`}
                            data-testid={`btn-integrar-6potes-${dream.id}`}
                          >
                            <Zap className="w-3 h-3 text-amber-300" />
                            <span>Integrar aos 6 Potes ({formatBRL(contributionSuggestion.suggestedMonthlyDeposit)}/mês)</span>
                          </button>

                          {dream.monthlyDeposit === contributionSuggestion.suggestedMonthlyDeposit ? (
                            <span 
                              className="px-2 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold flex items-center gap-1 shrink-0"
                              data-testid={`badge-aporte-alinhado-${dream.id}`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Alinhado
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApplySuggestedDeposit(dream.id, contributionSuggestion.suggestedMonthlyDeposit)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                              title="Adotar sugestão de aporte como economia mensal na meta"
                              data-testid={`btn-adotar-sugestao-${dream.id}`}
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Adotar</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Previsão de Conclusão baseada na Economia Mensal */}
                  {(() => {
                    const estimatedTime = calculateEstimatedTimeToGoal(
                      dream.target,
                      dream.current,
                      dream.monthlyDeposit,
                      dream.targetDate
                    );

                    return (
                      <div 
                        className="mt-3 p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-2 text-xs"
                        data-testid={`dream-time-estimate-${dream.id}`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Tempo Restante Estimado:
                            </span>
                          </div>
                          <span 
                            className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                              estimatedTime.isCompleted
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : estimatedTime.statusVsTargetDate === 'ahead'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : estimatedTime.statusVsTargetDate === 'on_track'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : estimatedTime.statusVsTargetDate === 'delayed'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                            data-testid={`badge-estimated-time-${dream.id}`}
                          >
                            {estimatedTime.formattedEstimatedTime}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-indigo-100/80 dark:border-indigo-900/40">
                          <span className="text-slate-500 dark:text-slate-400">Previsão de Conclusão:</span>
                          <span className="font-black text-indigo-700 dark:text-indigo-300" data-testid={`completion-date-${dream.id}`}>
                            {estimatedTime.formattedCompletionMonthYear}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[10px] pt-1">
                          <span className="text-slate-600 dark:text-slate-300 truncate" title={estimatedTime.statusMessage}>
                            {estimatedTime.statusMessage}
                          </span>
                          {estimatedTime.statusVsTargetDate === 'delayed' && estimatedTime.requiredMonthlyForTargetDate > 0 && dream.monthlyDeposit !== estimatedTime.requiredMonthlyForTargetDate && (
                            <button
                              type="button"
                              onClick={() => handleApplySuggestedDeposit(dream.id, estimatedTime.requiredMonthlyForTargetDate)}
                              className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shrink-0 cursor-pointer shadow-2xs"
                              title="Ajustar economia mensal para cumprir o prazo"
                            >
                              Ajustar R$ {estimatedTime.requiredMonthlyForTargetDate.toFixed(0)}/mês
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Ações de Simulação de Juros e Sugestão de Aporte */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 font-medium">Cálculos Avançados:</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCalculatorDream(dream);
                            const el = document.getElementById('calculadora-juros-compostos');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          title="Simular crescimento patrimonial com juros compostos para este objetivo"
                          data-testid={`btn-simular-juros-${dream.id}`}
                        >
                          <TrendingUp className="w-3 h-3" />
                          <span>Simular Juros</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSimulatorDream(dream)}
                          className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          title="Simular aporte mensal necessário para atingir o objetivo no prazo"
                        >
                          <Clock className="w-3 h-3" />
                          <span>{dream.targetDate ? 'Simular Prazo' : 'Definir Prazo'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Alerta de Urgência e Aporte Recalculado */}
                    {urgency.isCritical && (
                      <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-2 text-[11px]">
                        <div className="text-rose-800 dark:text-rose-200 truncate">
                          <div className="font-black flex items-center gap-1 text-rose-700 dark:text-rose-300">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>Prazo de Urgência: {urgency.daysRemaining} dias restantes</span>
                          </div>
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                            Aporte recalculado: <strong className="text-rose-700 dark:text-rose-300">{formatBRL(urgency.requiredMonthlyDeposit)}/mês</strong>
                            {urgency.deficitPerMonth > 0 && ` (+${formatBRL(urgency.deficitPerMonth)})`}
                          </p>
                        </div>
                        {dream.monthlyDeposit !== urgency.requiredMonthlyDeposit && (
                          <button
                            type="button"
                            onClick={() => handleApplySuggestedDeposit(dream.id, urgency.requiredMonthlyDeposit)}
                            className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shadow-2xs transition cursor-pointer shrink-0"
                            title="Ajustar aporte mensal para a quantia recalculada"
                          >
                            Aplicar Recalculado
                          </button>
                        )}
                      </div>
                    )}

                    {dream.targetDate && suggestedMonthlyDeposit > 0 && !isPastDeadline && !urgency.isCritical && (
                      <div className="p-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-slate-600 dark:text-slate-300 truncate">
                            Sugerido p/ prazo: <strong className="text-indigo-700 dark:text-indigo-300">{formatBRL(suggestedMonthlyDeposit)}/mês</strong>
                          </span>
                        </div>

                        {dream.monthlyDeposit !== suggestedMonthlyDeposit && (
                          <button
                            type="button"
                            onClick={() => handleApplySuggestedDeposit(dream.id, suggestedMonthlyDeposit)}
                            className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition cursor-pointer shrink-0"
                            title="Atualizar aporte mensal para atingir a meta no prazo"
                          >
                            Ajustar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with Monthly projection and Deposit button */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Economia Mensal:</span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={dream.monthlyDeposit || ''}
                        onChange={e => handleUpdateMonthlyDeposit(dream.id, parseFloat(e.target.value) || 0)}
                        className="w-20 px-1.5 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        title="Economia mensal destinada a este sonho"
                        data-testid={`input-monthly-deposit-${dream.id}`}
                      />
                      <span className="text-[10px] text-slate-400">/mês</span>
                      {contributionSuggestion.hasTargetDate && !contributionSuggestion.isCompleted && contributionSuggestion.suggestedMonthlyDeposit > 0 && dream.monthlyDeposit !== contributionSuggestion.suggestedMonthlyDeposit && (
                        <button
                          type="button"
                          onClick={() => handleApplySuggestedDeposit(dream.id, contributionSuggestion.suggestedMonthlyDeposit)}
                          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1 inline-flex items-center gap-0.5"
                          title="Definir economia mensal igual à sugestão de aporte"
                          data-testid={`btn-quick-sugestao-${dream.id}`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>(Sugerido: {formatBRL(contributionSuggestion.suggestedMonthlyDeposit)})</span>
                        </button>
                      )}
                    </div>
                    {monthsRemaining > 0 && (
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        ~ {monthsRemaining} meses estimados
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedDreamForDeposit(dream)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold text-xs transition active:scale-95 border border-blue-200 dark:border-blue-900 cursor-pointer shrink-0"
                  >
                    + Fazer Aporte
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Fazer Aporte */}
      {selectedDreamForDeposit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full p-6 rounded-3xl shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Aportar no Sonho: {selectedDreamForDeposit.title}
            </h3>
            <p className="text-xs text-slate-500">
              O aporte será adicionado ao progresso da meta e registrado no pote Reserva & Sonhos (PLP 10%).
            </p>

            <form onSubmit={handleDeposit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Valor do Aporte (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 100,00"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDreamForDeposit(null)}
                  className="px-4 py-2 rounded-xl text-slate-500 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-md transition"
                >
                  Confirmar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar Novo Sonho */}
      {isNewDreamModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full p-6 rounded-3xl shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Cadastrar Novo Sonho / Meta
            </h3>

            <form onSubmit={handleCreateDream} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Título do Sonho</label>
                <input
                  type="text"
                  placeholder="Ex: Reforma da Cozinha, Viagem a Portugal, Carro"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Seletor de Prioridade no Modal */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Prioridade do Sonho</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('alta')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      priority === 'alta'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-black'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    <span>Alta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('media')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      priority === 'media'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-2xs font-black'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Média</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('baixa')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      priority === 'baixa'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-black'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Baixa</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Valor Alvo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Prazo (Data Estimada)</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Pré-visualização da Contagem Regressiva no Modal */}
              {targetDate && (() => {
                const previewCountdown = calculateDreamCountdown(targetDate);
                return (
                  <div className={`p-2.5 rounded-2xl border flex items-center gap-2 text-xs ${previewCountdown.badgeColorClass}`}>
                    <Hourglass className="w-4 h-4 shrink-0 text-indigo-500" />
                    <div className="truncate">
                      <strong className="block font-bold truncate">Contagem Regressiva: {previewCountdown.countdownLabel}</strong>
                      <span className="text-[10px] opacity-80 block truncate">Alvo: {previewCountdown.formattedTargetDate} • {previewCountdown.countdownSubtext}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Prazo de Urgência Selector */}
              {targetDate && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Prazo de Urgência (Aviso de Meta Crítica)
                    </label>
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-400">
                      {urgencyThreshold} dias antes do prazo
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {URGENCY_PRESET_DAYS.map((days: number) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setUrgencyThreshold(days)}
                        className={`py-1.5 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                          urgencyThreshold === days
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {days} dias
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                    Ao restar {urgencyThreshold} dias ou menos para a meta, o app ativará o alerta de <strong>Meta Crítica</strong> e recalculará o aporte.
                  </p>
                </div>
              )}

              {/* Dynamic suggestion pill when date and target are filled */}
              {newDreamCalc.suggestedMonthlyDeposit > 0 && (
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between text-[11px] text-indigo-900 dark:text-indigo-200">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Aporte ideal para o prazo ({newDreamCalc.remainingMonths} meses): <strong>{formatBRL(newDreamCalc.suggestedMonthlyDeposit)}/mês</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMonthlyDeposit(String(newDreamCalc.suggestedMonthlyDeposit))}
                    className="font-bold underline cursor-pointer text-indigo-600 dark:text-indigo-400"
                  >
                    Usar
                  </button>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Aporte Mensal Previsto</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={monthlyDeposit}
                  onChange={e => setMonthlyDeposit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Impacto / Propósito</label>
                <input
                  type="text"
                  placeholder="Ex: Maior conforto para a família sem endividamento"
                  value={impact}
                  onChange={e => setImpact(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewDreamModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-500 text-white font-bold shadow-md hover:bg-blue-600 transition"
                >
                  Salvar Sonho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Simulador de Prazos e Aportes */}
      <DeadlineSimulatorModal
        isOpen={!!simulatorDream}
        onClose={() => setSimulatorDream(null)}
        dream={simulatorDream}
        onSave={handleSaveSimulatedDream}
      />

    </div>
  );
};
