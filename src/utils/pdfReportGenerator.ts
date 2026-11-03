import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, JarType } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { formatBRL } from './finance';

export interface AccountingReportConfig {
  reportTitle: string;
  entityName: string;
  documentNumber?: string; // CPF or CNPJ
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  accountantName?: string;
  accountantCrc?: string;
  includeSignatures: boolean;
  selectedJar?: string;
  selectedAccount?: string;
}

export interface AccountingReportSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  liquidatedCount: number;
  scheduledCount: number;
  totalCount: number;
  jarBreakdown: Record<string, { name: string; amount: number; count: number; pctOfExpense: number }>;
  categoryBreakdown: Record<string, { amount: number; count: number }>;
}

export function computeAccountingSummary(transactions: Transaction[]): AccountingReportSummary {
  let totalIncome = 0;
  let totalExpenses = 0;
  let liquidatedCount = 0;
  let scheduledCount = 0;
  const jarBreakdown: Record<string, { name: string; amount: number; count: number; pctOfExpense: number }> = {};
  const categoryBreakdown: Record<string, { amount: number; count: number }> = {};

  transactions.forEach(t => {
    if (t.status === 'liquidado') {
      liquidatedCount++;
    } else {
      scheduledCount++;
    }

    if (t.type === 'receita' || t.type === 'reembolso') {
      totalIncome += Math.abs(t.amount);
    } else {
      const expAmount = Math.abs(t.amount);
      totalExpenses += expAmount;

      const jarKey = t.jar || 'NEC_55';
      const jarDef = JAR_DEFINITIONS[jarKey as JarType] || { name: jarKey };
      if (!jarBreakdown[jarKey]) {
        jarBreakdown[jarKey] = { name: jarDef.name, amount: 0, count: 0, pctOfExpense: 0 };
      }
      jarBreakdown[jarKey].amount += expAmount;
      jarBreakdown[jarKey].count += 1;

      const catKey = t.category || t.costCenter || 'Geral';
      if (!categoryBreakdown[catKey]) {
        categoryBreakdown[catKey] = { amount: 0, count: 0 };
      }
      categoryBreakdown[catKey].amount += expAmount;
      categoryBreakdown[catKey].count += 1;
    }
  });

  // Calculate percentage of total expense for each jar
  Object.keys(jarBreakdown).forEach(key => {
    jarBreakdown[key].pctOfExpense = totalExpenses > 0 ? (jarBreakdown[key].amount / totalExpenses) * 100 : 0;
  });

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    liquidatedCount,
    scheduledCount,
    totalCount: transactions.length,
    jarBreakdown,
    categoryBreakdown
  };
}

export function generateAccountingPDF(
  transactions: Transaction[],
  config: AccountingReportConfig
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const summary = computeAccountingSummary(transactions);
  const now = new Date();
  const emissionDateStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const primaryColor: [number, number, number] = [13, 148, 136]; // Teal 600 #0d9488
  const darkTextColor: [number, number, number] = [30, 41, 59]; // Slate 800
  const lightBgColor: [number, number, number] = [241, 245, 249]; // Slate 100
  const emeraldColor: [number, number, number] = [5, 150, 105]; // Emerald 600
  const roseColor: [number, number, number] = [225, 29, 72]; // Rose 600

  // 1. HEADER BANNER
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 24, 'F');

  // Yupee Reborn Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Yupee Reborn', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('Sistema de Gestão Financeira Inteligente & Prestação de Contas', 14, 17);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO CONTÁBIL', 196, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Emissão: ${emissionDateStr}`, 196, 17, { align: 'right' });

  // 2. REPORT TITLE & ENTITY METADATA
  let y = 32;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(config.reportTitle.toUpperCase(), 14, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const docLine = config.documentNumber ? ` | Doc: ${config.documentNumber}` : '';
  doc.text(`Titular / Razão Social: `, 14, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${config.entityName}${docLine}`, 50, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Período de Referência: `, 14, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(config.periodLabel, 50, y);

  if (config.notes) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    const splitNotes = doc.splitTextToSize(`Finalidade/Obs: ${config.notes}`, 182);
    doc.text(splitNotes, 14, y);
    y += splitNotes.length * 4;
  } else {
    y += 3;
  }

  // 3. EXECUTIVE SUMMARY CARDS (RECEITAS, DESPESAS, SALDO LÍQUIDO, LANÇAMENTOS)
  y += 4;
  const cardW = 43;
  const cardH = 16;
  const cardGap = 3.3;

  // Card 1: Receitas
  doc.setFillColor(240, 253, 244); // Green 50
  doc.setDrawColor(187, 247, 208); // Green 200
  doc.roundedRect(14, y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // Green 800
  doc.text('TOTAL RECEITAS (+)', 17, y + 5);
  doc.setFontSize(10.5);
  doc.setTextColor(21, 128, 61); // Green 700
  doc.text(formatBRL(summary.totalIncome), 17, y + 12);

  // Card 2: Despesas
  const card2X = 14 + cardW + cardGap;
  doc.setFillColor(255, 241, 242); // Rose 50
  doc.setDrawColor(254, 205, 211); // Rose 200
  doc.roundedRect(card2X, y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(159, 18, 57); // Rose 800
  doc.text('TOTAL DESPESAS (-)', card2X + 3, y + 5);
  doc.setFontSize(10.5);
  doc.setTextColor(225, 29, 72); // Rose 600
  doc.text(formatBRL(summary.totalExpenses), card2X + 3, y + 12);

  // Card 3: Saldo Líquido
  const card3X = card2X + cardW + cardGap;
  const isNetPositive = summary.netBalance >= 0;
  doc.setFillColor(isNetPositive ? 240 : 254, isNetPositive ? 249 : 242, isNetPositive ? 255 : 242);
  doc.setDrawColor(isNetPositive ? 186 : 254, isNetPositive ? 230 : 205, isNetPositive ? 253 : 211);
  doc.roundedRect(card3X, y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isNetPositive ? 30 : 159, isNetPositive ? 58 : 18, isNetPositive ? 138 : 57);
  doc.text('SALDO LÍQUIDO', card3X + 3, y + 5);
  doc.setFontSize(10.5);
  doc.setTextColor(isNetPositive ? 13 : 225, isNetPositive ? 148 : 29, isNetPositive ? 136 : 72);
  doc.text(formatBRL(summary.netBalance), card3X + 3, y + 12);

  // Card 4: Status Operacional
  const card4X = card3X + cardW + cardGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(card44X(card4X), y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('OPERAÇÕES', card4X + 3, y + 5);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${summary.totalCount} lançamentos`, card4X + 3, y + 10);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${summary.liquidatedCount} liq. | ${summary.scheduledCount} agend.`, card4X + 3, y + 13.5);

  function card44X(val: number) {
    return val;
  }

  y += cardH + 7;

  // 4. DEMONSTRATIVO SINTÉTICO (DISTRIBUIÇÃO POR POTES / CATEGORIAS)
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. DEMONSTRATIVO SINTÉTICO DE DESPESAS (DISTRIBUIÇÃO POR POTE)', 14, y);

  const jarRows = Object.entries(summary.jarBreakdown).map(([jarId, data]) => [
    data.name,
    `${data.count} itens`,
    `${data.pctOfExpense.toFixed(1)}%`,
    formatBRL(data.amount)
  ]);

  if (jarRows.length === 0) {
    jarRows.push(['Nenhuma despesa registrada no período', '-', '-', formatBRL(0)]);
  }

  autoTable(doc, {
    startY: y + 2,
    head: [['Pote Financeiro', 'Qtd Lançamentos', 'Representação (%)', 'Total no Período (R$)']],
    body: jarRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: darkTextColor,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Calculate position after first table
  const finalJarY = (doc as any).lastAutoTable?.finalY || y + 25;
  let nextSectionY = finalJarY + 7;

  // If near page bottom, add new page
  if (nextSectionY > 240) {
    doc.addPage();
    nextSectionY = 20;
  }

  // 5. DEMONSTRATIVO ANALÍTICO DE LANÇAMENTOS (LIVRO CAIXA / DETALHADO)
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. DEMONSTRATIVO ANALÍTICO DOS LANÇAMENTOS (LIVRO CAIXA)', 14, nextSectionY);

  const tableRows = transactions.map(t => {
    const isIncome = t.type === 'receita' || t.type === 'reembolso';
    const formattedAmount = `${isIncome ? '+' : '-'} ${formatBRL(Math.abs(t.amount))}`;
    const jarDef = JAR_DEFINITIONS[t.jar as JarType] || { shortName: t.jar || '-' };

    // Format date DD/MM/AAAA
    const parts = t.date ? t.date.split('-') : [];
    const dateFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : t.date;

    return [
      dateFormatted,
      t.description,
      t.account,
      jarDef.shortName,
      t.costCenter,
      t.status === 'liquidado' ? 'Liquidado' : 'Agendado',
      formattedAmount
    ];
  });

  autoTable(doc, {
    startY: nextSectionY + 2,
    head: [['Data', 'Descrição / Histórico', 'Conta', 'Pote', 'Centro', 'Status', 'Valor (R$)']],
    body: tableRows,
    theme: 'striped',
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: darkTextColor,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 54 },
      2: { cellWidth: 26 },
      3: { cellWidth: 24 },
      4: { cellWidth: 20 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Colorize amount column based on sign
      if (data.section === 'body' && data.column.index === 6) {
        const text = String(data.cell.raw);
        if (text.startsWith('+')) {
          data.cell.styles.textColor = emeraldColor;
        } else {
          data.cell.styles.textColor = roseColor;
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY || 200;

  // 6. FORMAL SIGNATURES & DECLARATION
  if (config.includeSignatures) {
    let sigY = finalTableY + 12;
    if (sigY > 235) {
      doc.addPage();
      sigY = 25;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Declaro para os devidos fins legais e contábeis que os lançamentos e valores acima descritos refletem fielmente a',
      14,
      sigY
    );
    doc.text(
      'movimentação financeira apurada no período indicado, acompanhados de seus respectivos comprovantes.',
      14,
      sigY + 4
    );

    sigY += 18;
    const col1X = 25;
    const col2X = 120;
    const lineW = 65;

    // Line 1: Titular / Responsável Financeiro
    doc.setDrawColor(148, 163, 184);
    doc.line(col1X, sigY, col1X + lineW, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(config.entityName, col1X + lineW / 2, sigY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Responsável Financeiro${config.documentNumber ? ` (${config.documentNumber})` : ''}`, col1X + lineW / 2, sigY + 8, { align: 'center' });

    // Line 2: Contador / Responsável Técnico
    doc.setDrawColor(148, 163, 184);
    doc.line(col2X, sigY, col2X + lineW, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(config.accountantName || 'Contador Responsável', col2X + lineW / 2, sigY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(config.accountantCrc ? `CRC: ${config.accountantCrc}` : 'CRC / Registro Profissional', col2X + lineW / 2, sigY + 8, { align: 'center' });
  }

  // 7. PAGE NUMBERS AND FOOTER ON ALL PAGES
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    
    // Top fine line on footer
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 287, 196, 287);

    doc.text(
      `Yupee Reborn - Sistema de Gestão Financeira | Documento gerado para prestação de contas contábil`,
      14,
      291
    );
    doc.text(`Página ${i} de ${totalPages}`, 196, 291, { align: 'right' });
  }

  return doc;
}

export function downloadAccountingPDF(transactions: Transaction[], config: AccountingReportConfig): string {
  const doc = generateAccountingPDF(transactions, config);
  const cleanTitle = config.reportTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}
