import React, { useState, useMemo } from 'react';
import { 
  Calculator, TrendingDown, ArrowRight, Sparkles, 
  CheckCircle2, DollarSign, Calendar, Percent, ShieldCheck, 
  RotateCcw, AlertCircle, Info, ChevronRight, Layers, CreditCard,
  Building, HelpCircle
} from 'lucide-react';
import { 
  calculateEarlyPayoff, 
  DEFAULT_DEBT_PRESETS, 
  DebtPreset,
  EarlyPayoffSimulationResult 
} from '../utils/debtEarlyPayoff';
import { formatBRL } from '../utils/finance';

interface DebtPayoffSimulatorProps {
  themeCardClass?: string;
  onNavigateToScreen?: (screen: string) => void;
}

export const DebtPayoffSimulator: React.FC<DebtPayoffSimulatorProps> = ({
  themeCardClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
  onNavigateToScreen
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('c6_parcelas');
  const [installmentAmount, setInstallmentAmount] = useState<string>('320');
  const [remainingInstallments, setRemainingInstallments] = useState<number>(8);
  const [installmentsToPrepay, setInstallmentsToPrepay] = useState<number>(3);
  const [interestRate, setInterestRate] = useState<string>('1.5');
  const [activeTab, setActiveTab] = useState<'comparativo' | 'detalhes'>('comparativo');

  // Handle Preset Selection
  const handleSelectPreset = (preset: DebtPreset) => {
    setSelectedPresetId(preset.id);
    setInstallmentAmount(String(preset.installmentAmount));
    setRemainingInstallments(preset.remainingInstallments);
    setInstallmentsToPrepay(Math.min(3, preset.remainingInstallments));
    setInterestRate(String(preset.monthlyInterestRatePct));
  };

  // Perform Calculation
  const simulation: EarlyPayoffSimulationResult = useMemo(() => {
    const pmt = parseFloat(installmentAmount.replace(',', '.')) || 0;
    const rate = parseFloat(interestRate.replace(',', '.')) || 0;

    return calculateEarlyPayoff({
      installmentAmount: pmt,
      remainingInstallments: remainingInstallments,
      installmentsToPrepay: installmentsToPrepay,
      monthlyInterestRatePct: rate
    });
  }, [installmentAmount, remainingInstallments, installmentsToPrepay, interestRate]);

  const currentPreset = DEFAULT_DEBT_PRESETS.find(p => p.id === selectedPresetId);

  return (
    <div 
      className={`${themeCardClass} p-5 sm:p-6 rounded-3xl space-y-5 shadow-sm transition hover:shadow-md border-indigo-200/80 dark:border-indigo-900/60 relative overflow-hidden`}
      data-testid="debt-payoff-simulator"
    >
      {/* Decorative top accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-teal-500 to-emerald-500" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-sm">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Simulador de Antecipação de Dívidas & Cartões
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Economia Real
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Calcule quanto você economiza ao quitar parcelas adiantadas com desconto de juros compostos.
            </p>
          </div>
        </div>

        {/* Preset quick buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {DEFAULT_DEBT_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedPresetId === preset.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              data-testid={`btn-preset-${preset.id}`}
            >
              {preset.category === 'cartao' && <CreditCard className="w-3 h-3" />}
              {preset.category === 'financiamento' && <Building className="w-3 h-3" />}
              {preset.category === 'emprestimo' && <Percent className="w-3 h-3" />}
              <span>{preset.name.split(' - ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Simulator Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
        {/* Valor da Parcela */}
        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Valor da Parcela (R$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
              R$
            </span>
            <input
              type="number"
              step="0.01"
              value={installmentAmount}
              onChange={e => setInstallmentAmount(e.target.value)}
              placeholder="0,00"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="input-installment-amount"
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Valor mensal de cada prestação</span>
        </div>

        {/* Parcelas Restantes */}
        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Parcelas Restantes ({remainingInstallments}x)
          </label>
          <input
            type="number"
            min="1"
            max="420"
            value={remainingInstallments}
            onChange={e => {
              const val = Math.max(1, parseInt(e.target.value) || 1);
              setRemainingInstallments(val);
              if (installmentsToPrepay > val) {
                setInstallmentsToPrepay(val);
              }
            }}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="input-remaining-installments"
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">Total de meses ainda a pagar</span>
        </div>

        {/* Parcelas para Antecipar (Slider / Input) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Antecipar: <strong className="text-indigo-600 dark:text-indigo-400 font-black">{installmentsToPrepay} parcelas</strong>
            </label>
            <span className="text-[10px] font-semibold text-slate-400">
              -{installmentsToPrepay} meses
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max={remainingInstallments}
              value={installmentsToPrepay}
              onChange={e => setInstallmentsToPrepay(parseInt(e.target.value) || 1)}
              className="flex-1 accent-indigo-600 cursor-pointer"
              data-testid="slider-prepay-installments"
            />
            <input
              type="number"
              min="1"
              max={remainingInstallments}
              value={installmentsToPrepay}
              onChange={e => {
                const val = Math.min(remainingInstallments, Math.max(1, parseInt(e.target.value) || 1));
                setInstallmentsToPrepay(val);
              }}
              className="w-14 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-center"
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Adiantamento das últimas parcelas</span>
        </div>

        {/* Taxa de Desconto / Juros (% a.m.) */}
        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Desconto / Juros (% a.m.)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.05"
              min="0"
              value={interestRate}
              onChange={e => setInterestRate(e.target.value)}
              placeholder="1.5"
              className="w-full pr-8 pl-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="input-discount-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
              %
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Taxa de abatimento mensal</span>
        </div>
      </div>

      {/* COMPARATIVE IMPACT CARDS (SEM ANTECIPAÇÃO vs COM ANTECIPAÇÃO) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* CARD 1: Sem Antecipação */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Sem Antecipação
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              Padrão
            </span>
          </div>

          <div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatBRL(simulation.totalWithoutPrepay)}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Valor total pago ({simulation.remainingInstallments}x de {formatBRL(simulation.installmentAmount)})
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 text-slate-500 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span>Prazo final:</span>
              <strong className="text-slate-700 dark:text-slate-300">{simulation.remainingInstallments} meses</strong>
            </div>
            <div className="flex justify-between">
              <span>Desconto obtido:</span>
              <span className="font-semibold text-slate-400">R$ 0,00 (0%)</span>
            </div>
          </div>
        </div>

        {/* CARD 2: Com Antecipação */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Com Antecipação
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white">
              -{simulation.monthsSaved} parcelas
            </span>
          </div>

          <div>
            <span className="text-xl sm:text-2xl font-black text-indigo-900 dark:text-indigo-100">
              {formatBRL(simulation.totalWithPrepay)}
            </span>
            <span className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 block">
              Novo custo total da dívida/fatura
            </span>
          </div>

          <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-200 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span>Paga hoje com desconto:</span>
              <strong className="text-indigo-900 dark:text-white">{formatBRL(simulation.prepaidDiscountedAmount)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Restante no futuro:</span>
              <span>{simulation.newRemainingInstallments}x ({formatBRL(simulation.futureRemainingAmount)})</span>
            </div>
          </div>
        </div>

        {/* CARD 3: ECONOMIA TOTAL REAL & IMPACTO */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2 flex flex-col justify-between" data-testid="card-payoff-savings">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Economia Total no Bolso
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Lucro Puro</span>
              </span>
            </div>

            <div className="pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatBRL(simulation.totalNetSavings)}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block">
                {simulation.discountPercentage}% de desconto sobre o valor nominal antecipado
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span>Juros evitados:</span>
              <strong>{formatBRL(simulation.discountSaved)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Rentabilidade anualizada:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-black">+{simulation.roiAnnualized}% a.a.</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Explanatory summary and smart insight */}
      <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-slate-800 dark:text-white">
              Impacto no Orçamento: Antecipação de {simulation.installmentsToPrepay} parcelas
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ao investir <strong>{formatBRL(simulation.prepaidDiscountedAmount)}</strong> hoje, você elimina <strong>{formatBRL(simulation.prepaidInstallmentsNominal)}</strong> em dívidas nominais e economiza <strong>{formatBRL(simulation.totalNetSavings)}</strong> que ficariam para o banco ou operadora de cartão.
            </p>
          </div>
        </div>

        {onNavigateToScreen && (
          <button
            type="button"
            onClick={() => onNavigateToScreen('potes')}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Reserva & Potes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
