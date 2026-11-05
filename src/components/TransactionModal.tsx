import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, Edit3, Trash2, ArrowDownLeft, ArrowUpRight, AlertCircle, Bell, Clock } from 'lucide-react';
import { Transaction, JarType, CostCenter, AccountType, AutoCategoryRule } from '../types';
import { applyAutoRules } from '../utils/finance';
import { validateTransactionInput, normalizeTransactionData } from '../utils/transactionEditor';
import { getReminderPresetLabel } from '../utils/reminders';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id'>) => void;
  onUpdate?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
  transactionToEdit?: Transaction | null;
  autoRules: AutoCategoryRule[];
  defaultDate?: string;
  defaultScope?: 'PF' | 'PJ' | 'CONSOLIDADO';
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  transactionToEdit = null,
  autoRules,
  defaultDate = '2026-10-27',
  defaultScope = 'PF'
}) => {
  const isOnline = useOnlineStatus();
  const isEditing = Boolean(transactionToEdit);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [type, setType] = useState<'receita' | 'despesa' | 'reembolso'>('despesa');
  const [jar, setJar] = useState<JarType>(defaultScope === 'PJ' ? 'PJ_EXCLUIDO' : 'NEC_55');
  const [costCenter, setCostCenter] = useState<CostCenter>(defaultScope === 'PJ' ? 'PJ' : 'Magno');
  const [account, setAccount] = useState<AccountType>(defaultScope === 'PJ' ? 'Inter PJ' : 'Inter PF');
  const [status, setStatus] = useState<'liquidado' | 'agendado'>('liquidado');
  const [category, setCategory] = useState<string>('Geral');
  const [notes, setNotes] = useState<string>('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState<string>('');
  const [matchedRule, setMatchedRule] = useState<Partial<Transaction> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state whenever transactionToEdit or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setShowDeleteConfirm(false);
      setFormError(null);

      if (transactionToEdit) {
        setDesc(transactionToEdit.description);
        setAmount(Math.abs(transactionToEdit.amount).toString());
        setDate(transactionToEdit.date);
        setType(transactionToEdit.type);
        setJar(transactionToEdit.jar);
        setCostCenter(transactionToEdit.costCenter);
        setAccount(transactionToEdit.account);
        setStatus(transactionToEdit.status);
        setCategory(transactionToEdit.category || 'Geral');
        setNotes(transactionToEdit.notes || '');
        setReminderDaysBefore(transactionToEdit.reminderDaysBefore ?? null);
        setCustomDays(
          transactionToEdit.reminderDaysBefore !== undefined && transactionToEdit.reminderDaysBefore !== null
            ? String(transactionToEdit.reminderDaysBefore)
            : ''
        );
        setMatchedRule(null);
      } else {
        setDesc('');
        setAmount('');
        setDate(defaultDate);
        setType('despesa');
        setJar(defaultScope === 'PJ' ? 'PJ_EXCLUIDO' : 'NEC_55');
        setCostCenter(defaultScope === 'PJ' ? 'PJ' : 'Magno');
        setAccount(defaultScope === 'PJ' ? 'Inter PJ' : 'Inter PF');
        setStatus('liquidado');
        setCategory('Geral');
        setNotes('');
        setReminderDaysBefore(null);
        setCustomDays('');
        setMatchedRule(null);
      }
    }
  }, [isOpen, transactionToEdit, defaultDate, defaultScope]);

  // Auto-categorization listener (only active in create mode or if description changed)
  useEffect(() => {
    if (isEditing) {
      setMatchedRule(null);
      return;
    }
    if (!desc.trim()) {
      setMatchedRule(null);
      return;
    }
    const match = applyAutoRules(desc, autoRules);
    setMatchedRule(match);
  }, [desc, autoRules, isEditing]);

  const applyRuleSuggestion = () => {
    if (matchedRule) {
      if (matchedRule.jar) setJar(matchedRule.jar);
      if (matchedRule.account) setAccount(matchedRule.account);
      if (matchedRule.costCenter) setCostCenter(matchedRule.costCenter);
      if (matchedRule.category) setCategory(matchedRule.category);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateTransactionInput({
      description: desc,
      amount,
      date
    });

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setFormError(firstError || 'Por favor, revise os campos do lançamento.');
      return;
    }

    const reminderVal = reminderDaysBefore !== null ? reminderDaysBefore : undefined;

    if (isEditing && transactionToEdit && onUpdate) {
      const updated = normalizeTransactionData({
        id: transactionToEdit.id,
        date,
        description: desc,
        amount,
        type,
        jar,
        costCenter,
        account,
        status,
        category: category || matchedRule?.category || 'Geral',
        notes: notes.trim() || undefined,
        reminderDaysBefore: reminderVal
      });
      onUpdate(updated);
      onClose();
    } else {
      const val = parseFloat(amount.replace(',', '.'));
      onSave({
        date,
        description: desc.trim(),
        amount: type === 'despesa' ? -Math.abs(val) : Math.abs(val),
        type,
        jar,
        costCenter,
        account,
        status,
        category: category || matchedRule?.category || 'Geral',
        notes: notes.trim() || undefined,
        reminderDaysBefore: reminderVal
      });
      onClose();
    }
  };

  const handleDelete = () => {
    if (!transactionToEdit || !onDelete) return;
    onDelete(transactionToEdit.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            {isEditing ? (
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold">
                <Edit3 className="w-4 h-4" />
              </div>
            ) : (
              <div className="flex items-center gap-0.5">
                <span className="w-5 h-5 rounded-md bg-rose-500 text-white font-black text-[10px] flex items-center justify-center">y</span>
                <span className="w-5 h-5 rounded-md bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">u</span>
                <span className="w-5 h-5 rounded-md bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center">p</span>
                <span className="w-5 h-5 rounded-md bg-sky-500 text-white font-black text-[10px] flex items-center justify-center">e</span>
                <span className="w-5 h-5 rounded-md bg-indigo-500 text-white font-black text-[10px] flex items-center justify-center">e</span>
              </div>
            )}
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                {isEditing ? (
                  type === 'despesa' ? 'Edição de Saída (Pagamento)' :
                  type === 'receita' ? 'Edição de Entrada (Recebimento)' : 'Edição de Reembolso'
                ) : 'Adicionar movimentação financeira'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Offline & PWA Sync Status Banner */}
        <div className={`px-3 py-1.5 rounded-xl text-[11px] font-medium flex items-center justify-between border ${
          !isOnline
            ? 'bg-amber-500/10 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
            : 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
        }`}>
          <div className="flex items-center gap-1.5">
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span><strong>Modo Offline Ativo:</strong> Salvo no aparelho e pronto para uso</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span><strong>PWA Offline-First:</strong> Funciona mesmo sem internet</span>
              </>
            )}
          </div>
          <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
            {!isOnline ? 'Offline' : 'Online'}
          </span>
        </div>

        {formError && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {/* Segmented Control de Tipo */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-slate-500">Tipo de Lançamento</label>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                type === 'despesa' ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/60' :
                type === 'receita' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' :
                'text-blue-600 bg-blue-50 dark:bg-blue-950/60'
              }`}>
                {type === 'despesa' ? 'Saída (-)' : type === 'receita' ? 'Entrada (+)' : 'Reembolso (+)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setType('despesa')}
                className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  type === 'despesa' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Saída (-)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('receita')}
                className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  type === 'receita' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Entrada (+)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('reembolso')}
                className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  type === 'reembolso' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <span>Reembolso</span>
              </button>
            </div>
          </div>

          {/* Data e Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Data</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus={!isEditing}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Mercado Pão de Açúcar, Uber, Salário CLT, Internet"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />

            {/* Auto-categorization hint (only in new mode) */}
            {matchedRule && !isEditing && (
              <div 
                onClick={applyRuleSuggestion}
                className="mt-1.5 p-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-xl flex items-center justify-between cursor-pointer hover:bg-blue-100/70 transition"
              >
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>
                    Auto-regra: <strong>{matchedRule.jar}</strong> • {matchedRule.category}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-blue-600 underline">Aplicar</span>
              </div>
            )}
          </div>

          {/* Pote */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">Pote Orçamentário</label>
            <select
              value={jar}
              onChange={e => setJar(e.target.value as JarType)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="NEC_55">55% Necessidades Básicas (Moradia, Contas, C6, Transporte)</option>
              <option value="DIV_10">10% Diversão & Estilo (Lazer, Passeios, C6)</option>
              <option value="PLP_10">10% Reserva & Sonhos (Poupança a Longo Prazo)</option>
              <option value="LIF_10">10% Liberdade Financeira (Investimentos & Renda Passiva)</option>
              <option value="EDU_10">10% Educação Continuada (Cursos, Livros)</option>
              <option value="FER_5">5% Férias & Generosidade (Viagens e Doações)</option>
              <option value="PJ_EXCLUIDO">PJ - Operação Corporativa</option>
            </select>
          </div>

          {/* Conta e Centro de Custos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Conta de Pagamento</label>
              <select
                value={account}
                onChange={e => setAccount(e.target.value as AccountType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Inter PF">Inter PF</option>
                <option value="Inter PJ">Inter PJ</option>
                <option value="C6">Cartão C6</option>
                <option value="Passe">Passe / Transporte</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Centro de Custos</label>
              <select
                value={costCenter}
                onChange={e => setCostCenter(e.target.value as CostCenter)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Magno">Magno</option>
                <option value="Nathan">Nathan</option>
                <option value="PJ">PJ</option>
              </select>
            </div>
          </div>

          {/* Categoria Opcional */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">Categoria (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Habitação, Alimentação, Transporte, Saúde"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Observações / Notas */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-500">Observações / Tag (opcional)</label>
              <span className="text-[10px] text-slate-400">Exibida como badge no feed</span>
            </div>
            <input
              type="text"
              placeholder="Ex: Nathan 60%, Parcela 1/12, Evitável, Reembolsável..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid="input-transaction-notes"
            />
            {/* Sugestões rápidas de observações */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400">Sugestões:</span>
              {['Nathan 60%', 'Magno 40%', 'Evitável', 'Reembolsável', 'Parcela 1/12'].map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setNotes(sug)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                    notes === sug 
                      ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300 font-bold' 
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {sug}
                </button>
              ))}
              {notes && (
                <button
                  type="button"
                  onClick={() => setNotes('')}
                  className="text-[10px] px-1.5 py-0.5 text-rose-500 hover:underline cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">Status da Movimentação</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('liquidado')}
                className={`flex-1 py-1.5 rounded-xl font-bold transition text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === 'liquidado'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Liquidado (Efetivado)</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('agendado')}
                className={`flex-1 py-1.5 rounded-xl font-bold transition text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === 'agendado'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <span>Agendado (Futuro)</span>
              </button>
            </div>
          </div>

          {/* Lembrete de Vencimento */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold text-[11px]">
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <span>Lembrete de Vencimento</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                reminderDaysBefore !== null 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                  : 'bg-slate-200/70 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'
              }`}>
                {getReminderPresetLabel(reminderDaysBefore)}
              </span>
            </div>

            <p className="text-[10px] text-slate-400">
              Notificação visual destacada no aplicativo com N dias de antecedência para despesas agendadas.
            </p>

            {/* Presets de dias */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Sem lembrete', value: null, testId: 'reminder-pill-none' },
                { label: 'No dia (0d)', value: 0, testId: 'reminder-pill-0' },
                { label: '1 dia antes', value: 1, testId: 'reminder-pill-1' },
                { label: '2 dias antes', value: 2, testId: 'reminder-pill-2' },
                { label: '3 dias antes', value: 3, testId: 'reminder-pill-3' },
                { label: '5 dias antes', value: 5, testId: 'reminder-pill-5' },
                { label: '7 dias antes', value: 7, testId: 'reminder-pill-7' },
              ].map(preset => {
                const isSelected = reminderDaysBefore === preset.value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setReminderDaysBefore(preset.value);
                      setCustomDays(preset.value !== null ? String(preset.value) : '');
                      if (preset.value !== null && status !== 'agendado') {
                        setStatus('agendado');
                      }
                    }}
                    data-testid={preset.testId}
                    className={`text-[10px] px-2.5 py-1 rounded-xl font-semibold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Days Input */}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
              <span className="text-[10px]">Personalizado:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="60"
                  placeholder="Ex: 10"
                  value={customDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomDays(val);
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed) && parsed >= 0) {
                      setReminderDaysBefore(parsed);
                      if (status !== 'agendado') setStatus('agendado');
                    } else if (val === '') {
                      setReminderDaysBefore(null);
                    }
                  }}
                  className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-center text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  data-testid="reminder-custom-input"
                />
                <span className="text-[10px]">dias antes</span>
              </div>
            </div>

            {/* Dica da API de Notificações Nativas do Navegador */}
            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-blue-600 dark:text-blue-400">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>O navegador disparará alertas nativos no sistema quando a despesa estiver a 2 dias do vencimento.</span>
            </div>

            {/* Aviso inteligente caso status seja Liquidado */}
            {reminderDaysBefore !== null && status === 'liquidado' && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Lembretes funcionam para despesas com status <strong>Agendado</strong>.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatus('agendado')}
                  className="font-bold underline cursor-pointer text-amber-700 dark:text-amber-300"
                >
                  Mudar para Agendado
                </button>
              </div>
            )}
          </div>

          {/* Delete Confirmation inside Edit Modal */}
          {showDeleteConfirm && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-2xl space-y-2 animate-in fade-in">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-200 block">
                Tem certeza que deseja excluir este lançamento?
              </span>
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200/60 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition cursor-pointer"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          )}

          {/* Botões do Rodapé */}
          <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              {isEditing && onDelete && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  title="Excluir este lançamento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md transition active:scale-95 cursor-pointer"
              >
                {isEditing ? 'Salvar Alterações' : 'Salvar Lançamento'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
