import React, { useState, useMemo, useEffect } from 'react';
import { 
  Target, Home, CreditCard, Landmark, Car, Utensils, HeartPulse, 
  Smile, GraduationCap, Sparkles, ShieldCheck, AlertTriangle, 
  CheckCircle2, TrendingUp, TrendingDown, Edit3, Plus, Search, 
  RotateCcw, SlidersHorizontal, Check, X, ArrowUpRight, DollarSign,
  AlertCircle, ChevronRight, BarChart2, Layers, Filter
} from 'lucide-react';
import { 
  AnnualCategoryBudget, CategoryAnnualMetric, OverallAnnualBudgetMetric,
  DEFAULT_ANNUAL_CATEGORY_BUDGETS, calculateCategoryMetric, 
  calculateOverallAnnualBudgetMetrics 
} from '../utils/annualBudget';
import { formatBRL } from '../utils/finance';

interface AnnualBudgetGoalsViewProps {
  categorySpendMap: Record<string, number>; // Map of categoryId to spent amount in current year
  currentYear?: number;
  currentMonthIndex?: number; // 0 to 11 (e.g. 9 for Outubro)
}

export const AnnualBudgetGoalsView: React.FC<AnnualBudgetGoalsViewProps> = ({
  categorySpendMap,
  currentYear = 2026,
  currentMonthIndex = 9 // Outubro by default (month 10 of 12)
}) => {
  // Load saved custom limits from localStorage or defaults
  const [categoryBudgets, setCategoryBudgets] = useState<AnnualCategoryBudget[]>(() => {
    try {
      const saved = localStorage.getItem('yupee_annual_category_budgets_v1');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load annual budgets', e);
    }
    return DEFAULT_ANNUAL_CATEGORY_BUDGETS;
  });

  // Save to localStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem('yupee_annual_category_budgets_v1', JSON.stringify(categoryBudgets));
    } catch (e) {
      console.error('Failed to save annual budgets', e);
    }
  }, [categoryBudgets]);

  // View & Filter states
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');
  const [filterStatus, setFilterStatus] = useState<'all' | 'safe' | 'warning' | 'exceeded'>('all');
  const [sortBy, setSortBy] = useState<'spent_desc' | 'remaining_asc' | 'limit_desc' | 'name_asc' | 'pct_desc'>('remaining_asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal State
  const [editingBudget, setEditingBudget] = useState<AnnualCategoryBudget | null>(null);
  const [editLimitInput, setEditLimitInput] = useState<string>('');
  const [editMonthlyInput, setEditMonthlyInput] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryLimit, setNewCategoryLimit] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Icon Map Helper
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Home': return <Home className="w-4 h-4" />;
      case 'CreditCard': return <CreditCard className="w-4 h-4" />;
      case 'Landmark': return <Landmark className="w-4 h-4" />;
      case 'Car': return <Car className="w-4 h-4" />;
      case 'Utensils': return <Utensils className="w-4 h-4" />;
      case 'HeartPulse': return <HeartPulse className="w-4 h-4" />;
      case 'Smile': return <Smile className="w-4 h-4" />;
      case 'GraduationCap': return <GraduationCap className="w-4 h-4" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4" />;
      case 'ShieldCheck': return <ShieldCheck className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  // Compute metrics for all categories
  const categoryMetrics: CategoryAnnualMetric[] = useMemo(() => {
    const elapsedMonths = currentMonthIndex + 1;
    return categoryBudgets.map(b => {
      const spent = categorySpendMap[b.id] ?? 0;
      return calculateCategoryMetric(b, spent, elapsedMonths);
    });
  }, [categoryBudgets, categorySpendMap, currentMonthIndex]);

  // Compute overall totals
  const overallMetrics: OverallAnnualBudgetMetric = useMemo(() => {
    const elapsedMonths = currentMonthIndex + 1;
    return calculateOverallAnnualBudgetMetrics(categoryMetrics, elapsedMonths);
  }, [categoryMetrics, currentMonthIndex]);

  // Filter and sort categories
  const displayedCategories = useMemo(() => {
    let list = [...categoryMetrics];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.description.toLowerCase().includes(q) ||
        (c.subItems && c.subItems.some(s => s.toLowerCase().includes(q)))
      );
    }

    // Filter by pace / status
    if (filterStatus === 'safe') {
      list = list.filter(c => c.paceStatus === 'safe');
    } else if (filterStatus === 'warning') {
      list = list.filter(c => c.paceStatus === 'warning' || c.paceStatus === 'critical');
    } else if (filterStatus === 'exceeded') {
      list = list.filter(c => c.paceStatus === 'exceeded');
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'spent_desc':
          return b.spentYTD - a.spentYTD;
        case 'remaining_asc':
          return a.remaining - b.remaining; // lowest remaining first (most urgent)
        case 'limit_desc':
          return b.annualLimit - a.annualLimit;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'pct_desc':
          return b.percentUsed - a.percentUsed;
        default:
          return 0;
      }
    });

    return list;
  }, [categoryMetrics, filterStatus, sortBy, searchQuery]);

  // Handle start editing
  const handleStartEdit = (cat: AnnualCategoryBudget) => {
    setEditingBudget(cat);
    setEditLimitInput(cat.annualLimit.toString());
    setEditMonthlyInput((cat.annualLimit / 12).toFixed(2));
  };

  // Sync annual input to monthly
  const handleAnnualInputChange = (val: string) => {
    setEditLimitInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setEditMonthlyInput((num / 12).toFixed(2));
    }
  };

  // Sync monthly input to annual
  const handleMonthlyInputChange = (val: string) => {
    setEditMonthlyInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setEditLimitInput((num * 12).toFixed(2));
    }
  };

  // Save edited limit
  const handleSaveEdit = () => {
    if (!editingBudget) return;
    const newAnnualLimit = parseFloat(editLimitInput);
    if (isNaN(newAnnualLimit) || newAnnualLimit < 0) return;

    setCategoryBudgets(prev => prev.map(b => {
      if (b.id === editingBudget.id) {
        return {
          ...b,
          annualLimit: newAnnualLimit
        };
      }
      return b;
    }));
    setEditingBudget(null);
  };

  // Quick adjust presets (+10%, -10%, round)
  const applyPresetAdjust = (multiplier: number) => {
    const current = parseFloat(editLimitInput) || 0;
    const adjusted = Math.round(current * multiplier);
    handleAnnualInputChange(adjusted.toString());
  };

  // Reset to default limits
  const handleResetDefaults = () => {
    if (confirm('Deseja restaurar as metas e limites anuais padrão sugeridos para 2026?')) {
      setCategoryBudgets(DEFAULT_ANNUAL_CATEGORY_BUDGETS);
    }
  };

  // Add new category budget
  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const limit = parseFloat(newCategoryLimit) || 1200;
    const id = `cat_${Date.now()}`;
    const newBudget: AnnualCategoryBudget = {
      id,
      name: newCategoryName.trim(),
      annualLimit: limit,
      iconName: 'Target',
      colorHex: '#3b82f6',
      bgLightClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
      textClass: 'text-blue-700 dark:text-blue-300',
      badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
      description: newCategoryDesc.trim() || 'Categoria personalizada'
    };
    setCategoryBudgets(prev => [...prev, newBudget]);
    setIsAddModalOpen(false);
    setNewCategoryName('');
    setNewCategoryLimit('');
    setNewCategoryDesc('');
  };

  // Delete category budget
  const handleDeleteCategory = (id: string, name: string) => {
    if (confirm(`Remover a meta da categoria "${name}"?`)) {
      setCategoryBudgets(prev => prev.filter(b => b.id !== id));
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Header & Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-emerald-500 text-white">
              <Target className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              Planejamento & Tetos Orçamentários
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Ano {currentYear}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Metas de Orçamento Anual por Categoria
          </h2>
          <p className="text-xs text-slate-500">
            Defina limites máximos de gastos para o ano e acompanhe em tempo real quanto resta para atingir o teto orçado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Meta</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition"
            title="Restaurar limites padrão recomendados"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Padrões Yupee</span>
          </button>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewLayout('cards')}
              className={`p-1.5 rounded-lg transition ${
                viewLayout === 'cards' 
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Visualização em Cards"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewLayout('table')}
              className={`p-1.5 rounded-lg transition ${
                viewLayout === 'table' 
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Visualização em Tabela"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Global Annual KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Teto Total Anual */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold">Teto Orçado no Ano</span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-xl font-black text-slate-900 dark:text-white">
            {formatBRL(overallMetrics.totalAnnualLimit)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Média: {formatBRL(overallMetrics.totalMonthlyLimit)}/mês
          </span>
        </div>

        {/* Gasto Realizado YTD */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold">Gasto Realizado ({currentYear})</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-xl font-black text-rose-600 dark:text-rose-400">
            {formatBRL(overallMetrics.totalSpentYTD)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {overallMetrics.overallPercentUsed.toFixed(1)}% do limite consumido
          </span>
        </div>

        {/* Quanto Falta para Atingir o Limite Global */}
        <div className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm ${
          overallMetrics.isTotalExceeded 
            ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/20' 
            : 'border-emerald-200 dark:border-emerald-900/60'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {overallMetrics.isTotalExceeded ? 'Teto Global Excedido' : 'Falta Gastar p/ Atingir Limite'}
            </span>
            {overallMetrics.isTotalExceeded ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <span className={`text-xl font-black ${
            overallMetrics.isTotalExceeded 
              ? 'text-rose-600 dark:text-rose-400' 
              : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {overallMetrics.isTotalExceeded 
              ? `- ${formatBRL(Math.abs(overallMetrics.totalRemaining))}` 
              : formatBRL(overallMetrics.totalRemaining)
            }
          </span>
          <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
            {overallMetrics.isTotalExceeded 
              ? 'Atenção: corte despesas' 
              : `${(100 - overallMetrics.overallPercentUsed).toFixed(1)}% de margem disponível`
            }
          </span>
        </div>

        {/* Ritmo Anual vs Calendário */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] uppercase font-bold">Ritmo do Ano</span>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
                Mês {currentMonthIndex + 1}/12
              </span>
            </div>
            
            {/* Dual mini progress bar */}
            <div className="space-y-1.5 mt-2">
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                  <span>Tempo transcorrido</span>
                  <span className="font-bold">{overallMetrics.elapsedYearPercent.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-400 dark:bg-slate-500 rounded-full" 
                    style={{ width: `${Math.min(100, overallMetrics.elapsedYearPercent)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                  <span>Orçamento consumido</span>
                  <span className={`font-bold ${overallMetrics.overallPercentUsed > overallMetrics.elapsedYearPercent ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {overallMetrics.overallPercentUsed.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      overallMetrics.overallPercentUsed > 100 
                        ? 'bg-rose-500' 
                        : overallMetrics.overallPercentUsed > overallMetrics.elapsedYearPercent 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                    }`} 
                    style={{ width: `${Math.min(100, overallMetrics.overallPercentUsed)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <span className="text-[10px] text-slate-400 mt-2 block">
            {overallMetrics.overallPercentUsed <= overallMetrics.elapsedYearPercent 
              ? '✨ Ritmo abaixo do calendário (Economizando!)' 
              : '⚡ Ritmo acima da média do tempo'}
          </span>
        </div>

      </div>

      {/* Filter, Sort & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              filterStatus === 'all' 
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Todas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-black/20">
              {categoryMetrics.length}
            </span>
          </button>

          <button
            onClick={() => setFilterStatus('safe')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              filterStatus === 'safe' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>No Teto Seguro</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
              {overallMetrics.categoriesSafeCount}
            </span>
          </button>

          <button
            onClick={() => setFilterStatus('warning')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              filterStatus === 'warning' 
                ? 'bg-amber-600 text-white shadow-sm' 
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Alerta & Quase no Limite</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
              {overallMetrics.categoriesWarningCount + overallMetrics.categoriesCriticalCount}
            </span>
          </button>

          <button
            onClick={() => setFilterStatus('exceeded')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              filterStatus === 'exceeded' 
                ? 'bg-rose-600 text-white shadow-sm' 
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>Estouradas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
              {overallMetrics.categoriesExceededCount}
            </span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs focus:outline-none"
          >
            <option value="remaining_asc">Menor Margem (Mais crítica)</option>
            <option value="spent_desc">Maior Gasto no Ano</option>
            <option value="pct_desc">Maior % Consumido</option>
            <option value="limit_desc">Maior Limite Anual</option>
            <option value="name_asc">Nome (A-Z)</option>
          </select>
        </div>

      </div>

      {/* ============================================================== */}
      {/* VIEW LAYOUT 1: CARDS DE METAS DE ORÇAMENTO                     */}
      {/* ============================================================== */}
      {viewLayout === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedCategories.map((cat) => {
            const hasExceeded = cat.isExceeded;
            const remainingLabel = hasExceeded 
              ? `Estourado em ${formatBRL(cat.overAmount)}`
              : `Falta ${formatBRL(cat.remaining)} para o limite`;

            return (
              <div
                key={cat.id}
                className={`group bg-white dark:bg-slate-900 rounded-3xl border p-4.5 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
                  hasExceeded 
                    ? 'border-rose-300 dark:border-rose-900/70 bg-gradient-to-b from-white via-white to-rose-50/20 dark:from-slate-900 dark:to-rose-950/10' 
                    : cat.paceStatus === 'critical'
                    ? 'border-amber-300 dark:border-amber-900/70'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  
                  {/* Category Top Row: Icon, Name & Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{ backgroundColor: `${cat.colorHex}15`, color: cat.colorHex }}
                      >
                        {getIcon(cat.iconName)}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                          {cat.name}
                        </h4>
                        <span className="text-[11px] text-slate-400 block">
                          Teto mensal: {formatBRL(cat.monthlyEquivalentLimit)}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    {hasExceeded ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Estourado
                      </span>
                    ) : cat.paceStatus === 'critical' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Crítico ({cat.percentUsed.toFixed(0)}%)
                      </span>
                    ) : cat.paceStatus === 'warning' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 flex items-center gap-1">
                        Atenção
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        No Teto
                      </span>
                    )}
                  </div>

                  {/* Main Numbers: Spent YTD vs Annual Limit */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 mb-3.5">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Gasto Realizado</span>
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        {formatBRL(cat.spentYTD)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Limite Anual</span>
                      <span className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300">
                        {formatBRL(cat.annualLimit)}
                      </span>
                    </div>
                  </div>

                  {/* "Quanto Falta para o Limite" Callout Box */}
                  <div className={`p-3 rounded-2xl border mb-3.5 flex items-center justify-between ${
                    hasExceeded 
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200' 
                      : cat.remaining < cat.annualLimit * 0.15 
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 shrink-0 opacity-80" />
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 block">
                          {hasExceeded ? 'Excedido em relação ao limite' : 'Quanto Falta para o Limite'}
                        </span>
                        <strong className="text-sm font-black">
                          {hasExceeded ? `+ ${formatBRL(cat.overAmount)}` : formatBRL(cat.remaining)}
                        </strong>
                      </div>
                    </div>

                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-white/70 dark:bg-slate-900/70 shadow-xs">
                      {hasExceeded ? `+${(cat.percentUsed - 100).toFixed(0)}%` : `${cat.percentUsed.toFixed(0)}% uso`}
                    </span>
                  </div>

                  {/* Visual Progress Bar with Needle / Milestone */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                      <span>Progresso do Teto</span>
                      <span>
                        {cat.spentYTD >= cat.annualLimit ? '100% atingido' : `${(100 - cat.percentUsed).toFixed(1)}% restante`}
                      </span>
                    </div>

                    <div className="relative h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      {/* Bar fill */}
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          hasExceeded 
                            ? 'bg-rose-600' 
                            : cat.percentUsed >= 90 
                            ? 'bg-orange-500' 
                            : cat.percentUsed >= 75 
                            ? 'bg-amber-500' 
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, cat.percentUsed)}%` }}
                      />
                    </div>

                    {/* Projeção de Ritmo */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>Média: {formatBRL(cat.monthlyAverageSpent)}/mês</span>
                      <span className="italic">
                        {cat.projectedYearEndSpent > cat.annualLimit 
                          ? `Proj. final: ${formatBRL(cat.projectedYearEndSpent)}`
                          : 'Projeção no teto'}
                      </span>
                    </div>
                  </div>

                  {/* Sub-items tags if present */}
                  {cat.subItems && cat.subItems.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {cat.subItems.slice(0, 3).map((sub, idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400"
                        >
                          {sub}
                        </span>
                      ))}
                      {cat.subItems.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-400">
                          +{cat.subItems.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                </div>

                {/* Card Footer: Action to Edit Limit */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Ano Corrente ({currentYear})
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEdit(cat)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition"
                      title="Editar limite da categoria"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Definir Limite</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW LAYOUT 2: TABELA COMPARATIVA DE METAS ANUAIS              */}
      {/* ============================================================== */}
      {viewLayout === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-3 text-right">Limite Anual</th>
                  <th className="py-3 px-3 text-right">Teto Mensal</th>
                  <th className="py-3 px-3 text-right">Gasto Realizado</th>
                  <th className="py-3 px-3 text-right">Quanto Falta p/ Limite</th>
                  <th className="py-3 px-3 text-center">% Consumido</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedCategories.map(cat => (
                  <tr key={cat.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cat.colorHex}15`, color: cat.colorHex }}
                        >
                          {getIcon(cat.iconName)}
                        </div>
                        <div>
                          <span>{cat.name}</span>
                          <span className="block text-[10px] font-normal text-slate-400">{cat.description}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-black text-slate-800 dark:text-slate-200">
                      {formatBRL(cat.annualLimit)}
                    </td>

                    <td className="py-3 px-3 text-right text-slate-500">
                      {formatBRL(cat.monthlyEquivalentLimit)}
                    </td>

                    <td className="py-3 px-3 text-right font-black text-rose-600 dark:text-rose-400">
                      {formatBRL(cat.spentYTD)}
                    </td>

                    <td className="py-3 px-3 text-right font-black">
                      <span className={cat.isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {cat.isExceeded ? `+ ${formatBRL(cat.overAmount)}` : formatBRL(cat.remaining)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-bold text-[11px] w-9 text-right">{cat.percentUsed.toFixed(0)}%</span>
                        <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${cat.isExceeded ? 'bg-rose-500' : cat.percentUsed > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, cat.percentUsed)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {cat.isExceeded ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          Estourado
                        </span>
                      ) : cat.paceStatus === 'critical' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                          Crítico
                        </span>
                      ) : cat.paceStatus === 'warning' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                          Atenção
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          No Teto
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 transition"
                        title="Editar limite"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDITAR LIMITE DA CATEGORIA                              */}
      {/* ============================================================== */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-9 h-9 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${editingBudget.colorHex}20`, color: editingBudget.colorHex }}
                >
                  {getIcon(editingBudget.iconName)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Definir Limite de {editingBudget.name}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Ano Corrente {currentYear}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setEditingBudget(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              
              {/* Info summary */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Gasto Atual Realizado no Ano:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {formatBRL(categorySpendMap[editingBudget.id] ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Média mensal atual:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {formatBRL((categorySpendMap[editingBudget.id] ?? 0) / (currentMonthIndex + 1))}
                  </span>
                </div>
              </div>

              {/* Annual Limit Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Limite Anual de Gastos (R$/ano)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={editLimitInput}
                    onChange={(e) => handleAnnualInputChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Monthly Equivalent Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Equivalente Mensal Médio (R$/mês)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={editMonthlyInput}
                    onChange={(e) => handleMonthlyInputChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Ajustes Rápidos:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPresetAdjust(1.10)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    +10%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetAdjust(0.90)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    -10%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetAdjust(1.20)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    +20%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Set based on current run rate
                      const spent = categorySpendMap[editingBudget.id] ?? 0;
                      const annualized = Math.round((spent / (currentMonthIndex + 1)) * 12 * 1.05); // +5% safety
                      handleAnnualInputChange(annualized.toString());
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-xs font-bold text-blue-600 dark:text-blue-400"
                  >
                    Sugerir pelo Ritmo Atual
                  </button>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingBudget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
              >
                Salvar Limite
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADICIONAR NOVA META DE CATEGORIA                        */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddNewCategory}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                Nova Meta de Categoria Anual
              </h3>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome da Categoria
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Viagens & Férias, Pet Shop, etc."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Limite Anual Previsto (R$)
              </label>
              <input
                type="number"
                required
                step="50"
                min="100"
                placeholder="Ex: 5000"
                value={newCategoryLimit}
                onChange={(e) => setNewCategoryLimit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Descrição ou Itens Inclusos
              </label>
              <input
                type="text"
                placeholder="Ex: Passagens, hospedagem e passeios turísticos"
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
              >
                Adicionar Meta
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
