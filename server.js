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

// src/data/initialData.ts
var JAR_DEFINITIONS = {
  NEC_55: {
    id: "NEC_55",
    name: "Necessidades B\xE1sicas",
    shortName: "Necessidades",
    desc: "Moradia, alimenta\xE7\xE3o, contas de casa, sa\xFAde, transporte essencial",
    pct: 0.55,
    colorHex: "#3B82F6",
    // Blue
    bgClass: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900",
    textClass: "text-blue-600 dark:text-blue-400",
    iconName: "Home"
  },
  DIV_10: {
    id: "DIV_10",
    name: "Divers\xE3o & Estilo",
    shortName: "Lazer",
    desc: "Passeios, jantares, compras livres, lazer no cart\xE3o C6",
    pct: 0.1,
    colorHex: "#A855F7",
    // Purple
    bgClass: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900",
    textClass: "text-purple-600 dark:text-purple-400",
    iconName: "Smile"
  },
  PLP_10: {
    id: "PLP_10",
    name: "Reserva & Poupan\xE7a Longo Prazo",
    shortName: "Reserva & Sonhos",
    desc: "Fundo de emerg\xEAncia, seguran\xE7a familiar, grandes metas futuras",
    pct: 0.1,
    colorHex: "#6366F1",
    // Indigo
    bgClass: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900",
    textClass: "text-indigo-600 dark:text-indigo-400",
    iconName: "PiggyBank"
  },
  LIF_10: {
    id: "LIF_10",
    name: "Liberdade Financeira",
    shortName: "Investimentos",
    desc: "Renda passiva, dividendos, tesouro direto, independ\xEAncia",
    pct: 0.1,
    colorHex: "#10B981",
    // Emerald
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900",
    textClass: "text-emerald-600 dark:text-emerald-400",
    iconName: "Wallet"
  },
  EDU_10: {
    id: "EDU_10",
    name: "Educa\xE7\xE3o Continuada",
    shortName: "Educa\xE7\xE3o",
    desc: "Livros, capacita\xE7\xF5es, p\xF3s-gradua\xE7\xE3o, cursos e ferramentas",
    pct: 0.1,
    colorHex: "#F59E0B",
    // Amber
    bgClass: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900",
    textClass: "text-amber-600 dark:text-amber-400",
    iconName: "BookOpen"
  },
  FER_5: {
    id: "FER_5",
    name: "F\xE9rias & Generosidade",
    shortName: "F\xE9rias & Doa\xE7\xF5es",
    desc: "Viagens anuais de lazer, presentes especiais e doa\xE7\xF5es",
    pct: 0.05,
    colorHex: "#F43F5E",
    // Rose
    bgClass: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900",
    textClass: "text-rose-600 dark:text-rose-400",
    iconName: "Plane"
  },
  PJ_EXCLUIDO: {
    id: "PJ_EXCLUIDO",
    name: "Opera\xE7\xE3o PJ (Corporativo)",
    shortName: "PJ Opera\xE7\xE3o",
    desc: "Custos diretos da empresa, impostos DAS e conv\xEAnio corporativo",
    pct: 0,
    colorHex: "#EA580C",
    // Orange
    bgClass: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900",
    textClass: "text-orange-600 dark:text-orange-400",
    iconName: "Building2"
  }
};

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
  } catch {
    return getCuratedFallbackArticles(profile);
  }
}

// src/utils/jarOptimization.ts
var STANDARD_JAR_PERCENTAGES = {
  NEC_55: 55,
  DIV_10: 10,
  PLP_10: 10,
  LIF_10: 10,
  EDU_10: 10,
  FER_5: 5,
  PJ_EXCLUIDO: 0
};
var CORE_JAR_KEYS = ["NEC_55", "DIV_10", "PLP_10", "LIF_10", "EDU_10", "FER_5"];
function calculateDeterministicJarOptimization(params) {
  const {
    incomeBase,
    currentLimits = {},
    historicalStats,
    reserveShortfall = 1e4,
    averageMonthlyExpense = 2e3
  } = params;
  const safeIncome = incomeBase > 0 ? incomeBase : 3652.31;
  const currentPercents = {};
  let totalCurrentLimit = 0;
  CORE_JAR_KEYS.forEach((k) => {
    const limit = currentLimits[k] !== void 0 && currentLimits[k] > 0 ? currentLimits[k] : Math.round(safeIncome * (STANDARD_JAR_PERCENTAGES[k] / 100));
    totalCurrentLimit += limit;
  });
  CORE_JAR_KEYS.forEach((k) => {
    const limit = currentLimits[k] !== void 0 && currentLimits[k] > 0 ? currentLimits[k] : Math.round(safeIncome * (STANDARD_JAR_PERCENTAGES[k] / 100));
    currentPercents[k] = totalCurrentLimit > 0 ? Math.round(limit / totalCurrentLimit * 100) : STANDARD_JAR_PERCENTAGES[k];
  });
  let suggestedPercents = {
    NEC_55: 50,
    // -5% (ou ajustado conforme gasto real)
    DIV_10: 8,
    // -2%
    PLP_10: 20,
    // +10% (Foco Total na Reserva de Emergência)
    LIF_10: 10,
    // Mantém ou calibra
    EDU_10: 8,
    // -2%
    FER_5: 4,
    // -1%
    PJ_EXCLUIDO: 0
  };
  if (historicalStats) {
    const necSpentPct = historicalStats["NEC_55"]?.percentOfIncome || 50;
    const divSpentPct = historicalStats["DIV_10"]?.percentOfIncome || 8;
    const ferSpentPct = historicalStats["FER_5"]?.percentOfIncome || 2;
    const eduSpentPct = historicalStats["EDU_10"]?.percentOfIncome || 5;
    const necTarget = Math.max(45, Math.min(53, Math.ceil(necSpentPct + 3)));
    const divTarget = Math.max(6, Math.min(9, Math.ceil(divSpentPct + 2)));
    const ferTarget = Math.max(2, Math.min(4, Math.ceil(ferSpentPct + 1)));
    const eduTarget = Math.max(6, Math.min(8, Math.ceil(eduSpentPct + 2)));
    const lifTarget = 9;
    const otherSum = necTarget + divTarget + ferTarget + eduTarget + lifTarget;
    const plpTarget = Math.max(15, 100 - otherSum);
    suggestedPercents = {
      NEC_55: necTarget,
      DIV_10: divTarget,
      PLP_10: plpTarget,
      LIF_10: lifTarget,
      EDU_10: eduTarget,
      FER_5: ferTarget,
      PJ_EXCLUIDO: 0
    };
    const sum = CORE_JAR_KEYS.reduce((acc, k) => acc + suggestedPercents[k], 0);
    if (sum !== 100) {
      suggestedPercents.PLP_10 += 100 - sum;
    }
  }
  let sumCheck = CORE_JAR_KEYS.reduce((acc, k) => acc + suggestedPercents[k], 0);
  if (sumCheck !== 100) {
    suggestedPercents.PLP_10 += 100 - sumCheck;
  }
  const optimizedJars = {};
  const rationales = {
    NEC_55: `Ajustado de ${currentPercents["NEC_55"]}% para ${suggestedPercents["NEC_55"]}%. Otimiza\xE7\xE3o de contas fixas e consumo dom\xE9stico para evitar desperd\xEDcios sem perder conforto.`,
    DIV_10: `Calibrado de ${currentPercents["DIV_10"]}% para ${suggestedPercents["DIV_10"]}%. Preserva os momentos de lazer essenciais e transfere o excesso para o fundo de seguran\xE7a.`,
    PLP_10: `Turbinado de ${currentPercents["PLP_10"]}% para ${suggestedPercents["PLP_10"]}%. Foco priorit\xE1rio: acelerar a Reserva de Emerg\xEAncia para blindar sua fam\xEDlia contra imprevistos.`,
    LIF_10: `Definido em ${suggestedPercents["LIF_10"]}%. Mant\xE9m semente de investimentos para o futuro enquanto a reserva b\xE1sica se consolida.`,
    EDU_10: `Ajustado em ${suggestedPercents["EDU_10"]}%. Foco em cursos e livros pr\xE1ticos de alto impacto no curto e m\xE9dio prazo.`,
    FER_5: `Ajustado para ${suggestedPercents["FER_5"]}%. Mant\xE9m cota para descanso e generosidade com planejamento antecipado.`,
    PJ_EXCLUIDO: "N\xE3o aplic\xE1vel na partilha PF."
  };
  CORE_JAR_KEYS.forEach((key) => {
    const def = JAR_DEFINITIONS[key] || { name: key, shortName: key, colorHex: "#3b82f6" };
    const curLimit = currentLimits[key] !== void 0 && currentLimits[key] > 0 ? currentLimits[key] : Math.round(safeIncome * (currentPercents[key] / 100));
    const sugLimit = Math.round(safeIncome * (suggestedPercents[key] / 100));
    const deltaPct = suggestedPercents[key] - currentPercents[key];
    const deltaLim = sugLimit - curLimit;
    const stat = historicalStats ? historicalStats[key] : null;
    optimizedJars[key] = {
      jarId: key,
      jarName: def.name,
      shortName: def.shortName,
      colorHex: def.colorHex,
      currentPercent: currentPercents[key],
      suggestedPercent: suggestedPercents[key],
      currentLimit: curLimit,
      suggestedLimit: sugLimit,
      deltaPercent: deltaPct,
      deltaLimit: deltaLim,
      historicalNetSpent: stat ? stat.netSpent : 0,
      historicalPercentSpent: stat ? stat.percentOfIncome : 0,
      rationale: rationales[key],
      isReserveFocus: key === "PLP_10"
    };
  });
  const curReserveLimit = optimizedJars["PLP_10"].currentLimit;
  const sugReserveLimit = optimizedJars["PLP_10"].suggestedLimit;
  const monthlyReserveBoost = Math.max(0, sugReserveLimit - curReserveLimit);
  const curMonthlySavings = curReserveLimit > 0 ? curReserveLimit : Math.round(safeIncome * 0.1);
  const newMonthlySavings = sugReserveLimit > 0 ? sugReserveLimit : Math.round(safeIncome * 0.2);
  const curMonthsToGoal = curMonthlySavings > 0 ? reserveShortfall / curMonthlySavings : 24;
  const newMonthsToGoal = newMonthlySavings > 0 ? reserveShortfall / newMonthlySavings : 12;
  const monthsAccelerated = Math.max(1, Math.round(curMonthsToGoal - newMonthsToGoal));
  return {
    optimizedJars,
    totalCurrentPercent: 100,
    totalSuggestedPercent: 100,
    monthlyReserveBoost,
    monthsAccelerated,
    strategyHeadline: `Potencialize sua Reserva com +R$ ${monthlyReserveBoost.toFixed(0)}/m\xEAs`,
    strategySummary: `Redistribuindo pequenas margens ociosas de necessidades e lazer, aumentamos o Pote de Reserva & Sonhos (PLP) de ${currentPercents["PLP_10"]}% para ${suggestedPercents["PLP_10"]}%, antecipando sua meta de emerg\xEAncia em cerca de ${monthsAccelerated} meses.`,
    keyInsights: [
      `Aporte mensal na Reserva de Emerg\xEAncia salta de R$ ${curReserveLimit.toFixed(0)} para R$ ${sugReserveLimit.toFixed(0)} (+R$ ${monthlyReserveBoost.toFixed(0)}/m\xEAs).`,
      `Sua blindagem de emerg\xEAncia (6 meses de despesas) ser\xE1 conclu\xEDda aproximadamente ${monthsAccelerated} meses mais cedo.`,
      `Ajustes suaves em Divers\xE3o (-${Math.abs(optimizedJars["DIV_10"].deltaPercent)}%) e Necessidades (-${Math.abs(optimizedJars["NEC_55"].deltaPercent)}%) sem comprometer sua rotina.`,
      `Equil\xEDbrio rigoroso: a soma de todos os potes permanece exatamente em 100% da sua renda.`
    ],
    source: "heuristic"
  };
}

// server.ts
import_dotenv.default.config();
if (process.env.DISABLE_HMR === void 0) {
  process.env.DISABLE_HMR = "true";
}
var app = (0, import_express.default)();
var port = 3e3;
app.use(import_express.default.json());
var geminiCircuitTrippedUntil = 0;
var CIRCUIT_COOLDOWN_MS = 5 * 60 * 1e3;
function isBillingOrQuotaError(err) {
  if (!err) return false;
  const msg = typeof err === "string" ? err : err.message || JSON.stringify(err);
  return msg.includes("402") || msg.includes("prepayment credits are depleted") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429") || msg.includes("quota") || msg.includes("billing");
}
function isGeminiAvailable() {
  return Boolean(process.env.GEMINI_API_KEY) && Date.now() >= geminiCircuitTrippedUntil;
}
function tripGeminiCircuit(reason) {
  geminiCircuitTrippedUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
  console.log(`[Yupee AI Service] Modo conting\xEAncia inteligente ativo por 5 min (${reason}).`);
}
function getDeterministicDailyTip(profile) {
  if (profile?.chequeEspecialJuros > 0) {
    return {
      titulo: "Estanque a Sangria do Cheque Especial no Dia 25",
      categoria: "Prote\xE7\xE3o de Fluxo",
      impacto: "Economia de R$ 140,00/m\xEAs (R$ 1.680/ano)",
      dica: "Sua conta Inter PF sofreu R$ 140 de juros porque o d\xE9bito do financiamento habitacional (R$ 1.290) cai antes de certas compensa\xE7\xF5es. Transferir R$ 1.000 de colch\xE3o do lucro PJ elimina essa cobran\xE7a para sempre.",
      acaoRecomendada: "Ativar o Escudo Amortecedor na aba Controle Autom\xE1tico.",
      citacaoEducativa: "Pequenos vazamentos afundam grandes navios. Cuide dos centavos e os reais cuidar\xE3o de si mesmos."
    };
  } else if (profile?.faturaC6Total > 2e3) {
    return {
      titulo: "Separe o Lazer das Contas Fixas no Cart\xE3o",
      categoria: "6 Potes de Harv Eker",
      impacto: "Maior clareza e controle emocional nos gastos",
      dica: "Sua fatura C6 concentra R$ 2.000 em necessidades b\xE1sicas e R$ 600 em estilo de vida. Ao estabelecer limites visuais separados para cada um, voc\xEA aproveita o fim de semana sem culpa e sem comprometer as contas da casa.",
      acaoRecomendada: "Conferir o teto de 10% no Pote de Lazer.",
      citacaoEducativa: "Or\xE7amento n\xE3o serve para limitar sua vida, mas para dar permiss\xE3o consciente ao seu prazer."
    };
  } else {
    return {
      titulo: "Automatize seu Super\xE1vit no Pote de Reserva",
      categoria: "Investimentos & Liberdade",
      impacto: "Meta de Reserva Familiar adiantada em 3 meses",
      dica: "Seu m\xEAs fechou no positivo (+R$ 2,31 livre consolidado). Programe um aporte recorrente para o primeiro dia ap\xF3s o sal\xE1rio cair para n\xE3o correr o risco de gastar o excedente ao longo do m\xEAs.",
      acaoRecomendada: "Simular aporte mensal na aba Sonhos & Metas.",
      citacaoEducativa: "Pague a si mesmo primeiro antes de pagar a qualquer outro credor."
    };
  }
}
app.post("/api/dica-do-dia", async (req, res) => {
  const profile = req.body?.spendingProfile || {};
  if (!isGeminiAvailable()) {
    return res.json({ ...getDeterministicDailyTip(profile), fonte: "Mentor Yupee" });
  }
  const apiKey = process.env.GEMINI_API_KEY;
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

${JSON.stringify(profile, null, 2)}

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
  try {
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
      if (isBillingOrQuotaError(e)) {
        tripGeminiCircuit("Cr\xE9ditos de pr\xE9-pagamento esgotados");
        return res.json({ ...getDeterministicDailyTip(profile), fonte: "Mentor Yupee" });
      }
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
    if (isBillingOrQuotaError(error)) {
      tripGeminiCircuit("Cr\xE9ditos de pr\xE9-pagamento esgotados");
    }
    return res.json({ ...getDeterministicDailyTip(profile), fonte: "Mentor Yupee" });
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
  if (!isGeminiAvailable()) {
    const fallbackArticles = getCuratedFallbackArticles(safeProfile);
    return res.json({
      artigos: fallbackArticles,
      queriesUsed: generateSearchQueriesForProfile(safeProfile),
      fonte: "Acervo Yupee Educativo"
    });
  }
  const apiKey = process.env.GEMINI_API_KEY;
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
    if (isBillingOrQuotaError(err)) {
      tripGeminiCircuit("Cr\xE9ditos de pr\xE9-pagamento esgotados");
    }
    const fallbackArticles = getCuratedFallbackArticles(safeProfile);
    return res.json({
      artigos: fallbackArticles,
      queriesUsed: generateSearchQueriesForProfile(safeProfile),
      fonte: "Acervo Yupee Educativo"
    });
  }
});
app.post("/api/otimizar-potes", async (req, res) => {
  const {
    incomeBase = 3652.31,
    currentLimits = {},
    historicalSpending = {},
    emergencyReserve = {}
  } = req.body || {};
  const safeIncome = Number(incomeBase) > 0 ? Number(incomeBase) : 3652.31;
  const reserveShortfall = Number(emergencyReserve.shortfall) || 12e3;
  const avgExpense = Number(emergencyReserve.averageMonthlyExpense) || 2e3;
  const getDeterministicResult = () => calculateDeterministicJarOptimization({
    incomeBase: safeIncome,
    currentLimits,
    historicalStats: historicalSpending,
    reserveShortfall,
    averageMonthlyExpense: avgExpense
  });
  if (!isGeminiAvailable()) {
    return res.json(getDeterministicResult());
  }
  const apiKey = process.env.GEMINI_API_KEY;
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const prompt = `Voc\xEA \xE9 o consultor de finan\xE7as especialista do Yupee Reborn, mestre na Metodologia dos 6 Potes (T. Harv Eker) e em acelera\xE7\xE3o de Reserva de Emerg\xEAncia.
Analise os dados reais do usu\xE1rio abaixo:
- Renda Base Mensal: R$ ${safeIncome.toFixed(2)}
- Limites Atuais por Pote (R$): ${JSON.stringify(currentLimits)}
- Comportamento de Gastos Hist\xF3ricos por Pote: ${JSON.stringify(historicalSpending)}
- Situa\xE7\xE3o da Reserva de Emerg\xEAncia: Saldo atual R$ ${(emergencyReserve.currentReserve || 0).toFixed(2)}, Meta Ideal R$ ${(emergencyReserve.idealReserve || 0).toFixed(2)}, Falta para Meta: R$ ${reserveShortfall.toFixed(2)}, Despesa M\xE9dia: R$ ${avgExpense.toFixed(2)}/m\xEAs.

MISS\xC3O CR\xCDTICA:
Sugerir ajustes percentuais nos limites dos 6 potes com foco em MAXIMIZAR A RESERVA DE EMERG\xCANCIA (Pote PLP_10 - Poupan\xE7a a Longo Prazo / Reserva & Sonhos).
Os 6 potes s\xE3o:
1. NEC_55: Necessidades B\xE1sicas (padr\xE3o 55%)
2. DIV_10: Divers\xE3o & Lazer (padr\xE3o 10%)
3. PLP_10: Poupan\xE7a a Longo Prazo / Reserva de Emerg\xEAncia (padr\xE3o 10% - ELEVE ESTE POTE, tipicamente para 16% a 24%)
4. LIF_10: Liberdade Financeira / Investimentos (padr\xE3o 10%)
5. EDU_10: Instru\xE7\xE3o & Educa\xE7\xE3o (padr\xE3o 10%)
6. FER_5: F\xE9rias & Doa\xE7\xF5es (padr\xE3o 5%)

REGRAS MATEM\xC1TICAS R\xCDGIDAS:
1. A SOMA DOS 6 PERCENTUAIS (NEC_55 + DIV_10 + PLP_10 + LIF_10 + EDU_10 + FER_5) DEVE SER EXATAMENTE 100.
2. Cada percentual deve ser um n\xFAmero inteiro positivo (ex: 48, 8, 20, 10, 8, 6).
3. Redirecione excedentes de potes que historicamente gastam pouco ou de lazer/necessidades flex\xEDveis para o Pote PLP_10.

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
    "NEC_55": "Justificativa clara em 1-2 frases acolhedoras em portugu\xEAs",
    "DIV_10": "Justificativa clara em 1-2 frases",
    "PLP_10": "Justificativa do aumento da reserva em 1-2 frases destacando o benef\xEDcio",
    "LIF_10": "Justificativa clara em 1-2 frases",
    "EDU_10": "Justificativa clara em 1-2 frases",
    "FER_5": "Justificativa clara em 1-2 frases"
  },
  "strategyHeadline": "Frase de impacto curta (ex: 'Potencialize sua Reserva com +R$ 365/m\xEAs')",
  "strategySummary": "Vis\xE3o geral estrat\xE9gica da readequa\xE7\xE3o dos potes em 2 a 3 frases",
  "keyInsights": [
    "Insight 1 destacando o ganho de aporte na reserva",
    "Insight 2 sobre o tempo economizado para blindagem financeira",
    "Insight 3 sobre os ajustes suaves sem perda de conforto",
    "Insight 4 confirmando a distribui\xE7\xE3o equilibrada em 100%"
  ]
}

Responda SOMENTE o JSON puro, sem markdown tags adicionais.`;
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
      if (isBillingOrQuotaError(e)) {
        tripGeminiCircuit("Cr\xE9ditos de pr\xE9-pagamento esgotados");
        return res.json(getDeterministicResult());
      }
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
    const rawPct = parsed.percentages || {};
    let sumPct = 0;
    const finalPct = {};
    CORE_JAR_KEYS.forEach((k) => {
      finalPct[k] = typeof rawPct[k] === "number" && rawPct[k] > 0 ? Math.round(rawPct[k]) : 10;
      sumPct += finalPct[k];
    });
    if (sumPct !== 100 && finalPct["PLP_10"] !== void 0) {
      finalPct["PLP_10"] += 100 - sumPct;
    }
    const heuristic = calculateDeterministicJarOptimization({
      incomeBase: safeIncome,
      currentLimits,
      historicalStats: historicalSpending,
      reserveShortfall,
      averageMonthlyExpense: avgExpense
    });
    CORE_JAR_KEYS.forEach((k) => {
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
    const sugReserve = heuristic.optimizedJars["PLP_10"].suggestedLimit;
    const curReserve = heuristic.optimizedJars["PLP_10"].currentLimit;
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
    heuristic.source = "gemini";
    return res.json(heuristic);
  } catch (error) {
    if (isBillingOrQuotaError(error)) {
      tripGeminiCircuit("Cr\xE9ditos de pr\xE9-pagamento esgotados");
    }
    return res.json(getDeterministicResult());
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
