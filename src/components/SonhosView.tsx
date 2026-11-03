import React, { useState, useMemo } from 'react';
import { 
  Cloud, Plus, Zap, ShieldAlert, Plane, Wallet, PiggyBank, 
  BookOpen, Smile, TrendingUp, CheckCircle2, Calendar, Target,
  Sparkles, DollarSign, Clock
} from 'lucide-react';
import { DreamGoal, Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import { DreamDepositChecklist } from './DreamDepositChecklist';
import { DreamsDonutChart } from './DreamsDonutChart';
import { DeadlineSimulatorModal } from './DeadlineSimulatorModal';
import { CompoundInterestCalculator } from './CompoundInterestCalculator';
import { calculateSuggestedMonthlyDeposit } from '../utils/dreamCalculations';

interface SonhosViewProps {
  dreams: DreamGoal[];
  setDreams: React.Dispatch<React.SetStateAction<DreamGoal[]>>;
  onAddTransaction: (tx: Partial<Transaction>) => void;
}

export const SonhosView: React.FC<SonhosViewProps> = ({
  dreams,
  setDreams,
  onAddTransaction
}) => {
  const [selectedDreamForDeposit, setSelectedDreamForDeposit] = useState<DreamGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isNewDreamModalOpen, setIsNewDreamModalOpen] = useState(false);
  const [simulatorDream, setSimulatorDream] = useState<DreamGoal | null>(null);
  const [activeCalculatorDream, setActiveCalculatorDream] = useState<DreamGoal | null>(null);

  // New dream fields
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [monthlyDeposit, setMonthlyDeposit] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('Reserva (PLP 10%)');
  const [impact, setImpact] = useState('');

  const handleApplySuggestedDeposit = (dreamId: string, suggestedAmount: number) => {
    setDreams(prev => prev.map(d => {
      if (d.id === dreamId) {
        return { ...d, monthlyDeposit: suggestedAmount };
      }
      return d;
    }));
  };

  const handleSaveSimulatedDream = (updatedDream: DreamGoal) => {
    setDreams(prev => prev.map(d => d.id === updatedDream.id ? updatedDream : d));
    setSimulatorDream(null);
  };

  // Dynamic suggested monthly deposit for new dream modal
  const newDreamCalc = useMemo(() => {
    const t = parseFloat(target) || 0;
    return calculateSuggestedMonthlyDeposit(t, 0, targetDate);
  }, [target, targetDate]);

  const handleDirectDeposit = (dream: DreamGoal, val: number) => {
    if (val <= 0) return;
    setDreams(prev => prev.map(d => {
      if (d.id === dream.id) {
        return { ...d, current: d.current + val };
      }
      return d;
    }));

    onAddTransaction({
      description: `Aporte Mensal: ${dream.title}`,
      amount: -Math.abs(val),
      type: 'despesa',
      jar: 'PLP_10',
      account: 'Inter PF',
      costCenter: 'Magno',
      status: 'liquidado',
      category: 'Sonhos & Poupança'
    });
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDreamForDeposit || !depositAmount) return;

    const val = parseFloat(depositAmount);
    if (isNaN(val) || val <= 0) return;

    // 1. Update dream state
    setDreams(prev => prev.map(d => {
      if (d.id === selectedDreamForDeposit.id) {
        return { ...d, current: d.current + val };
      }
      return d;
    }));

    // 2. Also record a transaction in PLP_10
    onAddTransaction({
      description: `Aporte Sonho: ${selectedDreamForDeposit.title}`,
      amount: -Math.abs(val),
      type: 'despesa',
      jar: 'PLP_10',
      account: 'Inter PF',
      costCenter: 'Magno',
      status: 'liquidado',
      category: 'Sonhos & Poupança'
    });

    setDepositAmount('');
    setSelectedDreamForDeposit(null);
  };

  const handleCreateDream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !target) return;

    const targetVal = parseFloat(target);
    const depositVal = parseFloat(monthlyDeposit) || (newDreamCalc.suggestedMonthlyDeposit > 0 ? newDreamCalc.suggestedMonthlyDeposit : 100);

    const newDream: DreamGoal = {
      id: `dream-${Date.now()}`,
      title,
      target: targetVal,
      current: 0,
      monthlyDeposit: depositVal,
      category,
      impact: impact || 'Meta financeira planejada',
      targetDate: targetDate || undefined,
      iconName: 'Target',
      gradient: 'from-blue-500 to-indigo-600',
    };

    setDreams([...dreams, newDream]);
    setTitle('');
    setTarget('');
    setMonthlyDeposit('');
    setTargetDate('');
    setImpact('');
    setIsNewDreamModalOpen(false);
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'Zap': return Zap;
      case 'ShieldAlert': return ShieldAlert;
      case 'Plane': return Plane;
      case 'Wallet': return Wallet;
      default: return PiggyBank;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-sky-500 text-white">
              <Cloud className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-sky-600 dark:text-sky-400">
              Módulo Sonhos & Metas Yupee
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Planejamento de Sonhos
          </h2>
          <p className="text-xs text-slate-500">
            Transforme metas financeiras em conquistas reais com aportes mensais consistentes dos seus potes.
          </p>
        </div>

        <button
          onClick={() => setIsNewDreamModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Sonho</span>
        </button>
      </div>

      {/* Gráfico de Rosca de Conclusão dos Sonhos */}
      <DreamsDonutChart 
        dreams={dreams} 
        onSelectDream={(d) => setSimulatorDream(d)}
        onApplySuggestedDeposit={handleApplySuggestedDeposit}
      />

      {/* Calculadora de Juros Compostos & Crescimento de Patrimônio */}
      <CompoundInterestCalculator 
        dreams={dreams}
        onApplyDepositToDream={handleApplySuggestedDeposit}
        selectedDreamInitial={activeCalculatorDream}
      />

      {/* Componente de Checklist de Aportes Mensais */}
      <DreamDepositChecklist 
        dreams={dreams}
        onDepositCustom={(dream) => setSelectedDreamForDeposit(dream)}
        onRecordDeposit={handleDirectDeposit}
      />

      {/* Grid de Sonhos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dreams.map(dream => {
          const Icon = getIcon(dream.iconName);
          const pct = Math.min(100, (dream.current / (dream.target || 1)) * 100);
          const remainingAmount = Math.max(0, dream.target - dream.current);
          const monthsRemaining = dream.monthlyDeposit > 0 ? Math.ceil(remainingAmount / dream.monthlyDeposit) : 0;

          const {
            suggestedMonthlyDeposit,
            remainingMonths: calcRemainingMonths,
            isPastDeadline
          } = calculateSuggestedMonthlyDeposit(dream.target, dream.current, dream.targetDate);

          return (
            <div 
              key={dream.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 rounded-2xl bg-gradient-to-tr ${dream.gradient} text-white shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {dream.category}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {dream.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {dream.impact}
                </p>

                {/* Progress Bar & Amounts */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-baseline mb-1 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Acumulado</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {formatBRL(dream.current)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Meta Final</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {formatBRL(dream.target)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-1">
                    <div 
                      className={`h-full bg-gradient-to-r ${dream.gradient} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-medium">
                    <span>{pct.toFixed(0)}% concluído</span>
                    <span>Falta: {formatBRL(remainingAmount)}</span>
                  </div>
                </div>

                {/* Data Limite & Sugestão de Aporte */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      {dream.targetDate ? (
                        <span>
                          Prazo: <strong className="text-slate-800 dark:text-slate-200">{dream.targetDate.split('-').reverse().join('/')}</strong>
                          {!isPastDeadline && calcRemainingMonths > 0 && (
                            <span className="text-[10px] text-slate-400 ml-1">({calcRemainingMonths} meses)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sem data limite</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCalculatorDream(dream);
                          const el = document.getElementById('calculadora-juros-compostos');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        title="Simular crescimento patrimonial com juros compostos para este objetivo"
                        data-testid={`btn-simular-juros-${dream.id}`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span>Simular Juros</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSimulatorDream(dream)}
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        title="Simular aporte mensal necessário para atingir o objetivo no prazo"
                      >
                        <Clock className="w-3 h-3" />
                        <span>{dream.targetDate ? 'Simular Prazo' : 'Definir Prazo'}</span>
                      </button>
                    </div>
                  </div>

                  {dream.targetDate && suggestedMonthlyDeposit > 0 && !isPastDeadline && (
                    <div className="p-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="text-slate-600 dark:text-slate-300 truncate">
                          Sugerido p/ prazo: <strong className="text-indigo-700 dark:text-indigo-300">{formatBRL(suggestedMonthlyDeposit)}/mês</strong>
                        </span>
                      </div>

                      {dream.monthlyDeposit !== suggestedMonthlyDeposit && (
                        <button
                          type="button"
                          onClick={() => handleApplySuggestedDeposit(dream.id, suggestedMonthlyDeposit)}
                          className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition cursor-pointer shrink-0"
                          title="Atualizar aporte mensal para atingir a meta no prazo"
                        >
                          Ajustar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer with Monthly projection and Deposit button */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  <span>Aporte: <strong>{formatBRL(dream.monthlyDeposit)}/mês</strong></span>
                  {monthsRemaining > 0 && (
                    <span className="block text-[10px] text-slate-400">
                      ~ {monthsRemaining} meses estimados
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setSelectedDreamForDeposit(dream)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold text-xs transition active:scale-95 border border-blue-200 dark:border-blue-900 cursor-pointer"
                >
                  + Fazer Aporte
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Fazer Aporte */}
      {selectedDreamForDeposit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full p-6 rounded-3xl shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Aportar no Sonho: {selectedDreamForDeposit.title}
            </h3>
            <p className="text-xs text-slate-500">
              O aporte será adicionado ao progresso da meta e registrado no pote Reserva & Sonhos (PLP 10%).
            </p>

            <form onSubmit={handleDeposit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Valor do Aporte (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 100,00"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDreamForDeposit(null)}
                  className="px-4 py-2 rounded-xl text-slate-500 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-md transition"
                >
                  Confirmar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar Novo Sonho */}
      {isNewDreamModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full p-6 rounded-3xl shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Cadastrar Novo Sonho / Meta
            </h3>

            <form onSubmit={handleCreateDream} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Título do Sonho</label>
                <input
                  type="text"
                  placeholder="Ex: Reforma da Cozinha, Viagem a Portugal, Carro"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Valor Alvo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Data Limite (Prazo Final)</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Dynamic suggestion pill when date and target are filled */}
              {newDreamCalc.suggestedMonthlyDeposit > 0 && (
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between text-[11px] text-indigo-900 dark:text-indigo-200">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Aporte ideal para o prazo ({newDreamCalc.remainingMonths} meses): <strong>{formatBRL(newDreamCalc.suggestedMonthlyDeposit)}/mês</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMonthlyDeposit(String(newDreamCalc.suggestedMonthlyDeposit))}
                    className="font-bold underline cursor-pointer text-indigo-600 dark:text-indigo-400"
                  >
                    Usar
                  </button>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Aporte Mensal Previsto</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={monthlyDeposit}
                  onChange={e => setMonthlyDeposit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Impacto / Propósito</label>
                <input
                  type="text"
                  placeholder="Ex: Maior conforto para a família sem endividamento"
                  value={impact}
                  onChange={e => setImpact(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewDreamModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-500 text-white font-bold shadow-md hover:bg-blue-600 transition"
                >
                  Salvar Sonho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Simulador de Prazos e Aportes */}
      <DeadlineSimulatorModal
        isOpen={!!simulatorDream}
        onClose={() => setSimulatorDream(null)}
        dream={simulatorDream}
        onSave={handleSaveSimulatedDream}
      />

    </div>
  );
};
