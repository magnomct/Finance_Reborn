import React, { useMemo, useState } from 'react';
import {
  Building2,
  Edit3,
  Briefcase,
  Calculator,
  ShieldCheck,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Landmark,
} from 'lucide-react';
import { Transaction } from '../types';
import {
  calculateFinancialMetrics,
  calculatePJFiscalMetrics,
  formatBRL,
} from '../utils/finance';
import { safeGetStorage, safeSetStorage } from '../utils/storage';
import { PjDreComparative } from './PjDreComparative';
import { PjDreSummaryCard } from './PjDreSummaryCard';
import { PjDreMarginComparisonCard } from './PjDreMarginComparisonCard';
import { NetMarginEvolutionCard } from './NetMarginEvolutionCard';
import { PJTaxAndPayoutOptimizerCard } from './PJTaxAndPayoutOptimizerCard';
import { MEIFinancialAndPayoutCard } from './MEIFinancialAndPayoutCard';

interface PjViewProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Partial<Transaction>) => void;
  onEditTransaction?: (tx: Transaction) => void;
}

const PJ_FISCAL_SETTINGS_KEY = '@finance_app:pj_fiscal_settings_v1';

interface StoredPjFiscalSettings {
  monthlyDASProvision: number;
  dasReserveBalance: number;
  targetProLabore: number;
  payroll12m: number;
}

export const PjView: React.FC<PjViewProps> = ({ transactions, onAddTransaction, onEditTransaction }) => {
  const [pjTab, setPjTab] = useState<'mei' | 'simples'>('mei');
  const [transferToast, setTransferToast] = useState<string | null>(null);

  const [fiscalSettings, setFiscalSettings] = useState<StoredPjFiscalSettings>(() =>
    safeGetStorage<StoredPjFiscalSettings>(
      PJ_FISCAL_SETTINGS_KEY,
      {
        monthlyDASProvision: 75.9,
        dasReserveBalance: 227.7,
        targetProLabore: 857.04,
        payroll12m: 10284.48,
      },
      val => {
        if (!val || typeof val !== 'object') return false;
        const v = val as Partial<StoredPjFiscalSettings>;
        return (
          typeof v.monthlyDASProvision === 'number' &&
          Number.isFinite(v.monthlyDASProvision) &&
          typeof v.dasReserveBalance === 'number' &&
          Number.isFinite(v.dasReserveBalance) &&
          typeof v.targetProLabore === 'number' &&
          Number.isFinite(v.targetProLabore) &&
          typeof v.payroll12m === 'number' &&
          Number.isFinite(v.payroll12m)
        );
      }
    )
  );

  const updateFiscalSetting = (patch: Partial<StoredPjFiscalSettings>) => {
    setFiscalSettings(prev => {
      const next: StoredPjFiscalSettings = {
        ...prev,
        ...patch,
      };
      safeSetStorage(PJ_FISCAL_SETTINGS_KEY, next);
      return next;
    });
  };

  const metrics = calculateFinancialMetrics(transactions, true);
  const pjTransactions = transactions.filter(t => t.costCenter === 'PJ');

  // Derive monthly and annualized PJ metrics without inflating gross revenue with PF transfers
  const pjStats = useMemo(() => {
    const activeMonth = '2026-10';
    const isProfitTransfer = (tx: Transaction) => {
      const desc = (tx.description || '').toLowerCase();
      const cat = (tx.category || '').toLowerCase();
      return (
        cat.includes('distribuição de lucros') ||
        desc.includes('transferência lucro isento') ||
        desc.includes('transferencia lucro isento')
      );
    };

    const pjRevenues = pjTransactions.filter(t => t.type === 'receita');
    const pjOperatingExpenses = pjTransactions.filter(
      t => t.type === 'despesa' && !isProfitTransfer(t)
    );
    const pjDistributedMonth = pjTransactions
      .filter(t => t.type === 'despesa' && isProfitTransfer(t) && t.date.startsWith(activeMonth))
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const monthlyRevs = pjRevenues.filter(t => t.date.startsWith(activeMonth));
    const monthlyExps = pjOperatingExpenses.filter(t => t.date.startsWith(activeMonth));

    const monthlyGrossRevenue =
      monthlyRevs.length > 0
        ? monthlyRevs.reduce((acc, t) => acc + Math.max(0, t.amount), 0)
        : pjRevenues.reduce((acc, t) => acc + Math.max(0, t.amount), 0);

    const monthlyExpenses =
      monthlyExps.length > 0
        ? monthlyExps.reduce((acc, t) => acc + Math.abs(t.amount), 0)
        : pjOperatingExpenses.reduce((acc, t) => acc + Math.abs(t.amount), 0);

    // Count distinct months in PJ revenues; if < 12 months, annualize 12m baseline cleanly
    const distinctRevMonths = new Set(pjRevenues.map(t => t.date.slice(0, 7))).size;
    const rawTotalRev = pjRevenues.reduce((acc, t) => acc + Math.max(0, t.amount), 0);
    const grossRevenue12m =
      distinctRevMonths >= 12 ? rawTotalRev : monthlyGrossRevenue * 12;

    const alreadyTransferredPF = Math.round(pjDistributedMonth * 100) / 100;

    return {
      activeMonth,
      monthlyGrossRevenue,
      monthlyExpenses,
      grossRevenue12m,
      alreadyTransferredPF,
    };
  }, [pjTransactions]);

  const fiscalMetrics = useMemo(
    () =>
      calculatePJFiscalMetrics({
        grossRevenue12m: pjStats.grossRevenue12m,
        monthlyGrossRevenue: pjStats.monthlyGrossRevenue,
        monthlyExpenses: pjStats.monthlyExpenses,
        payroll12m: fiscalSettings.payroll12m,
        dasReserveBalance: fiscalSettings.dasReserveBalance,
        monthlyDASProvision: fiscalSettings.monthlyDASProvision,
        targetProLabore: fiscalSettings.targetProLabore,
      }),
    [pjStats, fiscalSettings]
  );

  const remainingTransferableProfit = Math.max(
    0,
    Math.round((fiscalMetrics.exemptProfitDistributionBRL - pjStats.alreadyTransferredPF) * 100) / 100
  );

  const handleTransferExemptProfitToPF = () => {
    const amountToTransfer = remainingTransferableProfit;
    if (amountToTransfer <= 0) return;

    const txDate = `${pjStats.activeMonth}-26`;

    // 1. PJ Outflow (recorded as profit distribution, never inflates PJ gross revenue)
    onAddTransaction({
      date: txDate,
      description: 'Transferência Lucro Isento para PF',
      amount: -amountToTransfer,
      type: 'despesa',
      jar: 'PJ_EXCLUIDO',
      costCenter: 'PJ',
      account: 'Inter PJ',
      status: 'liquidado',
      category: 'Distribuição de Lucros',
      notes: 'Repasse de Lucro Isento MEI/PJ → Inter PF',
    });

    // 2. Paired PF Inflow (credited to Inter PF / Magno)
    onAddTransaction({
      date: txDate,
      description: 'Recebimento Lucro Isento PJ',
      amount: amountToTransfer,
      type: 'receita',
      jar: 'LIF_10',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Distribuição de Lucros',
      notes: 'Lucro Isento recebido da Conta Inter PJ',
    });

    setTransferToast(
      `Transferência pareada de ${formatBRL(amountToTransfer)} registrada (saída PJ + entrada PF).`
    );
    setTimeout(() => setTransferToast(null), 5000);
  };

  const handleProvisionMonthlyDAS = () => {
    const nextBalance =
      Math.round((fiscalSettings.dasReserveBalance + fiscalSettings.monthlyDASProvision) * 100) / 100;
    updateFiscalSetting({ dasReserveBalance: nextBalance });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-teal-600 text-white">
              <Building2 className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400">
              Gestão Empresarial & Operação Jurídica
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Operação PJ (Conta Inter PJ)
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhe o faturamento MEI, limite anual de R$ 81.000, guia DAS unificada e simulações para o Simples Nacional.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-900">
            Regime Atual: MEI Ativo
          </span>
          <span className="px-3.5 py-1.5 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-900">
            Margem Líquida: {metrics.pjProfitMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PAINEL ESTRATÉGICO FISCAL & FLUXO DE CAIXA PJ/MEI (3 COLUNAS)         */}
      {/* ===================================================================== */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        data-testid="pj-strategic-fiscal-panel"
      >
        {/* WIDGET 1: Monitor de Fator R (12 Meses) + Teto Anual MEI */}
        <div
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4"
          data-testid="card-pj-fator-r"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Monitor de Fator R (12 Meses)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Folha 12M ÷ Receita Bruta 12M
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                  fiscalMetrics.isAnexoIIIOptimized
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                }`}
                data-testid="badge-pj-fator-r-status"
              >
                {fiscalMetrics.isAnexoIIIOptimized ? 'Anexo III (≥ 28%)' : 'Atenção (< 28%)'}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span
                className="text-2xl font-black text-slate-900 dark:text-white tabular-nums"
                data-testid="value-pj-fator-r-pct"
              >
                {fiscalMetrics.fatorRPercent.toFixed(1).replace('.', ',')}%
              </span>
              <span className="text-[11px] text-slate-500 tabular-nums">
                Meta Anexo III: <strong>28,0%</strong>
              </span>
            </div>

            {/* Barra Fator R com marcador de 28% */}
            <div className="relative h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  fiscalMetrics.isAnexoIIIOptimized ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${fiscalMetrics.fatorRProgressPct}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-slate-900/60 dark:bg-white/70"
                style={{ left: '28%' }}
                title="Limiar de 28% para enquadramento no Anexo III"
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px]">
              <label
                htmlFor="pj-payroll-12m"
                className="text-slate-500 dark:text-slate-400 font-semibold"
              >
                Folha / Pró-Labore 12M (R$):
              </label>
              <input
                id="pj-payroll-12m"
                type="number"
                min="0"
                step="50"
                value={fiscalSettings.payroll12m}
                onChange={e =>
                  updateFiscalSetting({
                    payroll12m: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                data-testid="input-pj-payroll-12m"
                className="w-28 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-right font-bold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Sub-bloco: Teto Anual MEI R$ 81.000,00 */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Teto Anual MEI (R$ 81.000,00)
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  fiscalMetrics.meiCapAlertLevel === 'EXCEEDED_100'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                    : fiscalMetrics.meiCapAlertLevel === 'WARNING_80'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
                }`}
                data-testid="badge-pj-mei-cap"
              >
                {fiscalMetrics.meiCapUsagePct.toFixed(1).replace('.', ',')}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  fiscalMetrics.meiCapAlertLevel === 'EXCEEDED_100'
                    ? 'bg-rose-500'
                    : fiscalMetrics.meiCapAlertLevel === 'WARNING_80'
                      ? 'bg-amber-500'
                      : 'bg-teal-500'
                }`}
                style={{ width: `${fiscalMetrics.meiCapBarPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
              <span>Projeção 12M: {formatBRL(fiscalMetrics.grossRevenue12m)}</span>
              <span>Folga: {formatBRL(fiscalMetrics.meiRemainingCapBRL)}</span>
            </div>
          </div>
        </div>

        {/* WIDGET 2: Calculadora de Retirada (Pró-Labore vs. Lucro Isento) */}
        <div
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4"
          data-testid="card-pj-withdrawal-calculator"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <ArrowRightLeft className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Calculadora de Retirada
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pró-Labore (11% INSS) vs. Lucro Isento
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                Lucro Líq.: {formatBRL(fiscalMetrics.netMonthlyProfitBRL)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <label
                htmlFor="pj-pro-labore-input"
                className="font-bold text-slate-700 dark:text-slate-200"
              >
                Pró-Labore Bruto (R$):
              </label>
              <input
                id="pj-pro-labore-input"
                type="number"
                min="0"
                step="50"
                value={fiscalSettings.targetProLabore}
                onChange={e =>
                  updateFiscalSetting({
                    targetProLabore: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                data-testid="input-pj-pro-labore"
                className="w-28 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-right font-black text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  INSS (11%) / Líquido
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums block mt-0.5">
                  {formatBRL(fiscalMetrics.proLaboreNetBRL)}
                </span>
                <span className="text-[10px] text-rose-500 tabular-nums">
                  - {formatBRL(fiscalMetrics.proLaboreINSSBRL)} INSS
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-900/60">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase block">
                  Lucro Isento (PF)
                </span>
                <span
                  className="text-sm font-black text-emerald-700 dark:text-emerald-300 tabular-nums block mt-0.5"
                  data-testid="value-pj-exempt-profit"
                >
                  {formatBRL(fiscalMetrics.exemptProfitDistributionBRL)}
                </span>
                <span className="text-[10px] text-slate-500 tabular-nums">
                  Disp.: {formatBRL(remainingTransferableProfit)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleTransferExemptProfitToPF}
              disabled={remainingTransferableProfit <= 0}
              data-testid="btn-pj-transfer-exempt-profit"
              className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                remainingTransferableProfit > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-[0.99]'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>
                {remainingTransferableProfit > 0
                  ? `Transferir Lucro Isento para PF (${formatBRL(remainingTransferableProfit)})`
                  : 'Lucro Isento do Mês já Transferido'}
              </span>
            </button>
            {transferToast && (
              <p
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 text-center"
                data-testid="toast-pj-transfer-success"
              >
                {transferToast}
              </p>
            )}
          </div>
        </div>

        {/* WIDGET 3: Reserva Virtual de Obrigações & DAS */}
        <div
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4"
          data-testid="card-pj-das-reserve"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <Landmark className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Reserva Virtual de Obrigações &amp; DAS
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Provisão mensal de guia DAS &amp; tributos
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                  fiscalMetrics.isDasReserveHealthy
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                }`}
                data-testid="badge-pj-das-health"
              >
                {fiscalMetrics.isDasReserveHealthy ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Coberto</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    <span>Déficit</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span
                className="text-2xl font-black text-slate-900 dark:text-white tabular-nums"
                data-testid="value-pj-das-reserve"
              >
                {formatBRL(fiscalMetrics.dasReserveBalance)}
              </span>
              <span className="text-[11px] text-slate-500 tabular-nums">
                Cobertura:{' '}
                <strong className="text-teal-600 dark:text-teal-400">
                  {fiscalMetrics.dasMonthsCovered.toFixed(1).replace('.', ',')} meses
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label
                  htmlFor="pj-das-provision-input"
                  className="text-[10px] font-bold text-slate-500 block mb-1"
                >
                  Provisão DAS/Mês (R$)
                </label>
                <input
                  id="pj-das-provision-input"
                  type="number"
                  min="0"
                  step="1"
                  value={fiscalSettings.monthlyDASProvision}
                  onChange={e =>
                    updateFiscalSetting({
                      monthlyDASProvision: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  data-testid="input-pj-das-provision"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label
                  htmlFor="pj-das-balance-input"
                  className="text-[10px] font-bold text-slate-500 block mb-1"
                >
                  Saldo Virtual DAS (R$)
                </label>
                <input
                  id="pj-das-balance-input"
                  type="number"
                  min="0"
                  step="10"
                  value={fiscalSettings.dasReserveBalance}
                  onChange={e =>
                    updateFiscalSetting({
                      dasReserveBalance: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  data-testid="input-pj-das-balance"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleProvisionMonthlyDAS}
            data-testid="btn-pj-provision-das"
            className="w-full py-2.5 px-3 rounded-2xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold text-xs transition cursor-pointer"
          >
            + Provisionar DAS do Mês ({formatBRL(fiscalSettings.monthlyDASProvision)})
          </button>
        </div>
      </div>

      {/* Tabs de Regime: MEI (Atual) vs Simples Nacional (Planejamento) */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl text-xs font-bold gap-1 self-start sm:self-auto max-w-fit">
        <button
          type="button"
          onClick={() => setPjTab('mei')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            pjTab === 'mei'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          data-testid="pj-tab-mei"
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Operação MEI (Atual)</span>
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
            pjTab === 'mei' ? 'bg-white/20 text-white' : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
          }`}>
            Ativo
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPjTab('simples')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            pjTab === 'simples'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          data-testid="pj-tab-simples"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Simples Nacional (Planejamento & DRE)</span>
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
            pjTab === 'simples' ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
          }`}>
            Simulador
          </span>
        </button>
      </div>

      {/* CONTEÚDO DA ABA MEI (ATUAL) */}
      {pjTab === 'mei' && (
        <div className="space-y-6">
          {/* Central MEI: Limite Anual, DAS Fixo e Transferência PF */}
          <MEIFinancialAndPayoutCard 
            transactions={transactions} 
            initialMonth="2026-10" 
            onAddTransaction={onAddTransaction}
          />
        </div>
      )}

      {/* CONTEÚDO DA ABA SIMPLES NACIONAL (PLANEJAMENTO & DRE) */}
      {pjTab === 'simples' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                <strong>Painel de Planejamento Tributário:</strong> Parâmetros do Simples Nacional mantidos para projeção e transição caso sua receita ultrapasse o teto do MEI.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPjTab('mei')}
              className="px-3 py-1 bg-white dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-lg font-bold hover:underline cursor-pointer shrink-0 ml-2"
            >
              Voltar ao MEI
            </button>
          </div>

          {/* Componente Resumo DRE: Cálculo Automático de Receita Bruta, DAS Estimado e Lucro Líquido p/ PF */}
          <PjDreSummaryCard transactions={transactions} initialMonth="2026-10" />

          {/* Comparativo DRE: Mês Atual vs Média dos Últimos 3 Meses */}
          <PjDreMarginComparisonCard transactions={transactions} initialMonth="2026-10" />

          {/* DRE Comparativo Analítico: Mês Atual vs Média 3 Meses */}
          <PjDreComparative transactions={transactions} initialMonth="2026-10" />

          {/* Evolução da Margem Líquida - 12 Meses */}
          <NetMarginEvolutionCard transactions={transactions} initialMonth="2026-10" />

          {/* Otimizador de Fator R, Limite do Simples e Divisão de Retiradas */}
          <PJTaxAndPayoutOptimizerCard transactions={transactions} initialMonth="2026-10" />
        </div>
      )}

      {/* Tabela de Lançamentos PJ */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          Extrato Detalhado da Conta Inter PJ
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Descrição</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                {onEditTransaction && <th className="py-2.5 px-3 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pjTransactions.map(tx => {
                const isPositive = tx.type === 'receita';
                return (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-slate-400">{tx.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{tx.description}</span>
                        {tx.notes && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                            {tx.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{tx.category || 'Geral PJ'}</td>
                    <td className={`py-3 px-3 text-right font-black ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isPositive ? '+' : '-'} {formatBRL(Math.abs(tx.amount))}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                        Liquidado
                      </span>
                    </td>
                    {onEditTransaction && (
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onEditTransaction(tx)}
                          className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Editar lançamento PJ"
                          data-testid={`edit-pj-${tx.id}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
