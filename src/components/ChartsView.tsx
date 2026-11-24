import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Flame,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import { buildHistoricalNetWorthSeries } from '../utils/finance';

// Lazy-loading seguro (compatível tanto com named exports quanto default exports)
const MonthlyNetWorthD3Chart = lazy(() =>
  import('./MonthlyNetWorthD3Chart').then((mod) => ({
    default: mod.MonthlyNetWorthD3Chart ?? mod.default,
  }))
);

const CashFlowSankeyD3Chart = lazy(() =>
  import('./CashFlowSankeyD3Chart').then((mod) => ({
    default: mod.CashFlowSankeyD3Chart ?? mod.default,
  }))
);

const AnnualExpenseHeatmapD3Chart = lazy(() =>
  import('./AnnualExpenseHeatmapD3Chart').then((mod) => ({
    default: mod.AnnualExpenseHeatmapD3Chart ?? mod.default,
  }))
);

const ExpenseBalanceScatterD3Chart = lazy(() =>
  import('./ExpenseBalanceScatterD3Chart').then((mod) => ({
    default: mod.ExpenseBalanceScatterD3Chart ?? mod.default,
  }))
);

const FinancialDashboardCharts = lazy(() =>
  import('./FinancialDashboardCharts').then((mod) => ({
    default: mod.FinancialDashboardCharts ?? mod.default,
  }))
);

const ExpenseVariabilityCard = lazy(() =>
  import('./ExpenseVariabilityCard').then((mod) => ({
    default: mod.ExpenseVariabilityCard ?? mod.default,
  }))
);

export type ChartsSubTabId = 'PATRIMONIO' | 'COMPORTAMENTO' | 'CATEGORIAS';

export interface ChartsViewProps {
  transactions: any[];
  goals?: any[];
  baseMonthlyIncome?: number;
}

interface SubTabDefinition {
  id: ChartsSubTabId;
  label: string;
  description: string;
  chartCount: number;
  icon: React.ComponentType<{ className?: string }>;
}

const STORAGE_KEY = '@finance_app:charts_active_subtab';

const SUB_TABS: SubTabDefinition[] = [
  {
    id: 'PATRIMONIO',
    label: 'Patrimônio & Fluxo',
    description: 'Evolução consolidada e distribuição nos 6 Potes',
    chartCount: 2,
    icon: TrendingUp,
  },
  {
    id: 'COMPORTAMENTO',
    label: 'Comportamento & Calor',
    description: 'Calendário anual de gastos e correlação de saldo',
    chartCount: 2,
    icon: Flame,
  },
  {
    id: 'CATEGORIAS',
    label: 'Categorias & Variabilidade',
    description: 'Participação por categoria, série anual e desvio padrão',
    chartCount: 2,
    icon: PieChart,
  },
];

function isValidSubTab(value: unknown): value is ChartsSubTabId {
  return (
    value === 'PATRIMONIO' ||
    value === 'COMPORTAMENTO' ||
    value === 'CATEGORIAS'
  );
}

function readPersistedSubTab(): ChartsSubTabId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isValidSubTab(saved)) {
      return saved;
    }
  } catch {
    // Fallback seguro caso o localStorage esteja indisponível
  }
  return 'PATRIMONIO';
}

interface ChartSkeletonProps {
  title: string;
  heightClass?: string;
}

const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  title,
  heightClass = 'h-80',
}) => (
  <div
    className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 shadow-sm animate-pulse"
    aria-busy="true"
    aria-label={`Carregando ${title}`}
  >
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="space-y-2">
        <div className="h-5 w-52 rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="h-3.5 w-72 rounded-md bg-slate-100 dark:bg-slate-800/70" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-8 w-20 rounded-lg bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>

    <div
      className={`w-full ${heightClass} rounded-xl bg-slate-100/80 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/70 flex flex-col items-center justify-center gap-2`}
    >
      <BarChart3 className="w-6 h-6 text-indigo-500/70" />
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Carregando visualização D3: {title}...
      </span>
    </div>
  </div>
);

export const ChartsView: React.FC<ChartsViewProps> = ({
  transactions = [],
  goals = [],
  baseMonthlyIncome = 0,
}) => {
  const [activeSubTab, setActiveSubTab] =
    useState<ChartsSubTabId>(readPersistedSubTab);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, activeSubTab);
    } catch {
      // Ignora erro de cota ou modo privado
    }
  }, [activeSubTab]);

  // Calcula a série patrimonial apenas quando necessário e mantém memoizada
  const netWorthSeries = useMemo(
    () => buildHistoricalNetWorthSeries(transactions, goals),
    [transactions, goals]
  );

  const activeTabMeta = useMemo(
    () => SUB_TABS.find((tab) => tab.id === activeSubTab) ?? SUB_TABS[0],
    [activeSubTab]
  );

  return (
    <section className="space-y-6">
      {/* Cabeçalho e Barra de Navegação das Sub-Abas */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Gráficos Intuitivos
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {activeTabMeta.description}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Categorias de visualizações analíticas"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70"
          >
            {SUB_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center justify-between sm:justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <span className="inline-flex items-center gap-2 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{tab.label}</span>
                  </span>

                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tab.chartCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Montagem Condicional Estrita (evita width=0px no ResizeObserver do D3) */}
      {activeSubTab === 'PATRIMONIO' && (
        <div
          role="tabpanel"
          aria-label="Patrimônio & Fluxo"
          className="space-y-6 transition-opacity duration-200"
        >
          <Suspense
            fallback={
              <ChartSkeleton
                title="Evolução Patrimonial Consolidada"
                heightClass="h-80"
              />
            }
          >
            <MonthlyNetWorthD3Chart data={netWorthSeries} />
          </Suspense>

          <Suspense
            fallback={
              <ChartSkeleton
                title="Fluxo de Caixa Sankey (Entradas → 6 Potes → Gastos)"
                heightClass="h-96"
              />
            }
          >
            <CashFlowSankeyD3Chart
              transactions={transactions}
              baseMonthlyIncome={baseMonthlyIncome}
            />
          </Suspense>
        </div>
      )}

      {activeSubTab === 'COMPORTAMENTO' && (
        <div
          role="tabpanel"
          aria-label="Comportamento & Calor"
          className="space-y-6 transition-opacity duration-200"
        >
          <Suspense
            fallback={
              <ChartSkeleton
                title="Mapa de Calor Anual de Despesas"
                heightClass="h-64"
              />
            }
          >
            <AnnualExpenseHeatmapD3Chart transactions={transactions} />
          </Suspense>

          <Suspense
            fallback={
              <ChartSkeleton
                title="Dispersão: Saldo Disponível vs. Gastos Diários"
                heightClass="h-80"
              />
            }
          >
            <ExpenseBalanceScatterD3Chart transactions={transactions} />
          </Suspense>
        </div>
      )}

      {activeSubTab === 'CATEGORIAS' && (
        <div
          role="tabpanel"
          aria-label="Categorias & Variabilidade"
          className="space-y-6 transition-opacity duration-200"
        >
          <Suspense
            fallback={
              <ChartSkeleton
                title="Distribuição por Categoria e Saldo Anual"
                heightClass="h-80"
              />
            }
          >
            <FinancialDashboardCharts transactions={transactions} />
          </Suspense>

          <Suspense
            fallback={
              <ChartSkeleton
                title="Variabilidade de Gastos (σ) e Projeção de Fechamento"
                heightClass="h-64"
              />
            }
          >
            <ExpenseVariabilityCard transactions={transactions} />
          </Suspense>
        </div>
      )}
    </section>
  );
};

export default ChartsView;