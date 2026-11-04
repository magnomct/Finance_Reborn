import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, LayoutGrid, BarChart3, Home, Cloud, Building2, 
  Plus, Trash2, CheckCircle2, AlertTriangle, CreditCard, 
  Smartphone, Monitor, Moon, Sun, ChevronLeft, ChevronRight,
  Filter, Search, Clock, Zap, Sparkles, RefreshCw, RotateCcw,
  FileSpreadsheet, Table, Bell, X, Edit3, BellRing, FileText, Download
} from 'lucide-react';
import { DashboardMonthlyPdfModal } from './components/DashboardMonthlyPdfModal';

import { 
  Transaction, JarType, CostCenter, AccountType, ActiveScreen, 
  DreamGoal, RecurringExpense, AutoCategoryRule 
} from './types';
import { 
  INITIAL_TRANSACTIONS, INITIAL_RECURRING, INITIAL_DREAMS, 
  INITIAL_AUTO_RULES, JAR_DEFINITIONS 
} from './data/initialData';
import { 
  calculateFinancialMetrics, formatBRL, generateRecurringTransactions 
} from './utils/finance';
import { updateTransactionInList, updateTransactionNotes } from './utils/transactionEditor';
import { getActiveReminders } from './utils/reminders';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  dispatchNativeBrowserNotification,
  filterPendingNativeNotifications,
  BrowserNotificationPermissionState
} from './utils/browserNotifications';

import { AnnualDashboardView } from './components/AnnualDashboardView';
import { AgendaView } from './components/AgendaView';
import { ChartsView } from './components/ChartsView';
import { PotesView } from './components/PotesView';
import { SonhosView } from './components/SonhosView';
import { AutomationsView } from './components/AutomationsView';
import { PjView } from './components/PjView';
import { ExtratosView } from './components/ExtratosView';
import { TransactionModal } from './components/TransactionModal';
import { DicaDoDiaCard } from './components/DicaDoDiaCard';
import { FinanceReadingCard } from './components/FinanceReadingCard';
import { BudgetAlertsBanner } from './components/BudgetAlertsBanner';
import { BudgetLimitsModal } from './components/BudgetLimitsModal';
import { ResetEnvironmentModal } from './components/ResetEnvironmentModal';
import { loadJarLimits, saveJarLimits, calculateJarBudgetAlerts } from './utils/budgetAlerts';
import { EnvironmentSetupOutput, purgeAllApplicationStorage, persistFreshEnvironment } from './utils/environmentSetup';
import { Sliders } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScreenTransition } from './components/ScreenTransition';
import { TAB_INDICATOR_TRANSITION } from './utils/motionTransitions';

export default function App() {
  // Screens & Navigation - Default to the complete Dashboard with Resumo dos Dados
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');
  const [viewScope, setViewScope] = useState<'PF' | 'PJ' | 'CONSOLIDADO'>('PF');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(2); // 0: Ago, 1: Set, 2: Out, 3: Nov
  
  const months = ['Agosto / 2026', 'Setembro / 2026', 'Outubro / 2026', 'Novembro / 2026'];
  const selectedMonth = months[selectedMonthIndex] || 'Outubro / 2026';

  // Persistence in LocalStorage
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('yupee_transactions_v2');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [recurringList, setRecurringList] = useState<RecurringExpense[]>(() => {
    try {
      const saved = localStorage.getItem('yupee_recurring_v3');
      return saved ? JSON.parse(saved) : INITIAL_RECURRING;
    } catch {
      return INITIAL_RECURRING;
    }
  });

  const [dreams, setDreams] = useState<DreamGoal[]>(() => {
    try {
      const saved = localStorage.getItem('yupee_dreams_v2');
      return saved ? JSON.parse(saved) : INITIAL_DREAMS;
    } catch {
      return INITIAL_DREAMS;
    }
  });

  const [autoRules, setAutoRules] = useState<AutoCategoryRule[]>(() => {
    try {
      const saved = localStorage.getItem('yupee_rules_v2');
      return saved ? JSON.parse(saved) : INITIAL_AUTO_RULES;
    } catch {
      return INITIAL_AUTO_RULES;
    }
  });

  const [usePjProfitInPf, setUsePjProfitInPf] = useState<boolean>(true);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [themeMode, setThemeMode] = useState<'clean' | 'dark'>('clean');
  const [cushionApplied, setCushionApplied] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJarFilter, setSelectedJarFilter] = useState<string>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [isGlobalPdfModalOpen, setIsGlobalPdfModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetNotification, setResetNotification] = useState<string | null>(null);
  const [jarLimits, setJarLimits] = useState<Record<JarType, number>>(() => loadJarLimits());

  const handleSaveJarLimits = (newLimits: Record<JarType, number>) => {
    setJarLimits(newLimits);
    saveJarLimits(newLimits);
  };

  // Auto-dismiss reset notification
  useEffect(() => {
    if (!resetNotification) return;
    const timer = setTimeout(() => {
      setResetNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [resetNotification]);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('yupee_transactions_v2', JSON.stringify(transactions));
    } catch (e) {
      console.error(e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem('yupee_recurring_v3', JSON.stringify(recurringList));
      localStorage.setItem('yupee_dreams_v2', JSON.stringify(dreams));
      localStorage.setItem('yupee_rules_v2', JSON.stringify(autoRules));
    } catch (e) {
      console.error(e);
    }
  }, [recurringList, dreams, autoRules]);

  // Financial Metrics Calculation
  const financialMetrics = useMemo(() => {
    return calculateFinancialMetrics(transactions, usePjProfitInPf);
  }, [transactions, usePjProfitInPf]);

  // Budget Alerts Calculation (80% threshold trigger)
  const budgetAlerts = useMemo(() => {
    return calculateJarBudgetAlerts(transactions, jarLimits);
  }, [transactions, jarLimits]);

  const activeAlertsCount = useMemo(() => {
    return budgetAlerts.filter(a => a.status === 'WARNING' || a.status === 'EXCEEDED').length;
  }, [budgetAlerts]);

  // Due Date Reminders calculation (reference date: 2026-10-25)
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const activeReminders = useMemo(() => {
    return getActiveReminders(transactions, '2026-10-25');
  }, [transactions]);

  // Browser Notifications API State
  const [notificationPermission, setNotificationPermission] = useState<BrowserNotificationPermissionState>(() => {
    return getBrowserNotificationPermission();
  });

  const [dispatchedTags, setDispatchedTags] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('yupee_dispatched_notification_tags');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Automatically check and dispatch native notifications for expenses due in <= 2 days if permission is granted
  useEffect(() => {
    if (notificationPermission !== 'granted') return;
    const pending = filterPendingNativeNotifications(transactions, dispatchedTags, '2026-10-25');
    if (pending.length > 0) {
      const updatedTags = new Set(dispatchedTags);
      pending.forEach(item => {
        dispatchNativeBrowserNotification(item.payload);
        updatedTags.add(item.payload.tag);
      });
      setDispatchedTags(updatedTags);
      try {
        localStorage.setItem('yupee_dispatched_notification_tags', JSON.stringify([...updatedTags]));
      } catch (err) {
        console.error(err);
      }
    }
  }, [transactions, notificationPermission, dispatchedTags]);

  const handleEnableNotifications = async () => {
    const perm = await requestBrowserNotificationPermission();
    setNotificationPermission(perm);

    if (perm === 'granted') {
      const pending = filterPendingNativeNotifications(transactions, dispatchedTags, '2026-10-25');
      if (pending.length > 0) {
        const updatedTags = new Set(dispatchedTags);
        pending.forEach(item => {
          dispatchNativeBrowserNotification(item.payload);
          updatedTags.add(item.payload.tag);
        });
        setDispatchedTags(updatedTags);
        try {
          localStorage.setItem('yupee_dispatched_notification_tags', JSON.stringify([...updatedTags]));
        } catch (err) {
          console.error(err);
        }
      } else {
        // Show welcome confirmation notification
        dispatchNativeBrowserNotification({
          title: '🔔 Alertas Nativos Yupee Ativados!',
          body: 'Você receberá notificações nativas no sistema operacional com 2 dias de antecedência para despesas agendadas.',
          tag: `yupee-welcome-${Date.now()}`,
          data: { transactionId: 'welcome', dueDate: '2026-10-25', daysRemaining: 0, amount: 0 }
        });
      }
    }
  };

  const handleTestNotification = () => {
    dispatchNativeBrowserNotification({
      title: '🔔 Teste de Notificação Nativa (2 dias)',
      body: 'Este é um alerta nativo simulado para despesas a 2 dias do vencimento. O sistema operacional exibirá avisos como este.',
      tag: `yupee-test-${Date.now()}`,
      data: { transactionId: 'test', dueDate: '2026-10-27', daysRemaining: 2, amount: 600 }
    });
  };

  // Handle scope change
  const handleScopeChange = (scope: 'PF' | 'PJ' | 'CONSOLIDADO') => {
    setViewScope(scope);
  };

  // Add new transaction
  const handleAddTransaction = (newTxData: Partial<Transaction>) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      date: newTxData.date || new Date().toISOString().slice(0, 10),
      description: newTxData.description || 'Sem descrição',
      amount: newTxData.amount ?? 0,
      type: newTxData.type || (newTxData.amount && newTxData.amount >= 0 ? 'receita' : 'despesa'),
      jar: newTxData.jar || 'NEC_55',
      costCenter: newTxData.costCenter || 'Magno',
      account: newTxData.account || 'Inter PF',
      status: newTxData.status || 'liquidado',
      category: newTxData.category || 'Geral',
      isRecurring: newTxData.isRecurring,
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  // Import batch of transactions from OFX or CSV
  const handleImportTransactions = (newTxs: Transaction[]) => {
    if (newTxs.length === 0) return;
    setTransactions(prev => [...newTxs, ...prev]);
  };

  // Delete transaction
  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (editingTransaction && editingTransaction.id === id) {
      setEditingTransaction(null);
    }
  };

  // Open edit modal for a transaction
  const handleOpenEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  // Update existing transaction
  const handleUpdateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => updateTransactionInList(prev, updatedTx));
    setEditingTransaction(null);
    setIsModalOpen(false);
  };

  // Update specific transaction notes
  const handleUpdateTransactionNotes = (id: string, notes: string) => {
    setTransactions(prev => updateTransactionNotes(prev, id, notes));
  };

  // Toggle status
  const handleToggleStatus = (id: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: t.status === 'liquidado' ? 'agendado' : 'liquidado'
        };
      }
      return t;
    }));
  };

  // Generate recurring expenses for selected month
  const handleGenerateRecurringForMonth = (yearMonth: string) => {
    const generated = generateRecurringTransactions(recurringList, yearMonth);
    // Add only ones not already present with same description & date
    const existingKeys = new Set(transactions.map(t => `${t.description}-${t.date}`));
    const toAdd = generated.filter(g => !existingKeys.has(`${g.description}-${g.date}`));

    if (toAdd.length > 0) {
      setTransactions(prev => [...toAdd, ...prev]);
    }
  };

  // Apply cushion strategy to prevent overdraft
  const handleApplyCushionStrategy = () => {
    if (cushionApplied) return;
    setCushionApplied(true);
    // Add buffer entry
    const bufferTx: Transaction = {
      id: `cushion-${Date.now()}`,
      date: '2026-10-01',
      description: 'Colchão de Amortecimento de Fluxo (Inter PJ p/ PF)',
      amount: 1000.00,
      type: 'receita',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Reserva Amortecedora'
    };
    // Also remove the overdraft fee if present
    const updated = transactions.filter(t => !t.description.toLowerCase().includes('juros de cheque especial'));
    setTransactions([bufferTx, ...updated]);
  };

  // Reset data to initial reference demo model
  const handleResetData = () => {
    if (confirm('Deseja restaurar os lançamentos e configurações padrão do Yupee?')) {
      purgeAllApplicationStorage();
      setTransactions(INITIAL_TRANSACTIONS);
      setRecurringList(INITIAL_RECURRING);
      setDreams(INITIAL_DREAMS);
      setAutoRules(INITIAL_AUTO_RULES);
      setCushionApplied(false);
      setResetNotification('🔄 Modelo padrão de demonstração restaurado com sucesso.');
    }
  };

  // Apply fresh custom environment configured by the user
  const handleApplyFreshEnvironment = (newEnv: EnvironmentSetupOutput, feedbackMessage: string) => {
    purgeAllApplicationStorage();
    persistFreshEnvironment(newEnv);
    setTransactions(newEnv.transactions);
    setRecurringList(newEnv.recurringList);
    setDreams(newEnv.dreams);
    setAutoRules(newEnv.autoRules);
    handleSaveJarLimits(newEnv.jarLimits);
    setCushionApplied(false);
    setActiveScreen('dashboard');
    setResetNotification(feedbackMessage);
  };

  // Filtered transactions for Agenda & Extratos
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Scope filter
      if (viewScope === 'PF' && t.costCenter === 'PJ') return false;
      if (viewScope === 'PJ' && t.costCenter !== 'PJ') return false;

      // Jar filter
      if (selectedJarFilter !== 'ALL' && t.jar !== selectedJarFilter) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.description.toLowerCase().includes(q) ||
          t.account.toLowerCase().includes(q) ||
          t.costCenter.toLowerCase().includes(q) ||
          t.jar.toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q))
        );
      }
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, viewScope, selectedJarFilter, searchQuery]);

  // Dark / Clean theme styles
  const isDark = themeMode === 'dark';
  const theme = {
    bg: isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F4F6F9] text-slate-800',
    card: isDark ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-md' : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:shadow-md transition-shadow',
    cardSubtle: isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/80',
    headerBg: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm',
    hoverRow: isDark ? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/50',
  };

  return (
    <div className={`min-h-screen ${theme.bg} font-sans transition-colors duration-200 pb-20`}>
      
      {/* Top Device & Mode Bar */}
      <div className="max-w-5xl mx-auto px-4 pt-3 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">Yupee Reborn:</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold dark:bg-emerald-950 dark:text-emerald-300">
            Finanças Pessoais & 6 Potes
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Reset e Configuração do Ambiente do Zero */}
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/80 font-bold transition cursor-pointer active:scale-95 shadow-xs"
            title="Começar do zero e configurar todo o ambiente financeiro"
            data-testid="btn-reset-environment"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Começar do Zero (Reset)</span>
          </button>

          <button
            onClick={handleResetData}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            title="Restaurar dados iniciais de demonstração"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Restaurar Modelo</span>
          </button>

          <button 
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition ${
              isMobileFrame 
                ? 'bg-blue-500 text-white border-blue-600 font-medium' 
                : `${theme.cardSubtle} text-slate-500 hover:text-slate-900 dark:hover:text-white`
            }`}
          >
            {isMobileFrame ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isMobileFrame ? 'Smartphone' : 'Expandido'}</span>
          </button>

          <button 
            onClick={() => setThemeMode(isDark ? 'clean' : 'dark')}
            className={`p-1.5 rounded-lg border ${theme.cardSubtle} text-slate-500 hover:text-slate-900 dark:hover:text-white transition`}
            title={isDark ? 'Mudar para Tema Clean' : 'Mudar para Tema Dark'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Toast Notification Banner for Environment Setup */}
      {resetNotification && (
        <div className="max-w-5xl mx-auto px-4 mt-2">
          <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
              <span>{resetNotification}</span>
            </div>
            <button
              onClick={() => setResetNotification(null)}
              className="p-1 rounded-lg hover:bg-white/20 transition cursor-pointer"
              title="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className={`mx-auto transition-all duration-300 ${
        isMobileFrame 
          ? 'max-w-md my-4 rounded-[40px] shadow-2xl border-8 border-slate-800 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950 relative min-h-[840px]' 
          : 'max-w-5xl px-4 py-4 space-y-5'
      }`}>

        {/* ============================================================== */}
        {/* CABEÇALHO YUPEE (Logo com as 5 letrinhas coloridas marcantes)    */}
        {/* ============================================================== */}
        <header className={`px-5 py-3.5 border-b ${theme.headerBg} flex items-center justify-between sticky top-0 z-30 backdrop-blur-md`}>
          
          {/* Logo Yupee */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveScreen('hub')}>
            <div className="flex items-center gap-1 tracking-tight select-none">
              <span className="w-6 h-6 rounded-md bg-rose-500 text-white font-black text-sm flex items-center justify-center shadow-sm">y</span>
              <span className="w-6 h-6 rounded-md bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-sm">u</span>
              <span className="w-6 h-6 rounded-md bg-emerald-500 text-white font-black text-sm flex items-center justify-center shadow-sm">p</span>
              <span className="w-6 h-6 rounded-md bg-sky-500 text-white font-black text-sm flex items-center justify-center shadow-sm">e</span>
              <span className="w-6 h-6 rounded-md bg-indigo-500 text-white font-black text-sm flex items-center justify-center shadow-sm">e</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block -mb-1">REBORN</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Controle Inteligente</span>
            </div>
          </div>

          {/* Scope Selector (PF, PJ, Consolidado) */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => handleScopeChange('PF')}
              className={`px-3 py-1 rounded-lg transition ${viewScope === 'PF' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              PF
            </button>
            <button
              onClick={() => handleScopeChange('PJ')}
              className={`px-3 py-1 rounded-lg transition ${viewScope === 'PJ' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              PJ
            </button>
            <button
              onClick={() => handleScopeChange('CONSOLIDADO')}
              className={`px-3 py-1 rounded-lg transition ${viewScope === 'CONSOLIDADO' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Consolidado
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Baixar Relatório Mensal Consolidado em PDF */}
            <button
              type="button"
              onClick={() => setIsGlobalPdfModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-500/30 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-xs font-bold transition cursor-pointer shadow-2xs"
              title="Gerar e baixar resumo mensal consolidado das finanças em PDF"
              data-testid="btn-header-pdf"
            >
              <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">Relatório</span>
              <span>PDF</span>
            </button>

            {/* Botão Alertas de Orçamento */}
            <button
              onClick={() => setIsLimitsModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
                activeAlertsCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
              }`}
              title="Definir teto máximo para cada pote e receber alerta aos 80%"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              <span>Alertas</span>
              <span className="hidden md:inline">de Orçamento</span>
              {activeAlertsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
                  {activeAlertsCount}
                </span>
              )}
            </button>

            {/* Botão Notificação Visual de Vencimentos */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRemindersOpen(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
                  activeReminders.length > 0
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                }`}
                title="Lembretes de vencimento para despesas agendadas"
                data-testid="btn-reminders-bell"
              >
                <Bell className={`w-3.5 h-3.5 ${activeReminders.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                <span>Lembretes</span>
                {activeReminders.length > 0 && (
                  <span 
                    className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse"
                    data-testid="badge-active-reminders-count"
                  >
                    {activeReminders.length}
                  </span>
                )}
              </button>

              {/* Popover de Lembretes Ativos */}
              {isRemindersOpen && (
                <div 
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 z-50 space-y-3 animate-in fade-in zoom-in-95"
                  data-testid="popover-reminders"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Lembretes de Vencimento</h4>
                        <span className="text-[10px] text-slate-400">Despesas agendadas com aviso prévio</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRemindersOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {activeReminders.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">Nenhum vencimento pendente</p>
                      <p className="text-[10px]">Todas as suas despesas agendadas estão em dia ou sem lembretes ativos.</p>
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 space-y-1 pr-1">
                      {activeReminders.map(item => (
                        <div 
                          key={item.transaction.id} 
                          className="pt-2 pb-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs"
                          data-testid={`reminder-item-${item.transaction.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {item.transaction.description}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                item.status.urgency === 'overdue' 
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                                  : item.status.urgency === 'today'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-black animate-pulse'
                                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}>
                                {item.status.message}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>{item.transaction.date}</span>
                              <span>•</span>
                              <span className="font-semibold text-rose-600 dark:text-rose-400">
                                {formatBRL(Math.abs(item.transaction.amount))}
                              </span>
                              <span>•</span>
                              <span>{item.transaction.account}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                handleToggleStatus(item.transaction.id);
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] shadow-2xs transition active:scale-95 cursor-pointer"
                              title="Marcar como liquidado / pago"
                              data-testid={`btn-liquidate-reminder-${item.transaction.id}`}
                            >
                              Liquidar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsRemindersOpen(false);
                                handleOpenEditTransaction(item.transaction);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Editar lembrete ou lançamento"
                              data-testid={`btn-edit-reminder-${item.transaction.id}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Seção API de Notificações do Navegador (Alerta a 2 dias do vencimento) */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                        <BellRing className="w-3.5 h-3.5 text-blue-500" />
                        <span>Notificações no Sistema (OS)</span>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                        notificationPermission === 'granted'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : notificationPermission === 'denied'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`} data-testid="badge-notification-permission">
                        {notificationPermission === 'granted' ? 'Ativo' : notificationPermission === 'denied' ? 'Bloqueado' : 'Desativado'}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight">
                      Dispara alertas nativos no sistema operacional (Windows/Mac/Linux/Android) quando uma despesa estiver a <strong>2 dias do vencimento</strong>.
                    </p>

                    <div className="flex items-center gap-2 pt-0.5">
                      {notificationPermission !== 'granted' ? (
                        <button
                          type="button"
                          onClick={handleEnableNotifications}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                          data-testid="btn-enable-browser-notifications"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                          <span>Ativar Alertas Nativos (2 dias)</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            type="button"
                            onClick={handleTestNotification}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                            data-testid="btn-test-browser-notification"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                            <span>Testar Alerta Nativo</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botão Novo Lançamento */}
            <button 
              onClick={() => {
                setEditingTransaction(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo</span>
            </button>
          </div>
        </header>

        {/* ============================================================== */}
        {/* BARRA DE NAVEGAÇÃO DE TELAS                                     */}
        {/* ============================================================== */}
        <nav className="flex items-center gap-1 px-4 py-2 overflow-x-auto no-scrollbar border-b border-slate-200/60 dark:border-slate-800/80 text-xs font-semibold">
          {[
            { id: 'dashboard', label: 'Dashboard & Resumo', icon: FileSpreadsheet },
            { id: 'agenda', label: 'Agenda Diária', icon: Calendar },
            { id: 'graficos', label: 'Gráficos Intuitivos', icon: BarChart3 },
            { id: 'potes', label: '6 Potes', icon: Home },
            { id: 'sonhos', label: 'Sonhos & Metas', icon: Cloud },
            { id: 'automacoes', label: 'Controle Automático', icon: Zap },
            { id: 'pj', label: 'Operação PJ', icon: Building2 },
            { id: 'extratos', label: 'Extratos (.OFX / .CSV)', icon: LayoutGrid },
            { id: 'hub', label: 'Minhas Finanças (Hub)', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeScreen === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveScreen(tab.id as ActiveScreen)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400 font-bold' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
                data-testid={`nav-tab-${tab.id}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavigationTab"
                    transition={TAB_INDICATOR_TRANSITION}
                    className="absolute inset-0 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-xl shadow-xs -z-0"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.id === 'potes' && activeAlertsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
                      {activeAlertsCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Notificação Estratégica Yupee */}
        <div className="px-4 pt-1">
          <div className="bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-transparent p-3.5 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-500 text-white font-bold text-[10px]">OK</span>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Orçamento no Azul (+R$ 2,31)!</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Condução ajustada para R$ 120 e Nathan reembolsando R$ 858 do financiamento habitacional.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Saldo Consolidado</span>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                +{formatBRL(financialMetrics.netBalanceConsolidated)}
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo com Transição Animada Suave (Framer Motion) */}
        <ScreenTransition screenKey={activeScreen}>
          {/* ============================================================== */}
          {/* TELA PRINCIPAL: DASHBOARD COMPLETO & RESUMO DOS DADOS          */}
          {/* ============================================================== */}
          {activeScreen === 'dashboard' && (
          <div className="px-4 space-y-4">
            {/* Banner de Lembretes de Vencimento com Antecedência */}
            {activeReminders.length > 0 && (
              <div 
                className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-center justify-between gap-3 text-xs"
                data-testid="banner-due-reminders"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {activeReminders.length === 1 ? '1 Lembrete de Vencimento ativo' : `${activeReminders.length} Lembretes de Vencimento ativos`}
                    </span>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {activeReminders[0].transaction.description}: {activeReminders[0].status.message} ({formatBRL(Math.abs(activeReminders[0].transaction.amount))})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsRemindersOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                    data-testid="btn-banner-view-reminders"
                  >
                    Ver Lembretes
                  </button>
                </div>
              </div>
            )}

            {/* Banner Notificador de Alertas de Orçamento dos Potes (80% / 100%) */}
            <BudgetAlertsBanner
              alerts={budgetAlerts}
              onOpenLimitsModal={() => setIsLimitsModalOpen(true)}
              onNavigateToPotes={() => setActiveScreen('potes')}
            />

            <AnnualDashboardView 
              transactions={transactions}
              dreams={dreams}
              jarLimits={jarLimits}
              selectedMonth={selectedMonth}
              selectedMonthIndex={selectedMonthIndex}
              onSelectMonth={(monthIdx) => {
                if (monthIdx >= 0 && monthIdx < months.length) {
                  setSelectedMonthIndex(monthIdx);
                }
              }}
              onUpdateDreamBalance={(dreamId, newBal) => {
                setDreams(prev => prev.map(d => d.id === dreamId ? { ...d, current: newBal } : d));
              }}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* TELA 1: AGENDA FINANCEIRA (Feed Diário Yupee)                   */}
        {/* ============================================================== */}
        {activeScreen === 'agenda' && (
          <div className="px-4">
            <AgendaView
              selectedMonth={selectedMonth}
              selectedMonthIndex={selectedMonthIndex}
              setSelectedMonthIndex={setSelectedMonthIndex}
              months={months}
              filteredTransactions={filteredTransactions}
              totalTransactionsCount={transactions.length}
              selectedJarFilter={selectedJarFilter}
              setSelectedJarFilter={setSelectedJarFilter}
              financialMetrics={financialMetrics}
              onToggleStatus={handleToggleStatus}
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={handleOpenEditTransaction}
              onUpdateNotes={handleUpdateTransactionNotes}
              theme={theme}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* TELA 2: GRÁFICOS INTUITIVOS                                     */}
        {/* ============================================================== */}
        {activeScreen === 'graficos' && (
          <div className="px-4">
            <ChartsView 
              transactions={transactions} 
              usePjProfitInPf={usePjProfitInPf} 
              selectedMonth={selectedMonth} 
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* TELA 3: OS 6 POTES                                              */}
        {/* ============================================================== */}
        {activeScreen === 'potes' && (
          <div className="px-4">
            <PotesView 
              transactions={transactions}
              usePjProfitInPf={usePjProfitInPf}
              setUsePjProfitInPf={setUsePjProfitInPf}
              onFilterJarInAgenda={(jar) => {
                setSelectedJarFilter(jar);
                setActiveScreen('agenda');
              }}
              jarLimits={jarLimits}
              onOpenLimitsModal={() => setIsLimitsModalOpen(true)}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* TELA 4: SONHOS & METAS                                          */}
        {/* ============================================================== */}
        {activeScreen === 'sonhos' && (
          <div className="px-4">
            <SonhosView 
              dreams={dreams}
              setDreams={setDreams}
              onAddTransaction={handleAddTransaction}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* TELA 5: CONTROLE AUTOMÁTICO DE GASTOS                          */}
        {/* ============================================================== */}
        {activeScreen === 'automacoes' && (
          <div className="px-4">
            <AutomationsView
              recurringList={recurringList}
              setRecurringList={setRecurringList}
              autoRules={autoRules}
              setAutoRules={setAutoRules}
              onGenerateRecurringForMonth={handleGenerateRecurringForMonth}
              selectedMonth={selectedMonth}
              totalBudget={financialMetrics.effectiveIncomeBase}
              totalSpent={financialMetrics.totalSpentPF}
              onApplyCushionStrategy={handleApplyCushionStrategy}
              cushionApplied={cushionApplied}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* TELA 6: OPERAÇÃO PJ                                             */}
        {/* ============================================================== */}
        {activeScreen === 'pj' && (
          <div className="px-4">
            <PjView 
              transactions={transactions}
              onAddTransaction={handleAddTransaction}
              onEditTransaction={handleOpenEditTransaction}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* TELA 7: EXTRATOS & CSV                                          */}
        {/* ============================================================== */}
        {activeScreen === 'extratos' && (
          <div className="px-4">
            <ExtratosView 
              transactions={transactions}
              onDeleteTransaction={handleDeleteTransaction}
              onToggleStatus={handleToggleStatus}
              onEditTransaction={handleOpenEditTransaction}
              onImportTransactions={handleImportTransactions}
              autoRules={autoRules}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* TELA 8: HUB MINHAS FINANÇAS (Yupee 6 Cards)                     */}
        {/* ============================================================== */}
        {activeScreen === 'hub' && (
          <div className="px-4 space-y-5">
            {/* Componente Dica do Dia com Inteligência Gemini */}
            <DicaDoDiaCard
              transactions={transactions}
              usePjProfitInPf={usePjProfitInPf}
              onNavigateToScreen={(scr) => setActiveScreen(scr)}
            />

            {/* Componente de Leitura de Finanças baseado no perfil atual usando a API de busca */}
            <FinanceReadingCard
              transactions={transactions}
              jarLimits={jarLimits}
              usePjProfitInPf={usePjProfitInPf}
            />

            <div className="text-center sm:text-left">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Minhas Finanças Yupee</h2>
              <p className="text-xs text-slate-400">Selecione o módulo para navegar pelo ecossistema financeiro</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              
              <button 
                onClick={() => setActiveScreen('dashboard')}
                className={`${theme.card} p-5 rounded-3xl flex flex-col items-center justify-center text-center gap-3 group hover:border-teal-400 transition relative overflow-hidden ring-1 ring-teal-500/30 bg-teal-50/20`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-400 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">Dashboard Anual</h3>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block mt-0.5">Resumo & Planilha 12M</span>
                </div>
              </button>

              <button 
                onClick={() => setActiveScreen('agenda')}
                className={`${theme.card} p-5 rounded-3xl flex flex-col items-center justify-center text-center gap-3 group hover:border-blue-400 transition relative overflow-hidden`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">Agenda Diária</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Fluxo cronológico</span>
                </div>
              </button>

              <button 
                onClick={() => setActiveScreen('graficos')}
                className={`${theme.card} p-5 rounded-3xl flex flex-col items-center justify-center text-center gap-3 group hover:border-emerald-400 transition relative overflow-hidden`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">Gráficos Intuitivos</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Donut, Ritmo & Histórico</span>
                </div>
              </button>

              <button 
                onClick={() => setActiveScreen('potes')}
                className={`${theme.card} p-5 rounded-3xl flex flex-col items-center justify-center text-center gap-3 group hover:border-indigo-400 transition relative overflow-hidden`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">6 Potes Orçamento</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">55% Necessidades & Lazer</span>
                </div>
              </button>

              <button 
                onClick={() => setActiveScreen('automacoes')}
                className={`${theme.card} p-5 rounded-3xl flex flex-col items-center justify-center text-center gap-3 group hover:border-amber-400 transition relative overflow-hidden`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">Controle Automático</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Regras & Recorrências</span>
                </div>
              </button>

              <button 
                onClick={() => setActiveScreen('sonhos')}
                className={`${theme.card} p-5 rounded-3xl flex flex-col items-center justify-center text-center gap-3 group hover:border-sky-400 transition relative overflow-hidden`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-400 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">Sonhos & Metas</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Aportes consistentes</span>
                </div>
              </button>

              <button 
                onClick={() => setActiveScreen('pj')}
                className={`${theme.card} p-5 rounded-3xl flex flex-col items-center justify-center text-center gap-3 group hover:border-orange-400 transition relative overflow-hidden`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-400 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">Operação PJ</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">DRE, DAS & Repasse</span>
                </div>
              </button>

              <button 
                onClick={() => setActiveScreen('extratos')}
                className={`${theme.card} p-5 rounded-3xl flex flex-col items-center justify-center text-center gap-3 group hover:border-purple-400 transition relative overflow-hidden`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">Extratos & CSV</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Tabela & Download</span>
                </div>
              </button>

              <button 
                onClick={() => setIsResetModalOpen(true)}
                className={`${theme.card} p-5 rounded-3xl flex flex-col items-center justify-center text-center gap-3 group hover:border-amber-400 transition relative overflow-hidden`}
                data-testid="card-reset-environment-hub"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">Começar do Zero</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Reset & Novo Ambiente</span>
                </div>
              </button>

            </div>

            {/* Strategic Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`${theme.card} p-5 rounded-3xl space-y-2`}>
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
                  <CreditCard className="w-4 h-4" />
                  <span>Cartão C6 Concentrador</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xl font-black text-slate-900 dark:text-white">R$ 2.600,00</span>
                  <span className="text-[11px] text-slate-400">Total Fatura Mensal</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  R$ 2.000 em contas essenciais (água, luz, gás, mercado, transporte) + R$ 600 em lazer.
                </p>
              </div>

              <div className={`${theme.card} p-5 rounded-3xl space-y-2 border-l-4 border-l-blue-500`}>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                  <Home className="w-4 h-4" />
                  <span>Financiamento Habitacional (Nathan)</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xl font-black text-slate-900 dark:text-white">R$ 572,00</span>
                  <span className="text-[11px] text-slate-400">Custo Líquido Magno</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Débito de R$ 1.430 com R$ 858 reembolsados por Nathan. R$ 140 são juros de cheque especial evitáveis.
                </p>
              </div>
            </div>

          </div>
        )}
        </ScreenTransition>

      </main>

      {/* Modal Lançamento (Novo / Edição) com Auto-Regra */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleAddTransaction}
        onUpdate={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
        transactionToEdit={editingTransaction}
        autoRules={autoRules}
        defaultScope={viewScope}
      />

      {/* Modal Configuração de Limites Máximos e Alertas dos 6 Potes */}
      <BudgetLimitsModal
        isOpen={isLimitsModalOpen}
        onClose={() => setIsLimitsModalOpen(false)}
        limits={jarLimits}
        onSaveLimits={handleSaveJarLimits}
        transactions={transactions}
        effectiveIncomeBase={financialMetrics.effectiveIncomeBase}
      />

      {/* Modal Relatório Mensal Consolidado em PDF */}
      <DashboardMonthlyPdfModal
        isOpen={isGlobalPdfModalOpen}
        onClose={() => setIsGlobalPdfModalOpen(false)}
        transactions={transactions}
        dreams={dreams}
        jarLimits={jarLimits}
        defaultMonthName={selectedMonth}
      />

      {/* Modal de Reset e Configuração do Ambiente do Zero */}
      <ResetEnvironmentModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onApplyEnvironment={handleApplyFreshEnvironment}
        onRestoreDemoModel={() => {
          handleResetData();
          setResetNotification('🔄 Modelo de demonstração restaurado com sucesso.');
        }}
      />

    </div>
  );
}
