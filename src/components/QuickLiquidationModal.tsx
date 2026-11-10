import React, { useEffect } from 'react';
import { 
  X, CheckCircle2, Banknote, CreditCard, Landmark, 
  ArrowRight, Calendar, Tag, ShieldCheck 
} from 'lucide-react';
import { Transaction, PaymentMethodType } from '../types';
import { formatBRL } from '../utils/finance';
import { JAR_DEFINITIONS } from '../data/initialData';

interface QuickLiquidationModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: (paymentMethod: PaymentMethodType) => void;
}

export const QuickLiquidationModal: React.FC<QuickLiquidationModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onConfirm
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !transaction) return null;

  const isPositive = transaction.type === 'receita' || transaction.type === 'reembolso';
  const jarDef = JAR_DEFINITIONS[transaction.jar] || {
    shortName: transaction.jar,
    colorHex: '#3B82F6'
  };

  const paymentOptions: {
    id: PaymentMethodType;
    title: string;
    description: string;
    icon: React.ReactNode;
    colorClasses: string;
    badgeClasses: string;
    testId: string;
  }[] = [
    {
      id: 'Dinheiro',
      title: 'Dinheiro',
      description: 'Pagamento em espécie / papel moeda',
      icon: <Banknote className="w-5 h-5" />,
      colorClasses: 'hover:border-emerald-500 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-600',
      badgeClasses: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
      testId: 'btn-pay-dinheiro'
    },
    {
      id: 'Cartão de Crédito',
      title: 'Cartão de Crédito',
      description: 'Débito na fatura (ex: C6, Nubank, etc.)',
      icon: <CreditCard className="w-5 h-5" />,
      colorClasses: 'hover:border-purple-500 hover:bg-purple-50/70 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:text-purple-600',
      badgeClasses: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
      testId: 'btn-pay-cartao'
    },
    {
      id: 'Conta Corrente',
      title: 'Conta Corrente',
      description: 'Débito em conta, PIX ou TED bancário',
      icon: <Landmark className="w-5 h-5" />,
      colorClasses: 'hover:border-sky-500 hover:bg-sky-50/70 dark:hover:bg-sky-950/40 text-sky-600 dark:text-sky-400 group-hover:text-sky-600',
      badgeClasses: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300',
      testId: 'btn-pay-conta'
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-liquidation-title"
      data-testid="modal-quick-liquidation"
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Subtle accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-sky-500 to-purple-500" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 
                id="modal-liquidation-title"
                className="text-base sm:text-lg font-black text-slate-900 dark:text-white"
              >
                Liquidar Lançamento
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Confirmação rápida da efetivação de pagamento
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fechar"
            data-testid="btn-close-liquidation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 mb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                Transação a Liquidar
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                {transaction.description}
              </h3>
            </div>

            <div className="text-right shrink-0">
              <span className={`text-base font-black ${
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
              }`}>
                {isPositive ? '+' : '-'} {formatBRL(Math.abs(transaction.amount))}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/50 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3 h-3 text-slate-400" />
              {transaction.date}
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {transaction.account}
            </span>
            <span>•</span>
            <span 
              className="font-bold text-[10px] px-1.5 py-0.2 rounded"
              style={{ backgroundColor: `${jarDef.colorHex}15`, color: jarDef.colorHex }}
            >
              {jarDef.shortName}
            </span>
          </div>
        </div>

        {/* Question Prompt */}
        <div className="mb-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
            Como foi realizado o pagamento?
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Selecione a forma utilizada para atualizar a transação e marcar como liquidada:
          </span>
        </div>

        {/* 3 Payment Method Buttons */}
        <div className="space-y-2 mb-4">
          {paymentOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onConfirm(opt.id)}
              className={`w-full group p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 transition-all flex items-center justify-between gap-3 text-left shadow-2xs hover:shadow-sm active:scale-[0.99] cursor-pointer ${opt.colorClasses}`}
              data-testid={opt.testId}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800 ${opt.badgeClasses}`}>
                  {opt.icon}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-slate-900 dark:text-white block group-hover:text-inherit">
                    {opt.title}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                    {opt.description}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400 group-hover:text-inherit transition-transform group-hover:translate-x-0.5 shrink-0">
                <span className="text-[11px] font-bold hidden sm:inline">Escolher</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer info & Cancel */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Atualiza status e meio automaticamente
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            data-testid="btn-cancel-liquidation"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
