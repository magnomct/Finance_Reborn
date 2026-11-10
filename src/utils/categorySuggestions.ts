import { Transaction, AutoCategoryRule, JarType, CostCenter, AccountType } from '../types';

export interface CategorySuggestion {
  id: string;
  keyword: string;
  category: string;
  jar: JarType;
  costCenter: CostCenter;
  account: AccountType;
  frequency: number;
  sampleDescriptions: string[];
  sampleAmount: number;
  type: 'despesa' | 'receita' | 'reembolso';
}

// Stop words / noise tokens that shouldn't form a rule keyword by themselves
const STOP_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem',
  'a', 'o', 'e', 'ou', 'se', 'um', 'uma', 'uns', 'umas', 'ao', 'aos', 'à', 'às',
  'pgto', 'pagamento', 'compra', 'transferencia', 'transf', 'ted', 'doc', 'pix',
  'debito', 'credito', 'total', 'mes', 'parcela', 'fatura', 'cartao', 'banco',
  'ref', 'reembolso'
]);

// Known pattern dictionary to intelligently suggest jar and category based on keywords
const KEYWORD_KNOWLEDGE_BASE: Array<{
  pattern: RegExp;
  keyword: string;
  category: string;
  jar: JarType;
}> = [
  // Supermercados & Mercearia (Necessidades 55%)
  { pattern: /mercado|supermercado|carrefour|pao de acucar|assai|atacad|extra|hortifruti|sacolao/i, keyword: 'mercado', category: 'Supermercado', jar: 'NEC_55' },
  // Farmácia & Saúde (Necessidades 55%)
  { pattern: /farmacia|droga|drogaria|raia|drogasil|panvel|pacheco|consulta|medico|exame|dentista/i, keyword: 'farmácia', category: 'Saúde & Farmácia', jar: 'NEC_55' },
  // Combustível & Posto (Necessidades 55%)
  { pattern: /posto|gasolina|combustivel|ipiranga|shell|petrobras|abastece/i, keyword: 'posto', category: 'Combustível', jar: 'NEC_55' },
  // Condução & Mobilidade (Necessidades 55%)
  { pattern: /conducao|metro|onibus|passagem|passe|bilhete|pedagio|sem parar|veloe/i, keyword: 'condução', category: 'Transporte & Condução', jar: 'NEC_55' },
  // Moradia, Contas de Consumo (Necessidades 55%)
  { pattern: /aluguel|condominio|iptu|energia|enel|cpfl|luz|agua|sabesp|sanepar|internet|vivo|claro|tim/i, keyword: 'moradia', category: 'Moradia & Contas', jar: 'NEC_55' },
  // Lazer & Alimentação Fora (Lazer 10%)
  { pattern: /restaurante|lanchonete|hamburguer|pizza|churrascaria|mcdonald|burger king|starbucks|cafe|cafeteria|padaria/i, keyword: 'restaurante', category: 'Restaurantes & Lanches', jar: 'DIV_10' },
  // Streaming & Entretenimento (Lazer 10%)
  { pattern: /netflix|spotify|amazon prime|disney|hbo|max|cinema|ingresso|show|game|steam|playstation|xbox/i, keyword: 'streaming', category: 'Entretenimento & Lazer', jar: 'DIV_10' },
  // Roupas & Cuidados Pessoais (Lazer 10%)
  { pattern: /zara|renner|c&a|riachuelo|salao|barbearia|barbeiro|cabeleireiro|estetica|perfumaria|boticario/i, keyword: 'cuidados', category: 'Vestuário & Beleza', jar: 'DIV_10' },
  // Educação, Cursos & Livros (Educação 10%)
  { pattern: /udemy|alura|coursera|curso|faculdade|escola|ingles|livro|livraria|apostila/i, keyword: 'curso', category: 'Cursos & Educação', jar: 'EDU_10' },
  // Investimentos & Reserva (Reserva PLP 10% / LIF 10%)
  { pattern: /tesouro|cdb|lci|lca|fundo|investimento|acoes|bolsa|b3/i, keyword: 'investimento', category: 'Investimentos & Reserva', jar: 'PLP_10' },
  // Férias & Viagens (Férias 5%)
  { pattern: /hotel|airbnb|booking|pousada|voo|latam|gol|azul|viagem|decolar|milhas/i, keyword: 'viagem', category: 'Viagens & Férias', jar: 'FER_5' },
  // PJ & Empresas (PJ Excluído)
  { pattern: /das|simples nacional|gps|inss|darf|contador|contabilidade|hospedagem|servidor|aws|google cloud/i, keyword: 'empresa pj', category: 'Operação PJ', jar: 'PJ_EXCLUIDO' },
];

/**
 * Extracts candidate keywords or clean tokens from a transaction description.
 */
export function extractCandidateTokens(description: string): string[] {
  if (!description) return [];

  // Remove parenthesis and special punctuation
  const cleaned = description
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[.,:;!?'"/-]/g, ' ')
    .toLowerCase()
    .trim();

  const words = cleaned
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

  return words;
}

/**
 * Identifies patterns from un-automated transactions and suggests one-click category rules.
 */
export function findCategoryRuleSuggestions(
  transactions: Transaction[],
  existingRules: AutoCategoryRule[]
): CategorySuggestion[] {
  if (!transactions || transactions.length === 0) return [];

  // Set of existing keywords (lowercased)
  const existingKeywords = new Set(existingRules.map(r => r.keyword.toLowerCase().trim()));

  // Filter transactions that do NOT already match an existing rule
  const unautomatedTxList = transactions.filter(t => {
    const descLower = t.description.toLowerCase();
    return !existingRules.some(r => descLower.includes(r.keyword.toLowerCase().trim()));
  });

  if (unautomatedTxList.length === 0) return [];

  // Group transactions by candidate keywords or known patterns
  interface GroupAcc {
    keyword: string;
    category: string;
    jar: JarType;
    costCenter: CostCenter;
    account: AccountType;
    type: 'despesa' | 'receita' | 'reembolso';
    txs: Transaction[];
  }

  const groups = new Map<string, GroupAcc>();

  for (const tx of unautomatedTxList) {
    const descLower = tx.description.toLowerCase();

    // 1. Try to find a match in the knowledge base first
    let matchedKnowledge = KEYWORD_KNOWLEDGE_BASE.find(kb => kb.pattern.test(descLower));

    let chosenKeyword: string | null = null;
    let chosenCategory = tx.category || 'Geral';
    let chosenJar: JarType = tx.jar || 'NEC_55';

    if (matchedKnowledge) {
      chosenKeyword = matchedKnowledge.keyword;
      if (!tx.category || tx.category === 'Geral') {
        chosenCategory = matchedKnowledge.category;
      }
      chosenJar = matchedKnowledge.jar;
    } else {
      // 2. Extract best token from words
      const tokens = extractCandidateTokens(tx.description);
      if (tokens.length > 0) {
        // Prefer first 1-2 words or most specific token
        chosenKeyword = tokens[0];
      }
    }

    if (!chosenKeyword) continue;

    const normalizedKeyword = chosenKeyword.toLowerCase().trim();

    // If an existing rule already covers this exact keyword, skip
    if (existingKeywords.has(normalizedKeyword)) continue;

    if (!groups.has(normalizedKeyword)) {
      groups.set(normalizedKeyword, {
        keyword: normalizedKeyword,
        category: chosenCategory,
        jar: chosenJar,
        costCenter: tx.costCenter || 'Magno',
        account: tx.account || 'Inter PF',
        type: tx.type,
        txs: [tx],
      });
    } else {
      const g = groups.get(normalizedKeyword)!;
      g.txs.push(tx);
      // If we find a transaction with a better category name than 'Geral', adopt it
      if (tx.category && tx.category !== 'Geral' && g.category === 'Geral') {
        g.category = tx.category;
      }
    }
  }

  // Convert groups to sorted suggestions (only groups with recurring pattern or high relevance)
  const suggestions: CategorySuggestion[] = [];

  for (const [kw, g] of groups.entries()) {
    // Only suggest if it appears at least once, but prioritize frequent occurrences
    const sampleTxs = g.txs.slice(0, 3);
    const avgAmount = g.txs.reduce((acc, t) => acc + Math.abs(t.amount), 0) / g.txs.length;

    suggestions.push({
      id: `sug-${kw}-${Date.now()}`,
      keyword: kw,
      category: g.category,
      jar: g.jar,
      costCenter: g.costCenter,
      account: g.account,
      frequency: g.txs.length,
      sampleDescriptions: Array.from(new Set(sampleTxs.map(t => t.description))),
      sampleAmount: avgAmount,
      type: g.type,
    });
  }

  // Sort by frequency (most common transactions first)
  return suggestions.sort((a, b) => b.frequency - a.frequency);
}
