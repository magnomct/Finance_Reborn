import React, { useState, useMemo } from 'react';
import { 
  Percent, ShieldCheck, AlertCircle, ArrowUpRight, DollarSign, 
  Wallet, PiggyBank, Landmark, Sparkles, Sliders, ChevronDown, CheckCircle2,
  TrendingUp, Award, Layers
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Transaction } from '../types';
import { 
  calculatePJTaxOptimization, 
  SimplesCeilingPreset, 
  SIMPLES_CEILING_PRESETS,
  PJTaxOptimizationMetrics 
} from '../utils/pjTaxOptimization';
import { formatBRL } from '../utils/finance';

export interface PJTaxAndPayoutOptimizerCardProps {
  transactions?: Transaction[];
  initialMonth?: string;
  className?: string;
}

export const PJTaxAndPayoutOptimizerCard: React.FC<PJTaxAndPayoutOptimizerCardProps> = ({
  transactions = [],
  initialMonth = '2026-10',
  className = '',
}) => {
  const [ceilingPreset, setCeilingPreset] = useState<SimplesCeilingPreset>('simples_faixa1');
  const [pjReservePct, setPjReservePct] = useState<number>(10);
  const [proLaborePct, setProLaborePct] = useState<number>(28);

  // Compute optimization metrics
  const metrics: PJTaxOptimizationMetrics = useMemo(() => {
    return calculatePJTaxOptimization(transactions, {
      referenceMonth: initialMonth,
      ceilingPreset,
      pjReservePct,
      proLaborePct,
    });
  }, [transactions, initialMonth, ceilingPreset, pjReservePct, proLaborePct]);

  // Destination data for chart
  const destinationChartData = useMemo(() => {
    return metrics.payout.destinations.map(d => ({
      name: d.name,
      amount: d.amount,
      pct: d.pct,
      color: d.color,
      description: d.description,
    }));
  }, [metrics.payout.destinations]);

  // Destination Custom Tooltip
  const DestinationTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-1.5 min-w-[200px] z-50">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1 font-bold text-slate-800 dark:text-white">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
          <span>{item.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Valor Alocado:</span>
          <strong className="font-mono text-slate-900 dark:text-white">{formatBRL(item.amount)}</strong>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Fatia da Receita:</span>
          <strong className="font-mono text-indigo-600 dark:text-indigo-400">{item.pct.toFixed(1)}%</strong>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          {item.description}
        </p>
      </div>
    );
  };

  return (
    <div 
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-6 relative overflow-hidden ${className}`}
      data-testid="pj-tax-and-payout-optimizer-card"
    >
      {/* Background glow accent */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-amber-500/5 via-violet-500/5 to-transparent rounded-full pointer-events-none -ml-16 -mt-16 blur-2xl" />

      {/* Header do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
              <Percent className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Otimizador de Fator R, Limite do Simples & Divisão de Retiradas
              </h3>
              
              {/* Badge do Anexo */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                metrics.isAnexoIII
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}>
                {metrics.isAnexoIII ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Anexo III Garantido (6,0%)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Risco de Anexo V (15,5%)</span>
                  </>
                )}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitore o Fator R para pagar a menor alíquota de impostos, controle o teto anual do Simples e simule a transferência líquida para sua conta PF.
          </p>
        </div>

        {/* Seletor de Teto do Simples */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <span className="text-[11px] font-bold text-slate-400">Teto Monitorado:</span>
          <div className="relative">
            <select
              value={ceilingPreset}
              onChange={(e) => setCeilingPreset(e.target.value as SimplesCeilingPreset)}
              className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500"
              data-testid="ceiling-preset-select"
            >
              {Object.values(SIMPLES_CEILING_PRESETS).map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid Principal: 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* COLUNA 1: Monitor Fator R & Termômetro do Limite (5 colunas no LG) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card Fator R */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Termômetro de Fator R (12 Meses)
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-2 mt-0.5">
                  <span data-testid="kpi-fator-r">{metrics.fatorR.toFixed(1)}%</span>
                  <span className="text-xs font-semibold text-slate-400 font-sans">
                    Meta: ≥ 28,0%
                  </span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold">Alíquota DAS</span>
                <span className={`text-sm font-extrabold font-mono ${metrics.isAnexoIII ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {metrics.effectiveTaxRatePct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Barra de Progresso do Fator R com Marcador 28% */}
            <div className="space-y-1">
              <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    metrics.isAnexoIII 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                      : 'bg-gradient-to-r from-rose-500 to-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.fatorR / 40) * 100)}%` }}
                  data-testid="fator-r-progress-bar"
                />
                
                {/* Linha / Marcador de 28% (posicionada em (28/40)*100 = 70%) */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-slate-900 dark:bg-white shadow-md z-10"
                  style={{ left: '70%' }}
                  title="Meta de 28% do Fator R"
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5 font-mono">
                <span>0%</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">Meta: 28% (Anexo III)</span>
                <span>40%+</span>
              </div>
            </div>

            {/* Status e Alerta Fator R */}
            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
              metrics.isAnexoIII
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
            }`}>
              <div className="flex items-start gap-2">
                {metrics.isAnexoIII ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="block font-bold">
                    {metrics.isAnexoIII ? 'Enquadramento Tributário Otimizado' : 'Atenção: Risco de Tributação Majorada'}
                  </strong>
                  <p className="text-[11px] mt-0.5">
                    {metrics.isAnexoIII 
                      ? 'Sua folha e pró-labore representam mais de 28% do faturamento acumulado, garantindo alíquota reduzida no Anexo III.'
                      : `Aumente o Pró-Labore em ${formatBRL(metrics.proLaboreShortfallFor28Pct)} para atingir os 28% e migrar do Anexo V para o Anexo III.`}
                  </p>
                </div>
              </div>
            </div>

            {/* FS12 e RBT12 Details */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Folha Acumulada 12M (FS12)</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200 font-bold">{formatBRL(metrics.fs12)}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Faturamento 12M (RBT12)</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200 font-bold">{formatBRL(metrics.rbt12)}</strong>
              </div>
            </div>
          </div>

          {/* Card Termômetro de Faturamento Anual (Simples Nacional) */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Termômetro de Limite Anual
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {SIMPLES_CEILING_PRESETS[ceilingPreset].title}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono block" data-testid="kpi-ceiling-consumed">
                  {metrics.ceiling.consumedPct.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500">
                  {formatBRL(metrics.rbt12)} consumidos de {formatBRL(metrics.ceiling.limit)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold">Espaço Restante</span>
                <strong className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {formatBRL(metrics.ceiling.remainingAmount)}
                </strong>
              </div>
            </div>

            {/* Barra de Progresso do Teto */}
            <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  metrics.ceiling.consumedPct > 85 
                    ? 'bg-rose-500' 
                    : metrics.ceiling.consumedPct > 65 
                    ? 'bg-amber-500' 
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${metrics.ceiling.consumedPct}%` }}
                data-testid="ceiling-progress-bar"
              />
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Projeção anual de faturamento no ritmo atual: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatBRL(metrics.ceiling.projectedAnnualPace)}</strong>.
              {metrics.ceiling.riskOfExceeding && (
                <span className="text-rose-500 font-bold ml-1">
                  Risco de ultrapassar o limite monitorado.
                </span>
              )}
            </p>
          </div>

        </div>

        {/* COLUNA 2: Calculadora de Retiradas PF vs Caixa PJ (7 colunas no LG) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Sliders Interativos */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  Simulador de Divisão de Retiradas (Mês Atual: {formatBRL(metrics.currentMonthRevenue)})
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Ajuste os parâmetros abaixo
              </span>
            </div>

            {/* Slider 1: Pró-Labore % */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Pró-Labore Sócio (% do Faturamento):</span>
                  {proLaborePct === 28 && (
                    <span className="px-1.5 py-0.2 bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 rounded text-[9px] font-bold">
                      Ideal Fator R (28%)
                    </span>
                  )}
                </span>
                <span className="font-mono font-bold text-violet-600 dark:text-violet-400 text-sm">
                  {proLaborePct}% ({formatBRL(metrics.payout.proLaboreGross)})
                </span>
              </div>
              <input 
                type="range" 
                min={10} 
                max={50} 
                step={1}
                value={proLaborePct}
                onChange={(e) => setProLaborePct(Number(e.target.value))}
                className="w-full accent-violet-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                data-testid="pro-labore-slider"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>10% (Mínimo)</span>
                <button 
                  type="button"
                  onClick={() => setProLaborePct(28)}
                  className="text-violet-600 dark:text-violet-400 hover:underline cursor-pointer font-bold"
                >
                  Restaurar 28%
                </button>
                <span>50% (Máximo)</span>
              </div>
            </div>

            {/* Slider 2: Reserva de Caixa PJ % */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Reserva de Caixa PJ (% Retido na Empresa):
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {pjReservePct}% ({formatBRL(metrics.payout.pjReserveAmount)})
                </span>
              </div>
              <input 
                type="range" 
                min={0} 
                max={30} 
                step={5}
                value={pjReservePct}
                onChange={(e) => setPjReservePct(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                data-testid="pj-reserve-slider"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0% (Sem reserva)</span>
                <span>10% (Recomendado)</span>
                <span>30% (Conservador)</span>
              </div>
            </div>
          </div>

          {/* Gráfico Horizontal: Para Onde Vai Cada R$ 1,00 Faturado */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-white">
                Destinação de Cada R$ 1,00 Faturado
              </span>
              <span className="text-[10px] text-slate-400">
                Total Faturado: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatBRL(metrics.currentMonthRevenue)}</strong>
              </span>
            </div>

            {/* Visual Segmented Bar */}
            <div className="h-6 w-full rounded-xl overflow-hidden flex bg-slate-200 dark:bg-slate-700 shadow-inner">
              {metrics.payout.destinations.map(item => (
                <div 
                  key={item.id}
                  style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  className="h-full transition-all duration-300 relative group cursor-pointer"
                  title={`${item.name}: ${item.pct.toFixed(1)}% (${formatBRL(item.amount)})`}
                />
              ))}
            </div>

            {/* Legenda compacta com valores */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[10px]">
              {metrics.payout.destinations.map(item => (
                <div key={item.id} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <div className="truncate">
                    <span className="text-slate-600 dark:text-slate-400 block truncate">{item.name}</span>
                    <strong className="font-mono text-slate-900 dark:text-white block font-semibold">
                      {item.pct.toFixed(0)}% • {formatBRL(item.amount)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2 Cards de Ação de Transferência para PF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* 1ª Transferência: Pró-Labore Líquido */}
            <div className="bg-gradient-to-br from-violet-500/10 to-transparent dark:from-violet-950/40 dark:to-slate-900 p-4 rounded-2xl border border-violet-200 dark:border-violet-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5" />
                  1ª Transferência: Pró-Labore
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold">
                  Com Retenções
                </span>
              </div>

              <div>
                <span className="text-xl font-black text-violet-700 dark:text-violet-300 font-mono block" data-testid="payout-pro-labore-net">
                  {formatBRL(metrics.payout.proLaboreNet)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Pró-Labore Bruto: {formatBRL(metrics.payout.proLaboreGross)}
                </span>
              </div>

              <div className="pt-1.5 border-t border-violet-200/50 dark:border-violet-900/50 text-[10px] space-y-0.5 text-slate-500 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>(-) INSS Sócio (11%):</span>
                  <span className="font-mono text-rose-500">- {formatBRL(metrics.payout.inssDeduction)}</span>
                </div>
                <div className="flex justify-between">
                  <span>(-) IRRF Progressivo:</span>
                  <span className="font-mono text-rose-500">- {formatBRL(metrics.payout.irrfDeduction)}</span>
                </div>
              </div>
            </div>

            {/* 2ª Transferência: Lucro Isento p/ PF */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-transparent dark:from-emerald-950/40 dark:to-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  2ª Transferência: Lucro Isento
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  100% Livre de IR
                </span>
              </div>

              <div>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono block" data-testid="payout-exempt-profit">
                  {formatBRL(metrics.payout.exemptProfitDistribution)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Transferir via PIX para sua conta PF (sem IR)
                </span>
              </div>

              <div className="pt-1.5 border-t border-emerald-200/50 dark:border-emerald-900/50 text-[10px] flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>Total Recebido PF (Soma):</span>
                <strong className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                  {formatBRL(metrics.payout.totalPartnerPayout)}
                </strong>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Banner de Rodapé: Economia Tributária (Anexo III vs Anexo V) */}
      <div 
        className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/5 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
        data-testid="tax-savings-footer"
      >
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
            <Award className="w-4 h-4" />
          </span>
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 dark:text-white block">
              Impacto da Otimização do Fator R (Anexo III vs. Anexo V)
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              No <strong>Anexo III</strong> a alíquota inicial é de <strong>6,0%</strong>, contra <strong>15,5%</strong> do Anexo V — uma economia real de <strong>9,5 p.p.</strong> em cada nota fiscal emitida.
            </p>
          </div>
        </div>

        <div className="shrink-0 self-end sm:self-center text-right pl-2 sm:border-l sm:border-emerald-200/60 dark:sm:border-emerald-900/60">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Economia Projetada</span>
          <strong className="text-emerald-600 dark:text-emerald-400 text-xs font-black font-mono block">
            {formatBRL(metrics.taxSavings.monthlySavings)} / mês
          </strong>
          <span className="text-[10px] text-slate-500 block font-mono">
            {formatBRL(metrics.taxSavings.annualProjectedSavings)} / ano economizados
          </span>
        </div>
      </div>

    </div>
  );
};
