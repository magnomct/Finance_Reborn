import { Transaction, JarType, CostCenter, AccountType, AutoCategoryRule } from '../types';

export interface ParsedImportItem {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positive for receipt, negative for expense
  type: 'receita' | 'despesa' | 'reembolso';
  jar: JarType;
  category: string;
  account: AccountType;
  costCenter: CostCenter;
  isDuplicate?: boolean;
  selected: boolean;
  fitId?: string;
}

/**
 * Smart categorizer for imported transaction descriptions
 */
export function autoCategorizeImport(
  description: string,
  amount: number,
  rules: AutoCategoryRule[] = []
): { jar: JarType; category: string; costCenter: CostCenter } {
  const descLower = description.toLowerCase();

  // 1. Check user-defined rules first
  for (const rule of rules) {
    if (descLower.includes(rule.keyword.toLowerCase())) {
      return {
        jar: rule.jar,
        category: rule.category,
        costCenter: rule.costCenter
      };
    }
  }

  // 2. Income detection
  if (amount > 0) {
    if (descLower.includes('salario') || descLower.includes('folha') || descLower.includes('provento')) {
      return { jar: 'NEC_55', category: 'Salário / Renda', costCenter: 'Magno' };
    }
    if (descLower.includes('consultoria') || descLower.includes('pj') || descLower.includes('nota fiscal')) {
      return { jar: 'NEC_55', category: 'Faturamento PJ', costCenter: 'PJ' };
    }
    if (descLower.includes('reembolso') || descLower.includes('devolucao')) {
      return { jar: 'NEC_55', category: 'Reembolso', costCenter: 'Nathan' };
    }
    return { jar: 'NEC_55', category: 'Outras Rendas', costCenter: 'Magno' };
  }

  // 3. Expense smart categorizer
  if (descLower.includes('mercado') || descLower.includes('supermercado') || descLower.includes('carrefour') || descLower.includes('pao de acucar') || descLower.includes('hortifruti') || descLower.includes('feira') || descLower.includes('padaria')) {
    return { jar: 'NEC_55', category: 'Alimentação & Feira', costCenter: 'Magno' };
  }
  if (descLower.includes('aluguel') || descLower.includes('condominio') || descLower.includes('iptu') || descLower.includes('enel') || descLower.includes('luz') || descLower.includes('sabesp') || descLower.includes('agua') || descLower.includes('gas') || descLower.includes('internet') || descLower.includes('claro') || descLower.includes('vivo')) {
    return { jar: 'NEC_55', category: 'Habitação', costCenter: 'Magno' };
  }
  if (descLower.includes('uber') || descLower.includes('99') || descLower.includes('posto') || descLower.includes('combustivel') || descLower.includes('gasolina') || descLower.includes('estapar') || descLower.includes('estacionamento') || descLower.includes('sem parar') || descLower.includes('pedagio') || descLower.includes('conducao') || descLower.includes('metro') || descLower.includes('onibus')) {
    return { jar: 'NEC_55', category: 'Transporte', costCenter: 'Magno' };
  }
  if (descLower.includes('droga') || descLower.includes('farmacia') || descLower.includes('hospital') || descLower.includes('clinica') || descLower.includes('medico') || descLower.includes('dentista') || descLower.includes('unimed') || descLower.includes('amil') || descLower.includes('sulamerica') || descLower.includes('laboratorio')) {
    return { jar: 'NEC_55', category: 'Saúde & Cuidados', costCenter: 'Magno' };
  }
  if (descLower.includes('curso') || descLower.includes('livraria') || descLower.includes('udemy') || descLower.includes('alura') || descLower.includes('faculdade') || descLower.includes('escola') || descLower.includes('idiomas')) {
    return { jar: 'EDU_10', category: 'Educação & Cursos', costCenter: 'Magno' };
  }
  if (descLower.includes('restaurante') || descLower.includes('ifood') || descLower.includes('bar') || descLower.includes('lanche') || descLower.includes('cinema') || descLower.includes('netflix') || descLower.includes('spotify') || descLower.includes('steam') || descLower.includes('show') || descLower.includes('cervejaria')) {
    return { jar: 'DIV_10', category: 'Lazer & Experiências', costCenter: 'Magno' };
  }
  if (descLower.includes('tesouro') || descLower.includes('cdi') || descLower.includes('renda fixa') || descLower.includes('invest') || descLower.includes('acoes') || descLower.includes('fundo') || descLower.includes('previdencia') || descLower.includes('icatu') || descLower.includes('brasilprev')) {
    return { jar: 'LIF_10', category: 'Bancos & Investimentos', costCenter: 'Magno' };
  }
  if (descLower.includes('tarifa') || descLower.includes('anuidade') || descLower.includes('iof') || descLower.includes('juros') || descLower.includes('das') || descLower.includes('taxa')) {
    return { jar: 'NEC_55', category: 'Bancos & Tarifas', costCenter: 'Magno' };
  }
  if (descLower.includes('nubank') || descLower.includes('fatura') || descLower.includes('c6') || descLower.includes('inter')) {
    return { jar: 'NEC_55', category: 'Cartões de Crédito', costCenter: 'Magno' };
  }

  // Default fallback
  return { jar: 'NEC_55', category: 'Despesas Gerais', costCenter: 'Magno' };
}

/**
 * Parses numeric currency strings supporting Brazilian format (1.234,56 or -123,45) and standard (1234.56)
 */
export function parseCurrencyString(val: string): number {
  if (!val) return 0;
  let clean = val.trim().replace(/^R\$\s?/, '').replace(/\s+/g, '');

  // If contains comma and dot, check position
  if (clean.includes('.') && clean.includes(',')) {
    // 1.234,56 -> remove dots, replace comma with dot
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    // 1234,56 -> replace comma with dot
    clean = clean.replace(',', '.');
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formats YYYYMMDD or DD/MM/YYYY or YYYY-MM-DD into canonical YYYY-MM-DD
 */
export function normalizeDateString(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const clean = dateStr.trim();

  // YYYYMMDD (OFX style: e.g. 20261015 or 20261015120000[-03:EST])
  if (/^\d{8}/.test(clean)) {
    const year = clean.slice(0, 4);
    const month = clean.slice(4, 6);
    const day = clean.slice(6, 8);
    return `${year}-${month}-${day}`;
  }

  // DD/MM/YYYY (BR CSV style)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Checks if a parsed item matches an existing transaction
 */
export function checkIsDuplicate(
  item: { date: string; amount: number; description: string },
  existingTransactions: Transaction[]
): boolean {
  const normDesc = item.description.toLowerCase().replace(/[^a-z0-9]/g, '');
  return existingTransactions.some(t => {
    if (t.date !== item.date) return false;
    if (Math.abs(t.amount - item.amount) > 0.01) return false;
    const existingNorm = t.description.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normDesc.includes(existingNorm) || existingNorm.includes(normDesc);
  });
}

/**
 * Parses OFX format file content (XML and SGML tags)
 */
export function parseOFX(
  content: string,
  options: {
    account?: AccountType;
    costCenter?: CostCenter;
    existingTransactions?: Transaction[];
    rules?: AutoCategoryRule[];
  } = {}
): ParsedImportItem[] {
  const {
    account = 'Inter PF',
    costCenter = 'Magno',
    existingTransactions = [],
    rules = []
  } = options;

  const items: ParsedImportItem[] = [];

  // Match all <STMTTRN>...</STMTTRN> blocks or unclosed <STMTTRN> in SGML
  // Using regex to capture transactions
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>)|(?=<\/CCSTMTTRNRS>)|$)/gi;
  let match: RegExpExecArray | null;

  const extractTag = (block: string, tag: string): string => {
    // Matches <TAG>value</TAG> or <TAG>value\n
    const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
    const m = block.match(regex);
    return m ? m[1].trim() : '';
  };

  while ((match = stmttrnRegex.exec(content)) !== null) {
    const block = match[1];
    if (!block.trim()) continue;

    const trntype = extractTag(block, 'TRNTYPE').toUpperCase();
    const dtposted = extractTag(block, 'DTPOSTED');
    const trnamtStr = extractTag(block, 'TRNAMT');
    const fitid = extractTag(block, 'FITID');
    const name = extractTag(block, 'NAME');
    const memo = extractTag(block, 'MEMO');

    let description = memo || name || 'Lançamento bancário';
    // Clean up XML entities like &amp; &lt; etc
    description = description
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    const date = normalizeDateString(dtposted);
    let amount = parseFloat(trnamtStr.replace(',', '.'));
    if (isNaN(amount)) amount = 0;

    // Determine type
    const type: 'receita' | 'despesa' | 'reembolso' = amount >= 0 ? 'receita' : 'despesa';

    const categoryInfo = autoCategorizeImport(description, amount, rules);

    const isDuplicate = checkIsDuplicate(
      { date, amount, description },
      existingTransactions
    );

    items.push({
      id: `ofx-${fitid || Date.now()}-${items.length}`,
      date,
      description,
      amount,
      type,
      jar: categoryInfo.jar,
      category: categoryInfo.category,
      account,
      costCenter: categoryInfo.costCenter || costCenter,
      fitId: fitid,
      isDuplicate,
      selected: !isDuplicate
    });
  }

  return items;
}

/**
 * Parses CSV file content (auto-detects delimiter: comma or semicolon)
 */
export function parseCSV(
  content: string,
  options: {
    account?: AccountType;
    costCenter?: CostCenter;
    existingTransactions?: Transaction[];
    rules?: AutoCategoryRule[];
  } = {}
): ParsedImportItem[] {
  const {
    account = 'Inter PF',
    costCenter = 'Magno',
    existingTransactions = [],
    rules = []
  } = options;

  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) return [];

  // Detect delimiter: check header line
  const headerLine = lines[0];
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const delimiter = semicolonCount >= commaCount ? ';' : ',';

  // Helper to split row respecting quotes
  const splitRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(s => s.replace(/^"|"$/g, '').trim());
  };

  const headers = splitRow(headerLine).map(h => h.toLowerCase());

  // Find column indices
  let dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date') || h.includes('dt'));
  let descIdx = headers.findIndex(h => h.includes('desc') || h.includes('historico') || h.includes('histórico') || h.includes('detalhe') || h.includes('memo') || h.includes('estabelecimento') || h.includes('identifica'));
  let amountIdx = headers.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('vlr') || h.includes('saldo') || h.includes('preco') || h.includes('preço'));
  let typeIdx = headers.findIndex(h => h.includes('tipo') || h.includes('type') || h.includes('operacao') || h.includes('operação'));
  let catIdx = headers.findIndex(h => h.includes('categoria') || h.includes('category') || h.includes('pote'));

  // Fallbacks if not recognized by names
  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = headers.length > 1 ? 1 : 0;
  if (amountIdx === -1) amountIdx = headers.length > 2 ? 2 : 1;

  const items: ParsedImportItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    if (cols.length < 2) continue;

    const rawDate = cols[dateIdx] || '';
    const rawDesc = cols[descIdx] || 'Lançamento CSV';
    const rawAmount = cols[amountIdx] || '0';
    const rawType = typeIdx >= 0 ? cols[typeIdx] : '';
    const rawCat = catIdx >= 0 ? cols[catIdx] : '';

    const date = normalizeDateString(rawDate);
    let amount = parseCurrencyString(rawAmount);

    // If type column specifies 'débito' / 'saída' / 'pagamento' and amount is positive, invert to negative
    if (rawType) {
      const typeLower = rawType.toLowerCase();
      if ((typeLower.includes('deb') || typeLower.includes('saida') || typeLower.includes('saída') || typeLower.includes('despesa')) && amount > 0) {
        amount = -amount;
      }
    }

    const type: 'receita' | 'despesa' | 'reembolso' = amount >= 0 ? 'receita' : 'despesa';

    const categoryInfo = autoCategorizeImport(rawDesc, amount, rules);
    const category = rawCat || categoryInfo.category;

    const isDuplicate = checkIsDuplicate(
      { date, amount, description: rawDesc },
      existingTransactions
    );

    items.push({
      id: `csv-${Date.now()}-${i}`,
      date,
      description: rawDesc,
      amount,
      type,
      jar: categoryInfo.jar,
      category,
      account,
      costCenter: categoryInfo.costCenter || costCenter,
      isDuplicate,
      selected: !isDuplicate
    });
  }

  return items;
}
