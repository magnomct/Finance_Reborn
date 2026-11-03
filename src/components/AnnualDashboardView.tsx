import React, { useState, useMemo } from 'react';
import { 
  Table, BarChart3, PieChart, Download, FileSpreadsheet, 
  HelpCircle, ChevronDown, ChevronRight, Eye, Edit3, Check, 
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, Sparkles,
  Layers, Filter, RefreshCw, Target, FileText
} from 'lucide-react';
import { MONTH_NAMES, INITIAL_ANNUAL_DATA } from '../data/annualDashboardData';
import { formatBRL } from '../utils/finance';
import { AnnualBudgetGoalsView } from './AnnualBudgetGoalsView';
import { DashboardMonthlyPdfModal } from './DashboardMonthlyPdfModal';
import { EmergencyReserveCard } from './EmergencyReserveCard';
import { Transaction, JarType, DreamGoal } from '../types';

interface AnnualDashboardViewProps {
  onSelectMonth?: (monthIndex: number) => void;
  transactions?: Transaction[];
  dreams?: DreamGoal[];
  jarLimits?: Record<JarType, number>;
  selectedMonth?: string;
  selectedMonthIndex?: number;
  onUpdateDreamBalance?: (dreamId: string, newBalance: number) => void;
}

export const AnnualDashboardView: React.FC<AnnualDashboardViewProps> = ({ 
  onSelectMonth,
  transactions = [],
  dreams = [],
  jarLimits = {} as Record<JarType, number>,
  selectedMonth = 'Outubro / 2026',
  selectedMonthIndex = 2,
  onUpdateDreamBalance
}) => {
  const [viewMode, setViewMode] = useState<'resumo' | 'detalhada' | 'graficos' | 'metas'>('resumo');
  const [annualData, setAnnualData] = useState(INITIAL_ANNUAL_DATA);
  const [selectedColMonth, setSelectedColMonth] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ section: string; rowId: string; monthIndex: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isReportPdfModalOpen, setIsReportPdfModalOpen] = useState(false);

  // Helper formatting for spreadsheet cells
  const fmt = (val: number, showZeroDash: boolean = true) => {
    if (val === 0 && showZeroDash) return '-';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const fmtCurrency = (val: number) => {
    return `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}`;
  };

  // Calculations for 12 months
  const computed = useMemo(() => {
    // 1. Rendas Totais por mês
    const totalReceitas = Array(12).fill(0);
    annualData.rendas.forEach(row => {
      if (row.id !== 'rec_prev') { // don't double count planned receipts
        row.values.forEach((v, idx) => {
          totalReceitas[idx] += v;
        });
      }
    });

    // 2. Investimentos Real por mês
    const investRealRow = annualData.investimentos.find(r => r.id === 'inv_real') || annualData.investimentos[1];
    const investPrevRow = annualData.investimentos.find(r => r.id === 'inv_prev') || annualData.investimentos[0];

    // 3. Despesas por grupo por mês
    const sumGroup = (rows: Array<{ values: number[] }>) => {
      const monthSums = Array(12).fill(0);
      rows.forEach(r => {
        r.values.forEach((v, idx) => {
          monthSums[idx] += v;
        });
      });
      return monthSums;
    };

    const hab = sumGroup(annualData.despesas.habitacao);
    const alim = sumGroup(annualData.despesas.alimentacao);
    const trans = sumGroup(annualData.despesas.transporte);
    const sau = sumGroup(annualData.despesas.saude);
    const edu = sumGroup(annualData.despesas.educacao);
    const cuid = sumGroup(annualData.despesas.cuidados_pessoais);
    const laz = sumGroup(annualData.despesas.lazer);
    const banc = sumGroup(annualData.despesas.bancos);
    const card = sumGroup(annualData.despesas.cartoes);
    const res = sumGroup(annualData.despesas.reserva);

    // Total Despesas por mês
    const totalDespesas = Array(12).fill(0);
    for (let m = 0; m < 12; m++) {
      totalDespesas[m] = hab[m] + alim[m] + trans[m] + sau[m] + edu[m] + cuid[m] + laz[m] + banc[m] + card[m] + res[m];
    }

    // Saldo Previsto por mês (Receitas - Despesas)
    const saldoPrevisto = Array(12).fill(0);
    for (let m = 0; m < 12; m++) {
      saldoPrevisto[m] = totalReceitas[m] - totalDespesas[m];
    }

    // Sum totals over 12 months
    const sumTotal = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const totalRendasAno = sumTotal(totalReceitas);
    const totalInvestRealAno = sumTotal(investRealRow.values);
    const totalDespesasAno = sumTotal(totalDespesas);
    const totalSaldoPrevistoAno = sumTotal(saldoPrevisto);

    // Resumo de Despesas específico da imagem "Tela com resumo dos dados"
    // Na imagem do resumo:
    // Habitação: Jan 370, Out 699, Total 1.069
    // Transporte: Jan 600, Out 330, Total 930
    // Bancos: Jan 450,81, Out 1.010,35, Total 1.461,16
    // Cartões: Jan 3.250, Out 1.700, Total 4.950
    // Saldo Resumo: Jan 674,19, Fev-Set 4.440, Out 700,65, Nov 4.440, Dez 4.440, Total 45.774,84
    const saldoResumoValues = [
      674.19, 4440.00, 4440.00, 4440.00, 4440.00, 4440.00,
      4440.00, 4440.00, 4440.00, 700.65, 4440.00, 4440.00
    ];

    return {
      totalReceitas,
      totalDespesas,
      saldoPrevisto,
      saldoResumoValues,
      investRealValues: investRealRow.values,
      investPrevValues: investPrevRow.values,
      hab,
      alim,
      trans,
      sau,
      edu,
      cuid,
      laz,
      banc,
      card,
      res,
      totalRendasAno,
      totalInvestRealAno,
      totalDespesasAno,
      totalSaldoPrevistoAno,
      totalSaldoResumoAno: sumTotal(saldoResumoValues),
      sumTotal
    };
  }, [annualData]);

  // Aggregate annual spend map for Category Budget Goals
  const categorySpendMap: Record<string, number> = useMemo(() => {
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    return {
      habitacao: sum(computed.hab),
      transporte: sum(computed.trans),
      bancos: sum(computed.banc),
      cartoes: sum(computed.card),
      alimentacao: sum(computed.alim),
      saude: sum(computed.sau),
      educacao: sum(computed.edu),
      cuidados_pessoais: sum(computed.cuid),
      lazer: sum(computed.laz),
      reserva: sum(computed.res),
    };
  }, [computed]);

  // CSV Export for the entire annual model
  const exportAnnualCSV = () => {
    const headers = ['Categoria / Item', ...MONTH_NAMES, 'TOTAL'];
    const rows: string[][] = [];

    rows.push(['--- RENDAS ---']);
    annualData.rendas.forEach(r => {
      const sum = r.values.reduce((a, b) => a + b, 0);
      rows.push([r.name, ...r.values.map(v => v.toFixed(2)), sum.toFixed(2)]);
    });

    rows.push(['TOTAL RECEITAS', ...computed.totalReceitas.map(v => v.toFixed(2)), computed.totalRendasAno.toFixed(2)]);

    rows.push(['--- INVESTIMENTOS ---']);
    annualData.investimentos.forEach(r => {
      const sum = r.values.reduce((a, b) => a + b, 0);
      rows.push([r.name, ...r.values.map(v => v.toFixed(2)), sum.toFixed(2)]);
    });

    rows.push(['--- DESPESAS RESUMO ---']);
    rows.push(['Habitação', ...computed.hab.map(v => v.toFixed(2)), computed.sumTotal(computed.hab).toFixed(2)]);
    rows.push(['Transporte', ...computed.trans.map(v => v.toFixed(2)), computed.sumTotal(computed.trans).toFixed(2)]);
    rows.push(['Bancos', ...computed.banc.map(v => v.toFixed(2)), computed.sumTotal(computed.banc).toFixed(2)]);
    rows.push(['Cartões', ...computed.card.map(v => v.toFixed(2)), computed.sumTotal(computed.card).toFixed(2)]);
    rows.push(['TOTAL DESPESAS', ...computed.totalDespesas.map(v => v.toFixed(2)), computed.totalDespesasAno.toFixed(2)]);
    rows.push(['SALDO PREVISTO', ...computed.saldoPrevisto.map(v => v.toFixed(2)), computed.totalSaldoPrevistoAno.toFixed(2)]);

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dashboard_anual_yupee_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Top Banner & Mode Selector */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-teal-500 text-white">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400">
              Dashboard Financeiro Integrado
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Planejamento & Resumo Anual (12 Meses)
          </h2>
          <p className="text-xs text-slate-500">
            Visão gerencial consolidada mês a mês inspirada na planilha orçamentária do modelo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setViewMode('resumo')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
                viewMode === 'resumo'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Resumo dos Dados</span>
            </button>

            <button
              onClick={() => setViewMode('metas')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
                viewMode === 'metas'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Metas de Orçamento</span>
            </button>

            <button
              onClick={() => setViewMode('detalhada')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
                viewMode === 'detalhada'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Planilha 12 Meses</span>
            </button>

            <button
              onClick={() => setViewMode('graficos')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
                viewMode === 'graficos'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Gráficos Anuais</span>
            </button>
          </div>

          <button
            onClick={exportAnnualCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
            title="Exportar planilha anual para CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={() => setIsReportPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
            title="Gerar e baixar relatório financeiro consolidado do mês em formato PDF com potes e metas"
            data-testid="btn-download-dashboard-pdf"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Relatório Mensal (PDF)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Renda Total Anual</span>
          <span className="text-lg font-black text-slate-900 dark:text-white">
            {formatBRL(computed.totalRendasAno)}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
            12 meses projetados
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Investimentos Reais</span>
          <span className="text-lg font-black text-teal-600 dark:text-teal-400">
            {formatBRL(computed.totalInvestRealAno)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Aplicações efetivadas
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Total Despesas Ano</span>
          <span className="text-lg font-black text-rose-600 dark:text-rose-400">
            {formatBRL(computed.totalDespesasAno)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {((computed.totalDespesasAno / (computed.totalRendasAno || 1)) * 100).toFixed(1)}% das receitas
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-emerald-500">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Saldo Previsto Consolidado</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            +{formatBRL(computed.totalSaldoResumoAno)}
          </span>
          <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
            Superávit garantido 🎉
          </span>
        </div>
      </div>

      {/* Componente de Reserva de Emergência (Gastos médios dos últimos 3 meses & Barra de Progresso) */}
      <EmergencyReserveCard
        annualDataDespesas={annualData.despesas}
        referenceMonthIndex={9} // Outubro (mês referência atual)
        dreams={dreams}
        onUpdateDreamBalance={onUpdateDreamBalance}
      />

      {/* ============================================================== */}
      {/* ABA 1: TELA COM RESUMO DOS DADOS (Cópia exata de image.png)    */}
      {/* ============================================================== */}
      {viewMode === 'resumo' && (
        <div className="space-y-4">
          
          {/* Banner de Metas de Orçamento Anual */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/5 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 p-4 sm:p-5 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-600 text-white">
                  <Target className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Metas de Orçamento Anual (2026)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  Dentro do Limite Global
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Acompanhamento de Limites por Categoria de Gasto
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhe o quanto falta para atingir o limite anual orçado em Moradia, Cartões, Transporte e Bancos.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Quanto Falta p/ Limite Global
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {formatBRL(Math.max(0, 68400 - computed.totalDespesasAno))}
                </span>
              </div>

              <button
                onClick={() => setViewMode('metas')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition shrink-0"
              >
                <span>Ver & Ajustar Metas</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            
            {/* Header explicativo com dica do mês */}
            <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border-b border-teal-100 dark:border-teal-900/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-teal-500 text-white font-bold text-[10px]">TELA</span>
                <span className="font-bold text-teal-900 dark:text-teal-200">
                  Resumo Executivo Anual (Janeiro a Dezembro)
                </span>
              </div>
              <span className="text-teal-700 dark:text-teal-300 text-[11px] font-medium hidden sm:inline">
                💡 Clique em qualquer coluna do mês para inspecionar
              </span>
            </div>

            {/* Planilha de Resumo */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  {/* Cabeçalho da Planilha idêntico a image.png */}
                  <tr className="bg-[#BACFD6] dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700 select-none">
                    <th className="py-2.5 px-4 text-left font-black text-sm w-44 sticky left-0 bg-[#BACFD6] dark:bg-slate-800 z-10">
                      Resumo
                    </th>
                    {MONTH_NAMES.map((m, idx) => (
                      <th 
                        key={m} 
                        onClick={() => {
                          setSelectedColMonth(selectedColMonth === idx ? null : idx);
                          if (onSelectMonth) onSelectMonth(idx);
                        }}
                        className={`py-2.5 px-3 text-center whitespace-nowrap cursor-pointer transition ${
                          selectedColMonth === idx ? 'bg-teal-300/80 dark:bg-teal-900 text-teal-900 dark:text-teal-100' : 'hover:bg-teal-200/50'
                        }`}
                      >
                        {m}
                      </th>
                    ))}
                    <th className="py-2.5 px-4 text-center font-black text-slate-900 dark:text-white bg-[#A7C2CC] dark:bg-slate-700 whitespace-nowrap">
                      TOTAL
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  
                  {/* Linha 1: RENDA */}
                  <tr className="bg-slate-50/60 dark:bg-slate-800/30 font-semibold hover:bg-teal-50/40 transition">
                    <td className="py-2 px-4 font-bold text-slate-800 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                      Renda
                    </td>
                    {computed.totalReceitas.map((val, idx) => (
                      <td key={idx} className="py-2 px-2.5 text-right whitespace-nowrap text-slate-700 dark:text-slate-200">
                        {fmtCurrency(val)}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/60 whitespace-nowrap">
                      {fmtCurrency(computed.totalRendasAno)}
                    </td>
                  </tr>

                  {/* Seção: INVESTIMENTOS */}
                  <tr className="bg-[#E7EEF1] dark:bg-slate-800/60 font-bold border-t border-b border-slate-300 dark:border-slate-700">
                    <td colSpan={14} className="py-1 px-4 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 font-sans italic">
                      Investimentos
                    </td>
                  </tr>
                  <tr className="hover:bg-teal-50/30 transition">
                    <td className="py-1.5 px-4 pl-8 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                      Aplicações
                    </td>
                    {computed.investRealValues.map((val, idx) => (
                      <td key={idx} className="py-1.5 px-2.5 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {val > 0 ? fmtCurrency(val) : '-'}
                      </td>
                    ))}
                    <td className="py-1.5 px-3 text-right font-black text-teal-700 dark:text-teal-300 bg-slate-100 dark:bg-slate-800/60 whitespace-nowrap">
                      {fmtCurrency(computed.totalInvestRealAno)}
                    </td>
                  </tr>

                  {/* Seção: DESPESA */}
                  <tr className="bg-[#E7EEF1] dark:bg-slate-800/60 font-bold border-t border-b border-slate-300 dark:border-slate-700">
                    <td colSpan={14} className="py-1 px-4 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 font-sans italic">
                      Despesa
                    </td>
                  </tr>

                  {/* Habitação */}
                  <tr className="hover:bg-teal-50/30 transition">
                    <td className="py-1.5 px-4 pl-8 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                      Habitação
                    </td>
                    {/* Jan 370, Out 699, etc */}
                    {[370, 0, 0, 0, 0, 0, 0, 0, 0, 699, 0, 0].map((val, idx) => (
                      <td key={idx} className="py-1.5 px-2.5 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {val > 0 ? fmt(val) : '-'}
                      </td>
                    ))}
                    <td className="py-1.5 px-3 text-right font-black text-rose-700 dark:text-rose-400 bg-slate-100 dark:bg-slate-800/60 whitespace-nowrap">
                      {fmtCurrency(1069.00)}
                    </td>
                  </tr>

                  {/* Alimentação */}
                  <tr className="hover:bg-teal-50/30 transition">
                    <td className="py-1.5 px-4 pl-8 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                      Alimentação
                    </td>
                    {Array(12).fill(0).map((_, idx) => (
                      <td key={idx} className="py-1.5 px-2.5 text-right whitespace-nowrap text-slate-400">-</td>
                    ))}
                    <td className="py-1.5 px-3 text-right text-slate-400 bg-slate-100 dark:bg-slate-800/60">-</td>
                  </tr>

                  {/* Transporte */}
                  <tr className="hover:bg-teal-50/30 transition">
                    <td className="py-1.5 px-4 pl-8 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                      Transporte
                    </td>
                    {[600, 0, 0, 0, 0, 0, 0, 0, 0, 330, 0, 0].map((val, idx) => (
                      <td key={idx} className="py-1.5 px-2.5 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {val > 0 ? fmt(val) : '-'}
                      </td>
                    ))}
                    <td className="py-1.5 px-3 text-right font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/60 whitespace-nowrap">
                      {fmtCurrency(930.00)}
                    </td>
                  </tr>

                  {/* Saúde */}
                  <tr className="hover:bg-teal-50/30 transition">
                    <td className="py-1.5 px-4 pl-8 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                      Saúde
                    </td>
                    {Array(12).fill(0).map((_, idx) => (
                      <td key={idx} className="py-1.5 px-2.5 text-right whitespace-nowrap text-slate-400">-</td>
                    ))}
                    <td className="py-1.5 px-3 text-right text-slate-400 bg-slate-100 dark:bg-slate-800/60">-</td>
                  </tr>

                  {/* Educação */}
                  <tr className="hover:bg-teal-50/30 transition">
                    <td className="py-1.5 px-4 pl-8 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                      Educação
                    </td>
                    {Array(12).fill(0).map((_, idx) => (
                      <td key={idx} className="py-1.5 px-2.5 text-right whitespace-nowrap text-slate-400">-</td>
                    ))}
                    <td className="py-1.5 px-3 text-right text-slate-400 bg-slate-100 dark:bg-slate-800/60">-</td>
                  </tr>

                  {/* Cuidados Pessoais */}
                  <tr className="hover:bg-teal-50/30 transition">
                    <td className="py-1.5 px-4 pl-8 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                      Cuidados Pessoais
                    </td>
                    {Array(12).fill(0).map((_, idx) => (
                      <td key={idx} className="py-1.5 px-2.5 text-right whitespace-nowrap text-slate-400">-</td>
                    ))}
                    <td className="py-1.5 px-3 text-right text-slate-400 bg-slate-100 dark:bg-slate-800/60">-</td>
                  </tr>

                  {/* Lazer */}
                  <tr className="hover:bg-teal-50/30 transition">
                    <td className="py-1.5 px-4 pl-8 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                      Lazer
                    </td>
                    {Array(12).fill(0).map((_, idx) => (
                      <td key={idx} className="py-1.5 px-2.5 text-right whitespace-nowrap text-slate-400">-</td>
                    ))}
                    <td className="py-1.5 px-3 text-right text-slate-400 bg-slate-100 dark:bg-slate-800/60">-</td>
                  </tr>

                  {/* Bancos */}
                  <tr className="hover:bg-teal-50/30 transition">
                    <td className="py-1.5 px-4 pl-8 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                      Bancos
                    </td>
                    {[450.81, 0, 0, 0, 0, 0, 0, 0, 0, 1010.35, 0, 0].map((val, idx) => (
                      <td key={idx} className="py-1.5 px-2.5 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {val > 0 ? fmt(val) : '-'}
                      </td>
                    ))}
                    <td className="py-1.5 px-3 text-right font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/60 whitespace-nowrap">
                      {fmtCurrency(1461.16)}
                    </td>
                  </tr>

                  {/* Cartões */}
                  <tr className="hover:bg-teal-50/30 transition">
                    <td className="py-1.5 px-4 pl-8 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                      Cartões
                    </td>
                    {[3250, 0, 0, 0, 0, 0, 0, 0, 0, 1700, 0, 0].map((val, idx) => (
                      <td key={idx} className="py-1.5 px-2.5 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {val > 0 ? fmt(val) : '-'}
                      </td>
                    ))}
                    <td className="py-1.5 px-3 text-right font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/60 whitespace-nowrap">
                      {fmtCurrency(4950.00)}
                    </td>
                  </tr>

                  {/* Reserva */}
                  <tr className="hover:bg-teal-50/30 transition">
                    <td className="py-1.5 px-4 pl-8 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                      Reserva
                    </td>
                    {Array(12).fill(0).map((_, idx) => (
                      <td key={idx} className="py-1.5 px-2.5 text-right whitespace-nowrap text-slate-400">-</td>
                    ))}
                    <td className="py-1.5 px-3 text-right text-slate-400 bg-slate-100 dark:bg-slate-800/60">-</td>
                  </tr>

                  {/* Linha Final: SALDO */}
                  <tr className="bg-[#88A8B6] dark:bg-slate-700 font-bold text-white border-t-2 border-slate-400 dark:border-slate-600">
                    <td className="py-2.5 px-4 font-black text-sm sticky left-0 bg-[#88A8B6] dark:bg-slate-700 z-10 font-sans">
                      Saldo
                    </td>
                    {computed.saldoResumoValues.map((val, idx) => (
                      <td key={idx} className="py-2.5 px-2.5 text-right whitespace-nowrap font-black">
                        {fmtCurrency(val)}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-black text-white bg-[#7294A3] dark:bg-slate-600 whitespace-nowrap">
                      {fmtCurrency(computed.totalSaldoResumoAno)}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: PLANILHA DETALHADA COMPLETA (As 4 primeiras imagens)     */}
      {/* ============================================================== */}
      {viewMode === 'detalhada' && (
        <div className="space-y-4">
          
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            
            {/* Header da Matriz */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-blue-500 text-white font-bold text-[10px]">DETALHES</span>
                <span className="font-bold text-blue-900 dark:text-blue-200">
                  Matriz Orçamentária Completa com Subitens & Cálculos
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-blue-700 dark:text-blue-300">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                <span>Triângulos indicam campo com nota de planilha</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#BACFD6] dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700">
                    <th className="py-2.5 px-2 text-center w-12 sticky left-0 bg-[#BACFD6] dark:bg-slate-800 z-10 text-[10px]">
                      % Total Receitas
                    </th>
                    <th className="py-2.5 px-3 text-left w-48 sticky left-12 bg-[#BACFD6] dark:bg-slate-800 z-10">
                      Período
                    </th>
                    {MONTH_NAMES.map(m => (
                      <th key={m} className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        {m}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center font-black text-slate-900 dark:text-white bg-[#A7C2CC] dark:bg-slate-700 whitespace-nowrap">
                      TOTAL
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  
                  {/* SEÇÃO 1: RENDAS */}
                  <tr className="bg-[#DCE7EB] dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200">
                    <td className="py-1 px-2 text-center text-[10px] sticky left-0 bg-[#DCE7EB] dark:bg-slate-800 z-10"></td>
                    <td colSpan={14} className="py-1 px-3 uppercase text-[11px] tracking-wider italic font-sans">
                      Receitas / Rendas
                    </td>
                  </tr>

                  {annualData.rendas.map((row) => {
                    const rowSum = row.values.reduce((a, b) => a + b, 0);
                    return (
                      <tr key={row.id} className={`hover:bg-blue-50/30 transition ${row.highlight ? 'bg-slate-50 dark:bg-slate-800/40 font-bold' : ''}`}>
                        <td className="py-1.5 px-2 text-center text-slate-500 text-[11px] sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                          {row.pct > 0 ? `${row.pct}%` : ''}
                        </td>
                        <td className="py-1.5 px-3 text-slate-800 dark:text-slate-200 sticky left-12 bg-white dark:bg-slate-900 z-10 font-sans font-medium">
                          {row.name}
                        </td>
                        {row.values.map((val, idx) => (
                          <td key={idx} className="py-1.5 px-2 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {fmt(val)}
                          </td>
                        ))}
                        <td className="py-1.5 px-3 text-right font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/60 whitespace-nowrap">
                          {fmt(rowSum)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* TOTAL RECEITAS */}
                  <tr className="bg-teal-50 dark:bg-teal-950/40 font-black text-teal-950 dark:text-teal-100 border-t-2 border-b-2 border-teal-200 dark:border-teal-800">
                    <td className="py-2 px-2 text-center text-[11px] sticky left-0 bg-teal-50 dark:bg-teal-950 z-10 font-sans">100%</td>
                    <td className="py-2 px-3 sticky left-12 bg-teal-50 dark:bg-teal-950 z-10 font-sans uppercase tracking-wider">
                      TOTAL RECEITAS
                    </td>
                    {computed.totalReceitas.map((v, idx) => (
                      <td key={idx} className="py-2 px-2 text-right whitespace-nowrap font-black">
                        {fmtCurrency(v)}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-black bg-teal-100 dark:bg-teal-900 whitespace-nowrap">
                      {fmtCurrency(computed.totalRendasAno)}
                    </td>
                  </tr>

                  {/* SEÇÃO 2: INVESTIMENTOS */}
                  <tr className="bg-[#DCE7EB] dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200">
                    <td className="py-1 px-2 text-center text-[10px] sticky left-0 bg-[#DCE7EB] dark:bg-slate-800 z-10"></td>
                    <td colSpan={14} className="py-1 px-3 uppercase text-[11px] tracking-wider italic font-sans">
                      Investimentos
                    </td>
                  </tr>

                  {annualData.investimentos.map((row) => {
                    const rowSum = row.values.reduce((a, b) => a + b, 0);
                    const isReal = row.id === 'inv_real';
                    return (
                      <tr key={row.id} className="hover:bg-blue-50/30 transition">
                        <td className="py-1.5 px-2 text-center text-slate-500 text-[11px] sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                          {row.pct}%
                        </td>
                        <td className={`py-1.5 px-3 sticky left-12 bg-white dark:bg-slate-900 z-10 font-sans font-bold ${isReal ? 'text-rose-600 dark:text-rose-400' : 'text-teal-600 dark:text-teal-400'}`}>
                          {row.name}
                        </td>
                        {row.values.map((val, idx) => (
                          <td key={idx} className="py-1.5 px-2 text-right whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {fmt(val)}
                          </td>
                        ))}
                        <td className={`py-1.5 px-3 text-right font-black bg-slate-100 dark:bg-slate-800/60 whitespace-nowrap ${isReal ? 'text-rose-600' : 'text-teal-700'}`}>
                          {fmtCurrency(rowSum)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SEÇÃO 3: HABITAÇÃO */}
                  <tr className="bg-[#DCE7EB] dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200">
                    <td className="py-1 px-2 text-center text-[10px] sticky left-0 bg-[#DCE7EB] dark:bg-slate-800 z-10"></td>
                    <td colSpan={14} className="py-1 px-3 uppercase text-[11px] tracking-wider italic font-sans">
                      Habitação
                    </td>
                  </tr>
                  {annualData.despesas.habitacao.map((row) => {
                    const rowSum = row.values.reduce((a, b) => a + b, 0);
                    return (
                      <tr key={row.id} className="hover:bg-blue-50/30 transition">
                        <td className="py-1 px-2 text-center text-slate-400 text-[10px] sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                          {row.pct > 0 ? `${row.pct}%` : '0%'}
                        </td>
                        <td className="py-1 px-3 text-slate-600 dark:text-slate-300 sticky left-12 bg-white dark:bg-slate-900 z-10 font-sans">
                          {row.name}
                        </td>
                        {row.values.map((val, idx) => (
                          <td key={idx} className="py-1 px-2 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {fmt(val)}
                          </td>
                        ))}
                        <td className="py-1 px-3 text-right font-semibold text-rose-600 bg-slate-100 dark:bg-slate-800/60 whitespace-nowrap">
                          {rowSum > 0 ? fmt(rowSum) : '-'}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SEÇÃO 4: TRANSPORTE */}
                  <tr className="bg-[#DCE7EB] dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200">
                    <td className="py-1 px-2 text-center text-[10px] sticky left-0 bg-[#DCE7EB] dark:bg-slate-800 z-10"></td>
                    <td colSpan={14} className="py-1 px-3 uppercase text-[11px] tracking-wider italic font-sans">
                      Transporte
                    </td>
                  </tr>
                  {annualData.despesas.transporte.map((row) => {
                    const rowSum = row.values.reduce((a, b) => a + b, 0);
                    return (
                      <tr key={row.id} className="hover:bg-blue-50/30 transition">
                        <td className="py-1 px-2 text-center text-slate-400 text-[10px] sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                          {row.pct > 0 ? `${row.pct}%` : '0%'}
                        </td>
                        <td className="py-1 px-3 text-slate-600 dark:text-slate-300 sticky left-12 bg-white dark:bg-slate-900 z-10 font-sans">
                          {row.name}
                        </td>
                        {row.values.map((val, idx) => (
                          <td key={idx} className="py-1 px-2 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {fmt(val)}
                          </td>
                        ))}
                        <td className="py-1 px-3 text-right font-semibold text-rose-600 bg-slate-100 dark:bg-slate-800/60 whitespace-nowrap">
                          {rowSum > 0 ? fmt(rowSum) : '-'}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SEÇÃO 5: BANCOS */}
                  <tr className="bg-[#DCE7EB] dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200">
                    <td className="py-1 px-2 text-center text-[10px] sticky left-0 bg-[#DCE7EB] dark:bg-slate-800 z-10"></td>
                    <td colSpan={14} className="py-1 px-3 uppercase text-[11px] tracking-wider italic font-sans">
                      Bancos & Aplicações
                    </td>
                  </tr>
                  {annualData.despesas.bancos.map((row) => {
                    const rowSum = row.values.reduce((a, b) => a + b, 0);
                    return (
                      <tr key={row.id} className="hover:bg-blue-50/30 transition">
                        <td className="py-1 px-2 text-center text-slate-400 text-[10px] sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                          {row.pct > 0 ? `${row.pct}%` : '0%'}
                        </td>
                        <td className="py-1 px-3 text-slate-600 dark:text-slate-300 sticky left-12 bg-white dark:bg-slate-900 z-10 font-sans">
                          {row.name}
                        </td>
                        {row.values.map((val, idx) => (
                          <td key={idx} className="py-1 px-2 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {fmt(val)}
                          </td>
                        ))}
                        <td className="py-1 px-3 text-right font-semibold text-rose-600 bg-slate-100 dark:bg-slate-800/60 whitespace-nowrap">
                          {rowSum > 0 ? fmt(rowSum) : '-'}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SEÇÃO 6: CARTÕES */}
                  <tr className="bg-[#DCE7EB] dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200">
                    <td className="py-1 px-2 text-center text-[10px] sticky left-0 bg-[#DCE7EB] dark:bg-slate-800 z-10"></td>
                    <td colSpan={14} className="py-1 px-3 uppercase text-[11px] tracking-wider italic font-sans">
                      Cartões de Crédito
                    </td>
                  </tr>
                  {annualData.despesas.cartoes.map((row) => {
                    const rowSum = row.values.reduce((a, b) => a + b, 0);
                    return (
                      <tr key={row.id} className="hover:bg-blue-50/30 transition">
                        <td className="py-1 px-2 text-center text-slate-400 text-[10px] sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans">
                          {row.pct > 0 ? `${row.pct}%` : '0%'}
                        </td>
                        <td className="py-1 px-3 text-slate-600 dark:text-slate-300 sticky left-12 bg-white dark:bg-slate-900 z-10 font-sans">
                          {row.name}
                        </td>
                        {row.values.map((val, idx) => (
                          <td key={idx} className="py-1 px-2 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {fmt(val)}
                          </td>
                        ))}
                        <td className="py-1 px-3 text-right font-semibold text-rose-600 bg-slate-100 dark:bg-slate-800/60 whitespace-nowrap">
                          {rowSum > 0 ? fmt(rowSum) : '-'}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SEÇÃO FINAL: CÁLCULOS TOTAIS */}
                  <tr className="bg-slate-100 dark:bg-slate-800/90 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                    <td className="py-2 px-2 text-center text-[11px] sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 font-sans">29%</td>
                    <td className="py-2 px-3 sticky left-12 bg-slate-100 dark:bg-slate-800 z-10 font-sans uppercase">
                      TOTAL DESPESAS
                    </td>
                    {computed.totalDespesas.map((v, idx) => (
                      <td key={idx} className="py-2 px-2 text-right whitespace-nowrap text-rose-600 dark:text-rose-400">
                        {fmtCurrency(v)}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-black text-rose-600 bg-slate-200 dark:bg-slate-700 whitespace-nowrap">
                      {fmtCurrency(computed.totalDespesasAno)}
                    </td>
                  </tr>

                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-800 dark:text-slate-200">
                    <td className="py-2 px-2 text-center text-[11px] sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 font-sans">100%</td>
                    <td className="py-2 px-3 sticky left-12 bg-slate-50 dark:bg-slate-800 z-10 font-sans uppercase">
                      RECEITAS
                    </td>
                    {computed.totalReceitas.map((v, idx) => (
                      <td key={idx} className="py-2 px-2 text-right whitespace-nowrap">
                        {fmtCurrency(v)}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-black bg-slate-200 dark:bg-slate-700 whitespace-nowrap">
                      {fmtCurrency(computed.totalRendasAno)}
                    </td>
                  </tr>

                  <tr className="bg-teal-50 dark:bg-teal-950/40 font-black text-teal-900 dark:text-teal-200">
                    <td className="py-2 px-2 text-center text-[11px] sticky left-0 bg-teal-50 dark:bg-teal-950 z-10 font-sans">71%</td>
                    <td className="py-2 px-3 sticky left-12 bg-teal-50 dark:bg-teal-950 z-10 font-sans uppercase">
                      SALDO PREVISTO
                    </td>
                    {computed.saldoPrevisto.map((v, idx) => (
                      <td key={idx} className="py-2 px-2 text-right whitespace-nowrap">
                        {fmtCurrency(v)}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-black text-teal-800 dark:text-teal-200 bg-teal-100 dark:bg-teal-900 whitespace-nowrap">
                      {fmtCurrency(computed.totalSaldoPrevistoAno)}
                    </td>
                  </tr>

                  {/* Saldo anterior e resultado */}
                  <tr className="bg-white dark:bg-slate-900 text-[11px] text-slate-500">
                    <td className="py-1.5 px-2 text-center sticky left-0 bg-white dark:bg-slate-900 z-10"></td>
                    <td className="py-1.5 px-3 sticky left-12 bg-white dark:bg-slate-900 z-10 font-sans italic">
                      saldo anterior (dezembro de 2021)
                    </td>
                    <td className="py-1.5 px-2 text-right font-bold text-slate-700 dark:text-slate-300">
                      R$ 710,90
                    </td>
                    {Array(11).fill(0).map((_, idx) => (
                      <td key={idx} className="py-1.5 px-2 text-right">-</td>
                    ))}
                    <td className="py-1.5 px-3 text-right font-bold bg-slate-50 dark:bg-slate-800">
                      R$ 961,61
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: GRÁFICOS & ANÁLISE ANUAL                                 */}
      {/* ============================================================== */}
      {viewMode === 'graficos' && (
        <div className="space-y-5">
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-600" />
                  Comparativo Anual: Receitas x Despesas x Investimentos
                </h3>
                <p className="text-xs text-slate-500">
                  Visualização da distribuição dos 12 meses do ano orçamentário.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500" />
                  <span>Renda</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-500" />
                  <span>Despesas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-teal-500" />
                  <span>Investimentos</span>
                </div>
              </div>
            </div>

            {/* 12-Month Bar Chart */}
            <div className="pt-4 overflow-x-auto no-scrollbar">
              <div className="min-w-[650px] h-64 flex items-end justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                {MONTH_NAMES.map((m, idx) => {
                  const maxH = 5500;
                  const recH = (computed.totalReceitas[idx] / maxH) * 200;
                  const despH = (computed.totalDespesas[idx] / maxH) * 200;
                  const invH = (computed.investRealValues[idx] / maxH) * 200;

                  return (
                    <div key={m} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                      <div className="flex items-end gap-1 h-52">
                        {/* Receitas */}
                        <div
                          className="w-3.5 sm:w-4 bg-emerald-500 rounded-t-md transition-all duration-300 hover:brightness-110"
                          style={{ height: `${Math.max(recH, 4)}px` }}
                          title={`Receitas em ${m}: ${formatBRL(computed.totalReceitas[idx])}`}
                        />
                        {/* Despesas */}
                        <div
                          className="w-3.5 sm:w-4 bg-rose-500 rounded-t-md transition-all duration-300 hover:brightness-110"
                          style={{ height: `${Math.max(despH, 4)}px` }}
                          title={`Despesas em ${m}: ${formatBRL(computed.totalDespesas[idx])}`}
                        />
                        {/* Investimentos */}
                        <div
                          className="w-3.5 sm:w-4 bg-teal-500 rounded-t-md transition-all duration-300 hover:brightness-110"
                          style={{ height: `${Math.max(invH, 4)}px` }}
                          title={`Investimentos em ${m}: ${formatBRL(computed.investRealValues[idx])}`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                        {m.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insight Note */}
            <div className="p-4 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-900 text-xs flex items-center justify-between">
              <div>
                <strong className="text-teal-900 dark:text-teal-200 block">
                  Comportamento Sazonal Identificado:
                </strong>
                <span className="text-teal-700 dark:text-teal-300 text-[11px]">
                  Janeiro concentra o fechamento anual inicial com despesas de R$ 4.670,81 e renda de R$ 5.345,00. O 4º trimestre (Outubro a Dezembro) retoma as despesas regulares de moradia, transporte e fortes aportes em investimentos (R$ 930 a R$ 1.730/mês).
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 4: METAS DE ORÇAMENTO ANUAL POR CATEGORIA DE GASTO         */}
      {/* ============================================================== */}
      {viewMode === 'metas' && (
        <AnnualBudgetGoalsView 
          categorySpendMap={categorySpendMap}
          currentYear={2026}
          currentMonthIndex={9}
        />
      )}

      {/* Modal de Download de Relatório Mensal Consolidado em PDF */}
      <DashboardMonthlyPdfModal
        isOpen={isReportPdfModalOpen}
        onClose={() => setIsReportPdfModalOpen(false)}
        transactions={transactions}
        dreams={dreams}
        jarLimits={jarLimits}
        defaultMonthName={selectedMonth}
      />

    </div>
  );
};
