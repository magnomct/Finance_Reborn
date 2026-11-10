import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Receipt, 
  Percent, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  Info, 
  ChevronDown,
  Sparkles,
  HelpCircle,
  Coins
} from 'lucide-react';
import { Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  calculatePjDreSummary, 
  getAvailablePjMonths, 
  formatMonthLabel,
  PjDreSummaryData 
} from '../utils/pjDre';

interface PjDreSummaryCardProps {
  transactions: Transaction[];
  initialMonth?: string;
  onTransferToPf?: (amount: number, month: string) => void;
}

export const PjDreSummaryCard: React.FC<PjDreSummaryCardProps> = ({
  transactions,
  initialMonth = '2026-10',
  onTransferToPf
}) => {
  const availableMonths = useMemo(() => getAvailablePjMonths(transactions), [transactions]);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [estimatedTaxRate, setEstimatedTaxRate] = useState<number>(6.0);
  const [showTaxSetting, setShowTaxSetting] = useState<boolean>(false);
  const [isTransferred, setIsTransferred] = useState<boolean>(false);

  // Calculate DRE summary for selected month
  const dre = useMemo<PjDreSummaryData>(() => {
    return calculatePjDreSummary(transactions, selectedMonth, estimatedTaxRate);
  }, [transactions, selectedMonth, estimatedTaxRate]);

  const handleTransferClick = () => {
    if (isTransferred) return;
    setIsTransferred(true);
    if (onTransferToPf && dre.availableForPfTransfer > 0) {
      onTransferToPf(dre.availableForPfTransfer, selectedMonth);
    }
  };

  return (
    <div 
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-6"
      data-testid="pj-dre-summary-card"
    >
      {/* Card Header with Month Selector and Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-amber-500 text-white shadow-2xs">
              <Receipt className="w-4 h-4" />
            </span>
            <span className="text-[11px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
              Demonstrativo Contábil • Conta Inter PJ
            </span>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Resumo DRE Operacional & Repasse à PF
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cálculo automático de Receita Bruta, Deduções de DAS (real/estimado) e Lucro Líquido Isento.
          </p>
        </div>

        {/* Controls: Month selector and Tax Setting toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Dropdown */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setIsTransferred(false);
              }}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
              data-testid="select-pj-dre-month"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Tax Estimator Config Toggle */}
          <button
            type="button"
            onClick={() => setShowTaxSetting(!showTaxSetting)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              showTaxSetting
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
            title="Ajustar alíquota estimada para meses sem guia DAS lançada"
            data-testid="btn-toggle-tax-setting"
          >
            <Percent className="w-3.5 h-3.5 text-amber-500" />
            <span>Alíquota DAS: {dre.effectiveTaxRatePct.toFixed(1)}%</span>
          </button>
        </div>
      </div>

      {/* Optional Tax Rate Slider / Editor */}
      {showTaxSetting && (
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Parâmetro do Simples Nacional (Anexo III - Serviços)
            </span>
            <span className="font-mono font-black text-amber-700 dark:text-amber-300">
              {estimatedTaxRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
            Alíquota utilizada para projetar a provisão de DAS quando não houver lançamento de imposto no mês.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="4.0"
              max="15.0"
              step="0.5"
              value={estimatedTaxRate}
              onChange={(e) => setEstimatedTaxRate(parseFloat(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
              data-testid="input-tax-rate-slider"
            />
            <div className="flex gap-1">
              {[4.5, 6.0, 9.0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setEstimatedTaxRate(rate)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                    estimatedTaxRate === rate
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. Receita Operacional Bruta */}
        <div 
          className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
          data-testid="metric-gross-revenue"
        >
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
                1. Receita Bruta (Faturamento)
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              +{formatBRL(dre.grossRevenue)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Entrada bruta de serviços prestados e notas fiscais emitidas.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Status da Operação</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {dre.transactionCount > 0 ? `${dre.transactionCount} lançamento(s)` : 'Sem faturamento'}
            </span>
          </div>
        </div>

        {/* 2. Deduções de Impostos (DAS Simples Nacional) */}
        <div 
          className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
          data-testid="metric-das-taxes"
        >
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
                2. Deduções (DAS Simples)
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              -{formatBRL(dre.dasTaxes)}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                dre.isDasEstimated
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}>
                {dre.isDasEstimated ? 'DAS Estimado (~6%)' : 'DAS Lançado'}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                ({dre.effectiveTaxRatePct.toFixed(1)}% efetivo)
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Receita Líquida</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
              {formatBRL(dre.netRevenue)}
            </span>
          </div>
        </div>

        {/* 3. Lucro Líquido Disponível para Repasse à PF */}
        <div 
          className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-400 dark:border-amber-500 shadow-sm flex flex-col justify-between"
          data-testid="metric-net-profit"
        >
          <div>
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs mb-1.5">
              <span className="font-bold uppercase tracking-wider text-[10px]">
                3. Lucro Disponível p/ PF
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              +{formatBRL(dre.availableForPfTransfer)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Saldo 100% livre de despesas e isento de IRPF para transferência.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-200/80 dark:border-amber-800/80 flex items-center justify-between">
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
              Margem: {dre.netMarginPct.toFixed(1)}%
            </span>
            <button
              type="button"
              onClick={handleTransferClick}
              disabled={isTransferred || dre.availableForPfTransfer <= 0}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
                isTransferred
                  ? 'bg-emerald-600 text-white'
                  : dre.availableForPfTransfer > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
              data-testid="btn-transfer-pj-profit"
            >
              {isTransferred ? 'Repassado à PF ✅' : 'Repassar à PF'}
            </button>
          </div>
        </div>

      </div>

      {/* Cascading DRE Waterfall (Demonstração Contábil Passo a Passo) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Estrutura Detalhada do DRE ({dre.monthLabel})
          </h4>
          <span className="text-[11px] text-slate-400">
            Metodologia Contábil Padrão • Lei 9.249/95
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-medium">
          {dre.steps.map((step) => {
            const isSubtotal = step.type === 'subtotal';
            const isResult = step.type === 'result';
            const isMinus = step.type === 'minus';
            const isPlus = step.type === 'plus';

            return (
              <div 
                key={step.code}
                className={`p-3 sm:px-4 flex items-center justify-between gap-3 transition ${
                  isResult 
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 font-bold' 
                    : isSubtotal 
                    ? 'bg-slate-50/80 dark:bg-slate-800/40 font-semibold' 
                    : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                }`}
                data-testid={`dre-step-${step.code.replace('.', '')}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-6 h-6 rounded-lg text-center flex items-center justify-center font-bold text-xs shrink-0 ${
                    isResult
                      ? 'bg-amber-500 text-white'
                      : isSubtotal
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      : isMinus
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {step.code}
                  </span>
                  <div className="min-w-0">
                    <span className={`block truncate ${
                      isResult 
                        ? 'text-slate-900 dark:text-white font-black text-sm' 
                        : isSubtotal 
                        ? 'text-slate-900 dark:text-slate-100 font-bold' 
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {step.label}
                    </span>
                    {step.badge && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        {step.badge}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`font-mono text-sm sm:text-base font-black ${
                    isResult 
                      ? 'text-amber-600 dark:text-amber-400 text-base' 
                      : isMinus 
                      ? 'text-rose-600 dark:text-rose-400' 
                      : isPlus 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-slate-900 dark:text-white'
                  }`}>
                    {isMinus ? '-' : isPlus ? '+' : ''} {formatBRL(Math.abs(step.amount))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tax Exemption & Regulatory Notice */}
      <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <p>
            <strong>Isenção Fiscal de IRPF na Distribuição:</strong> O lucro líquido de <strong>{formatBRL(dre.netProfit)}</strong> apurado após o pagamento do DAS Simples Nacional é isento de retenção na fonte e de imposto de renda da pessoa física para os sócios (art. 14 da LC 123/2006).
          </p>
          <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80">
            A transferência direta da conta <em>Inter PJ</em> para a <em>Inter PF</em> consolida a reserva financeira familiar sem bitributação.
          </p>
        </div>
      </div>
    </div>
  );
};
