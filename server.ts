import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { 
  getCuratedFallbackArticles, 
  generateSearchQueriesForProfile, 
  parseGeminiReadingResponse 
} from './src/utils/financeReading';
import {
  calculateDeterministicJarOptimization,
  CORE_JAR_KEYS
} from './src/utils/jarOptimization';

dotenv.config();

// HMR is disabled in AI Studio preview environment to prevent WebSocket connection errors
if (process.env.DISABLE_HMR === undefined) {
  process.env.DISABLE_HMR = 'true';
}

const app = express();
const port = 3000;

app.use(express.json());

// API endpoint for Gemini-powered financial education tip
app.post('/api/dica-do-dia', async (req, res) => {
  try {
    const { spendingProfile } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: 'API key não encontrada',
        message: 'A chave da API Gemini não está configurada no servidor.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `Você é o mentor financeiro e educador do app Yupee Reborn, especialista na metodologia dos 6 Potes (T. Harv Eker) e finanças pessoais conscientes.
Analise os dados financeiros reais do perfil do usuário fornecidos abaixo:

${JSON.stringify(spendingProfile, null, 2)}

Com base nesses dados (ex: salários CLT, faturamento PJ, financiamento habitacional, fatura do cartão C6, juros de cheque especial evitáveis, aportes em sonhos), forneça UMA Dica do Dia de educação financeira personalizada.

A resposta DEVE ser um objeto JSON estrito com o seguinte esquema:
{
  "titulo": "Título curto, motivador e focado em uma prática concreta (máx 60 caracteres)",
  "categoria": "Pote ou área correspondente (ex: '6 Potes', 'Proteção de Fluxo', 'Investimentos & Sonhos', 'Controle do Cartão', 'Gestão PJ')",
  "impacto": "Benefício prático estimado (ex: 'Economia de R$ 140/mês', 'Aumento de 15% na taxa de poupança', 'Fim do estresse no dia 25')",
  "dica": "Texto explicativo e acolhedor de 2 a 3 frases com uma prática financeira acionável.",
  "acaoRecomendada": "Ação prática recomendada em 1 frase curta para executar no app ou na rotina",
  "citacaoEducativa": "Uma frase inspiradora sobre educação financeira e disciplina de gastos"
}

Responda SOMENTE o JSON puro, sem markdown backticks adicionais.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });
    } catch (e: any) {
      console.warn('Tentando modelo alternativo gemini-flash-latest após erro:', e?.message);
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });
    }

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    return res.json({ ...parsed, fonte: 'Gemini AI' });
  } catch (error: any) {
    console.warn('Gemini temporariamente indisponível (503/timeout), ativando motor heurístico do Yupee:', error?.message);
    
    // Intelligent heuristic fallback based on the user's profile
    const profile = req.body?.spendingProfile || {};
    let fallbackTip;

    if (profile.chequeEspecialJuros > 0) {
      fallbackTip = {
        titulo: "Estanque a Sangria do Cheque Especial no Dia 25",
        categoria: "Proteção de Fluxo",
        impacto: "Economia de R$ 140,00/mês (R$ 1.680/ano)",
        dica: "Sua conta Inter PF sofreu R$ 140 de juros porque o débito do financiamento habitacional (R$ 1.290) cai antes de certas compensações. Transferir R$ 1.000 de colchão do lucro PJ elimina essa cobrança para sempre.",
        acaoRecomendada: "Ativar o Escudo Amortecedor na aba Controle Automático.",
        citacaoEducativa: "Pequenos vazamentos afundam grandes navios. Cuide dos centavos e os reais cuidarão de si mesmos."
      };
    } else if (profile.faturaC6Total > 2000) {
      fallbackTip = {
        titulo: "Separe o Lazer das Contas Fixas no Cartão",
        categoria: "6 Potes de Harv Eker",
        impacto: "Maior clareza e controle emocional nos gastos",
        dica: "Sua fatura C6 concentra R$ 2.000 em necessidades básicas e R$ 600 em estilo de vida. Ao estabelecer limites visuais separados para cada um, você aproveita o fim de semana sem culpa e sem comprometer as contas da casa.",
        acaoRecomendada: "Conferir o teto de 10% no Pote de Lazer.",
        citacaoEducativa: "Orçamento não serve para limitar sua vida, mas para dar permissão consciente ao seu prazer."
      };
    } else {
      fallbackTip = {
        titulo: "Automatize seu Superávit no Pote de Reserva",
        categoria: "Investimentos & Liberdade",
        impacto: "Meta de Reserva Familiar adiantada em 3 meses",
        dica: "Seu mês fechou no positivo (+R$ 2,31 livre consolidado). Programe um aporte recorrente para o primeiro dia após o salário cair para não correr o risco de gastar o excedente ao longo do mês.",
        acaoRecomendada: "Simular aporte mensal na aba Sonhos & Metas.",
        citacaoEducativa: "Pague a si mesmo primeiro antes de pagar a qualquer outro credor."
      };
    }

    return res.json({ ...fallbackTip, fonte: 'Mentor Yupee' });
  }
});

// Endpoint para Leitura de Finanças com Google Search Grounding
app.post('/api/leitura-financas', async (req, res) => {
  const { profileSummary, userQuery } = req.body || {};
  const safeProfile = profileSummary || {
    cltIncome: 4440,
    pjRevenue: 8000,
    pjNetProfit: 4500,
    c6Total: 2600,
    overdraftInterest: 140,
    housingGross: 1430,
    housingNet: 572,
    netBalanceConsolidated: 2.31,
    exceededJars: ['Diversão & Estilo', 'Necessidades Básicas'],
    summaryTags: ['Fatura C6 Elevada', 'Juros de Cheque Especial', 'Financiamento Habitacional Ativo'],
    primaryFocus: 'Eliminação de Juros e Proteção de Fluxo de Caixa'
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallbackArticles = getCuratedFallbackArticles(safeProfile);
    return res.json({
      artigos: fallbackArticles,
      queriesUsed: generateSearchQueriesForProfile(safeProfile),
      fonte: 'Acervo Yupee Educativo',
      observacao: 'Chave Gemini não configurada no servidor, exibindo artigos curados.'
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const searchSubject = userQuery 
      ? `Pesquisa personalizada solicitada pelo usuário: "${userQuery}"` 
      : `Foco financeiro prioritário: ${safeProfile.primaryFocus}`;

    const prompt = `Você é um curador e educador financeiro do app Yupee Reborn especializado em finanças pessoais e no método dos 6 Potes.
O usuário possui o seguinte perfil financeiro real atual:
- Renda CLT: R$ ${safeProfile.cltIncome}
- Fatura Cartão C6: R$ ${safeProfile.c6Total}
- Débito Habitacional: R$ ${safeProfile.housingGross} (custo líquido R$ ${safeProfile.housingNet} após reembolsos)
- Juros/Tarifas Cheque Especial: R$ ${safeProfile.overdraftInterest}
- Potes com alerta de limite: ${safeProfile.exceededJars?.join(', ') || 'Nenhum'}
- Destaques do Perfil: ${safeProfile.summaryTags?.join(', ') || 'Equilíbrio orçamentário'}
- ${searchSubject}

Use a ferramenta de busca do Google (Google Search) para pesquisar artigos educativos e guias práticos em sites e fontes confiáveis brasileiras (ex: B3 Educação, Tesouro Direto, Banco Central do Brasil, Sebrae, CVM, portais de economia conceituados).

Gere de 4 a 6 recomendações de leitura em formato JSON estrito com o esquema:
[
  {
    "id": "search-art-1",
    "title": "Título claro e educativo do artigo",
    "summary": "Resumo explicativo de 2 a 3 frases com o conceito central",
    "keyTakeaways": ["Dica prática 1", "Dica prática 2", "Dica prática 3"],
    "sourceName": "Nome da instituição ou portal (ex: 'B3 Educação', 'Tesouro Direto', 'Banco Central', 'Sebrae')",
    "url": "URL real encontrada na busca ou link oficial",
    "readingTimeMinutes": 5,
    "topic": "cartao", // 'cartao' | 'financiamento' | 'investimentos' | 'potes' | 'pj'
    "relevanceReason": "Explicação personalizada em 1 frase de por que este artigo se aplica exatamente à situação financeira atual do usuário",
    "searchQueryUsed": "termo de busca utilizado"
  }
]

Responda APENAS o JSON puro.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSearchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    const artigos = parseGeminiReadingResponse(text, groundingChunks, safeProfile);

    return res.json({
      artigos,
      queriesUsed: webSearchQueries.length > 0 ? webSearchQueries : generateSearchQueriesForProfile(safeProfile),
      fonte: 'Google Search API Grounded',
      groundingCount: groundingChunks.length
    });
  } catch (err: any) {
    console.warn('Erro ao chamar Gemini com busca, acionando fallback curado:', err?.message);
    const fallbackArticles = getCuratedFallbackArticles(safeProfile);
    return res.json({
      artigos: fallbackArticles,
      queriesUsed: generateSearchQueriesForProfile(safeProfile),
      fonte: 'Acervo Yupee Educativo (Fallback)',
      erroDetalhe: err?.message
    });
  }
});

// Endpoint para Otimização de Potes com IA (Gemini) visando maximizar a Reserva de Emergência
app.post('/api/otimizar-potes', async (req, res) => {
  const { 
    incomeBase = 3652.31, 
    currentLimits = {}, 
    historicalSpending = {}, 
    emergencyReserve = {} 
  } = req.body || {};

  const safeIncome = Number(incomeBase) > 0 ? Number(incomeBase) : 3652.31;
  const reserveShortfall = Number(emergencyReserve.shortfall) || 12000;
  const avgExpense = Number(emergencyReserve.averageMonthlyExpense) || 2000;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const heuristic = calculateDeterministicJarOptimization({
      incomeBase: safeIncome,
      currentLimits,
      historicalStats: historicalSpending,
      reserveShortfall,
      averageMonthlyExpense: avgExpense,
    });
    return res.json(heuristic);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `Você é o consultor de finanças especialista do Yupee Reborn, mestre na Metodologia dos 6 Potes (T. Harv Eker) e em aceleração de Reserva de Emergência.
Analise os dados reais do usuário abaixo:
- Renda Base Mensal: R$ ${safeIncome.toFixed(2)}
- Limites Atuais por Pote (R$): ${JSON.stringify(currentLimits)}
- Comportamento de Gastos Históricos por Pote: ${JSON.stringify(historicalSpending)}
- Situação da Reserva de Emergência: Saldo atual R$ ${(emergencyReserve.currentReserve || 0).toFixed(2)}, Meta Ideal R$ ${(emergencyReserve.idealReserve || 0).toFixed(2)}, Falta para Meta: R$ ${reserveShortfall.toFixed(2)}, Despesa Média: R$ ${avgExpense.toFixed(2)}/mês.

MISSÃO CRÍTICA:
Sugerir ajustes percentuais nos limites dos 6 potes com foco em MAXIMIZAR A RESERVA DE EMERGÊNCIA (Pote PLP_10 - Poupança a Longo Prazo / Reserva & Sonhos).
Os 6 potes são:
1. NEC_55: Necessidades Básicas (padrão 55%)
2. DIV_10: Diversão & Lazer (padrão 10%)
3. PLP_10: Poupança a Longo Prazo / Reserva de Emergência (padrão 10% - ELEVE ESTE POTE, tipicamente para 16% a 24%)
4. LIF_10: Liberdade Financeira / Investimentos (padrão 10%)
5. EDU_10: Instrução & Educação (padrão 10%)
6. FER_5: Férias & Doações (padrão 5%)

REGRAS MATEMÁTICAS RÍGIDAS:
1. A SOMA DOS 6 PERCENTUAIS (NEC_55 + DIV_10 + PLP_10 + LIF_10 + EDU_10 + FER_5) DEVE SER EXATAMENTE 100.
2. Cada percentual deve ser um número inteiro positivo (ex: 48, 8, 20, 10, 8, 6).
3. Redirecione excedentes de potes que historicamente gastam pouco ou de lazer/necessidades flexíveis para o Pote PLP_10.

A resposta DEVE ser um JSON estrito com o seguinte esquema:
{
  "percentages": {
    "NEC_55": 50,
    "DIV_10": 8,
    "PLP_10": 20,
    "LIF_10": 10,
    "EDU_10": 8,
    "FER_5": 4
  },
  "rationales": {
    "NEC_55": "Justificativa clara em 1-2 frases acolhedoras em português",
    "DIV_10": "Justificativa clara em 1-2 frases",
    "PLP_10": "Justificativa do aumento da reserva em 1-2 frases destacando o benefício",
    "LIF_10": "Justificativa clara em 1-2 frases",
    "EDU_10": "Justificativa clara em 1-2 frases",
    "FER_5": "Justificativa clara em 1-2 frases"
  },
  "strategyHeadline": "Frase de impacto curta (ex: 'Potencialize sua Reserva com +R$ 365/mês')",
  "strategySummary": "Visão geral estratégica da readequação dos potes em 2 a 3 frases",
  "keyInsights": [
    "Insight 1 destacando o ganho de aporte na reserva",
    "Insight 2 sobre o tempo economizado para blindagem financeira",
    "Insight 3 sobre os ajustes suaves sem perda de conforto",
    "Insight 4 confirmando a distribuição equilibrada em 100%"
  ]
}

Responda SOMENTE o JSON puro, sem markdown tags adicionais.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });
    } catch (e: any) {
      console.warn('Tentando gemini-flash-latest para otimização de potes após erro:', e?.message);
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });
    }

    const text = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    // Validate and build structured response
    const rawPct = parsed.percentages || {};
    let sumPct = 0;
    const finalPct: Record<string, number> = {};

    CORE_JAR_KEYS.forEach(k => {
      finalPct[k] = typeof rawPct[k] === 'number' && rawPct[k] > 0 ? Math.round(rawPct[k]) : 10;
      sumPct += finalPct[k];
    });

    // Normalize if sum is not 100
    if (sumPct !== 100 && finalPct['PLP_10'] !== undefined) {
      finalPct['PLP_10'] += (100 - sumPct);
    }

    // Build optimization result using parsed rationales
    const heuristic = calculateDeterministicJarOptimization({
      incomeBase: safeIncome,
      currentLimits,
      historicalStats: historicalSpending,
      reserveShortfall,
      averageMonthlyExpense: avgExpense,
    });

    CORE_JAR_KEYS.forEach(k => {
      const sugPct = finalPct[k] || heuristic.optimizedJars[k].suggestedPercent;
      const sugLim = Math.round(safeIncome * (sugPct / 100));
      const curLim = heuristic.optimizedJars[k].currentLimit;
      const deltaLim = sugLim - curLim;
      const deltaPct = sugPct - heuristic.optimizedJars[k].currentPercent;

      heuristic.optimizedJars[k].suggestedPercent = sugPct;
      heuristic.optimizedJars[k].suggestedLimit = sugLim;
      heuristic.optimizedJars[k].deltaPercent = deltaPct;
      heuristic.optimizedJars[k].deltaLimit = deltaLim;

      if (parsed.rationales && parsed.rationales[k]) {
        heuristic.optimizedJars[k].rationale = parsed.rationales[k];
      }
    });

    const sugReserve = heuristic.optimizedJars['PLP_10'].suggestedLimit;
    const curReserve = heuristic.optimizedJars['PLP_10'].currentLimit;
    heuristic.monthlyReserveBoost = Math.max(0, sugReserve - curReserve);

    const curMonthly = curReserve > 0 ? curReserve : safeIncome * 0.1;
    const newMonthly = sugReserve > 0 ? sugReserve : safeIncome * 0.2;
    const curMonths = reserveShortfall / curMonthly;
    const newMonths = reserveShortfall / newMonthly;
    heuristic.monthsAccelerated = Math.max(1, Math.round(curMonths - newMonths));

    if (parsed.strategyHeadline) heuristic.strategyHeadline = parsed.strategyHeadline;
    if (parsed.strategySummary) heuristic.strategySummary = parsed.strategySummary;
    if (Array.isArray(parsed.keyInsights) && parsed.keyInsights.length > 0) {
      heuristic.keyInsights = parsed.keyInsights;
    }
    heuristic.source = 'gemini';

    return res.json(heuristic);
  } catch (error: any) {
    console.warn('Erro ao chamar Gemini para otimização de potes, acionando motor determinístico:', error?.message);
    const heuristic = calculateDeterministicJarOptimization({
      incomeBase: safeIncome,
      currentLimits,
      historicalStats: historicalSpending,
      reserveShortfall,
      averageMonthlyExpense: avgExpense,
    });
    return res.json(heuristic);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
}

startServer();
