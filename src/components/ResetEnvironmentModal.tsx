import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, Sparkles, Trash2, CheckCircle2, Shield, 
  Wallet, DollarSign, Target, ChevronRight, ChevronLeft,
  X, AlertTriangle, ArrowRight, Layers, Sliders, RefreshCw
} from 'lucide-react';
import { JarType, AccountType, CostCenter } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { formatBRL } from '../utils/finance';
import { 
  buildFreshEnvironment, 
  calculateJarLimitsFromIncome, 
  EnvironmentWizardConfig, 
  EnvironmentSetupOutput,
  DEFAULT_JAR_PERCENTAGES,
  purgeAllApplicationStorage
} from '../utils/environmentSetup';

interface ResetEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyEnvironment: (newEnv: EnvironmentSetupOutput, feedbackMessage: string) => void;
  onRestoreDemoModel: () => void;
}

export const ResetEnvironmentModal: React.FC<ResetEnvironmentModalProps> = ({
  isOpen,
  onClose,
  onApplyEnvironment,
  onRestoreDemoModel,
}) => {
  const [activeTab, setActiveTab] = useState<'wizard' | 'blank' | 'demo'>('wizard');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [userName, setUserName] = useState('');
  const [scope, setScope] = useState<'PF' | 'PJ' | 'CONSOLIDADO'>('PF');
  const [accountName, setAccountName] = useState<string>('Inter PF');
  const [initialBalance, setInitialBalance] = useState<string>('1500');
  
  // Step 2: Income & Jars
  const [monthlyIncome, setMonthlyIncome] = useState<string>('5000');
  const [incomeDescription, setIncomeDescription] = useState('Salário / Renda Principal');
  const [incomeDay, setIncomeDay] = useState<number>(5);
  const [customJarPcts, setCustomJarPcts] = useState<Record<JarType, number>>({ ...DEFAULT_JAR_PERCENTAGES });

  // Step 3: Emergency Reserve & Goals
  const [reserveInitial, setReserveInitial] = useState<string>('1000');
  const [reserveMonths, setReserveMonths] = useState<number>(6);
  const [firstGoalTitle, setFirstGoalTitle] = useState('');
  const [firstGoalTarget, setFirstGoalTarget] = useState('');

  // Confirmation for blank reset
  const [blankConfirmText, setBlankConfirmText] = useState('');

  // Parsed Numeric Helpers
  const parsedIncome = useMemo(() => {
    const val = parseFloat(monthlyIncome.replace(',', '.'));
    return isNaN(val) || val < 0 ? 0 : val;
  }, [monthlyIncome]);

  const parsedInitialBalance = useMemo(() => {
    const val = parseFloat(initialBalance.replace(',', '.'));
    return isNaN(val) ? 0 : val;
  }, [initialBalance]);

  const parsedReserveInitial = useMemo(() => {
    const val = parseFloat(reserveInitial.replace(',', '.'));
    return isNaN(val) ? 0 : val;
  }, [reserveInitial]);

  const calculatedJarLimits = useMemo(() => {
    return calculateJarLimitsFromIncome(parsedIncome, customJarPcts);
  }, [parsedIncome, customJarPcts]);

  const estimatedLivingCost = useMemo(() => {
    return calculatedJarLimits.NEC_55 || (parsedIncome * 0.55);
  }, [calculatedJarLimits, parsedIncome]);

  const recommendedReserveTarget = useMemo(() => {
    return estimatedLivingCost * reserveMonths;
  }, [estimatedLivingCost, reserveMonths]);

  if (!isOpen) return null;

  // Submission handler
  const handleCompleteWizard = () => {
    const config: EnvironmentWizardConfig = {
      mode: 'custom_wizard',
      userName: userName.trim() || undefined,
      scope,
      accountName,
      initialBalance: parsedInitialBalance,
      monthlyIncome: parsedIncome,
      incomeDescription: incomeDescription.trim() || 'Renda Principal',
      incomeDay,
      reserveInitialBalance: parsedReserveInitial,
      reserveTargetMonths: reserveMonths,
      createEmergencyGoal: true,
      jarPercentages: customJarPcts,
      firstGoalTitle: firstGoalTitle.trim() || undefined,
      firstGoalTarget: firstGoalTarget ? parseFloat(firstGoalTarget) : undefined,
      referenceDate: '2026-10-25',
    };

    const newEnv = buildFreshEnvironment(config);
    onApplyEnvironment(newEnv, '🎉 Ambiente configurado com sucesso! Seus dados foram inicializados do zero.');
    onClose();
  };

  const handleCompleteBlank = () => {
    const newEnv = buildFreshEnvironment({ mode: 'blank' });
    onApplyEnvironment(newEnv, '✨ Ambiente totalmente zerado. Você agora tem uma folha em branco pronta para uso.');
    onClose();
  };

  const handleRestoreDemo = () => {
    onRestoreDemoModel();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        data-testid="reset-environment-modal"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent dark:from-teal-950/40 dark:via-emerald-950/20 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Configuração de Ambiente
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  Começar do Zero
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Reset & Configuração do Ambiente
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Limpe os dados de demonstração e personalize suas contas, renda e potes para a sua realidade.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Fechar"
            data-testid="btn-close-reset-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'wizard'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
            data-testid="tab-wizard"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Assistente Guiado (Recomendado)</span>
          </button>

          <button
            onClick={() => setActiveTab('blank')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'blank'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
            data-testid="tab-blank"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Zerar Tudo (Em Branco)</span>
          </button>

          <button
            onClick={() => setActiveTab('demo')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'demo'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
            data-testid="tab-demo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Modelo Demo</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: GUIDED WIZARD */}
          {activeTab === 'wizard' && (
            <div className="space-y-5">
              {/* Step indicator */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    wizardStep === 1 ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                  }`}>
                    1
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Perfil & Contas
                  </span>
                </div>
                <div className="h-0.5 w-6 sm:w-12 bg-slate-200 dark:bg-slate-700" />
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    wizardStep === 2 ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    2
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Renda & 6 Potes
                  </span>
                </div>
                <div className="h-0.5 w-6 sm:w-12 bg-slate-200 dark:bg-slate-700" />
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    wizardStep === 3 ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    3
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Reserva & Metas
                  </span>
                </div>
              </div>

              {/* STEP 1: PERFIL & CONTAS */}
              {wizardStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Como podemos te chamar? (Opcional)
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      placeholder="Ex: Carlos, Ana, Empresa XPTO..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                      data-testid="input-username"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Perfil Principal de Utilização
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setScope('PF')}
                        className={`p-3 rounded-2xl border text-left transition ${
                          scope === 'PF'
                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-xs block font-bold">PF (Pessoal)</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Contas e despesas pessoais</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScope('PJ')}
                        className={`p-3 rounded-2xl border text-left transition ${
                          scope === 'PJ'
                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-xs block font-bold">PJ (Empresa)</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Faturamento, DRE e DAS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScope('CONSOLIDADO')}
                        className={`p-3 rounded-2xl border text-left transition ${
                          scope === 'CONSOLIDADO'
                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-xs block font-bold">Consolidado</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Integração PF + PJ</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        Conta Bancária Principal
                      </label>
                      <select
                        value={accountName}
                        onChange={e => setAccountName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                        data-testid="select-account"
                      >
                        <option value="Inter PF">Inter PF</option>
                        <option value="Inter PJ">Inter PJ</option>
                        <option value="Nubank">Nubank</option>
                        <option value="Itaú">Itaú</option>
                        <option value="C6">C6 Bank</option>
                        <option value="Outro">Outra Conta / Dinheiro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        Saldo Atual em Conta (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={initialBalance}
                          onChange={e => setInitialBalance(e.target.value)}
                          placeholder="0,00"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                          data-testid="input-initial-balance"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Cria o lançamento de abertura de caixa inicial.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: RENDA & 6 POTES */}
              {wizardStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        Descrição da Renda Principal
                      </label>
                      <input
                        type="text"
                        value={incomeDescription}
                        onChange={e => setIncomeDescription(e.target.value)}
                        placeholder="Ex: Salário Líquido, Pró-labore..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        Dia do Recebimento
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={incomeDay}
                        onChange={e => setIncomeDay(parseInt(e.target.value) || 5)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Renda Mensal Líquida Prevista (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        R$
                      </span>
                      <input
                        type="number"
                        step="50"
                        value={monthlyIncome}
                        onChange={e => setMonthlyIncome(e.target.value)}
                        placeholder="Ex: 5000"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500 font-black text-emerald-600 dark:text-emerald-400"
                        data-testid="input-monthly-income"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Usado para dimensionar os tetos mensais dos 6 potes e a reserva recomendada.
                    </span>
                  </div>

                  {/* Calculated Jars Table */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-teal-600" />
                        Distribuição Automática dos 6 Potes (T. Harv Eker)
                      </span>
                      <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                        Total: 100% da Renda
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block">
                          Necessidades (55%)
                        </span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {formatBRL(calculatedJarLimits.NEC_55)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                          Liberdade Fin. (10%)
                        </span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {formatBRL(calculatedJarLimits.LIF_10)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">
                          Longo Prazo (10%)
                        </span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {formatBRL(calculatedJarLimits.PLP_10)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
                          Educação (10%)
                        </span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {formatBRL(calculatedJarLimits.EDU_10)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block">
                          Lazer / Diversão (10%)
                        </span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {formatBRL(calculatedJarLimits.DIV_10)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">
                          Doações (5%)
                        </span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {formatBRL(calculatedJarLimits.FER_5)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: RESERVA & METAS */}
              {wizardStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent p-4 rounded-2xl border border-blue-200 dark:border-blue-900 space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-black uppercase text-blue-900 dark:text-blue-300">
                        Reserva de Emergência Inicial
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          Quanto já possui guardado hoje? (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            R$
                          </span>
                          <input
                            type="number"
                            step="50"
                            value={reserveInitial}
                            onChange={e => setReserveInitial(e.target.value)}
                            placeholder="0,00"
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-testid="input-reserve-initial"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          Meses de proteção desejados
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[3, 6, 12].map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setReserveMonths(m)}
                              className={`py-2 rounded-xl text-xs font-bold border transition ${
                                reserveMonths === m
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                              }`}
                            >
                              {m}m {m === 6 && '⭐'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
                      <span className="text-slate-500 dark:text-slate-400">
                        Meta ideal calculada ({reserveMonths}x custo essencial):
                      </span>
                      <span className="font-black text-blue-700 dark:text-blue-300">
                        {formatBRL(recommendedReserveTarget)}
                      </span>
                    </div>
                  </div>

                  {/* Optional Goal */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold uppercase text-slate-500">
                      Deseja cadastrar uma primeira meta pessoal agora? (Opcional)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={firstGoalTitle}
                        onChange={e => setFirstGoalTitle(e.target.value)}
                        placeholder="Ex: Viagem de Férias, Notebook Novo..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          R$
                        </span>
                        <input
                          type="number"
                          value={firstGoalTarget}
                          onChange={e => setFirstGoalTarget(e.target.value)}
                          placeholder="Valor Alvo (ex: 5000)"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BLANK RESET */}
          {activeTab === 'blank' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-black text-rose-800 dark:text-rose-300">
                    Atenção: Limpeza Completa e Irreversível
                  </h4>
                  <p className="text-rose-700 dark:text-rose-400 leading-relaxed">
                    Esta opção remove todas as transações, despesas recorrentes, metas e regras salvas no navegador. O sistema retornará para um estado 100% limpo, sem nenhum lançamento prévio.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Para confirmar, digite <span className="text-rose-600 font-mono font-black">ZERAR</span> abaixo:
                </label>
                <input
                  type="text"
                  value={blankConfirmText}
                  onChange={e => setBlankConfirmText(e.target.value.toUpperCase())}
                  placeholder="ZERAR"
                  className="w-full max-w-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase"
                  data-testid="input-blank-confirm"
                />
              </div>
            </div>
          )}

          {/* TAB 3: DEMO MODEL RESTORE */}
          {activeTab === 'demo' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-start gap-3">
                <RotateCcw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-black text-blue-900 dark:text-blue-300">
                    Restaurar Dados de Exemplo (Modelo Yupee)
                  </h4>
                  <p className="text-blue-700 dark:text-blue-400 leading-relaxed">
                    Recarrega o pacote de dados modelo que acompanha o app (lançamentos de Agosto a Novembro, metas de viagem, regras automáticas e simulação de cheque especial para testes didáticos).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {activeTab === 'wizard' && (
              <>
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep((prev) => (prev - 1) as 1 | 2 | 3)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    data-testid="btn-wizard-prev"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Voltar</span>
                  </button>
                )}

                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((prev) => (prev + 1) as 1 | 2 | 3)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition active:scale-95"
                    data-testid="btn-wizard-next"
                  >
                    <span>Avançar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteWizard}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition active:scale-95"
                    data-testid="btn-wizard-submit"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Concluir & Inicializar Ambiente</span>
                  </button>
                )}
              </>
            )}

            {activeTab === 'blank' && (
              <button
                type="button"
                disabled={blankConfirmText !== 'ZERAR'}
                onClick={handleCompleteBlank}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition"
                data-testid="btn-blank-submit"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar e Zerar Tudo</span>
              </button>
            )}

            {activeTab === 'demo' && (
              <button
                type="button"
                onClick={handleRestoreDemo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                data-testid="btn-demo-submit"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Modelo de Demonstração</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
