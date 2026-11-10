import { Transaction, JarType } from '../types';
import { calculateFinancialMetrics } from './finance';
import { calculateJarBudgetAlerts } from './budgetAlerts';

export type ArticleTopic = 'todos' | 'cartao' | 'financiamento' | 'investimentos' | 'potes' | 'pj';

export interface EducationalArticle {
  id: string;
  title: string;
  summary: string;
  keyTakeaways: string[];
  sourceName: string;
  url: string;
  readingTimeMinutes: number;
  topic: 'cartao' | 'financiamento' | 'investimentos' | 'potes' | 'pj';
  relevanceReason: string;
  searchQueryUsed?: string;
}

export interface UserFinancialProfileSummary {
  cltIncome: number;
  pjRevenue: number;
  pjNetProfit: number;
  c6Total: number;
  overdraftInterest: number;
  housingGross: number;
  housingNet: number;
  netBalanceConsolidated: number;
  exceededJars: string[];
  summaryTags: string[];
  primaryFocus: string;
}

/**
 * Pure function: Analyzes current transactions and budget limits to extract
 * key financial profile signals and priority focus.
 */
export function buildFinancialProfileSummary(
  transactions: Transaction[],
  jarLimits: Record<JarType, number>,
  usePjProfitInPf = true
): UserFinancialProfileSummary {
  const metrics = calculateFinancialMetrics(transactions, usePjProfitInPf);
  const alerts = calculateJarBudgetAlerts(transactions, jarLimits);

  const exceededJars = alerts
    .filter(a => a.status === 'WARNING' || a.status === 'EXCEEDED')
    .map(a => a.jarName);

  const summaryTags: string[] = [];
  if (metrics.c6Total > 1500) {
    summaryTags.push(`Fatura C6 Elevada (R$ ${Math.round(metrics.c6Total).toLocaleString('pt-BR')})`);
  }
  if (metrics.overdraftInterest > 0) {
    summaryTags.push(`Juros de Cheque Especial (R$ ${Math.round(metrics.overdraftInterest).toLocaleString('pt-BR')})`);
  }
  if (metrics.magnoTotalNetApto > 0) {
    summaryTags.push(`Financiamento Habitacional Ativo`);
  }
  if (exceededJars.length > 0) {
    summaryTags.push(`Alertas em ${exceededJars.length} Pote(s)`);
  }
  if (metrics.netBalanceConsolidated > 0) {
    summaryTags.push(`Superávit Livre (+R$ ${Math.round(metrics.netBalanceConsolidated).toLocaleString('pt-BR')})`);
  }
  if (metrics.pjNetProfit > 0) {
    summaryTags.push(`Operação PJ Simples Nacional`);
  }

  // Determine primary educational focus
  let primaryFocus = 'Investimentos & Formação de Reserva';
  if (metrics.overdraftInterest > 0) {
    primaryFocus = 'Eliminação de Juros e Proteção de Fluxo de Caixa';
  } else if (metrics.c6Total > 2500 || exceededJars.includes('Diversão & Estilo')) {
    primaryFocus = 'Controle de Cartão de Crédito e Faturas Concentradas';
  } else if (metrics.magnoTotalNetApto > 0) {
    primaryFocus = 'Estratégias de Amortização Habitacional e Custo Efetivo';
  } else if (metrics.pjNetProfit > 0 && metrics.cltIncome > 0) {
    primaryFocus = 'Separação de Finanças PF e Lucro PJ';
  }

  return {
    cltIncome: metrics.cltIncome,
    pjRevenue: metrics.pjServiceIncome,
    pjNetProfit: metrics.pjNetProfit,
    c6Total: metrics.c6Total,
    overdraftInterest: metrics.overdraftInterest,
    housingGross: metrics.totalAptoDebit,
    housingNet: metrics.magnoTotalNetApto,
    netBalanceConsolidated: metrics.netBalanceConsolidated,
    exceededJars,
    summaryTags,
    primaryFocus
  };
}

/**
 * Generates search queries for the Search API grounded model.
 */
export function generateSearchQueriesForProfile(profile: UserFinancialProfileSummary): string[] {
  const queries: string[] = [];

  if (profile.overdraftInterest > 0) {
    queries.push('como evitar juros de cheque especial fluxo de caixa banco central');
  }
  if (profile.c6Total > 1500) {
    queries.push('como organizar limite cartao de credito fatura concentrada educacao financeira');
  }
  if (profile.housingNet > 0) {
    queries.push('amortizacao financiamento imobiliario sac ou price vale a pena guia b3');
  }
  if (profile.exceededJars.length > 0) {
    queries.push('metodo 6 potes t harv eker como nao estourar orcamento mensal');
  }
  if (profile.pjNetProfit > 0) {
    queries.push('separar conta pessoa fisica e juridica simples nacional pro labore sebrae');
  }

  // Default high-value query
  queries.push('reserva de emergencia tesouro selic cdi liquidez diaria tesouro direto');

  return queries.slice(0, 4);
}

/**
 * Curated list of grounded Brazilian financial education articles from authoritative sources.
 * Used as high-fidelity fallback when API key is not present or offline.
 */
export function getCuratedFallbackArticles(profile: UserFinancialProfileSummary): EducationalArticle[] {
  const allArticles: EducationalArticle[] = [
    {
      id: 'art-amortizacao-sac-price',
      title: 'Amortização de Financiamento Imobiliário: SAC vs Price e Redução de Prazo',
      summary: 'Descubra como aportes extraordinários reduzem drasticamente os juros futuros e diminuem anos de parcelas com o mesmo orçamento.',
      keyTakeaways: [
        'Amortizar pelo saldo devedor corta os juros compostos cobrados pelo banco.',
        'A opção por redução de prazo (meses) é financeiramente superior à redução do valor da parcela.',
        'Separar reembolsos recebidos (como os de Nathan) para abater o principal gera economia expressiva.'
      ],
      sourceName: 'B3 Educação & Caixa',
      url: 'https://www.tesourodireto.com.br/educacao-financeira',
      readingTimeMinutes: 5,
      topic: 'financiamento',
      relevanceReason: 'Identificamos sua parcela habitacional de R$ 1.290,00 e reembolso ativo no app.',
      searchQueryUsed: 'amortizacao financiamento imobiliario sac prazo'
    },
    {
      id: 'art-cartao-sem-culpa',
      title: 'Cartão Concentrador: Como Usar a Fatura Alta a Seu Favor Sem Estourar',
      summary: 'Dicas práticas para quem concentra mercado, contas de consumo e assinaturas em um único cartão sem perder a visibilidade dos 6 Potes.',
      keyTakeaways: [
        'Categorize os lançamentos da fatura em Necessidades (55%) e Diversão (10%) antes de pagar.',
        'Nunca pague o rotativo ou mínimo: a taxa média supera 400% ao ano no Brasil.',
        'Programe a data de vencimento da fatura logo após o dia de pagamento do salário CLT.'
      ],
      sourceName: 'Banco Central do Brasil',
      url: 'https://www.bcb.gov.br/cidadaniafinanceira',
      readingTimeMinutes: 4,
      topic: 'cartao',
      relevanceReason: 'Sua fatura C6 concentra R$ 2.600,00 entre contas fixas e lazer familiar.',
      searchQueryUsed: 'controle cartao de credito fatura concentrada'
    },
    {
      id: 'art-cheque-especial-escudo',
      title: 'Fim dos Juros Ocultos: Como Eliminar a Cobrança de Cheque Especial',
      summary: 'O descompasso entre a data de débitos automáticos e os depósitos pode gerar tarifas evitáveis. Veja como montar um escudo amortecedor.',
      keyTakeaways: [
        'O cheque especial cobra juros diários a partir do primeiro centavo negativado.',
        'Manter um colchão mínimo de 10% a 20% das contas do mês na conta corrente zera essas cobranças.',
        'Verifique os dias de compensação de DOC/TED/PIX e adiantamento de repasses.'
      ],
      sourceName: 'Febraban & CVM',
      url: 'https://www.cvm.gov.br/educacional',
      readingTimeMinutes: 3,
      topic: 'potes',
      relevanceReason: profile.overdraftInterest > 0
        ? `Você teve registro de R$ ${profile.overdraftInterest.toFixed(2)} em juros/tarifas que podem ser 100% evitados.`
        : 'Prevenção de descompassos de caixa em contas com débitos automáticos.',
      searchQueryUsed: 'como evitar cheque especial fluxo de caixa'
    },
    {
      id: 'art-reserva-tesouro-selic',
      title: 'Reserva Familiar e Tesouro Selic: Onde Guardar o Dinheiro da Tranquilidade',
      summary: 'O passo a passo para construir sua reserva de emergência rendendo 100% da Selic com liquidez D+0 e segurança máxima.',
      keyTakeaways: [
        'Reserva de emergência não visa enriquecimento, mas liquidez imediata e ausência de volatilidade.',
        'Tesouro Selic e CDBs de liquidez diária de grandes bancos são as alternativas mais eficientes à poupança.',
        'Aporte primeiro: programe a transferência automática no mesmo dia em que o faturamento entra.'
      ],
      sourceName: 'Tesouro Direto Oficial',
      url: 'https://www.tesourodireto.com.br',
      readingTimeMinutes: 6,
      topic: 'investimentos',
      relevanceReason: 'Seu saldo atual está positivo (+R$ 2,31) e pronto para impulsionar metas de longo prazo.',
      searchQueryUsed: 'reserva de emergencia tesouro selic liquidez'
    },
    {
      id: 'art-pf-pj-simples-nacional',
      title: 'PF vs PJ: Pró-Labore, Distribuição de Lucros Isenta e DAS em Dia',
      summary: 'Guia do empresário consciente: como calcular o pró-labore ideal, recolher o DAS sem atraso e repassar o lucro para suas despesas pessoais.',
      keyTakeaways: [
        'Nunca misture a conta jurídica com pagamentos pessoais de supermercado ou lazer.',
        'A distribuição de lucros é isenta de imposto de renda se a empresa mantiver escrituração regular.',
        'O DAS deve ser tratado como custo fixo sagrado no início de cada mês para evitar perda do Simples.'
      ],
      sourceName: 'Sebrae Nacional',
      url: 'https://www.sebrae.com.br/sites/PortalSebrae/educacao',
      readingTimeMinutes: 5,
      topic: 'pj',
      relevanceReason: 'Você possui fluxo ativo no Simples Nacional com faturamento e tributos calculados no Yupee.',
      searchQueryUsed: 'gestao financeira pj simples nacional pro labore'
    },
    {
      id: 'art-metodo-6-potes-harv-eker',
      title: 'O Método dos 6 Potes de T. Harv Eker: Como Nunca Mais Ficar Sem Dinheiro',
      summary: 'Aprenda a distribuir cada real entre Necessidades (55%), Lazer (10%), Educação (10%), Reserva (10%), Sonhos (10%) e Doações (5%).',
      keyTakeaways: [
        'O segredo do sucesso financeiro não é o montante ganho, mas a proporcionalidade dos hábitos.',
        'Gastar os 10% do pote de Diversão sem remorso é essencial para manter a disciplina nos outros 90%.',
        'Se o pote de Necessidades passar de 55%, busque simplificar custos fixos antes de cortar investimentos.'
      ],
      sourceName: 'Yupee Educação Financeira',
      url: 'https://www.tesourodireto.com.br/educacao-financeira',
      readingTimeMinutes: 4,
      topic: 'potes',
      relevanceReason: 'Estrutura fundamental do aplicativo Yupee Reborn para equilibrar suas decisões de gastos.',
      searchQueryUsed: 'metodo 6 potes harv eker financas pessoais'
    }
  ];

  // Prioritize articles based on user profile
  return allArticles.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (profile.overdraftInterest > 0) {
      if (a.topic === 'potes' || a.id.includes('cheque')) scoreA += 5;
      if (b.topic === 'potes' || b.id.includes('cheque')) scoreB += 5;
    }
    if (profile.c6Total > 2000) {
      if (a.topic === 'cartao') scoreA += 4;
      if (b.topic === 'cartao') scoreB += 4;
    }
    if (profile.housingNet > 0) {
      if (a.topic === 'financiamento') scoreA += 3;
      if (b.topic === 'financiamento') scoreB += 3;
    }
    if (profile.pjNetProfit > 0) {
      if (a.topic === 'pj') scoreA += 2;
      if (b.topic === 'pj') scoreB += 2;
    }

    return scoreB - scoreA;
  });
}

/**
 * Filter articles by topic
 */
export function filterArticlesByTopic(
  articles: EducationalArticle[],
  topic: ArticleTopic
): EducationalArticle[] {
  if (topic === 'todos') return articles;
  return articles.filter(a => a.topic === topic);
}

/**
 * Search articles by text query
 */
export function searchArticlesByKeyword(
  articles: EducationalArticle[],
  query: string
): EducationalArticle[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return articles;

  return articles.filter(a => {
    return (
      a.title.toLowerCase().includes(clean) ||
      a.summary.toLowerCase().includes(clean) ||
      a.sourceName.toLowerCase().includes(clean) ||
      a.keyTakeaways.some(t => t.toLowerCase().includes(clean)) ||
      a.relevanceReason.toLowerCase().includes(clean)
    );
  });
}

/**
 * Parses Gemini Grounding response and matches with grounding chunks
 */
export function parseGeminiReadingResponse(
  rawText: string,
  groundingChunks: any[] = [],
  profile: UserFinancialProfileSummary
): EducationalArticle[] {
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(clean);
    const articlesArray = Array.isArray(parsed) ? parsed : parsed.artigos || parsed.articles || [];

    if (!Array.isArray(articlesArray) || articlesArray.length === 0) {
      return getCuratedFallbackArticles(profile);
    }

    // Extract valid grounding URLs
    const webChunks = (groundingChunks || [])
      .map(c => c.web)
      .filter((w): w is { uri: string; title: string } => !!w && typeof w.uri === 'string');

    return articlesArray.map((item: any, index: number) => {
      // Find matching grounding chunk URL or fallback
      const matchedChunk = webChunks[index % (webChunks.length || 1)];
      const resolvedUrl = (item.url && item.url.startsWith('http')) 
        ? item.url 
        : (matchedChunk?.uri || 'https://www.bcb.gov.br/cidadaniafinanceira');
      
      const resolvedSource = item.sourceName || matchedChunk?.title || 'Educação Financeira';

      return {
        id: item.id || `gemini-art-${index}-${Date.now()}`,
        title: item.title || 'Artigo Educativo Yupee',
        summary: item.summary || 'Conteúdo educativo focado no seu perfil financeiro.',
        keyTakeaways: Array.isArray(item.keyTakeaways) ? item.keyTakeaways : ['Prática financeira consciente para o dia a dia.'],
        sourceName: resolvedSource,
        url: resolvedUrl,
        readingTimeMinutes: typeof item.readingTimeMinutes === 'number' ? item.readingTimeMinutes : 4,
        topic: (['cartao', 'financiamento', 'investimentos', 'potes', 'pj'].includes(item.topic) ? item.topic : 'potes') as any,
        relevanceReason: item.relevanceReason || 'Recomendado com base nas suas transações e hábitos de gastos.',
        searchQueryUsed: item.searchQueryUsed
      };
    });
  } catch {
    return getCuratedFallbackArticles(profile);
  }
}

