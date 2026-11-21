import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldCheck,
  Flame,
  PieChart,
} from 'lucide-react';
import { Transaction, ParentCategoryItem, DreamGoal } from '../types';
import {
  calculateFinancialMetrics,
  formatBRL,
  buildHistoricalNetWorthSeries,
} from '../utils/finance';
import { safeGetStorage, safeSetStorage } from '../utils/storage';
import { MonthlyNetWorthD3Chart } from './MonthlyNetWorthD3Chart';
import { CashFlowSankeyD3Chart } from './CashFlowSankeyD3Chart';
import { AnnualExpenseHeatmapD3Chart } from './AnnualExpenseHeatmapD3Chart';
import { ExpenseBalanceScatterD3Chart } from './ExpenseBalanceScatterD3Chart';
import { FinancialDashboardCharts } from './FinancialDashboardCharts';
import { ExpenseVariabilityCard } from './ExpenseVariabilityCard';
import { CategoryPieChart } from './CategoryPieChart';
import { MonthlyVariabilityCard } from './MonthlyVariabilityCard';

export type ChartsSubTab = 'PATRIMONIO' | 'COMPORTAMENTO' | 'CATEGORIAS';

export const CHARTS_ACTIVE_SUBTAB_STORAGE_KEY = '@finance_app:charts_active_subtab';

function isValidChartsSubTab(val: unknown): val is ChartsSubTab {
  return val === 'PATRIMONIO' || val === 'COMPORTAMENTO' || val === 'CATEGORIAS';
}

interface SubTabDefinition {
  id: ChartsSubTab;
  label: string;
  countLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  panelId: string;
  tabId: string;
}

const SUB_TABS: SubTabDefinition[] = [
  {
    id: 'PATRIMONIO',
    label: 'Patrimônio & Fluxo',
    countLabel: '2 gráficos',
    icon: TrendingUp,
    panelId: 'charts-tabpanel-patrimonio',
    tabId: 'charts-tab-patrimonio',
  },
  {
    id: 'COMPORTAMENTO',
    label: 'Comportamento & Calor',
    countLabel: '2 gráficos',
    icon: Flame,
    panelId: 'charts-tabpanel-comportamento',
    tabId: 'charts-tab-comportamento',
  },
  {
    id: 'CATEGORIAS',
    label: 'Categorias & Variabilidade',
    countLabel: '4 gráficos',
    icon: PieChart,
    panelId: 'charts-tabpanel-categorias',
    tabId: 'charts-tab-categorias',
  },
];

interface ChartsViewProps {
  transactions: Transaction[];
  dreams?: DreamGoal[];
  usePjProfitInPf: boolean;
  selectedMonth: string;
  hierarchy?: ParentCategoryItem[];
}

export const ChartsView: React.FC<ChartsViewProps> = ({
  transactions,
  dreams = [],
  usePjProfitInPf,
  selectedMonth,
  hierarchy,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ChartsSubTab>(() =>
    safeGetStorage<ChartsSubTab>(
      CHARTS_ACTIVE_SUBTAB_STORAGE_KEY,
      'PATRIMONIO',
      isValidChartsSubTab
    )
  );

  useEffect(() => {
    safeSetStorage(CHARTS_ACTIVE_SUBTAB_STORAGE_KEY, activeSubTab);
  }, [activeSubTab]);

  const metrics = useMemo(() => {
    return calculateFinancialMetrics(transactions, usePjProfitInPf);
  }, [transactions, usePjProfitInPf]);

  const netWorthSeries = useMemo(() => {
    return buildHistoricalNetWorthSeries(transactions, dreams);
  }, [transactions, dreams]);

  const healthScore = useMemo(() => {
    let score = 70;
    if (metrics.netBalanceConsolidated > 0) score += 15;
    if (metrics.overdraftInterest === 0) score += 15;
    else score -= 10;
    if (metrics.jars.NEC_55 && metrics.jars.NEC_55.usageRatio <= 100) score += 10;
    return Math.min(100, Math.max(0, score));
  }, [metrics]);

  return (
    <div className="space-y-6" data-testid="charts-view-root">
      {/* Top Thematic Sub-Tab Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Seções analíticas de gráficos"
          data-testid="charts-subtab-list"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full w-full lg:w-auto touch-pan-x p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80"
        >
          {SUB_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                id={tab.tabId}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={tab.panelId}
                data-testid={`btn-charts-subtab-${tab.id}`}
                onClick={() => setActiveSubTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200/80 dark:ring-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? tab.id === 'PATRIMONIO'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : tab.id === 'COMPORTAMENTO'
                          ? 'text-orange-500'
                          : 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.countLabel}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2 whitespace-nowrap shrink-0 tabular-nums">
          Referência: <strong className="text-slate-800 dark:text-slate-200">{selectedMonth}</strong>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 tabular-nums">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Renda Efetiva Base</span>
            <DollarSign className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {formatBRL(metrics.effectiveIncomeBase)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {usePjProfitInPf ? 'CLT + Lucro Líquido PJ' : 'Apenas Salário CLT'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Gasto PF</span>
            <TrendingDown className="w-4 h-4 text-rose-500 shrink-0" />
          </div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400">
            {formatBRL(metrics.totalSpentPF)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {((metrics.totalSpentPF / (metrics.effectiveIncomeBase || 1)) * 100).toFixed(1)}% da renda
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Saldo Livre Mês</span>
            <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <div
            className={`text-lg font-black ${
              metrics.netBalanceConsolidated >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {metrics.netBalanceConsolidated >= 0
              ? `+${formatBRL(metrics.netBalanceConsolidated)}`
              : formatBRL(metrics.netBalanceConsolidated)}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            {metrics.netBalanceConsolidated >= 0 ? 'Superávit no período' : 'Atenção ao saldo'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Saúde Orçamentária</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
              {healthScore}/100
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              · {healthScore >= 80 ? 'Excelente' : 'Ajustar'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Metodologia 6 Potes</p>
        </div>
      </div>

      {/* Tab 1: Patrimônio & Fluxo (True Conditional Mounting) */}
      {activeSubTab === 'PATRIMONIO' && (
        <div
          id="charts-tabpanel-patrimonio"
          role="tabpanel"
          aria-labelledby="charts-tab-patrimonio"
          data-testid="charts-panel-PATRIMONIO"
          className="space-y-6 transition-opacity duration-200 opacity-100"
        >
          <MonthlyNetWorthD3Chart data={netWorthSeries} />
          <CashFlowSankeyD3Chart
            transactions={transactions}
            baseMonthlyIncome={metrics.effectiveIncomeBase}
            referenceMonth={selectedMonth}
          />
        </div>
      )}

      {/* Tab 2: Comportamento & Calor (True Conditional Mounting) */}
      {activeSubTab === 'COMPORTAMENTO' && (
        <div
          id="charts-tabpanel-comportamento"
          role="tabpanel"
          aria-labelledby="charts-tab-comportamento"
          data-testid="charts-panel-COMPORTAMENTO"
          className="space-y-6 transition-opacity duration-200 opacity-100"
        >
          <AnnualExpenseHeatmapD3Chart transactions={transactions} />
          <ExpenseBalanceScatterD3Chart transactions={transactions} />
        </div>
      )}

      {/* Tab 3: Categorias & Variabilidade (True Conditional Mounting) */}
      {activeSubTab === 'CATEGORIAS' && (
        <div
          id="charts-tabpanel-categorias"
          role="tabpanel"
          aria-labelledby="charts-tab-categorias"
          data-testid="charts-panel-CATEGORIAS"
          className="space-y-6 transition-opacity duration-200 opacity-100"
        >
          <FinancialDashboardCharts transactions={transactions} />
          <ExpenseVariabilityCard transactions={transactions} />
          <CategoryPieChart transactions={transactions} />
          <MonthlyVariabilityCard
            transactions={transactions}
            hierarchy={hierarchy}
          />
        </div>
      )}
    </div>
  );
};
