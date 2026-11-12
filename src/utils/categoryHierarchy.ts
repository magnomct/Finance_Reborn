import { Transaction, ParentCategoryItem, SubcategoryItem, ExpenseNature, AutoCategoryRule } from '../types';

export const HIERARCHY_STORAGE_KEY = 'yupee_category_hierarchy_v1';

/**
 * Standard 2-level Category Hierarchy for Yupee Reborn
 */
export const DEFAULT_CATEGORY_HIERARCHY: ParentCategoryItem[] = [
  {
    id: 'cat-moradia',
    name: 'Moradia',
    nature: 'fixed',
    colorHex: '#3B82F6', // Blue
    icon: 'Home',
    subcategories: [
      {
        id: 'sub-financiamento',
        name: 'Aluguel & Financiamento',
        parentId: 'cat-moradia',
        parentName: 'Moradia',
        nature: 'fixed',
        keywords: ['ALUGUEL', 'CAIXA', 'HABITACAO', 'PARCELA APTO', 'FINANCIAMENTO', 'PARCELA HABITACIONAL'],
        jarDefault: 'NEC_55',
      },
      {
        id: 'sub-condominio',
        name: 'Condomínio',
        parentId: 'cat-moradia',
        parentName: 'Moradia',
        nature: 'fixed',
        keywords: ['CONDOMINIO', 'CONDOMÍNIO', 'TAXA CONDOMINIAL'],
        jarDefault: 'NEC_55',
      },
      {
        id: 'sub-contas-casa',
        name: 'Contas de Consumo (Luz, Água, Net)',
        parentId: 'cat-moradia',
        parentName: 'Moradia',
        nature: 'fixed',
        keywords: ['ENEL', 'LIGHT', 'COPEL', 'CLARO', 'VIVO', 'NET', 'SABESP', 'INTERNET', 'AGUA', 'ÁGUA', 'ENERGIA'],
        jarDefault: 'NEC_55',
      },
    ],
  },
  {
    id: 'cat-alimentacao',
    name: 'Alimentação',
    nature: 'variable',
    colorHex: '#F97316', // Orange
    icon: 'Utensils',
    subcategories: [
      {
        id: 'sub-supermercado',
        name: 'Supermercado',
        parentId: 'cat-alimentacao',
        parentName: 'Alimentação',
        nature: 'variable',
        keywords: ['MERCADO', 'SUPERMERCADO', 'ASSAI', 'ASSAÍ', 'CARREFOUR', 'PAO DE ACUCAR', 'EXTRA', 'ATACADAO'],
        jarDefault: 'NEC_55',
      },
      {
        id: 'sub-delivery',
        name: 'Delivery & Lanches',
        parentId: 'cat-alimentacao',
        parentName: 'Alimentação',
        nature: 'variable',
        keywords: ['IFOOD', 'RAPPI', 'UBER EATS', 'BURGER KING', 'MC DONALD', 'MCDONALD', 'HABIB', 'LANCHE'],
        jarDefault: 'DIV_10',
      },
      {
        id: 'sub-restaurantes',
        name: 'Restaurantes & Bares',
        parentId: 'cat-alimentacao',
        parentName: 'Alimentação',
        nature: 'variable',
        keywords: ['RESTAURANTE', 'OUTBACK', 'PIZZARIA', 'CHOPP', 'BAR', 'ALMOCO', 'JANTAR'],
        jarDefault: 'DIV_10',
      },
    ],
  },
  {
    id: 'cat-transporte',
    name: 'Transporte',
    nature: 'variable',
    colorHex: '#0EA5E9', // Sky
    icon: 'Car',
    subcategories: [
      {
        id: 'sub-conducao',
        name: 'Condução & Transporte Público',
        parentId: 'cat-transporte',
        parentName: 'Transporte',
        nature: 'fixed',
        keywords: ['CONDUCAO', 'CONDUÇÃO', 'PASSE', 'BILHETE', 'METRO', 'METRÔ', 'SPTRANS', 'ONIBUS', 'ÔNIBUS'],
        jarDefault: 'NEC_55',
      },
      {
        id: 'sub-apps-transporte',
        name: 'Aplicativos & Táxi',
        parentId: 'cat-transporte',
        parentName: 'Transporte',
        nature: 'variable',
        keywords: ['UBER', '99APP', '99', 'TAXI', 'TÁXI', 'CORRIDA'],
        jarDefault: 'NEC_55',
      },
      {
        id: 'sub-combustivel',
        name: 'Combustível & Manutenção',
        parentId: 'cat-transporte',
        parentName: 'Transporte',
        nature: 'variable',
        keywords: ['POSTO', 'GASOLINA', 'ETANOL', 'SHELL', 'IPIRANGA', 'PETROBRAS', 'MECANICA'],
        jarDefault: 'NEC_55',
      },
    ],
  },
  {
    id: 'cat-lazer',
    name: 'Lazer & Estilo',
    nature: 'variable',
    colorHex: '#A855F7', // Purple
    icon: 'Smile',
    subcategories: [
      {
        id: 'sub-lazer-diversao',
        name: 'Lazer & Diversão',
        parentId: 'cat-lazer',
        parentName: 'Lazer & Estilo',
        nature: 'variable',
        keywords: ['CINEMA', 'INGRESSO', 'SHOW', 'TEATRO', 'PARQUE', 'ENTRETENIMENTO', 'BALADA'],
        jarDefault: 'DIV_10',
      },
      {
        id: 'sub-compras-roupas',
        name: 'Compras & Vestuário',
        parentId: 'cat-lazer',
        parentName: 'Lazer & Estilo',
        nature: 'variable',
        keywords: ['ZARA', 'RENNER', 'RIACHUELO', 'AMAZON', 'MERCADO LIVRE', 'SHOPPING', 'SHEIN'],
        jarDefault: 'DIV_10',
      },
      {
        id: 'sub-streaming',
        name: 'Streaming & Assinaturas',
        parentId: 'cat-lazer',
        parentName: 'Lazer & Estilo',
        nature: 'fixed',
        keywords: ['NETFLIX', 'SPOTIFY', 'DISNEY', 'HBO', 'MAX', 'PRIME', 'YOUTUBE PREMIUM'],
        jarDefault: 'DIV_10',
      },
    ],
  },
  {
    id: 'cat-saude',
    name: 'Saúde & Cuidados',
    nature: 'variable',
    colorHex: '#10B981', // Emerald
    icon: 'HeartPulse',
    subcategories: [
      {
        id: 'sub-farmacia',
        name: 'Farmácia & Cuidados',
        parentId: 'cat-saude',
        parentName: 'Saúde & Cuidados',
        nature: 'variable',
        keywords: ['DROGASIL', 'RAIA', 'DROGARIA', 'FARMACIA', 'FARMÁCIA', 'PANVEL', 'REMEDIO'],
        jarDefault: 'NEC_55',
      },
      {
        id: 'sub-consultas',
        name: 'Consultas & Terapias',
        parentId: 'cat-saude',
        parentName: 'Saúde & Cuidados',
        nature: 'variable',
        keywords: ['CLINICA', 'CONSULTA', 'MEDICO', 'MÉDICO', 'DENTISTA', 'TERAPIA', 'PSICOLOGO'],
        jarDefault: 'NEC_55',
      },
      {
        id: 'sub-academia',
        name: 'Academia & Atividades',
        parentId: 'cat-saude',
        parentName: 'Saúde & Cuidados',
        nature: 'fixed',
        keywords: ['SMART FIT', 'ACADEMIA', 'GYMPASS', 'TOTALPASS', 'CROSSFIT'],
        jarDefault: 'DIV_10',
      },
    ],
  },
  {
    id: 'cat-bancos',
    name: 'Bancos & Encargos',
    nature: 'fixed',
    colorHex: '#64748B', // Slate
    icon: 'CreditCard',
    subcategories: [
      {
        id: 'sub-tarifas-juros',
        name: 'Juros & Tarifas',
        parentId: 'cat-bancos',
        parentName: 'Bancos & Encargos',
        nature: 'fixed',
        keywords: ['TARIFA', 'JUROS', 'CHEQUE ESPECIAL', 'IOF', 'ANUIDADE', 'MULTA'],
        jarDefault: 'NEC_55',
      },
      {
        id: 'sub-tributos',
        name: 'Tributos & DAS',
        parentId: 'cat-bancos',
        parentName: 'Bancos & Encargos',
        nature: 'fixed',
        keywords: ['DAS', 'SIMPLES', 'RECEITA', 'IMPOSTO', 'TRIBUTOS', 'DARF'],
        jarDefault: 'PJ_EXCLUIDO',
      },
    ],
  },
  {
    id: 'cat-receitas',
    name: 'Receitas & Entradas',
    nature: 'income',
    type: 'income',
    colorHex: '#10B981', // Emerald
    color: '#10B981',
    icon: 'TrendingUp',
    subcategories: [
      {
        id: 'sub-salario',
        name: 'Salário CLT & Pró-Labore',
        parentId: 'cat-receitas',
        parentName: 'Receitas & Entradas',
        nature: 'income',
        type: 'income',
        keywords: ['SALARIO', 'SALÁRIO', 'FOLHA', 'PRO-LABORE', 'PRÓ-LABORE', 'PAGAMENTO'],
        jarDefault: 'NEC_55',
      },
      {
        id: 'sub-pj-faturamento',
        name: 'Faturamento PJ & Contratos',
        parentId: 'cat-receitas',
        parentName: 'Receitas & Entradas',
        nature: 'income',
        type: 'income',
        keywords: ['FATURAMENTO', 'NOTA FISCAL', 'CLIENTE', 'CONTRATO', 'HONORARIOS'],
        jarDefault: 'PJ_EXCLUIDO',
      },
      {
        id: 'sub-investimentos-renda',
        name: 'Rendimentos & Dividendos',
        parentId: 'cat-receitas',
        parentName: 'Receitas & Entradas',
        nature: 'income',
        type: 'income',
        keywords: ['DIVIDENDOS', 'RENDIMENTO', 'CDB', 'TESOURO', 'FII', 'JUROS'],
        jarDefault: 'LIF_10',
      },
      {
        id: 'sub-outras-receitas',
        name: 'Reembolsos & Outros',
        parentId: 'cat-receitas',
        parentName: 'Receitas & Entradas',
        nature: 'income',
        type: 'income',
        keywords: ['REEMBOLSO', 'ESTORNO', 'RESTITUICAO', 'RESTITUIÇÃO', 'VENDA'],
        jarDefault: 'NEC_55',
      },
    ],
  },
];

export const APP_CATEGORIAS_STORAGE_KEY = '@app_financas:categorias';

/**
 * Normalizes hierarchy items to guarantee both `nature`/`type` and `colorHex`/`color` exist
 */
export function normalizeHierarchyItems(items: ParentCategoryItem[]): ParentCategoryItem[] {
  return items.map(p => ({
    ...p,
    nature: p.nature || p.type || 'variable',
    type: p.type || p.nature || 'variable',
    colorHex: p.colorHex || p.color || '#3B82F6',
    color: p.color || p.colorHex || '#3B82F6',
    subcategories: (p.subcategories || []).map(s => ({
      ...s,
      nature: s.nature || s.type || p.nature || 'variable',
      type: s.type || s.nature || p.nature || 'variable',
      color: s.color || p.colorHex || p.color,
    }))
  }));
}

/**
 * Load hierarchy from localStorage (@app_financas:categorias or fallback key) or return defaults
 */
export function loadCategoryHierarchy(): ParentCategoryItem[] {
  try {
    const rawApp = typeof localStorage !== 'undefined' ? localStorage.getItem(APP_CATEGORIAS_STORAGE_KEY) : null;
    const rawLegacy = typeof localStorage !== 'undefined' ? localStorage.getItem(HIERARCHY_STORAGE_KEY) : null;
    const raw = rawApp || rawLegacy;

    if (!raw) return normalizeHierarchyItems(DEFAULT_CATEGORY_HIERARCHY);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return normalizeHierarchyItems(parsed);
    }
    return normalizeHierarchyItems(DEFAULT_CATEGORY_HIERARCHY);
  } catch {
    return normalizeHierarchyItems(DEFAULT_CATEGORY_HIERARCHY);
  }
}

/**
 * Save hierarchy to localStorage simultaneously under both keys for maximum compatibility
 */
export function saveCategoryHierarchy(hierarchy: ParentCategoryItem[]): void {
  try {
    const normalized = normalizeHierarchyItems(hierarchy);
    const serialized = JSON.stringify(normalized);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(APP_CATEGORIAS_STORAGE_KEY, serialized);
      localStorage.setItem(HIERARCHY_STORAGE_KEY, serialized);
    }
  } catch (e) {
    console.error('Error saving category hierarchy:', e);
  }
}

/**
 * Reset category hierarchy to default app categories
 */
export function resetCategoryHierarchyToDefaults(): ParentCategoryItem[] {
  const defaults = normalizeHierarchyItems(DEFAULT_CATEGORY_HIERARCHY);
  saveCategoryHierarchy(defaults);
  return defaults;
}

/**
 * Validates if a parent category name is duplicate (case-insensitive)
 */
export function isParentCategoryNameDuplicate(
  name: string,
  hierarchy: ParentCategoryItem[],
  excludeId?: string
): boolean {
  const norm = normalizeCategoryText(name);
  return hierarchy.some(p => p.id !== excludeId && normalizeCategoryText(p.name) === norm);
}

/**
 * Validates if a subcategory name is duplicate within a parent or overall
 */
export function isSubcategoryNameDuplicate(
  name: string,
  parentId: string,
  hierarchy: ParentCategoryItem[],
  excludeId?: string
): boolean {
  const norm = normalizeCategoryText(name);
  const parent = hierarchy.find(p => p.id === parentId);
  if (!parent) return false;
  return parent.subcategories.some(s => s.id !== excludeId && normalizeCategoryText(s.name) === norm);
}

/**
 * Counts how many transactions currently reference a parent category or subcategory
 */
export function countTransactionsUsingCategory(
  transactions: Transaction[],
  categoryName: string,
  isParent: boolean
): number {
  const norm = normalizeCategoryText(categoryName);
  return transactions.filter(t => {
    const parsed = parseHierarchicalCategory(t.category || t.description);
    if (isParent) {
      return (
        normalizeCategoryText(t.parentCategory || '') === norm ||
        normalizeCategoryText(parsed.parent) === norm ||
        normalizeCategoryText(t.category || '').startsWith(`${norm} >`) ||
        normalizeCategoryText(t.category || '') === norm
      );
    } else {
      return (
        normalizeCategoryText(t.subcategory || '') === norm ||
        normalizeCategoryText(parsed.sub) === norm ||
        normalizeCategoryText(t.category || '').endsWith(`> ${norm}`) ||
        normalizeCategoryText(t.category || '') === norm
      );
    }
  }).length;
}

/**
 * Safely deletes a parent category or subcategory.
 * Reassigns any affected transactions to fallback ("Outros > Diversos") so reports and charts don't break.
 */
export function applySafeDeleteCategory(
  transactions: Transaction[],
  hierarchy: ParentCategoryItem[],
  targetId: string,
  isParent: boolean,
  fallbackFormatted: string = 'Outros > Diversos'
): { updatedTransactions: Transaction[]; updatedHierarchy: ParentCategoryItem[]; affectedCount: number; deletedName: string } {
  let deletedName = '';
  let updatedHierarchy: ParentCategoryItem[] = [];

  if (isParent) {
    const parentToDelete = hierarchy.find(p => p.id === targetId);
    if (parentToDelete) {
      deletedName = parentToDelete.name;
    }
    updatedHierarchy = hierarchy.filter(p => p.id !== targetId);
  } else {
    updatedHierarchy = hierarchy.map(p => {
      const subToDelete = p.subcategories.find(s => s.id === targetId);
      if (subToDelete) {
        deletedName = subToDelete.name;
      }
      return {
        ...p,
        subcategories: p.subcategories.filter(s => s.id !== targetId)
      };
    });
  }

  if (!deletedName) {
    return { updatedTransactions: transactions, updatedHierarchy: hierarchy, affectedCount: 0, deletedName: '' };
  }

  const normDeleted = normalizeCategoryText(deletedName);
  const parsedFallback = parseHierarchicalCategory(fallbackFormatted, hierarchy);
  let affectedCount = 0;

  const updatedTransactions = transactions.map(t => {
    const parsed = parseHierarchicalCategory(t.category || t.description, hierarchy);
    const matchesParent = isParent && (
      normalizeCategoryText(t.parentCategory || '') === normDeleted ||
      normalizeCategoryText(parsed.parent) === normDeleted ||
      normalizeCategoryText(t.category || '').startsWith(`${normDeleted} >`) ||
      normalizeCategoryText(t.category || '') === normDeleted
    );
    const matchesSub = !isParent && (
      normalizeCategoryText(t.subcategory || '') === normDeleted ||
      normalizeCategoryText(parsed.sub) === normDeleted ||
      normalizeCategoryText(t.category || '').endsWith(`> ${normDeleted}`) ||
      normalizeCategoryText(t.category || '') === normDeleted
    );

    if (matchesParent || matchesSub) {
      affectedCount++;
      return {
        ...t,
        category: parsedFallback.formatted,
        parentCategory: parsedFallback.parent,
        subcategory: parsedFallback.sub,
        nature: parsedFallback.nature,
      };
    }

    return t;
  });

  return { updatedTransactions, updatedHierarchy, affectedCount, deletedName };
}

/**
 * Normalizes text for matching
 */
export function normalizeCategoryText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Parse any category string into hierarchical { parent, sub, formatted }
 * Handles formats like:
 * - "Alimentação > Delivery"
 * - "Alimentação / Delivery"
 * - "Delivery" (finds matching parent in hierarchy)
 */
export function parseHierarchicalCategory(
  catStr: string,
  hierarchy: ParentCategoryItem[] = DEFAULT_CATEGORY_HIERARCHY
): { parent: string; sub: string; parentCategory: string; subcategory: string; formatted: string; nature: ExpenseNature } {
  if (!catStr || typeof catStr !== 'string') {
    return { 
      parent: 'Outros', 
      sub: 'Diversos', 
      parentCategory: 'Outros', 
      subcategory: 'Diversos', 
      formatted: 'Outros > Diversos', 
      nature: 'variable' 
    };
  }

  const clean = catStr.trim();

  // If already composite with ">"
  if (clean.includes('>')) {
    const parts = clean.split('>').map(p => p.trim());
    const parent = parts[0] || 'Outros';
    const sub = parts[1] || parts[0];
    const nature = resolveNatureForHierarchy(parent, sub, hierarchy);
    return { parent, sub, parentCategory: parent, subcategory: sub, formatted: `${parent} > ${sub}`, nature };
  }

  // If composite with "/"
  if (clean.includes('/') && !clean.includes('2026')) {
    const parts = clean.split('/').map(p => p.trim());
    if (parts.length === 2 && parts[0].length > 3 && parts[1].length > 3) {
      const parent = parts[0];
      const sub = parts[1];
      const nature = resolveNatureForHierarchy(parent, sub, hierarchy);
      return { parent, sub, parentCategory: parent, subcategory: sub, formatted: `${parent} > ${sub}`, nature };
    }
  }

  // Look up in hierarchy
  const normClean = normalizeCategoryText(clean);

  for (const p of hierarchy) {
    // Check if clean matches parent name
    if (normalizeCategoryText(p.name) === normClean) {
      const firstSub = p.subcategories[0]?.name || p.name;
      return { parent: p.name, sub: firstSub, parentCategory: p.name, subcategory: firstSub, formatted: `${p.name} > ${firstSub}`, nature: p.nature };
    }

    // Check if clean matches any subcategory name
    for (const s of p.subcategories) {
      if (normalizeCategoryText(s.name) === normClean) {
        return { parent: p.name, sub: s.name, parentCategory: p.name, subcategory: s.name, formatted: `${p.name} > ${s.name}`, nature: s.nature };
      }
    }
  }

  // Keyword-based fallback check
  for (const p of hierarchy) {
    for (const s of p.subcategories) {
      const matchesKeyword = s.keywords.some(kw => normClean.includes(normalizeCategoryText(kw)));
      if (matchesKeyword) {
        return { parent: p.name, sub: s.name, parentCategory: p.name, subcategory: s.name, formatted: `${p.name} > ${s.name}`, nature: s.nature };
      }
    }
  }

  // Default fallback
  const isLikelyFixed = ['aluguel', 'condominio', 'condomínio', 'financiamento', 'habitacao', 'luz', 'internet', 'seguro', 'tarifa', 'das'].some(k => normClean.includes(k));
  const parent = isLikelyFixed ? 'Despesas Fixas' : 'Outros Variáveis';
  return {
    parent,
    sub: clean,
    parentCategory: parent,
    subcategory: clean,
    formatted: `${parent} > ${clean}`,
    nature: isLikelyFixed ? 'fixed' : 'variable'
  };
}

/**
 * Resolves nature ('fixed' or 'variable') based on parent/sub hierarchy
 */
export function resolveNatureForHierarchy(
  parentName: string,
  subName: string,
  hierarchy: ParentCategoryItem[] = DEFAULT_CATEGORY_HIERARCHY
): ExpenseNature {
  const normParent = normalizeCategoryText(parentName);
  const normSub = normalizeCategoryText(subName);

  for (const p of hierarchy) {
    if (normalizeCategoryText(p.name) === normParent) {
      for (const s of p.subcategories) {
        if (normalizeCategoryText(s.name) === normSub) {
          return s.nature;
        }
      }
      return p.nature;
    }
  }

  return 'variable';
}

/**
 * Cascade rename operation:
 * Updates all transactions whose category matches oldName or the hierarchical string.
 */
export function applyCascadeRename(
  transactions: Transaction[],
  oldName: string,
  newFormattedName: string,
  isParent: boolean = false
): { updatedTransactions: Transaction[]; affectedCount: number } {
  const normOld = normalizeCategoryText(oldName);
  let affectedCount = 0;

  const targetParentName = isParent 
    ? (newFormattedName.includes('>') ? newFormattedName.split('>')[0].trim() : newFormattedName.trim()) 
    : '';
  const targetSubName = !isParent 
    ? (newFormattedName.includes('>') ? newFormattedName.split('>')[1].trim() : newFormattedName.trim()) 
    : '';

  const updatedTransactions = transactions.map(t => {
    const currentCat = t.category || '';
    const normCurrent = normalizeCategoryText(currentCat);
    const parsedCurrent = parseHierarchicalCategory(currentCat);

    const txParent = t.parentCategory || parsedCurrent.parent;
    const txSub = t.subcategory || parsedCurrent.sub;

    const matchesDirect = normCurrent === normOld;
    const matchesParent = isParent && (
      normalizeCategoryText(txParent) === normOld ||
      normCurrent === normOld ||
      normCurrent.startsWith(`${normOld} >`) ||
      normCurrent.startsWith(`${normOld}/`)
    );
    const matchesSub = !isParent && (
      normalizeCategoryText(txSub) === normOld ||
      normCurrent.endsWith(`> ${normOld}`) ||
      normCurrent === normOld
    );

    if (matchesDirect || matchesParent || matchesSub) {
      affectedCount++;
      const updatedParent = isParent ? targetParentName : txParent;
      const updatedSub = isParent ? txSub : targetSubName;
      const updatedFormatted = `${updatedParent} > ${updatedSub}`;

      return {
        ...t,
        category: updatedFormatted,
        parentCategory: updatedParent,
        subcategory: updatedSub,
      };
    }

    return t;
  });

  return { updatedTransactions, affectedCount };
}

/**
 * Cascade merge operation:
 * Merges multiple source category names into targetFormattedName across all transactions.
 */
export function applyCascadeMerge(
  transactions: Transaction[],
  sourceNames: string | string[],
  targetFormattedName: string
): { updatedTransactions: Transaction[]; affectedCount: number } {
  const sources = Array.isArray(sourceNames) ? sourceNames : [sourceNames];
  const normSources = sources.map(s => normalizeCategoryText(s));
  const parsedTarget = parseHierarchicalCategory(targetFormattedName);
  let affectedCount = 0;

  const updatedTransactions = transactions.map(t => {
    const currentCat = t.category || '';
    const normCurrent = normalizeCategoryText(currentCat);
    const parsedCurrent = parseHierarchicalCategory(currentCat);

    const matches = normSources.some(ns => 
      normCurrent === ns || 
      normalizeCategoryText(parsedCurrent.sub) === ns ||
      normalizeCategoryText(parsedCurrent.parent) === ns ||
      (t.subcategory && normalizeCategoryText(t.subcategory) === ns) ||
      (t.parentCategory && normalizeCategoryText(t.parentCategory) === ns) ||
      currentCat.includes(ns)
    );

    if (matches) {
      affectedCount++;
      return {
        ...t,
        category: parsedTarget.formatted,
        parentCategory: parsedTarget.parent,
        subcategory: parsedTarget.sub,
        nature: parsedTarget.nature,
      };
    }

    return t;
  });

  return { updatedTransactions, affectedCount };
}

/**
 * Move a subcategory to a new Parent Category and cascade update transactions
 */
export function applyCascadeMoveSubcategory(
  transactions: Transaction[],
  subcategoryName: string,
  arg3: string | ParentCategoryItem[],
  arg4?: string | ParentCategoryItem[] | any,
  arg5?: any
): { updatedTransactions: Transaction[]; updatedHierarchy: ParentCategoryItem[]; affectedCount: number } {
  let newParentName: string;
  let hierarchy: ParentCategoryItem[];

  if (typeof arg4 === 'string') {
    // Called as: (transactions, subcategoryName, oldParentName, newParentName, hierarchy?)
    newParentName = arg4;
    hierarchy = Array.isArray(arg5) ? arg5 : DEFAULT_CATEGORY_HIERARCHY;
  } else {
    // Called as: (transactions, subcategoryName, newParentName, hierarchy?)
    newParentName = typeof arg3 === 'string' ? arg3 : '';
    hierarchy = Array.isArray(arg4) ? arg4 : DEFAULT_CATEGORY_HIERARCHY;
  }

  const normSub = normalizeCategoryText(subcategoryName);
  const normParent = normalizeCategoryText(newParentName);
  let affectedCount = 0;

  // Find subcategory item
  let movedItem: SubcategoryItem | null = null;

  const updatedHierarchy = hierarchy.map(p => {
    const isTarget = normalizeCategoryText(p.name) === normParent;
    const remainingSubs = p.subcategories.filter(s => {
      if (normalizeCategoryText(s.name) === normSub) {
        movedItem = { ...s, parentId: '', parentName: newParentName };
        return false;
      }
      return true;
    });

    return {
      ...p,
      subcategories: isTarget && movedItem 
        ? [...remainingSubs, { ...movedItem, parentId: p.id, parentName: p.name }] 
        : remainingSubs
    };
  });

  // If movedItem wasn't placed yet (target parent found after removal)
  const finalHierarchy = updatedHierarchy.map(p => {
    if (normalizeCategoryText(p.name) === normParent && movedItem) {
      const alreadyHas = p.subcategories.some(s => normalizeCategoryText(s.name) === normSub);
      if (!alreadyHas) {
        return {
          ...p,
          subcategories: [...p.subcategories, { ...movedItem, parentId: p.id, parentName: p.name }]
        };
      }
    }
    return p;
  });

  const newFormatted = `${newParentName} > ${subcategoryName}`;

  const updatedTransactions = transactions.map(t => {
    const currentCat = t.category || '';
    const normCurrent = normalizeCategoryText(currentCat);
    const parsed = parseHierarchicalCategory(currentCat, hierarchy);

    if (normCurrent === normSub || normalizeCategoryText(parsed.sub) === normSub || (t.subcategory && normalizeCategoryText(t.subcategory) === normSub)) {
      affectedCount++;
      return {
        ...t,
        category: newFormatted,
        parentCategory: newParentName,
        subcategory: subcategoryName,
      };
    }
    return t;
  });

  return { updatedTransactions, updatedHierarchy: finalHierarchy, affectedCount };
}

/**
 * Batch group loose or selected categories into a Parent Category
 */
export function applyGroupInParentCategory(
  transactions: Transaction[],
  selectedCategoryNames: string[],
  parentName: string,
  arg4?: any,
  arg5?: any
): { updatedTransactions: Transaction[]; updatedHierarchy: ParentCategoryItem[]; affectedCount: number } {
  const hierarchy: ParentCategoryItem[] = Array.isArray(arg4) 
    ? arg4 
    : (Array.isArray(arg5) ? arg5 : DEFAULT_CATEGORY_HIERARCHY);

  const normParent = normalizeCategoryText(parentName);
  let affectedCount = 0;

  let targetParent = hierarchy.find(p => normalizeCategoryText(p.name) === normParent);
  let nextHierarchy = [...hierarchy];

  if (!targetParent) {
    targetParent = {
      id: `cat-${Date.now()}`,
      name: parentName,
      nature: 'variable',
      subcategories: [],
      colorHex: '#6366F1',
      icon: 'Layers',
    };
    nextHierarchy.push(targetParent);
  }

  // Create subcategories for each selected name if not existing
  const targetParentId = targetParent.id;
  const newSubs: SubcategoryItem[] = [];

  selectedCategoryNames.forEach(name => {
    const cleanName = name.replace(/.*>/, '').trim();
    const existing = targetParent!.subcategories.find(s => normalizeCategoryText(s.name) === normalizeCategoryText(cleanName));
    if (!existing) {
      newSubs.push({
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        parentId: targetParentId,
        parentName: targetParent!.name,
        nature: targetParent!.nature,
        keywords: [cleanName.toUpperCase()],
      });
    }
  });

  const finalHierarchy = nextHierarchy.map(p => {
    if (p.id === targetParentId) {
      return {
        ...p,
        subcategories: [...p.subcategories, ...newSubs]
      };
    }
    return p;
  });

  // Cascade to transactions
  const updatedTransactions = transactions.map(t => {
    const currentCat = t.category || '';
    const normCurrent = normalizeCategoryText(currentCat);
    const parsed = parseHierarchicalCategory(currentCat, hierarchy);

    const matches = selectedCategoryNames.some(sn => {
      const cleanSn = normalizeCategoryText(sn.replace(/.*>/, '').trim());
      return normCurrent === cleanSn || normalizeCategoryText(parsed.sub) === cleanSn;
    });

    if (matches) {
      affectedCount++;
      const subName = parsed.sub || currentCat;
      const formatted = `${parentName} > ${subName}`;
      return {
        ...t,
        category: formatted,
        parentCategory: parentName,
        subcategory: subName,
      };
    }

    return t;
  });

  return { updatedTransactions, updatedHierarchy: finalHierarchy, affectedCount };
}

/**
 * Matches a transaction description with subcategory keywords
 */
export function matchTransactionWithHierarchy(
  description: string,
  hierarchy: ParentCategoryItem[] = DEFAULT_CATEGORY_HIERARCHY
): { parent: ParentCategoryItem; sub: SubcategoryItem; parentCategory: ParentCategoryItem; subcategory: SubcategoryItem; formatted: string } | null {
  if (!description) return null;
  const normDesc = normalizeCategoryText(description);

  for (const parent of hierarchy) {
    for (const sub of parent.subcategories) {
      for (const kw of sub.keywords) {
        const normKw = normalizeCategoryText(kw);
        if (normKw && normDesc.includes(normKw)) {
          return {
            parent,
            sub,
            parentCategory: parent,
            subcategory: sub,
            formatted: `${parent.name} > ${sub.name}`,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Calculates aggregated spending and counts for each Parent Category & Subcategory
 */
export function calculateHierarchyStats(
  transactions: Transaction[],
  hierarchy: ParentCategoryItem[] = DEFAULT_CATEGORY_HIERARCHY
): Record<string, { totalSpent: number; count: number; total?: number; subStats: Record<string, { totalSpent: number; count: number }> }> & { totalSpent: number; byParent: Record<string, { total: number; count: number }> } {
  const stats: any = {
    totalSpent: 0,
    byParent: {},
  };

  hierarchy.forEach(p => {
    const parentStat = { 
      totalSpent: 0, 
      total: 0,
      count: 0, 
      subStats: {} as Record<string, { totalSpent: number; count: number }> 
    };
    stats[p.id] = parentStat;
    stats[p.name] = parentStat;
    stats.byParent[p.name] = parentStat;
    p.subcategories.forEach(s => {
      const subStat = { totalSpent: 0, count: 0 };
      parentStat.subStats[s.id] = subStat;
      parentStat.subStats[s.name] = subStat;
    });
  });

  transactions.forEach(t => {
    if (t.type !== 'despesa') return;
    const amount = Math.abs(t.amount);
    stats.totalSpent += amount;

    const parsed = parseHierarchicalCategory(t.category || t.description, hierarchy);

    const parentItem = hierarchy.find(p => normalizeCategoryText(p.name) === normalizeCategoryText(parsed.parent));
    if (parentItem) {
      const parentStat = stats[parentItem.id];
      if (parentStat) {
        parentStat.totalSpent += amount;
        parentStat.total += amount;
        parentStat.count += 1;

        const subItem = parentItem.subcategories.find(s => normalizeCategoryText(s.name) === normalizeCategoryText(parsed.sub));
        if (subItem && parentStat.subStats[subItem.id]) {
          parentStat.subStats[subItem.id].totalSpent += amount;
          parentStat.subStats[subItem.id].count += 1;
        }
      }
    }
  });

  return stats;
}
