var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);

// src/utils/financeReading.ts
function generateSearchQueriesForProfile(profile) {
  const queries = [];
  if (profile.overdraftInterest > 0) {
    queries.push("como evitar juros de cheque especial fluxo de caixa banco central");
  }
  if (profile.c6Total > 1500) {
    queries.push("como organizar limite cartao de credito fatura concentrada educacao financeira");
  }
  if (profile.housingNet > 0) {
    queries.push("amortizacao financiamento imobiliario sac ou price vale a pena guia b3");
  }
  if (profile.exceededJars.length > 0) {
    queries.push("metodo 6 potes t harv eker como nao estourar orcamento mensal");
  }
  if (profile.pjNetProfit > 0) {
    queries.push("separar conta pessoa fisica e juridica simples nacional pro labore sebrae");
  }
  queries.push("reserva de emergencia tesouro selic cdi liquidez diaria tesouro direto");
  return queries.slice(0, 4);
}
function getCuratedFallbackArticles(profile) {
  const allArticles = [
    {
      id: "art-amortizacao-sac-price",
      title: "Amortiza\xE7\xE3o de Financiamento Imobili\xE1rio: SAC vs Price e Redu\xE7\xE3o de Prazo",
      summary: "Descubra como aportes extraordin\xE1rios reduzem drasticamente os juros futuros e diminuem anos de parcelas com o mesmo or\xE7amento.",
      keyTakeaways: [
        "Amortizar pelo saldo devedor corta os juros compostos cobrados pelo banco.",
        "A op\xE7\xE3o por redu\xE7\xE3o de prazo (meses) \xE9 financeiramente superior \xE0 redu\xE7\xE3o do valor da parcela.",
        "Separar reembolsos recebidos (como os de Nathan) para abater o principal gera economia expressiva."
      ],
      sourceName: "B3 Educa\xE7\xE3o & Caixa",
      url: "https://www.tesourodireto.com.br/educacao-financeira",
      readingTimeMinutes: 5,
      topic: "financiamento",
      relevanceReason: "Identificamos sua parcela habitacional de R$ 1.290,00 e reembolso ativo no app.",
      searchQueryUsed: "amortizacao financiamento imobiliario sac prazo"
    },
    {
      id: "art-cartao-sem-culpa",
      title: "Cart\xE3o Concentrador: Como Usar a Fatura Alta a Seu Favor Sem Estourar",
      summary: "Dicas pr\xE1ticas para quem concentra mercado, contas de consumo e assinaturas em um \xFAnico cart\xE3o sem perder a visibilidade dos 6 Potes.",
      keyTakeaways: [
        "Categorize os lan\xE7amentos da fatura em Necessidades (55%) e Divers\xE3o (10%) antes de pagar.",
        "Nunca pague o rotativo ou m\xEDnimo: a taxa m\xE9dia supera 400% ao ano no Brasil.",
        "Programe a data de vencimento da fatura logo ap\xF3s o dia de pagamento do sal\xE1rio CLT."
      ],
      sourceName: "Banco Central do Brasil",
      url: "https://www.bcb.gov.br/cidadaniafinanceira",
      readingTimeMinutes: 4,
      topic: "cartao",
      relevanceReason: "Sua fatura C6 concentra R$ 2.600,00 entre contas fixas e lazer familiar.",
      searchQueryUsed: "controle cartao de credito fatura concentrada"
    },
    {
      id: "art-cheque-especial-escudo",
      title: "Fim dos Juros Ocultos: Como Eliminar a Cobran\xE7a de Cheque Especial",
      summary: "O descompasso entre a data de d\xE9bitos autom\xE1ticos e os dep\xF3sitos pode gerar tarifas evit\xE1veis. Veja como montar um escudo amortecedor.",
      keyTakeaways: [
        "O cheque especial cobra juros di\xE1rios a partir do primeiro centavo negativado.",
        "Manter um colch\xE3o m\xEDnimo de 10% a 20% das contas do m\xEAs na conta corrente zera essas cobran\xE7as.",
        "Verifique os dias de compensa\xE7\xE3o de DOC/TED/PIX e adiantamento de repasses."
      ],
      sourceName: "Febraban & CVM",
      url: "https://www.cvm.gov.br/educacional",
      readingTimeMinutes: 3,
      topic: "potes",
      relevanceReason: profile.overdraftInterest > 0 ? `Voc\xEA teve registro de R$ ${profile.overdraftInterest.toFixed(2)} em juros/tarifas que podem ser 100% evitados.` : "Preven\xE7\xE3o de descompassos de caixa em contas com d\xE9bitos autom\xE1ticos.",
      searchQueryUsed: "como evitar cheque especial fluxo de caixa"
    },
    {
      id: "art-reserva-tesouro-selic",
      title: "Reserva Familiar e Tesouro Selic: Onde Guardar o Dinheiro da Tranquilidade",
      summary: "O passo a passo para construir sua reserva de emerg\xEAncia rendendo 100% da Selic com liquidez D+0 e seguran\xE7a m\xE1xima.",
      keyTakeaways: [
        "Reserva de emerg\xEAncia n\xE3o visa enriquecimento, mas liquidez imediata e aus\xEAncia de volatilidade.",
        "Tesouro Selic e CDBs de liquidez di\xE1ria de grandes bancos s\xE3o as alternativas mais eficientes \xE0 poupan\xE7a.",
        "Aporte primeiro: programe a transfer\xEAncia autom\xE1tica no mesmo dia em que o faturamento entra."
      ],
      sourceName: "Tesouro Direto Oficial",
      url: "https://www.tesourodireto.com.br",
      readingTimeMinutes: 6,
      topic: "investimentos",
      relevanceReason: "Seu saldo atual est\xE1 positivo (+R$ 2,31) e pronto para impulsionar metas de longo prazo.",
      searchQueryUsed: "reserva de emergencia tesouro selic liquidez"
    },
    {
      id: "art-pf-pj-simples-nacional",
      title: "PF vs PJ: Pr\xF3-Labore, Distribui\xE7\xE3o de Lucros Isenta e DAS em Dia",
      summary: "Guia do empres\xE1rio consciente: como calcular o pr\xF3-labore ideal, recolher o DAS sem atraso e repassar o lucro para suas despesas pessoais.",
      keyTakeaways: [
        "Nunca misture a conta jur\xEDdica com pagamentos pessoais de supermercado ou lazer.",
        "A distribui\xE7\xE3o de lucros \xE9 isenta de imposto de renda se a empresa mantiver escritura\xE7\xE3o regular.",
        "O DAS deve ser tratado como custo fixo sagrado no in\xEDcio de cada m\xEAs para evitar perda do Simples."
      ],
      sourceName: "Sebrae Nacional",
      url: "https://www.sebrae.com.br/sites/PortalSebrae/educacao",
      readingTimeMinutes: 5,
      topic: "pj",
      relevanceReason: "Voc\xEA possui fluxo ativo no Simples Nacional com faturamento e tributos calculados no Yupee.",
      searchQueryUsed: "gestao financeira pj simples nacional pro labore"
    },
    {
      id: "art-metodo-6-potes-harv-eker",
      title: "O M\xE9todo dos 6 Potes de T. Harv Eker: Como Nunca Mais Ficar Sem Dinheiro",
      summary: "Aprenda a distribuir cada real entre Necessidades (55%), Lazer (10%), Educa\xE7\xE3o (10%), Reserva (10%), Sonhos (10%) e Doa\xE7\xF5es (5%).",
      keyTakeaways: [
        "O segredo do sucesso financeiro n\xE3o \xE9 o montante ganho, mas a proporcionalidade dos h\xE1bitos.",
        "Gastar os 10% do pote de Divers\xE3o sem remorso \xE9 essencial para manter a disciplina nos outros 90%.",
        "Se o pote de Necessidades passar de 55%, busque simplificar custos fixos antes de cortar investimentos."
      ],
      sourceName: "Yupee Educa\xE7\xE3o Financeira",
      url: "https://www.tesourodireto.com.br/educacao-financeira",
      readingTimeMinutes: 4,
      topic: "potes",
      relevanceReason: "Estrutura fundamental do aplicativo Yupee Reborn para equilibrar suas decis\xF5es de gastos.",
      searchQueryUsed: "metodo 6 potes harv eker financas pessoais"
    }
  ];
  return allArticles.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (profile.overdraftInterest > 0) {
      if (a.topic === "potes" || a.id.includes("cheque")) scoreA += 5;
      if (b.topic === "potes" || b.id.includes("cheque")) scoreB += 5;
    }
    if (profile.c6Total > 2e3) {
      if (a.topic === "cartao") scoreA += 4;
      if (b.topic === "cartao") scoreB += 4;
    }
    if (profile.housingNet > 0) {
      if (a.topic === "financiamento") scoreA += 3;
      if (b.topic === "financiamento") scoreB += 3;
    }
    if (profile.pjNetProfit > 0) {
      if (a.topic === "pj") scoreA += 2;
      if (b.topic === "pj") scoreB += 2;
    }
    return scoreB - scoreA;
  });
}
function parseGeminiReadingResponse(rawText, groundingChunks = [], profile) {
  try {
    let clean = rawText.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/```json/g, "").replace(/```/g, "").trim();
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/```/g, "").trim();
    }
    const parsed = JSON.parse(clean);
    const articlesArray = Array.isArray(parsed) ? parsed : parsed.artigos || parsed.articles || [];
    if (!Array.isArray(articlesArray) || articlesArray.length === 0) {
      return getCuratedFallbackArticles(profile);
    }
    const webChunks = (groundingChunks || []).map((c) => c.web).filter((w) => !!w && typeof w.uri === "string");
    return articlesArray.map((item, index) => {
      const matchedChunk = webChunks[index % (webChunks.length || 1)];
      const resolvedUrl = item.url && item.url.startsWith("http") ? item.url : matchedChunk?.uri || "https://www.bcb.gov.br/cidadaniafinanceira";
      const resolvedSource = item.sourceName || matchedChunk?.title || "Educa\xE7\xE3o Financeira";
      return {
        id: item.id || `gemini-art-${index}-${Date.now()}`,
        title: item.title || "Artigo Educativo Yupee",
        summary: item.summary || "Conte\xFAdo educativo focado no seu perfil financeiro.",
        keyTakeaways: Array.isArray(item.keyTakeaways) ? item.keyTakeaways : ["Pr\xE1tica financeira consciente para o dia a dia."],
        sourceName: resolvedSource,
        url: resolvedUrl,
        readingTimeMinutes: typeof item.readingTimeMinutes === "number" ? item.readingTimeMinutes : 4,
        topic: ["cartao", "financiamento", "investimentos", "potes", "pj"].includes(item.topic) ? item.topic : "potes",
        relevanceReason: item.relevanceReason || "Recomendado com base nas suas transa\xE7\xF5es e h\xE1bitos de gastos.",
        searchQueryUsed: item.searchQueryUsed
      };
    });
  } catch (e) {
    console.warn("Could not parse Gemini JSON response directly, using curated grounded articles:", e);
    return getCuratedFallbackArticles(profile);
  }
}

// server.ts
import_dotenv.default.config();
if (process.env.DISABLE_HMR === void 0) {
  process.env.DISABLE_HMR = "true";
}
var app = (0, import_express.default)();
var port = 3e3;
app.use(import_express.default.json());
app.post("/api/dica-do-dia", async (req, res) => {
  try {
    const { spendingProfile } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "API key n\xE3o encontrada",
        message: "A chave da API Gemini n\xE3o est\xE1 configurada no servidor."
      });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const prompt = `Voc\xEA \xE9 o mentor financeiro e educador do app Yupee Reborn, especialista na metodologia dos 6 Potes (T. Harv Eker) e finan\xE7as pessoais conscientes.
Analise os dados financeiros reais do perfil do usu\xE1rio fornecidos abaixo:

${JSON.stringify(spendingProfile, null, 2)}

Com base nesses dados (ex: sal\xE1rios CLT, faturamento PJ, financiamento habitacional, fatura do cart\xE3o C6, juros de cheque especial evit\xE1veis, aportes em sonhos), forne\xE7a UMA Dica do Dia de educa\xE7\xE3o financeira personalizada.

A resposta DEVE ser um objeto JSON estrito com o seguinte esquema:
{
  "titulo": "T\xEDtulo curto, motivador e focado em uma pr\xE1tica concreta (m\xE1x 60 caracteres)",
  "categoria": "Pote ou \xE1rea correspondente (ex: '6 Potes', 'Prote\xE7\xE3o de Fluxo', 'Investimentos & Sonhos', 'Controle do Cart\xE3o', 'Gest\xE3o PJ')",
  "impacto": "Benef\xEDcio pr\xE1tico estimado (ex: 'Economia de R$ 140/m\xEAs', 'Aumento de 15% na taxa de poupan\xE7a', 'Fim do estresse no dia 25')",
  "dica": "Texto explicativo e acolhedor de 2 a 3 frases com uma pr\xE1tica financeira acion\xE1vel.",
  "acaoRecomendada": "A\xE7\xE3o pr\xE1tica recomendada em 1 frase curta para executar no app ou na rotina",
  "citacaoEducativa": "Uma frase inspiradora sobre educa\xE7\xE3o financeira e disciplina de gastos"
}

Responda SOMENTE o JSON puro, sem markdown backticks adicionais.`;
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
    } catch (e) {
      console.warn("Tentando modelo alternativo gemini-flash-latest ap\xF3s erro:", e?.message);
      response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
    }
    const text = response.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(clean);
    }
    return res.json({ ...parsed, fonte: "Gemini AI" });
  } catch (error) {
    console.warn("Gemini temporariamente indispon\xEDvel (503/timeout), ativando motor heur\xEDstico do Yupee:", error?.message);
    const profile = req.body?.spendingProfile || {};
    let fallbackTip;
    if (profile.chequeEspecialJuros > 0) {
      fallbackTip = {
        titulo: "Estanque a Sangria do Cheque Especial no Dia 25",
        categoria: "Prote\xE7\xE3o de Fluxo",
        impacto: "Economia de R$ 140,00/m\xEAs (R$ 1.680/ano)",
        dica: "Sua conta Inter PF sofreu R$ 140 de juros porque o d\xE9bito do financiamento habitacional (R$ 1.290) cai antes de certas compensa\xE7\xF5es. Transferir R$ 1.000 de colch\xE3o do lucro PJ elimina essa cobran\xE7a para sempre.",
        acaoRecomendada: "Ativar o Escudo Amortecedor na aba Controle Autom\xE1tico.",
        citacaoEducativa: "Pequenos vazamentos afundam grandes navios. Cuide dos centavos e os reais cuidar\xE3o de si mesmos."
      };
    } else if (profile.faturaC6Total > 2e3) {
      fallbackTip = {
        titulo: "Separe o Lazer das Contas Fixas no Cart\xE3o",
        categoria: "6 Potes de Harv Eker",
        impacto: "Maior clareza e controle emocional nos gastos",
        dica: "Sua fatura C6 concentra R$ 2.000 em necessidades b\xE1sicas e R$ 600 em estilo de vida. Ao estabelecer limites visuais separados para cada um, voc\xEA aproveita o fim de semana sem culpa e sem comprometer as contas da casa.",
        acaoRecomendada: "Conferir o teto de 10% no Pote de Lazer.",
        citacaoEducativa: "Or\xE7amento n\xE3o serve para limitar sua vida, mas para dar permiss\xE3o consciente ao seu prazer."
      };
    } else {
      fallbackTip = {
        titulo: "Automatize seu Super\xE1vit no Pote de Reserva",
        categoria: "Investimentos & Liberdade",
        impacto: "Meta de Reserva Familiar adiantada em 3 meses",
        dica: "Seu m\xEAs fechou no positivo (+R$ 2,31 livre consolidado). Programe um aporte recorrente para o primeiro dia ap\xF3s o sal\xE1rio cair para n\xE3o correr o risco de gastar o excedente ao longo do m\xEAs.",
        acaoRecomendada: "Simular aporte mensal na aba Sonhos & Metas.",
        citacaoEducativa: "Pague a si mesmo primeiro antes de pagar a qualquer outro credor."
      };
    }
    return res.json({ ...fallbackTip, fonte: "Mentor Yupee" });
  }
});
app.post("/api/leitura-financas", async (req, res) => {
  const { profileSummary, userQuery } = req.body || {};
  const safeProfile = profileSummary || {
    cltIncome: 4440,
    pjRevenue: 8e3,
    pjNetProfit: 4500,
    c6Total: 2600,
    overdraftInterest: 140,
    housingGross: 1430,
    housingNet: 572,
    netBalanceConsolidated: 2.31,
    exceededJars: ["Divers\xE3o & Estilo", "Necessidades B\xE1sicas"],
    summaryTags: ["Fatura C6 Elevada", "Juros de Cheque Especial", "Financiamento Habitacional Ativo"],
    primaryFocus: "Elimina\xE7\xE3o de Juros e Prote\xE7\xE3o de Fluxo de Caixa"
  };
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallbackArticles = getCuratedFallbackArticles(safeProfile);
    return res.json({
      artigos: fallbackArticles,
      queriesUsed: generateSearchQueriesForProfile(safeProfile),
      fonte: "Acervo Yupee Educativo",
      observacao: "Chave Gemini n\xE3o configurada no servidor, exibindo artigos curados."
    });
  }
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const searchSubject = userQuery ? `Pesquisa personalizada solicitada pelo usu\xE1rio: "${userQuery}"` : `Foco financeiro priorit\xE1rio: ${safeProfile.primaryFocus}`;
    const prompt = `Voc\xEA \xE9 um curador e educador financeiro do app Yupee Reborn especializado em finan\xE7as pessoais e no m\xE9todo dos 6 Potes.
O usu\xE1rio possui o seguinte perfil financeiro real atual:
- Renda CLT: R$ ${safeProfile.cltIncome}
- Fatura Cart\xE3o C6: R$ ${safeProfile.c6Total}
- D\xE9bito Habitacional: R$ ${safeProfile.housingGross} (custo l\xEDquido R$ ${safeProfile.housingNet} ap\xF3s reembolsos)
- Juros/Tarifas Cheque Especial: R$ ${safeProfile.overdraftInterest}
- Potes com alerta de limite: ${safeProfile.exceededJars?.join(", ") || "Nenhum"}
- Destaques do Perfil: ${safeProfile.summaryTags?.join(", ") || "Equil\xEDbrio or\xE7ament\xE1rio"}
- ${searchSubject}

Use a ferramenta de busca do Google (Google Search) para pesquisar artigos educativos e guias pr\xE1ticos em sites e fontes confi\xE1veis brasileiras (ex: B3 Educa\xE7\xE3o, Tesouro Direto, Banco Central do Brasil, Sebrae, CVM, portais de economia conceituados).

Gere de 4 a 6 recomenda\xE7\xF5es de leitura em formato JSON estrito com o esquema:
[
  {
    "id": "search-art-1",
    "title": "T\xEDtulo claro e educativo do artigo",
    "summary": "Resumo explicativo de 2 a 3 frases com o conceito central",
    "keyTakeaways": ["Dica pr\xE1tica 1", "Dica pr\xE1tica 2", "Dica pr\xE1tica 3"],
    "sourceName": "Nome da institui\xE7\xE3o ou portal (ex: 'B3 Educa\xE7\xE3o', 'Tesouro Direto', 'Banco Central', 'Sebrae')",
    "url": "URL real encontrada na busca ou link oficial",
    "readingTimeMinutes": 5,
    "topic": "cartao", // 'cartao' | 'financiamento' | 'investimentos' | 'potes' | 'pj'
    "relevanceReason": "Explica\xE7\xE3o personalizada em 1 frase de por que este artigo se aplica exatamente \xE0 situa\xE7\xE3o financeira atual do usu\xE1rio",
    "searchQueryUsed": "termo de busca utilizado"
  }
]

Responda APENAS o JSON puro.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSearchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];
    const artigos = parseGeminiReadingResponse(text, groundingChunks, safeProfile);
    return res.json({
      artigos,
      queriesUsed: webSearchQueries.length > 0 ? webSearchQueries : generateSearchQueriesForProfile(safeProfile),
      fonte: "Google Search API Grounded",
      groundingCount: groundingChunks.length
    });
  } catch (err) {
    console.warn("Erro ao chamar Gemini com busca, acionando fallback curado:", err?.message);
    const fallbackArticles = getCuratedFallbackArticles(safeProfile);
    return res.json({
      artigos: fallbackArticles,
      queriesUsed: generateSearchQueriesForProfile(safeProfile),
      fonte: "Acervo Yupee Educativo (Fallback)",
      erroDetalhe: err?.message
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
        watch: process.env.DISABLE_HMR === "true" ? null : {}
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(import_express.default.static("dist"));
    app.get("*", (_req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }
  app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
}
startServer();
