import React, { useState, useMemo } from 'react';
import { 
  PieChart as PieChartIcon, Filter, X, ArrowUpRight, 
  Calendar, CreditCard, Tag, Layers, CheckCircle2,
  ChevronRight, Search
} from 'lucide-react';
import { Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import { JAR_DEFINITIONS } from '../data/initialData';
import { 
  calculateCategoryExpenses, 
  CategoryExpenseItem 
} from '../utils/categoryExpenses';

interface CategoryPieChartProps {
  transactions: Transaction[];
  initialSelectedCategory?: string | null;
  onCategorySelect?: (categoryName: string | null) => void;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  transactions,
  initialSelectedCategory = null,
  onCategorySelect,
}) => {
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(initialSelectedCategory);
  const [searchTerm, setSearchTerm] = useState('');

  const summary = useMemo(() => {
    return calculateCategoryExpenses(transactions);
  }, [transactions]);

  const handleSelectCategory = (catName: string) => {
    const next = selectedCategoryName === catName ? null : catName;
    setSelectedCategoryName(next);
    if (onCategorySelect) {
      onCategorySelect(next);
    }
  };

  const handleClearSelection = () => {
    setSelectedCategoryName(null);
    if (onCategorySelect) {
      onCategorySelect(null);
    }
  };

  const selectedCategoryItem = useMemo(() => {
    if (!selectedCategoryName) return null;
    return summary.categories.find(c => c.category === selectedCategoryName) || null;
  }, [selectedCategoryName, summary.categories]);

  // Filter transactions in selected category if search term is typed
  const displayedCategoryTransactions = useMemo(() => {
    if (!selectedCategoryItem) return [];
    if (!searchTerm.trim()) return selectedCategoryItem.transactions;
    const term = searchTerm.toLowerCase();
    return selectedCategoryItem.transactions.filter(t => 
      t.description.toLowerCase().includes(term) ||
      (t.account && t.account.toLowerCase().includes(term)) ||
      (t.costCenter && t.costCenter.toLowerCase().includes(term))
    );
  }, [selectedCategoryItem, searchTerm]);

  // Helper for coordinates on circle
  const getCoordinatesForFraction = (fraction: number) => {
    // Offset by -90deg so 0 starts at 12 o'clock
    const angle = 2 * Math.PI * fraction - Math.PI / 2;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    return [x, y];
  };

  if (summary.totalExpenses === 0 || summary.categories.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <PieChartIcon className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
          Nenhuma despesa registrada para categorização
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Adicione despesas ou alterne o escopo para visualizar a distribuição percentual por categoria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="container-grafico-pizza-categorias">
      
      {/* Container Principal do Gráfico de Pizza */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        
        {/* Header do Gráfico */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="p-1 rounded-lg bg-indigo-500 text-white">
                <PieChartIcon className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Detalhamento Visual
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white" data-testid="titulo-grafico-categorias">
              Distribuição de Despesas por Categoria
            </h3>
            <p className="text-xs text-slate-500">
              Clique em qualquer fatia ou card da legenda para filtrar os lançamentos detalhados daquela categoria.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedCategoryName && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                data-testid="btn-limpar-selecao-categoria"
              >
                <X className="w-3.5 h-3.5" />
                <span>Ver Todas as Categorias</span>
              </button>
            )}

            <div className="text-right pl-2 sm:border-l border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Despesas</span>
              <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400">
                {formatBRL(summary.totalExpenses)}
              </span>
            </div>
          </div>
        </div>

        {/* Layout: Gráfico SVG de Pizza à Esquerda + Legenda Interativa à Direita */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* SVG Pie Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative select-none">
            <svg 
              viewBox="-1.25 -1.25 2.5 2.5" 
              className="w-64 h-64 sm:w-72 sm:h-72 drop-shadow-sm transition-all duration-300"
              data-testid="svg-pizza-categorias"
            >
              {summary.categories.length === 1 ? (
                // A single slice = full circle
                <circle
                  cx="0"
                  cy="0"
                  r="1"
                  fill={summary.categories[0].colorHex}
                  className="cursor-pointer transition-transform duration-200 hover:scale-105"
                  onClick={() => handleSelectCategory(summary.categories[0].category)}
                  data-testid={`fatia-categoria-${summary.categories[0].category}`}
                />
              ) : (
                summary.categories.map((slice, index) => {
                  let cumulativeFraction = 0;
                  for (let i = 0; i < index; i++) {
                    cumulativeFraction += summary.categories[i].fraction;
                  }
                  const startFraction = cumulativeFraction;
                  const endFraction = cumulativeFraction + slice.fraction;

                  const [startX, startY] = getCoordinatesForFraction(startFraction);
                  const [endX, endY] = getCoordinatesForFraction(endFraction);
                  const largeArcFlag = slice.fraction > 0.5 ? 1 : 0;
                  const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                  const isSelected = selectedCategoryName === slice.category;
                  const isAnySelected = selectedCategoryName !== null;

                  // Pop out calculation along slice bisector
                  const midFraction = (startFraction + endFraction) / 2;
                  const midAngleRad = 2 * Math.PI * midFraction - Math.PI / 2;
                  const popX = Math.cos(midAngleRad) * 0.08;
                  const popY = Math.sin(midAngleRad) * 0.08;

                  return (
                    <path
                      key={slice.category}
                      d={pathData}
                      fill={slice.colorHex}
                      className="cursor-pointer transition-all duration-200 hover:brightness-110"
                      style={{
                        transform: isSelected 
                          ? `translate(${popX}px, ${popY}px) scale(1.05)` 
                          : 'scale(1)',
                        transformOrigin: '0 0',
                        opacity: isAnySelected && !isSelected ? 0.35 : 1,
                        filter: isSelected ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' : 'none',
                      }}
                      onClick={() => handleSelectCategory(slice.category)}
                      data-testid={`fatia-categoria-${slice.category}`}
                    >
                      <title>{`${slice.category}: ${formatBRL(slice.totalSpent)} (${slice.percentage}%)`}</title>
                    </path>
                  );
                })
              )}

              {/* Inner cutout for donut hole style with live focus center */}
              <circle cx="0" cy="0" r="0.62" className="fill-white dark:fill-slate-900 transition-colors" />
            </svg>

            {/* Centro do Gráfico com Informações Dinâmicas */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              {selectedCategoryItem ? (
                <div className="space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                  <span 
                    className="w-2.5 h-2.5 rounded-full inline-block mx-auto"
                    style={{ backgroundColor: selectedCategoryItem.colorHex }}
                  />
                  <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 block truncate max-w-[140px]">
                    {selectedCategoryItem.category}
                  </span>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400 block leading-tight">
                    {formatBRL(selectedCategoryItem.totalSpent)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {selectedCategoryItem.percentage}% do total
                  </span>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    {summary.categoryCount} Categorias
                  </span>
                  <span className="text-xl font-black text-slate-900 dark:text-white block">
                    {formatBRL(summary.totalExpenses)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Toque para inspecionar
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Legenda & Lista de Categorias Interativas */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-1">
              <span>Categorias Ordenadas por Volume:</span>
              <span>{summary.categories.length} grupos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {summary.categories.map(cat => {
                const isSelected = selectedCategoryName === cat.category;

                return (
                  <div
                    key={cat.category}
                    onClick={() => handleSelectCategory(cat.category)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/30 shadow-xs' 
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                    }`}
                    data-testid={`card-categoria-${cat.category}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0 shadow-2xs" 
                          style={{ backgroundColor: cat.colorHex }} 
                        />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                          {cat.category}
                        </span>
                      </div>
                      
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                        isSelected 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {cat.percentage}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-black text-slate-900 dark:text-white">
                        {formatBRL(cat.totalSpent)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {cat.transactionCount} {cat.transactionCount === 1 ? 'lançamento' : 'lançamentos'}
                      </span>
                    </div>

                    {/* Barra de Proporção */}
                    <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, cat.percentage)}%`,
                          backgroundColor: cat.colorHex,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Painel de Lançamentos Detalhados da Categoria Selecionada */}
      {selectedCategoryItem && (
        <div 
          className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-200"
          data-testid="painel-detalhes-categoria"
        >
          {/* Header do Painel de Lançamentos */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span 
                className="w-4 h-4 rounded-full shrink-0 shadow-xs" 
                style={{ backgroundColor: selectedCategoryItem.colorHex }} 
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Lançamentos: {selectedCategoryItem.category}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-[10px]">
                    {selectedCategoryItem.percentage}% das despesas
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Total de {selectedCategoryItem.transactionCount} {selectedCategoryItem.transactionCount === 1 ? 'despesa encontrada' : 'despesas encontradas'} somando {formatBRL(selectedCategoryItem.totalSpent)}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Barra de Busca rápida no grupo */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar lançamento..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-48"
                />
              </div>

              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Fechar detalhes"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista de Transações */}
          {displayedCategoryTransactions.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Nenhum lançamento corresponde ao filtro de busca.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto pr-1">
              {displayedCategoryTransactions.map(tx => {
                const jarDef = tx.jar ? JAR_DEFINITIONS[tx.jar] : null;

                return (
                  <div 
                    key={tx.id} 
                    className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-2 rounded-xl transition"
                    data-testid={`item-transacao-${tx.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col items-center justify-center w-12 text-center shrink-0">
                        <span className="text-[10px] font-mono text-slate-400">{tx.date}</span>
                      </div>

                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                          {tx.description}
                        </span>
                        
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 flex-wrap mt-0.5">
                          {tx.account && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {tx.account}
                            </span>
                          )}

                          {tx.costCenter && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {tx.costCenter}
                            </span>
                          )}

                          {jarDef && (
                            <span 
                              className="px-1.5 py-0.2 rounded font-bold text-[9px] text-white"
                              style={{ backgroundColor: jarDef.colorHex }}
                            >
                              {jarDef.shortName}
                            </span>
                          )}

                          {tx.notes && (
                            <span className="text-slate-400 italic">
                              ({tx.notes})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-rose-600 dark:text-rose-400 text-sm block">
                        - {formatBRL(Math.abs(tx.amount))}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {((Math.abs(tx.amount) / selectedCategoryItem.totalSpent) * 100).toFixed(0)}% da categoria
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
