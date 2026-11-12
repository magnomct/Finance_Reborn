import React, { useState, useMemo } from 'react';
import { 
  Building2, ShieldCheck, AlertTriangle, ArrowRight, ArrowUpRight, 
  Wallet, CheckCircle2, DollarSign, Calendar, Sliders, ChevronDown, 
  HelpCircle, Sparkles, BookOpen, Clock, FileText, Check, AlertCircle
} from 'lucide-react';
import { Transaction } from '../types';
import { 
  calculateMEIMetrics, 
  MEIActivityType, 
  MEIIRPFMode, 
  MEI_DAS_PRESETS,
  MEIMetrics,
  SALARIO_MINIMO_2026
} from '../utils/meiMetrics';
import { formatBRL } from '../utils/finance';

export interface MEIFinancialAndPayoutCardProps {
  transactions?: Transaction[];
  initialMonth?: string;
  onAddTransaction?: (tx: Partial<Transaction>) => void;
  className?: string;
}

export const MEIFinancialAndPayoutCard: React.FC<MEIFinancialAndPayoutCardProps> = ({
  transactions = [],
  initialMonth = '2026-10',
  onAddTransaction,
  className = '',
}) => {
  const [activityType, setActivityType] = useState<MEIActivityType>('servicos');
  const [pjReservePct, setPjReservePct] = useState<number>(10);
  const [irpfMode, setIrpfMode] = useState<MEIIRPFMode>('presuncao_32');
  const [showConfirmationToast, setShowConfirmationToast] = useState<boolean>(false);

  // Compute MEI metrics
  const metrics: MEIMetrics = useMemo(() => {
    return calculateMEIMetrics(transactions, {
      referenceMonth: initialMonth,
      activityType,
      pjReservePct,
      irpfMode,
    });
  }, [transactions, initialMonth, activityType, pjReservePct, irpfMode]);

  // Action: Launch Transfers into PF Transactions
  const handleLaunchTransfersToPF = () => {
    if (!onAddTransaction || metrics.isAlreadyLoggedThisMonth || metrics.totalPayoutPF <= 0) {
      return;
    }

    const todayDate = `${initialMonth}-15`;

    // 1. Base Withdrawal (Retirada Base / Pró-labore MEI) -> Necessidades Básicas PF (NEC_55)
    if (metrics.baseWithdrawal > 0) {
      onAddTransaction({
        date: todayDate,
        description: 'Transferência MEI - Retirada Base',
        amount: metrics.baseWithdrawal,
        type: 'receita',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado',
        category: 'Pró-Labore / MEI',
        notes: `Retirada MEI ${initialMonth} (${irpfMode === 'presuncao_32' ? 'Parcela Tributável IRPF' : '1 Salário Mínimo'})`,
      });
    }

    // 2. Exempt Profit Distribution (Distribuição de Lucros Isenta) -> Liberdade Financeira (LIF_10)
    if (metrics.exemptProfitDistribution > 0) {
      onAddTransaction({
        date: todayDate,
        description: 'Transferência MEI - Lucro Isento',
        amount: metrics.exemptProfitDistribution,
        type: 'receita',
        jar: 'LIF_10',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado',
        category: 'Distribuição de Lucros',
        notes: `Lucro Isento MEI ${initialMonth} (${irpfMode === 'presuncao_32' ? 'Presunção 32% LC 123/06' : 'Escrituração Livro Caixa 100% Isento'})`,
      });
    }

    setShowConfirmationToast(true);
    setTimeout(() => {
      setShowConfirmationToast(false);
    }, 5000);
  };

  // Safe pace marker percentage along the 81k bar
  const safePaceAccumulated = Math.min(81000, 6750 * metrics.monthsElapsed);
  const safePacePct = (safePaceAccumulated / 81000) * 100;

  return (
    <div 
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-6 relative overflow-hidden ${className}`}
      data-testid="mei-financial-and-payout-card"
    >
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-teal-500/5 via-amber-500/5 to-transparent rounded-full pointer-events-none -mr-16 -mt-16 blur-2xl" />

      {/* Header do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Building2 className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Central MEI: Limite Anual, DAS Fixo & Transferência PF
              </h3>

              {/* Status Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                metrics.statusBadge.color === 'emerald'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : metrics.statusBadge.color === 'amber'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}>
                {metrics.statusBadge.color === 'emerald' ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span>{metrics.statusBadge.label}</span>
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Controle do teto de faturamento de R$ 81.000, guia DAS MEI unificada e apuração do Lucro Isento para transferência direta à sua conta PF.
          </p>
        </div>

        {/* Seletor de Atividade MEI (DAS Fixo) */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <span className="text-[11px] font-bold text-slate-400">Atividade MEI:</span>
          <div className="relative">
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as MEIActivityType)}
              className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
              data-testid="mei-activity-select"
            >
              {Object.values(MEI_DAS_PRESETS).map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({formatBRL(preset.amount)})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid Principal: 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* ========================================================================= */}
        {/* COLUNA 1: Termômetro de Faturamento MEI & Monitor de DAS (5 colunas no LG) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card Termômetro Teto R$ 81.000 */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Teto Anual MEI (Ano {metrics.year})
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono block mt-0.5" data-testid="kpi-mei-consumed-pct">
                  {metrics.consumedPct.toFixed(1)}%
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold">Emitido no Ano</span>
                <span className="text-sm font-extrabold font-mono text-teal-600 dark:text-teal-400" data-testid="kpi-mei-ytd-revenue">
                  {formatBRL(metrics.ytdRevenue)}
                </span>
              </div>
            </div>

            {/* Barra de Progresso Visual do Teto R$ 81.000 */}
            <div className="space-y-1.5">
              <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    metrics.consumedPct > 85 
                      ? 'bg-rose-500' 
                      : metrics.consumedPct > 65 
                      ? 'bg-amber-500' 
                      : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                  }`}
                  style={{ width: `${metrics.consumedPct}%` }}
                  data-testid="mei-progress-bar"
                />

                {/* Marcador do Ritmo Mensal Seguro Acumulado (R$ 6.750 * meses decorridos) */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-slate-900 dark:bg-white shadow-md z-10"
                  style={{ left: `${safePacePct}%` }}
                  title={`Ritmo Ideal até ${metrics.referenceMonth}: ${formatBRL(safePaceAccumulated)}`}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                <span>R$ 0,00</span>
                <span className="text-slate-600 dark:text-slate-300 font-bold">
                  Ritmo Seguro ({metrics.monthsElapsed}M): {formatBRL(safePaceAccumulated)}
                </span>
                <span>Teto: R$ 81.000</span>
              </div>
            </div>

            {/* Destaque: Saldo Restante de Notas até Dezembro */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-teal-500/10 to-transparent dark:from-teal-950/40 dark:to-slate-800 border border-teal-200/80 dark:border-teal-900/60">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 block">
                    Saldo Restante para Emitir sem Desenquadrar
                  </span>
                  <span className="text-xl font-black font-mono text-slate-900 dark:text-white block mt-0.5" data-testid="kpi-mei-remaining-quota">
                    {formatBRL(metrics.remainingAnnualQuota)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    {metrics.monthsRemaining > 0 ? `${metrics.monthsRemaining} meses restantes` : 'Mês final'}
                  </span>
                  <span className="text-xs font-bold font-mono text-teal-600 dark:text-teal-400 block">
                    {metrics.monthsRemaining > 0 ? `~${formatBRL(metrics.recommendedMonthlyQuota)} / mês` : 'Teto atingido'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {metrics.statusBadge.description} Tolerância máxima com excesso de até 20%: <strong>{formatBRL(metrics.annualToleranceCeiling)}</strong>.
              </p>
            </div>
          </div>

          {/* Card Status do DAS Fixo do Mês */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                  <FileText className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  DAS Fixo do Mês ({metrics.referenceMonth})
                </span>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                metrics.isDasPaidThisMonth
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`} data-testid="das-status-badge">
                {metrics.isDasPaidThisMonth ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>DAS Pago</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>DAS Pendente</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white block">
                  {formatBRL(metrics.dasAmount)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {metrics.dasConfig.description}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold">Vencimento</span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  Dia 20 do mês ({metrics.dasDueDate.slice(8, 10)}/{metrics.dasDueDate.slice(5, 7)})
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Inclui Previdência INSS (Aposentadoria MEI)</span>
              <span className="font-bold text-teal-600 dark:text-teal-400">5% do Salário Mínimo</span>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* COLUNA 2: Simulador de Retiradas e Sincronização PF (7 colunas no LG)      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Card Configuração e Regra IRPF */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            
            {/* Header com Alternância de Modo IRPF */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Divisão de Transferência para Pessoa Física (PF)
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Faturamento Bruto do Mês: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatBRL(metrics.currentMonthRevenue)}</strong>
                </span>
              </div>

              {/* Toggle de Regra de Apuração IRPF */}
              <div className="flex items-center bg-slate-200/80 dark:bg-slate-700 p-0.5 rounded-xl text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setIrpfMode('presuncao_32')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    irpfMode === 'presuncao_32'
                      ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  data-testid="mode-presuncao-32"
                >
                  Regra 32% (Serviços)
                </button>
                <button
                  type="button"
                  onClick={() => setIrpfMode('livro_caixa_100')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    irpfMode === 'livro_caixa_100'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-teal-600 dark:hover:text-teal-400'
                  }`}
                  data-testid="mode-livro-caixa"
                >
                  Livro Caixa (100% Isento)
                </button>
              </div>
            </div>

            {/* Slider Reserva de Caixa PJ */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Reserva de Caixa PJ (% Retido na Conta MEI):
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {pjReservePct}% ({formatBRL(metrics.pjReserveAmount)})
                </span>
              </div>
              <input 
                type="range" 
                min={0} 
                max={30} 
                step={5}
                value={pjReservePct}
                onChange={(e) => setPjReservePct(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                data-testid="mei-pj-reserve-slider"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0% (Repassar tudo)</span>
                <span>10% (Recomendado)</span>
                <span>30% (Conservador)</span>
              </div>
            </div>

            {/* Descontos e Resumo de Cálculo */}
            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>Receita Bruta Faturada:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{formatBRL(metrics.currentMonthRevenue)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>(-) DAS Fixo MEI:</span>
                <span className="font-mono text-rose-500">- {formatBRL(metrics.dasAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>(-) Despesas Operacionais PJ (Saúde/Custos):</span>
                <span className="font-mono text-rose-500">- {formatBRL(metrics.currentMonthOperatingCosts)}</span>
              </div>
              {metrics.pjReserveAmount > 0 && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                  <span>(-) Reserva de Caixa MEI ({pjReservePct}%):</span>
                  <span className="font-mono text-blue-500">- {formatBRL(metrics.pjReserveAmount)}</span>
                </div>
              )}
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
                <span>(=) Total Líquido Transferível para PF:</span>
                <span className="font-mono text-teal-600 dark:text-teal-400 text-sm font-black" data-testid="kpi-mei-total-transferable">
                  {formatBRL(metrics.totalNetProfitTransferable)}
                </span>
              </div>
            </div>

            {/* Explicação da Regra IRPF Selecionada */}
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
              {irpfMode === 'presuncao_32' ? (
                <>
                  💡 <strong>Regra 32% (Art. 14 da LC 123/2006):</strong> 32% da receita bruta ({formatBRL(metrics.currentMonthRevenue * 0.32)}) é isenta de Imposto de Renda. O restante transferido é considerado rendimento tributável na Declaração Anual IRPF.
                </>
              ) : (
                <>
                  💡 <strong>Escrituração Contábil / Livro Caixa:</strong> Ao comprovar todas as despesas da empresa em livro caixa, 100% do lucro líquido apurado pode ser transferido como distribuição isenta para a PF, mantendo 1 Salário Mínimo ({formatBRL(SALARIO_MINIMO_2026)}) como retirada base.
                </>
              )}
            </p>
          </div>

          {/* Os 2 Cards de Pix para a Conta PF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* 1. Retirada Base / Pró-Labore */}
            <div className="bg-gradient-to-br from-amber-500/10 to-transparent dark:from-amber-950/40 dark:to-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5" />
                  1. Retirada Base (PF)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                  Pote 55%
                </span>
              </div>

              <div>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono block" data-testid="mei-base-withdrawal">
                  {formatBRL(metrics.baseWithdrawal)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Cobre o custo de vida pessoal básico
                </span>
              </div>

              <div className="pt-1.5 border-t border-amber-200/50 dark:border-amber-900/50 text-[10px] text-slate-500 dark:text-slate-400">
                <span>{irpfMode === 'presuncao_32' ? 'Parcela Sujeita a IRPF' : 'Equivalente a 1 Salário Mínimo'}</span>
              </div>
            </div>

            {/* 2. Parcela Isenta de IRPF */}
            <div className="bg-gradient-to-br from-teal-500/10 to-transparent dark:from-teal-950/40 dark:to-slate-900 p-4 rounded-2xl border border-teal-200 dark:border-teal-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-700 dark:text-teal-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  2. Parcela Isenta de IRPF
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold">
                  100% Livre de IR
                </span>
              </div>

              <div>
                <span className="text-xl font-black text-teal-600 dark:text-teal-400 font-mono block" data-testid="mei-exempt-distribution">
                  {formatBRL(metrics.exemptProfitDistribution)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Distribuído sem imposto na conta PF
                </span>
              </div>

              <div className="pt-1.5 border-t border-teal-200/50 dark:border-teal-900/50 text-[10px] text-slate-500 dark:text-slate-400">
                <span>Alocação sugerida: Pote LIF (Liberdade)</span>
              </div>
            </div>

          </div>

          {/* Botão de Ação: Lançar Retiradas no Extrato PF */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleLaunchTransfersToPF}
              disabled={metrics.isAlreadyLoggedThisMonth || metrics.totalPayoutPF <= 0}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer ${
                metrics.isAlreadyLoggedThisMonth
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 cursor-not-allowed'
                  : metrics.totalPayoutPF <= 0
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/20 active:scale-[0.99]'
              }`}
              data-testid="launch-mei-transfers-btn"
            >
              {metrics.isAlreadyLoggedThisMonth ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Transferências de {metrics.referenceMonth} já lançadas no Extrato PF</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Lançar Retiradas no Extrato PF ({formatBRL(metrics.totalPayoutPF)})</span>
                </>
              )}
            </button>

            {/* Toast Feedback de Confirmação */}
            {showConfirmationToast && (
              <div 
                className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-fade-in"
                data-testid="mei-toast-confirmation"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Lançamento concluído! As duas receitas (Retirada Base e Lucro Isento) foram integradas à conta Inter PF.
                </span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
