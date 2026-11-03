import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, JarType, DreamGoal } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { formatBRL } from './finance';
import { calculateJarExpense } from './budgetAlerts';
import { calculateRemainingMonths, calculateSuggestedMonthlyDeposit } from './dreamCalculations';

export interface DashboardReportConfig {
  monthName: string; // e.g. "Outubro / 2026"
  yearMonth: string; // e.g. "2026-10"
  entityName?: string;
  notes?: string;
  includeTransactionsList?: boolean;
}

export interface JarExpenseReportItem {
  jarId: JarType;
  name: string;
  shortName: string;
  recommendedPct: number;
  limit: number;
  spent: number;
  remaining: number;
  usagePercent: number;
  status: 'OK' | 'ALERTA_80' | 'EXCEDIDO';
}

export interface DreamGoalReportItem {
  id: string;
  title: string;
  category: string;
  target: number;
  current: number;
  completionPercent: number;
  monthlyDeposit: number;
  suggestedDeposit: number;
  targetDate: string;
  remainingMonths: number;
  status: string;
}

export interface DashboardMonthlySummary {
  periodLabel: string;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  savingsRate: number;
  jarItems: JarExpenseReportItem[];
  totalJarBudget: number;
  totalJarSpent: number;
  dreamItems: DreamGoalReportItem[];
  totalDreamTarget: number;
  totalDreamCurrent: number;
  dreamOverallCompletion: number;
  topTransactions: Transaction[];
}

/**
 * Computes consolidated financial metrics, jar breakdown, and dreams status for a specific month.
 */
export function computeDashboardMonthlySummary(
  transactions: Transaction[],
  dreams: DreamGoal[],
  jarLimits: Record<JarType, number>,
  config: DashboardReportConfig
): DashboardMonthlySummary {
  const ym = config.yearMonth || '2026-10';

  // Filter transactions for selected month
  const monthTransactions = transactions.filter(t => t.date.startsWith(ym));

  // Compute Income and Expenses
  let totalIncome = 0;
  let totalExpenses = 0;

  monthTransactions.forEach(t => {
    if (t.type === 'receita') {
      totalIncome += Math.abs(t.amount);
    } else if (t.type === 'despesa') {
      totalExpenses += Math.abs(t.amount);
    } else if (t.type === 'reembolso') {
      // Reembolso counts as positive inflow
      totalIncome += Math.abs(t.amount);
    }
  });

  const netBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.max(0, (netBalance / totalIncome) * 100) : 0;

  // 6 Potes + PJ breakdown
  const jarKeys: JarType[] = ['NEC_55', 'DIV_10', 'PLP_10', 'LIF_10', 'EDU_10', 'FER_5', 'PJ_EXCLUIDO'];
  
  let totalJarBudget = 0;
  let totalJarSpent = 0;

  const jarItems: JarExpenseReportItem[] = jarKeys.map(jarId => {
    const jarDef = JAR_DEFINITIONS[jarId] || { name: jarId, shortName: jarId, pct: 0 };
    const limit = jarLimits[jarId] || 0;
    // Calculate spent deducting refunds for that jar
    const spent = calculateJarExpense(monthTransactions, jarId);
    const remaining = limit - spent;
    const usagePercent = limit > 0 ? (spent / limit) * 100 : (spent > 0 ? 100 : 0);

    totalJarBudget += limit;
    totalJarSpent += spent;

    let status: JarExpenseReportItem['status'] = 'OK';
    if (limit > 0) {
      if (spent > limit) {
        status = 'EXCEDIDO';
      } else if (usagePercent >= 80) {
        status = 'ALERTA_80';
      }
    }

    return {
      jarId,
      name: jarDef.name,
      shortName: jarDef.shortName,
      recommendedPct: jarDef.pct,
      limit,
      spent,
      remaining,
      usagePercent,
      status
    };
  });

  // Dreams & Savings Goals breakdown
  let totalDreamTarget = 0;
  let totalDreamCurrent = 0;

  const dreamItems: DreamGoalReportItem[] = dreams.map(dream => {
    totalDreamTarget += dream.target;
    totalDreamCurrent += dream.current;

    const completionPercent = dream.target > 0 
      ? Math.min(100, Math.round((dream.current / dream.target) * 100)) 
      : 0;

    const refDate = new Date(`${ym}-15`);
    const remainingMonths = dream.targetDate 
      ? calculateRemainingMonths(dream.targetDate, refDate) 
      : 12;

    const depositCalc = calculateSuggestedMonthlyDeposit(
      dream.target,
      dream.current,
      dream.targetDate,
      refDate
    );
    const suggestedDeposit = depositCalc.suggestedMonthlyDeposit;

    let status = 'Em andamento';
    if (completionPercent >= 100) {
      status = 'Concluído';
    } else if (completionPercent >= 75) {
      status = 'Fase Final';
    } else if (completionPercent >= 50) {
      status = 'Metade atingida';
    }

    return {
      id: dream.id,
      title: dream.title,
      category: dream.category,
      target: dream.target,
      current: dream.current,
      completionPercent,
      monthlyDeposit: dream.monthlyDeposit,
      suggestedDeposit,
      targetDate: dream.targetDate || 'A definir',
      remainingMonths,
      status
    };
  });

  const dreamOverallCompletion = totalDreamTarget > 0 
    ? Math.min(100, Math.round((totalDreamCurrent / totalDreamTarget) * 100)) 
    : 0;

  // Top transactions by amount
  const topTransactions = [...monthTransactions]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 10);

  return {
    periodLabel: config.monthName,
    totalIncome,
    totalExpenses,
    netBalance,
    savingsRate,
    jarItems,
    totalJarBudget,
    totalJarSpent,
    dreamItems,
    totalDreamTarget,
    totalDreamCurrent,
    dreamOverallCompletion,
    topTransactions
  };
}

/**
 * Generates a high-quality PDF report for the Dashboard view.
 */
export function generateDashboardMonthlyPDF(
  transactions: Transaction[],
  dreams: DreamGoal[],
  jarLimits: Record<JarType, number>,
  config: DashboardReportConfig
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const summary = computeDashboardMonthlySummary(transactions, dreams, jarLimits, config);
  const now = new Date();
  const emissionDateStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. HEADER BANNER
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 26, 'F');

  // Yupee Reborn Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Yupee Reborn', 14, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('Sistema de Gestão Financeira Inteligente • 6 Potes & Metas', 14, 19);

  // Right Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO MENSAL CONSOLIDADO', 196, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Emissão: ${emissionDateStr}`, 196, 19, { align: 'right' });

  // 2. REPORT CONTEXT & METADATA
  let y = 34;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`FECHAMENTO MENSAL: ${config.monthName.toUpperCase()}`, 14, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const titular = config.entityName || 'Magno Silva (Responsável Financeiro)';
  doc.text('Titular da Conta: ', 14, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(titular, 48, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Período de Análise: ', 120, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(config.monthName, 155, y);

  y += 8;

  // 3. EXECUTIVE KPI CARDS (RECEITAS, DESPESAS, SALDO, METAS)
  const cardW = 43;
  const cardH = 17;
  const cardGap = 3.3;

  // Card 1: Receitas Totais
  doc.setFillColor(240, 253, 244); // Green 50
  doc.setDrawColor(187, 247, 208); // Green 200
  doc.roundedRect(14, y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // Green 800
  doc.text('RECEITAS / ENTRADAS (+)', 17, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(21, 128, 61); // Green 700
  doc.text(formatBRL(summary.totalIncome), 17, y + 13);

  // Card 2: Despesas Totais
  const card2X = 14 + cardW + cardGap;
  doc.setFillColor(255, 241, 242); // Rose 50
  doc.setDrawColor(254, 205, 211); // Rose 200
  doc.roundedRect(card2X, y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(159, 18, 57); // Rose 800
  doc.text('DESPESAS / SAÍDAS (-)', card2X + 3, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(225, 29, 72); // Rose 600
  doc.text(formatBRL(summary.totalExpenses), card2X + 3, y + 13);

  // Card 3: Saldo Líquido Consolidado
  const card3X = card2X + cardW + cardGap;
  const isNetPositive = summary.netBalance >= 0;
  doc.setFillColor(isNetPositive ? 240 : 254, isNetPositive ? 249 : 242, isNetPositive ? 255 : 242);
  doc.setDrawColor(isNetPositive ? 186 : 254, isNetPositive ? 230 : 205, isNetPositive ? 253 : 211);
  doc.roundedRect(card3X, y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isNetPositive ? 30 : 159, isNetPositive ? 58 : 18, isNetPositive ? 138 : 57);
  doc.text('SALDO CONSOLIDADO', card3X + 3, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(isNetPositive ? 13 : 225, isNetPositive ? 148 : 29, isNetPositive ? 136 : 72);
  doc.text((isNetPositive ? '+' : '') + formatBRL(summary.netBalance), card3X + 3, y + 13);

  // Card 4: Progresso Global de Metas
  const card4X = card3X + cardW + cardGap;
  doc.setFillColor(245, 243, 255); // Purple 50
  doc.setDrawColor(221, 214, 254); // Purple 200
  doc.roundedRect(card4X, y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(109, 40, 217); // Purple 700
  doc.text('METAS DE ECONOMIA', card4X + 3, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(124, 58, 237); // Purple 600
  doc.text(`${summary.dreamOverallCompletion}% Concluído`, card4X + 3, y + 13);

  y += cardH + 7;

  // 4. TABELA 1: RESUMO DE GASTOS POR POTE
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. DEMONSTRATIVO DE GASTOS POR POTE ORÇAMENTÁRIO', 14, y);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Divisão orçamentária recomendada pelo método dos 6 Potes com limite teto e monitoramento de alertas a 80%.', 14, y + 4);

  const jarTableRows = summary.jarItems.map(item => {
    let statusText = 'Normal (OK)';
    if (item.status === 'EXCEDIDO') statusText = 'Estourado (>100%)';
    else if (item.status === 'ALERTA_80') statusText = 'Atenção (>=80%)';

    return [
      item.name,
      `${item.recommendedPct}%`,
      item.limit > 0 ? formatBRL(item.limit) : 'Flexível',
      formatBRL(item.spent),
      formatBRL(item.remaining),
      `${item.usagePercent.toFixed(1)}%`,
      statusText
    ];
  });

  // Add totals row
  jarTableRows.push([
    'TOTAL CONSOLIDADO',
    '100%',
    formatBRL(summary.totalJarBudget),
    formatBRL(summary.totalJarSpent),
    formatBRL(summary.totalJarBudget - summary.totalJarSpent),
    summary.totalJarBudget > 0 ? `${((summary.totalJarSpent / summary.totalJarBudget) * 100).toFixed(1)}%` : '-',
    summary.totalJarSpent <= summary.totalJarBudget ? 'Orçamento no Azul' : 'Ajustar Potes'
  ]);

  autoTable(doc, {
    startY: y + 6,
    head: [['Pote / Categoria', '% Rec.', 'Teto Orçado', 'Gasto Mês', 'Saldo Restante', '% Uso', 'Status']],
    body: jarTableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'center', cellWidth: 16 },
      2: { halign: 'right', cellWidth: 24 },
      3: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Highlight last totals row
      if (data.row.index === jarTableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
      // Color status cell
      if (data.column.index === 6 && data.row.index < jarTableRows.length - 1) {
        const text = String(data.cell.raw);
        if (text.includes('Estourado')) {
          data.cell.styles.textColor = [225, 29, 72]; // Rose
        } else if (text.includes('Atenção')) {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
        } else {
          data.cell.styles.textColor = [21, 128, 61]; // Green
        }
      }
    }
  });

  // Calculate position after first table
  let currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check page overflow
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  // 5. TABELA 2: METAS DE ECONOMIA & SONHOS
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. ACOMPANHAMENTO DE METAS DE ECONOMIA & SONHOS', 14, currentY);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Progresso acumulado de poupança, prazos limites e sugestão de aporte mensal para atingimento do objetivo.', 14, currentY + 4);

  const dreamsTableRows = summary.dreamItems.map(d => [
    d.title,
    d.category,
    formatBRL(d.target),
    formatBRL(d.current),
    `${d.completionPercent}%`,
    formatBRL(d.suggestedDeposit > 0 ? d.suggestedDeposit : d.monthlyDeposit) + '/mês',
    d.targetDate ? `${d.targetDate.split('-').reverse().join('/')} (${d.remainingMonths}m)` : 'A definir',
    d.status
  ]);

  // Dreams Totals
  dreamsTableRows.push([
    'TOTAL ACUMULADO EM METAS',
    'Geral',
    formatBRL(summary.totalDreamTarget),
    formatBRL(summary.totalDreamCurrent),
    `${summary.dreamOverallCompletion}%`,
    '-',
    '-',
    `${summary.dreamItems.length} Metas Ativas`
  ]);

  autoTable(doc, {
    startY: currentY + 6,
    head: [['Objetivo / Sonho', 'Categoria', 'Meta Total', 'Valor Atual', '% Concluído', 'Aporte Sugerido', 'Prazo Limite', 'Status']],
    body: dreamsTableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [14, 116, 144], // Cyan / Teal dark
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 28 },
      7: { halign: 'center', cellWidth: 18 },
    },
    didParseCell: (data) => {
      if (data.row.index === dreamsTableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 249, 255];
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check page overflow for Table 3
  if (currentY > 215) {
    doc.addPage();
    currentY = 20;
  }

  // 6. TABELA 3: TOP LANÇAMENTOS DO MÊS
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. PRINCIPAIS MOVIMENTAÇÕES DO MÊS (MAIORES LANÇAMENTOS)', 14, currentY);

  const topRows = summary.topTransactions.map(tx => {
    const isIncome = tx.type === 'receita' || tx.type === 'reembolso';
    const jarDef = JAR_DEFINITIONS[tx.jar] || { shortName: tx.jar };
    return [
      tx.date.split('-').reverse().join('/'),
      tx.description,
      tx.account,
      jarDef.shortName,
      tx.costCenter,
      tx.status === 'liquidado' ? 'Liquidado' : 'Agendado',
      (isIncome ? '+ ' : '- ') + formatBRL(Math.abs(tx.amount))
    ];
  });

  if (topRows.length > 0) {
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Data', 'Descrição do Lançamento', 'Conta', 'Pote', 'Centro', 'Status', 'Valor (R$)']],
      body: topRows,
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85], // Slate 700
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [30, 41, 59],
        valign: 'middle',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 18 },
        1: { halign: 'left', fontStyle: 'bold', cellWidth: 60 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'center', cellWidth: 18 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.column.index === 6) {
          const val = String(data.cell.raw);
          if (val.startsWith('+')) {
            data.cell.styles.textColor = [21, 128, 61];
          } else {
            data.cell.styles.textColor = [225, 29, 72];
          }
        }
      }
    });
  }

  // 7. FOOTER AND PAGE NUMBERING
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 285, 196, 285);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Yupee Reborn • Relatório Financeiro Consolidado Mensal', 14, 290);
    doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: 'right' });
  }

  return doc;
}

/**
 * Generates and downloads the PDF directly to the browser.
 */
export function downloadDashboardMonthlyPDF(
  transactions: Transaction[],
  dreams: DreamGoal[],
  jarLimits: Record<JarType, number>,
  config: DashboardReportConfig
): void {
  const doc = generateDashboardMonthlyPDF(transactions, dreams, jarLimits, config);
  const cleanMonth = (config.monthName || 'mensal')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');

  doc.save(`relatorio_mensal_${cleanMonth}.pdf`);
}
