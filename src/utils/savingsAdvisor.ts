import { JarType, Transaction } from '../types';
import {
  SIX_JAR_KEYS,
  calculateSixJarsMetrics,
  formatMonthLabelPtBr,
  formatPctPtBr,
} from './sixJarsMetrics';

export interface SavingsAdvisorActionStep {
  id: string;
  title: string;
  description: string;
  potentialSavingBRL: number;
}

export interface SavingsAdvisorPlan {
  headline: string;
  offenderCategoryPath: string;
  estimatedMonthlySavingsBRL: number;
  diagnosis: string;
  actionableSteps: SavingsAdvisorActionStep[];
  rebalanceSuggestion: string;
}

export interface OffendingSubcategorySummary {
  categoryPath: string;
  parentCategory: string;
  subcategory: string;
  nature: 'Fixo' | 'Variável';
  totalBRL: number;
  txCount: number;
}

export interface OffendingTransactionSummary {
  id: string;
  date: string;
  description: string;
  categoryPath: string;
  nature: 'Fixo' | 'Variável';
  amountBRL: number;
}

export interface SnapshotJarSummary {
  jarId: JarType;
  jarName: string;
  shortName: string;
  targetPct: number;
  actualIncomePct: number;
  targetLimitBRL: number;
  actualSpentBRL: number;
  consumptionPct: number;
  surplusBRL: number;
  excessBRL: number;
  status: 'ok' | 'atencao' | 'estourado';
}

export interface SixJarsSavingsSnapshot {
  monthKey: string;
  monthLabel: string;
  txCount: number;
  rendaLiquidaMensal: number;
  totalSpentBRL: number;
  jars: SnapshotJarSummary[];
  primaryOffenderJar: SnapshotJarSummary;
  topSubcategories: OffendingSubcategorySummary[];
  topTransactions: OffendingTransactionSummary[];
  donorJars: SnapshotJarSummary[];
  hasAnyOverrun: boolean;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatCurrencyPtBr(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function resolveTransactionCategoryParts(tx: Transaction): {
  parentCategory: string;
  subcategory: string;
} {
  if (tx.parentCategory && tx.subcategory) {
    return {
      parentCategory: tx.parentCategory.trim(),
      subcategory: tx.subcategory.trim(),
    };
  }
  const rawCategory = (tx.category || '').trim();
  if (rawCategory.includes('>')) {
    const [p, s] = rawCategory.split('>').map(x => x.trim());
    return {
      parentCategory: p || 'Geral',
      subcategory: s || p || tx.description,
    };
  }
  if (rawCategory) {
    return {
      parentCategory: rawCategory,
      subcategory: tx.subcategory?.trim() || rawCategory,
    };
  }
  return {
    parentCategory: 'Outros Gastos',
    subcategory: tx.description || 'Diversos',
  };
}

function resolveTransactionNatureLabel(tx: Transaction): 'Fixo' | 'Variável' {
  if (tx.nature === 'fixed') return 'Fixo';
  if (tx.nature === 'variable') return 'Variável';
  if (tx.isRecurring) return 'Fixo';
  return 'Variável';
}

export interface ExtractSavingsSnapshotOptions {
  monthKey?: string;
  usePjProfitInPf?: boolean;
  customIncomeBase?: number;
  jarLimits?: Partial<Record<JarType, number>>;
}

export function extractSixJarsSavingsSnapshot(
  transactions: Transaction[],
  options: ExtractSavingsSnapshotOptions = {}
): SixJarsSavingsSnapshot {
  const { monthKey, usePjProfitInPf = true, customIncomeBase, jarLimits } = options;

  const baseMetrics = calculateSixJarsMetrics(transactions, {
    monthKey,
    usePjProfitInPf,
    customIncomeBase,
  });

  const resolvedMonth = baseMetrics.monthKey;
  const monthTxs =
    resolvedMonth === 'ALL'
      ? transactions
      : transactions.filter(t => typeof t.date === 'string' && t.date.startsWith(resolvedMonth));

  const jars: SnapshotJarSummary[] = baseMetrics.jars.map(j => {
    const customLimit = jarLimits?.[j.id];
    const targetLimitBRL =
      typeof customLimit === 'number' && Number.isFinite(customLimit) && customLimit > 0
        ? round2(customLimit)
        : j.limiteMetaBRL;

    const consumptionPct =
      targetLimitBRL > 0
        ? Math.round(((j.gastoRealBRL / targetLimitBRL) * 100 + Number.EPSILON) * 10) / 10
        : j.gastoRealBRL > 0
        ? 999
        : 0;

    let status: SnapshotJarSummary['status'] = 'ok';
    if (j.gastoRealBRL > targetLimitBRL + 0.005 || consumptionPct > 100) {
      status = 'estourado';
    } else if (consumptionPct >= 85) {
      status = 'atencao';
    }

    return {
      jarId: j.id,
      jarName: j.name,
      shortName: j.shortName,
      targetPct: j.limiteMetaPct,
      actualIncomePct: j.gastoRealPctDaRenda,
      targetLimitBRL,
      actualSpentBRL: j.gastoRealBRL,
      consumptionPct,
      surplusBRL: round2(Math.max(0, targetLimitBRL - j.gastoRealBRL)),
      excessBRL: round2(Math.max(0, j.gastoRealBRL - targetLimitBRL)),
      status,
    };
  });

  // Primary Offender Jar: highest excessBRL, or highest consumptionPct if none overspent
  const sortedOffenders = [...jars].sort((a, b) => {
    if (b.excessBRL !== a.excessBRL) return b.excessBRL - a.excessBRL;
    if (b.consumptionPct !== a.consumptionPct) return b.consumptionPct - a.consumptionPct;
    return b.actualSpentBRL - a.actualSpentBRL;
  });

  const primaryOffenderJar = sortedOffenders[0];
  const hasAnyOverrun = jars.some(j => j.excessBRL > 0);

  // Drill down into transactions inside primaryOffenderJar
  const offenderExpenses = monthTxs
    .filter(t => t.jar === primaryOffenderJar.jarId && t.type === 'despesa')
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  // Group into Top 3 Offending Subcategories
  const subMap = new Map<
    string,
    {
      parentCategory: string;
      subcategory: string;
      fixedTotal: number;
      variableTotal: number;
      totalBRL: number;
      txCount: number;
    }
  >();

  for (const tx of offenderExpenses) {
    const { parentCategory, subcategory } = resolveTransactionCategoryParts(tx);
    const key =
      parentCategory.toLowerCase() === subcategory.toLowerCase()
        ? parentCategory
        : `${parentCategory} > ${subcategory}`;
    const amount = Math.abs(tx.amount);
    const nature = resolveTransactionNatureLabel(tx);
    const prev = subMap.get(key) || {
      parentCategory,
      subcategory,
      fixedTotal: 0,
      variableTotal: 0,
      totalBRL: 0,
      txCount: 0,
    };
    prev.totalBRL = round2(prev.totalBRL + amount);
    prev.txCount += 1;
    if (nature === 'Fixo') prev.fixedTotal += amount;
    else prev.variableTotal += amount;
    subMap.set(key, prev);
  }

  const topSubcategories: OffendingSubcategorySummary[] = Array.from(subMap.entries())
    .map(([categoryPath, info]) => ({
      categoryPath,
      parentCategory: info.parentCategory,
      subcategory: info.subcategory,
      nature: (info.fixedTotal >= info.variableTotal ? 'Fixo' : 'Variável') as 'Fixo' | 'Variável',
      totalBRL: info.totalBRL,
      txCount: info.txCount,
    }))
    .sort((a, b) => b.totalBRL - a.totalBRL)
    .slice(0, 3);

  const topTransactions: OffendingTransactionSummary[] = offenderExpenses.slice(0, 5).map(tx => {
    const { parentCategory, subcategory } = resolveTransactionCategoryParts(tx);
    const categoryPath =
      parentCategory.toLowerCase() === subcategory.toLowerCase()
        ? parentCategory
        : `${parentCategory} > ${subcategory}`;
    return {
      id: tx.id,
      date: tx.date,
      description: tx.description,
      categoryPath,
      nature: resolveTransactionNatureLabel(tx),
      amountBRL: round2(Math.abs(tx.amount)),
    };
  });

  const donorJars = jars
    .filter(j => j.jarId !== primaryOffenderJar.jarId && j.surplusBRL > 0)
    .sort((a, b) => b.surplusBRL - a.surplusBRL);

  return {
    monthKey: resolvedMonth,
    monthLabel: formatMonthLabelPtBr(resolvedMonth),
    txCount: monthTxs.length,
    rendaLiquidaMensal: baseMetrics.rendaLiquidaMensal,
    totalSpentBRL: baseMetrics.totalGastoBRL,
    jars,
    primaryOffenderJar,
    topSubcategories,
    topTransactions,
    donorJars,
    hasAnyOverrun,
  };
}

/**
 * Deterministic rule-based heuristic analyzer matching the exact Gemini JSON schema.
 * Used seamlessly when GEMINI_API_KEY is absent or an API failure occurs.
 */
export function buildDeterministicSavingsPlan(
  snapshot: SixJarsSavingsSnapshot
): SavingsAdvisorPlan {
  const offender = snapshot.primaryOffenderJar;
  const topSub = snapshot.topSubcategories[0];
  const secondSub = snapshot.topSubcategories[1];
  const thirdSub = snapshot.topSubcategories[2];
  const topTx = snapshot.topTransactions[0];
  const bestDonor = snapshot.donorJars[0];
  const lifJar = snapshot.jars.find(j => j.jarId === 'LIF_10');

  const offenderLabel = offender.jarName;
  const topSubLabel = topSub
    ? topSub.categoryPath
    : topTx
    ? topTx.description
    : 'Despesas Gerais';

  const offenderCategoryPath = `${offender.shortName} > ${topSubLabel}`;

  // Calculate realistic monthly savings target
  const rawSavingTarget =
    offender.excessBRL > 0
      ? Math.max(
          Math.min(offender.excessBRL, offender.actualSpentBRL * 0.45),
          offender.excessBRL * 0.55
        )
      : offender.actualSpentBRL > 0
      ? offender.actualSpentBRL * 0.15
      : snapshot.rendaLiquidaMensal * 0.05;

  const estimatedMonthlySavingsBRL = round2(Math.max(50, rawSavingTarget));

  const pctDelta = round2(Math.max(0, offender.actualIncomePct - offender.targetPct));

  const headline =
    offender.excessBRL > 0
      ? `Pote ${offender.shortName} ${formatPctPtBr(pctDelta)}% acima da renda por peso em ${topSub?.subcategory || offender.shortName}`
      : offender.actualSpentBRL > 0
      ? `Otimize ${topSub?.subcategory || offender.shortName} para turbinar seus aportes mensais`
      : `Orçamento dos 6 Potes zerado: direcione sobra inicial para Liberdade Financeira`;

  const subCountText = topSub
    ? `${topSub.categoryPath} (${formatCurrencyPtBr(topSub.totalBRL)} em ${topSub.txCount} ${
        topSub.txCount === 1 ? 'lançamento' : 'lançamentos'
      }, perfil ${topSub.nature})`
    : 'despesas acumuladas no mês';

  const diagnosis =
    offender.excessBRL > 0
      ? `Em ${snapshot.monthLabel}, o pote ${offenderLabel} consumiu ${formatCurrencyPtBr(
          offender.actualSpentBRL
        )} (${formatPctPtBr(offender.actualIncomePct)}% da sua renda de ${formatCurrencyPtBr(
          snapshot.rendaLiquidaMensal
        )}), excedendo o teto em ${formatCurrencyPtBr(offender.excessBRL)}. O principal vetor é ${subCountText}, concentrando o maior potencial de corte rápido sem afetar itens essenciais.`
      : offender.actualSpentBRL > 0
      ? `Em ${snapshot.monthLabel}, todos os 6 Potes operam dentro dos limites previstos sobre sua renda de ${formatCurrencyPtBr(
          snapshot.rendaLiquidaMensal
        )}, com maior concentração em ${offenderLabel} (${formatCurrencyPtBr(
          offender.actualSpentBRL
        )}). Ajustes pontuais em ${subCountText} permitem acelerar ainda mais seus objetivos de patrimônio.`
      : `Nenhuma despesa foi lançada em ${snapshot.monthLabel} até o momento sobre a base de ${formatCurrencyPtBr(
          snapshot.rendaLiquidaMensal
        )}. Aproveite o início limpo do mês para automatizar as transferências dos potes investidores antes dos gastos variáveis.`;

  // Build 3 concrete micro-actions tailored to the top offending subcategories
  const step1Saving = round2(estimatedMonthlySavingsBRL * 0.5);
  const step2Saving = round2(estimatedMonthlySavingsBRL * 0.3);
  const step3Saving = round2(Math.max(10, estimatedMonthlySavingsBRL - step1Saving - step2Saving));

  const hasOverdraft = snapshot.topTransactions.some(t =>
    t.description.toLowerCase().includes('cheque especial') ||
    t.categoryPath.toLowerCase().includes('juros')
  );

  const actionableSteps: SavingsAdvisorActionStep[] = [
    {
      id: 'step-1',
      title: topSub
        ? `Reduzir em 20% o bloco "${topSub.subcategory}"`
        : `Definir teto semanal para ${offender.shortName}`,
      description: topSub
        ? `Revisar ${topSub.txCount} lançamento(s) de ${topSub.categoryPath} (${formatCurrencyPtBr(
            topSub.totalBRL
          )}, natureza ${topSub.nature}) aplicando trava de gastos nos próximos 15 dias.`
        : `Dividir o orçamento de ${offenderLabel} em 4 blocos semanais para evitar estouro na segunda quinzena.`,
      potentialSavingBRL: step1Saving,
    },
    {
      id: 'step-2',
      title: hasOverdraft
        ? 'Blindar conta contra Juros de Cheque Especial'
        : secondSub
        ? `Renegociar ou pausar excessos em "${secondSub.subcategory}"`
        : 'Auditar assinaturas e débitos recorrentes do cartão',
      description: hasOverdraft
        ? 'Antecipar transferência de reserva de giro do lucro PJ antes do dia 25 para eliminar tarifas evitáveis de cheque especial.'
        : secondSub
        ? `Avaliar os ${secondSub.txCount} gasto(s) em ${secondSub.categoryPath} (${formatCurrencyPtBr(
            secondSub.totalBRL
          )}) buscando substituição ou parcelamento sem juros.`
        : `Listar cobranças automáticas no cartão concentrador e cancelar itens com baixo uso nos últimos 30 dias.`,
      potentialSavingBRL: step2Saving,
    },
    {
      id: 'step-3',
      title: thirdSub
        ? `Substituir gastos variáveis em "${thirdSub.subcategory}"`
        : 'Aplicar regra das 48h para compras variáveis',
      description: thirdSub
        ? `Estabelecer teto fixo por ocorrência em ${thirdSub.categoryPath} (atual: ${formatCurrencyPtBr(
            thirdSub.totalBRL
          )}) antes de aprovar novos pedidos no fim de semana.`
        : `Adiar compras não planejadas acima de R$ 80 por 48 horas e redirecionar o valor poupado ao pote Liberdade Financeira.`,
      potentialSavingBRL: step3Saving,
    },
  ];

  const rebalanceSuggestion =
    offender.excessBRL > 0 && bestDonor
      ? `Use temporariamente a folga de ${formatCurrencyPtBr(bestDonor.surplusBRL)} disponível em ${
          bestDonor.jarName
        } para compensar parte do excesso de ${formatCurrencyPtBr(
          offender.excessBRL
        )} em ${offender.shortName}, mantendo novas saídas congeladas até o fechamento do mês.`
      : lifJar
      ? `Com os potes sob controle, redirecione os ${formatCurrencyPtBr(
          estimatedMonthlySavingsBRL
        )} economizados diretamente para ${lifJar.jarName} (teto atual de ${formatCurrencyPtBr(
          lifJar.targetLimitBRL
        )}), acelerando sua geração de renda passiva.`
      : `Direcione ${formatCurrencyPtBr(
          estimatedMonthlySavingsBRL
        )} da economia projetada para Liberdade Financeira (LIF 10%) assim que fechar o mês.`;

  return {
    headline,
    offenderCategoryPath,
    estimatedMonthlySavingsBRL,
    diagnosis,
    actionableSteps,
    rebalanceSuggestion,
  };
}

export function sanitizeSavingsAdvisorPlan(
  raw: unknown,
  fallbackSnapshot: SixJarsSavingsSnapshot
): SavingsAdvisorPlan {
  const fallback = buildDeterministicSavingsPlan(fallbackSnapshot);
  if (!raw || typeof raw !== 'object') return fallback;

  const obj = raw as Record<string, unknown>;
  const headline =
    typeof obj.headline === 'string' && obj.headline.trim().length > 4
      ? obj.headline.trim()
      : fallback.headline;

  const offenderCategoryPath =
    typeof obj.offenderCategoryPath === 'string' && obj.offenderCategoryPath.trim().length > 2
      ? obj.offenderCategoryPath.trim()
      : fallback.offenderCategoryPath;

  const estimatedMonthlySavingsBRL =
    typeof obj.estimatedMonthlySavingsBRL === 'number' &&
    Number.isFinite(obj.estimatedMonthlySavingsBRL) &&
    obj.estimatedMonthlySavingsBRL >= 0
      ? round2(obj.estimatedMonthlySavingsBRL)
      : fallback.estimatedMonthlySavingsBRL;

  const diagnosis =
    typeof obj.diagnosis === 'string' && obj.diagnosis.trim().length > 10
      ? obj.diagnosis.trim()
      : fallback.diagnosis;

  const rebalanceSuggestion =
    typeof obj.rebalanceSuggestion === 'string' && obj.rebalanceSuggestion.trim().length > 10
      ? obj.rebalanceSuggestion.trim()
      : fallback.rebalanceSuggestion;

  const rawSteps = Array.isArray(obj.actionableSteps) ? obj.actionableSteps : [];
  const parsedSteps: SavingsAdvisorActionStep[] = rawSteps
    .slice(0, 3)
    .map((item, idx) => {
      const rec = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const fbStep = fallback.actionableSteps[idx] || fallback.actionableSteps[0];
      return {
        id: `step-${idx + 1}`,
        title:
          typeof rec.title === 'string' && rec.title.trim().length > 2
            ? rec.title.trim()
            : fbStep.title,
        description:
          typeof rec.description === 'string' && rec.description.trim().length > 5
            ? rec.description.trim()
            : fbStep.description,
        potentialSavingBRL:
          typeof rec.potentialSavingBRL === 'number' &&
          Number.isFinite(rec.potentialSavingBRL) &&
          rec.potentialSavingBRL >= 0
            ? round2(rec.potentialSavingBRL)
            : fbStep.potentialSavingBRL,
      };
    });

  while (parsedSteps.length < 3) {
    const fbStep = fallback.actionableSteps[parsedSteps.length];
    if (fbStep) parsedSteps.push(fbStep);
    else break;
  }

  return {
    headline,
    offenderCategoryPath,
    estimatedMonthlySavingsBRL,
    diagnosis,
    actionableSteps: parsedSteps,
    rebalanceSuggestion,
  };
}

export function buildSavingsAdvisorPrompt(snapshot: SixJarsSavingsSnapshot): string {
  return `Você é o Consultor de Economia IA especialista na metodologia dos 6 Potes (T. Harv Eker) e em finanças pessoais brasileiras.
Analise o retrato financeiro real do mês "${snapshot.monthLabel}" (${snapshot.monthKey}):

1. Renda Líquida Mensal (Base 100%): ${formatCurrencyPtBr(snapshot.rendaLiquidaMensal)}
2. Gasto Total nos 6 Potes: ${formatCurrencyPtBr(snapshot.totalSpentBRL)}
3. Situação dos 6 Potes:
${snapshot.jars
  .map(
    j =>
      `- ${j.jarName} (${j.jarId}): Meta ${j.targetPct}% (${formatCurrencyPtBr(
        j.targetLimitBRL
      )}) | Real ${j.actualIncomePct}% (${formatCurrencyPtBr(j.actualSpentBRL)}) | Consumo ${
        j.consumptionPct
      }% | Status: ${j.status} | Folga: ${formatCurrencyPtBr(j.surplusBRL)} | Excesso: ${formatCurrencyPtBr(
        j.excessBRL
      )}`
  )
  .join('\n')}

4. Pote Ofensor Principal: ${snapshot.primaryOffenderJar.jarName} (${snapshot.primaryOffenderJar.jarId})
5. Top 3 Categorias/Subcategorias Ofensoras neste Pote:
${
  snapshot.topSubcategories.length > 0
    ? snapshot.topSubcategories
        .map(
          (s, i) =>
            `${i + 1}. ${s.categoryPath} — ${formatCurrencyPtBr(s.totalBRL)} (${s.txCount} transações, perfil ${s.nature})`
        )
        .join('\n')
    : '- Nenhuma subcategoria detalhada registrada.'
}

6. Top 5 Maiores Despesas deste Pote:
${
  snapshot.topTransactions.length > 0
    ? snapshot.topTransactions
        .map(
          (t, i) =>
            `${i + 1}. [${t.date}] ${t.description} (${t.categoryPath}, ${t.nature}) — ${formatCurrencyPtBr(
              t.amountBRL
            )}`
        )
        .join('\n')
    : '- Nenhuma despesa lançada.'
}

7. Potes com Folga Disponível:
${
  snapshot.donorJars.length > 0
    ? snapshot.donorJars
        .map(d => `- ${d.jarName}: ${formatCurrencyPtBr(d.surplusBRL)} livres`)
        .join('\n')
    : '- Nenhum pote com folga positiva no momento.'
}

REGRAS OBRIGATÓRIAS:
- Responda integralmente em Português do Brasil (pt-BR) usando valores em Reais (R$).
- "headline": título direto e diagnóstico com o principal desvio e categoria (máx. 85 caracteres).
- "offenderCategoryPath": caminho hierárquico ex: "Necessidades > Cartão de Crédito" ou "Lazer > Delivery".
- "estimatedMonthlySavingsBRL": número realista de economia mensal em R$ (número positivo).
- "diagnosis": exatamente 2 frases objetivas citando os números reais do usuário e padrões de fixo vs. variável.
- "actionableSteps": exatamente 3 micro-ações práticas e específicas para as subcategorias ofensoras acima, cada uma com "title", "description" e "potentialSavingBRL" numérico.
- "rebalanceSuggestion": explique qual pote com folga pode absorver temporariamente o excesso OU quanto redirecionar para "Liberdade Financeira" caso os potes estejam saudáveis.`;
}

export { SIX_JAR_KEYS };
