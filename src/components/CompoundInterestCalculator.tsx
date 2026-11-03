import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Sparkles, DollarSign, Calendar, Clock, 
  ChevronDown, ChevronUp, ArrowUpRight, Percent, PiggyBank,
  CheckCircle2, Info, Layers
} from 'lucide-react';
import { DreamGoal } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  calculateCompoundInterest, 
  MARKET_BENCHMARKS,
  CompoundInterestResult 
} from '../utils/compoundInterest';

export interface CompoundInterestCalculatorProps {
  dreams: DreamGoal[];
  onApplyDepositToDream?: (dreamId: string, monthlyAmount: number) => void;
  selectedDreamInitial?: DreamGoal | null;
}

export const CompoundInterestCalculator: React.FC<CompoundInterestCalculatorProps> = ({
  dreams,
  onApplyDepositToDream,
  selectedDreamInitial = null
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [initialAmount, setInitialAmount] = useState<number>(selectedDreamInitial ? selectedDreamInitial.current : 1000);
  const [monthlyDeposit, setMonthlyDeposit] = useState<number>(selectedDreamInitial ? selectedDreamInitial.monthlyDeposit : 400);
  const [annualRate, setAnnualRate] = useState<number>(10.75); // 100% CDI
  const [periodValue, setPeriodValue] = useState<number>(5);
  const [periodType, setPeriodType] = useState<'years' | 'months'>('years');
  const [activeBenchmark, setActiveBenchmark] = useState<string>('selic');
  const [selectedDreamId, setSelectedDreamId] = useState<string>(selectedDreamInitial ? selectedDreamInitial.id : '');
  const [viewTable, setViewTable] = useState(false);
  const [hoveredMilestone, setHoveredMilestone] = useState<number | null>(null);

  // Sync when selectedDreamInitial changes from outside
  React.useEffect(() => {
    if (selectedDreamInitial) {
      setSelectedDreamId(selectedDreamInitial.id);
      setInitialAmount(selectedDreamInitial.current);
      setMonthlyDeposit(selectedDreamInitial.monthlyDeposit > 0 ? selectedDreamInitial.monthlyDeposit : 400);
      setIsExpanded(true);
    }
  }, [selectedDreamInitial]);

  // Load from dream
  const handleSelectDream = (dreamId: string) => {
    setSelectedDreamId(dreamId);
    if (!dreamId) return;

    const dream = dreams.find(d => d.id === dreamId);
    if (dream) {
      setInitialAmount(dream.current);
      setMonthlyDeposit(dream.monthlyDeposit > 0 ? dream.monthlyDeposit : 300);
    }
  };

  const handleBenchmarkClick = (benchmarkId: string, rate: number) => {
    setActiveBenchmark(benchmarkId);
    setAnnualRate(rate);
  };

  // Run calculation
  const result: CompoundInterestResult = useMemo(() => {
    return calculateCompoundInterest({
      initialAmount,
      monthlyDeposit,
      annualRatePercent: annualRate,
      periodValue,
      periodType
    });
  }, [initialAmount, monthlyDeposit, annualRate, periodValue, periodType]);

  const maxAccumulated = result.totalAccumulated > 0 ? result.totalAccumulated : 1;

  return (
    <div id="calculadora-juros-compostos" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200">
      
      {/* Banner / Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-md shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Calculadora de Juros Compostos & Patrimônio
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Simulador
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Descubra como os aportes mensais dos seus potes se multiplicam ao longo do tempo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Projetado</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {formatBRL(result.totalAccumulated)}
            </span>
          </div>

          <button 
            type="button"
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-6">
          
          {/* Quick Dream Importer */}
          {dreams.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <PiggyBank className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-semibold">Simular a partir de um Sonho cadastrado:</span>
              </div>

              <select
                value={selectedDreamId}
                onChange={e => handleSelectDream(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">Selecione um sonho...</option>
                {dreams.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.title} (Atual: {formatBRL(d.current)} • Aporte: {formatBRL(d.monthlyDeposit)}/mês)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Form Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            
            {/* 1. Valor Inicial */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 dark:text-slate-300 block text-[11px]">
                Valor Inicial (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">R$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={initialAmount}
                  onChange={e => setInitialAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-1 pt-0.5">
                {[0, 1000, 5000, 10000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setInitialAmount(val)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    {val === 0 ? 'Zero' : formatBRL(val)}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Aporte Mensal */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 dark:text-slate-300 block text-[11px]">
                Aporte Mensal (R$/mês)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">R$</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={monthlyDeposit}
                  onChange={e => setMonthlyDeposit(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-1 pt-0.5">
                {[200, 400, 600, 1000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMonthlyDeposit(val)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    {formatBRL(val)}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Taxa de Rentabilidade Anual */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-bold text-slate-600 dark:text-slate-300">
                  Taxa de Juros (% a.a.)
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  ~{result.monthlyRatePercent}% a.m.
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.25"
                  value={annualRate}
                  onChange={e => {
                    setAnnualRate(parseFloat(e.target.value) || 0);
                    setActiveBenchmark('custom');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">% a.a.</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {MARKET_BENCHMARKS.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleBenchmarkClick(b.id, b.rateAnnual)}
                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold transition cursor-pointer ${
                      annualRate === b.rateAnnual
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                    title={b.desc}
                  >
                    {b.label.split(' ')[0]} {b.rateAnnual}%
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Período / Prazo */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-bold text-slate-600 dark:text-slate-300">
                  Período
                </label>
                <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5 text-[9px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPeriodType('years')}
                    className={`px-1.5 py-0.5 rounded ${periodType === 'years' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'}`}
                  >
                    Anos
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('months')}
                    className={`px-1.5 py-0.5 rounded ${periodType === 'months' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'}`}
                  >
                    Meses
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={periodType === 'years' ? 50 : 600}
                  value={periodValue}
                  onChange={e => setPeriodValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">
                  {periodType === 'years' ? (periodValue === 1 ? 'ano' : 'anos') : (periodValue === 1 ? 'mês' : 'meses')}
                </span>
              </div>
              <div className="flex gap-1 pt-0.5">
                {[1, 2, 5, 10, 20].map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setPeriodType('years');
                      setPeriodValue(y);
                    }}
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                      periodType === 'years' && periodValue === y
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {y}a
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Results Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            
            {/* Card 1: Total Acumulado */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-4.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-black tracking-wider block">
                  Valor Total Final Acumulado
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">
                  {formatBRL(result.totalAccumulated)}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 block">
                Em {result.totalMonths} meses ({Math.floor(result.totalMonths / 12)} anos e {result.totalMonths % 12} meses)
              </span>
            </div>

            {/* Card 2: Total Investido (Do seu bolso) */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                  Total Investido (Do seu Bolso)
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 block mt-1">
                  {formatBRL(result.totalInvested)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                <span>Inicial: {formatBRL(initialAmount)}</span>
                <span>Aportes: {formatBRL(result.totalMonths * monthlyDeposit)}</span>
              </div>
            </div>

            {/* Card 3: Total Ganho em Juros */}
            <div className="bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent p-4.5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-black tracking-wider block">
                    Juros Ganhos (Rendimento Líquido)
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    +{result.interestSharePercent}%
                  </span>
                </div>
                <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 block mt-1">
                  +{formatBRL(result.totalInterest)}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 block">
                O dinheiro trabalhando passivamente por você 🚀
              </span>
            </div>

          </div>

          {/* Visual Composition Bar */}
          <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Capital Próprio: {formatBRL(result.totalInvested)} ({(100 - result.interestSharePercent).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Juros Compostos: +{formatBRL(result.totalInterest)} ({result.interestSharePercent.toFixed(1)}%)
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.max(5, 100 - result.interestSharePercent)}%` }}
                title={`Capital Próprio: ${formatBRL(result.totalInvested)}`}
              />
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(95, result.interestSharePercent)}%` }}
                title={`Juros Ganhos: ${formatBRL(result.totalInterest)}`}
              />
            </div>
          </div>

          {/* Evolution Visual Bars (Milestones) */}
          {result.yearlyProgression.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  Evolução do Patrimônio Ano a Ano:
                </span>
                <button
                  type="button"
                  onClick={() => setViewTable(!viewTable)}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                >
                  {viewTable ? 'Ocultar Tabela Detalhada' : 'Ver Tabela Detalhada'}
                </button>
              </div>

              {/* Graphical Timeline Bars */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-end gap-2 overflow-x-auto min-h-[140px] pt-8">
                {result.yearlyProgression.map((item, idx) => {
                  const heightPct = Math.max(12, Math.round((item.totalAccumulated / maxAccumulated) * 100));
                  const isHovered = hoveredMilestone === item.year;

                  return (
                    <div 
                      key={item.year}
                      onMouseEnter={() => setHoveredMilestone(item.year)}
                      onMouseLeave={() => setHoveredMilestone(null)}
                      className="flex-1 flex flex-col items-center gap-1 min-w-[42px] cursor-pointer group"
                    >
                      {/* Floating Tooltip Value */}
                      <span className={`text-[9px] font-bold whitespace-nowrap transition ${
                        isHovered ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-400'
                      }`}>
                        {formatBRL(item.totalAccumulated).replace('R$', '').trim()}
                      </span>

                      {/* Stacked bar */}
                      <div 
                        className={`w-full max-w-[28px] rounded-t-lg overflow-hidden flex flex-col justify-end transition-all ${
                          isHovered ? 'ring-2 ring-emerald-500 shadow-md' : 'opacity-90'
                        }`}
                        style={{ height: `${heightPct}px` }}
                      >
                        {/* Juros segment */}
                        <div 
                          className="bg-emerald-500 w-full"
                          style={{ 
                            height: `${item.totalAccumulated > 0 ? (item.totalInterest / item.totalAccumulated) * 100 : 0}%` 
                          }}
                        />
                        {/* Invested segment */}
                        <div 
                          className="bg-blue-500 w-full"
                          style={{ 
                            height: `${item.totalAccumulated > 0 ? (item.totalInvested / item.totalAccumulated) * 100 : 100}%` 
                          }}
                        />
                      </div>

                      {/* Label */}
                      <span className="text-[10px] font-bold text-slate-500 mt-1">
                        {item.year === 1 && result.totalMonths < 12 ? `${item.month}m` : `Ano ${item.year}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Table Breakdown (Optional toggle) */}
          {viewTable && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-3">Ano / Prazo</th>
                    <th className="py-2.5 px-3 text-right">Total Investido</th>
                    <th className="py-2.5 px-3 text-right">Juros no Ano</th>
                    <th className="py-2.5 px-3 text-right">Juros Acumulados</th>
                    <th className="py-2.5 px-3 text-right">Saldo Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {result.yearlyProgression.map(m => (
                    <tr key={m.year} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        Ano {m.year} ({m.month} meses)
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                        {formatBRL(m.totalInvested)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        +{formatBRL(m.interestInYear)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                        +{formatBRL(m.totalInterest)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                        {formatBRL(m.totalAccumulated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Action button to apply to selected dream */}
          {selectedDreamId && onApplyDepositToDream && (
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                Gostou da simulação? Aplique o aporte mensal de <strong>{formatBRL(monthlyDeposit)}</strong> na meta selecionada.
              </span>

              <button
                type="button"
                onClick={() => onApplyDepositToDream(selectedDreamId, monthlyDeposit)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Atualizar Aporte do Sonho</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
