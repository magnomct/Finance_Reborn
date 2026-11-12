import React, { useState, useMemo } from 'react';
import { 
  FolderTree, ChevronDown, ChevronRight, Plus, Edit2, Check, X, 
  Trash2, ArrowRight, Tag, Layers, RefreshCw, AlertCircle, 
  CheckCircle2, Sparkles, MoveRight, Merge, Hash, Search, Filter,
  Shield, ToggleLeft, ToggleRight
} from 'lucide-react';
import { 
  Transaction, 
  ParentCategoryItem, 
  SubcategoryItem, 
  ExpenseNature, 
  AutoCategoryRule 
} from '../types';
import { 
  DEFAULT_CATEGORY_HIERARCHY, 
  saveCategoryHierarchy, 
  calculateHierarchyStats,
  applyCascadeRename,
  applyCascadeMerge,
  applyCascadeMoveSubcategory,
  applyGroupInParentCategory,
  parseHierarchicalCategory,
  normalizeCategoryText
} from '../utils/categoryHierarchy';
import { formatBRL } from '../utils/finance';

export interface CategoryHierarchyManagerProps {
  hierarchy?: ParentCategoryItem[];
  setHierarchy?: React.Dispatch<React.SetStateAction<ParentCategoryItem[]>>;
  transactions?: Transaction[];
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  autoRules?: AutoCategoryRule[];
  setAutoRules?: React.Dispatch<React.SetStateAction<AutoCategoryRule[]>>;
  className?: string;
}

export const CategoryHierarchyManager: React.FC<CategoryHierarchyManagerProps> = ({
  hierarchy = [],
  setHierarchy,
  transactions = [],
  setTransactions,
  autoRules = [],
  setAutoRules,
  className = ''
}) => {
  const commitHierarchy = (newH: ParentCategoryItem[]) => {
    if (setHierarchy) setHierarchy(newH);
    saveCategoryHierarchy(newH);
  };

  const commitTransactions = (newT: Transaction[]) => {
    if (setTransactions) setTransactions(newT);
  };

  // Expanded parent accordions state (all expanded by default)
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    hierarchy.forEach(p => { init[p.id] = true; });
    return init;
  });

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [natureFilter, setNatureFilter] = useState<'all' | 'fixed' | 'variable' | 'income'>('all');

  // Inline editing states for Parent Categories
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editingParentName, setEditingParentName] = useState('');

  // Inline editing states for Subcategories
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState('');

  // New Parent Category form
  const [isAddingParent, setIsAddingParent] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [newParentNature, setNewParentNature] = useState<ExpenseNature>('variable');

  // New Subcategory form per Parent
  const [addingSubParentId, setAddingSubParentId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubKeywords, setNewSubKeywords] = useState('');
  const [newSubNature, setNewSubNature] = useState<ExpenseNature>('variable');

  // Adding keyword inline
  const [addingKeywordSubId, setAddingKeywordSubId] = useState<string | null>(null);
  const [newKeywordInput, setNewKeywordInput] = useState('');

  // Move Subcategory state
  const [movingSub, setMovingSub] = useState<SubcategoryItem | null>(null);
  const [targetParentForMove, setTargetParentForMove] = useState<string>('');

  // Merge Subcategories state
  const [mergingSub, setMergingSub] = useState<SubcategoryItem | null>(null);
  const [targetSubForMerge, setTargetSubForMerge] = useState<string>('');

  // Batch selection
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [isBatchGroupModalOpen, setIsBatchGroupModalOpen] = useState(false);
  const [batchTargetParentName, setBatchTargetParentName] = useState('');
  const [isCreatingNewParentForBatch, setIsCreatingNewParentForBatch] = useState(false);

  // Cascade notification banner
  const [cascadeNotice, setCascadeNotice] = useState<string | null>(null);

  // Statistics calculation for all hierarchy elements
  const hierarchyStats = useMemo(() => {
    return calculateHierarchyStats(transactions, hierarchy);
  }, [transactions, hierarchy]);

  // Loose categories in transactions that don't belong cleanly to the current hierarchy
  const looseCategories = useMemo(() => {
    const knownSubNames = new Set<string>();
    hierarchy.forEach(p => {
      knownSubNames.add(normalizeCategoryText(p.name));
      p.subcategories.forEach(s => {
        knownSubNames.add(normalizeCategoryText(s.name));
        knownSubNames.add(normalizeCategoryText(`${p.name} > ${s.name}`));
      });
    });

    const looseCounts: Record<string, { count: number; totalSpent: number }> = {};
    transactions.forEach(t => {
      if (t.type !== 'despesa') return;
      const cat = t.category || t.description;
      if (!cat) return;
      const norm = normalizeCategoryText(cat);
      if (!knownSubNames.has(norm)) {
        if (!looseCounts[cat]) {
          looseCounts[cat] = { count: 0, totalSpent: 0 };
        }
        looseCounts[cat].count += 1;
        looseCounts[cat].totalSpent += Math.abs(t.amount);
      }
    });

    return Object.entries(looseCounts).map(([name, data]) => ({
      name,
      count: data.count,
      totalSpent: data.totalSpent,
    }));
  }, [transactions, hierarchy]);

  const showNotification = (msg: string) => {
    setCascadeNotice(msg);
    setTimeout(() => setCascadeNotice(null), 5000);
  };

  const toggleParentExpand = (parentId: string) => {
    setExpandedParents(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  // 1. Rename Parent Category (Cascade to transactions)
  const handleSaveParentRename = (parent: ParentCategoryItem) => {
    const trimmed = editingParentName.trim();
    if (!trimmed || trimmed === parent.name) {
      setEditingParentId(null);
      return;
    }

    const { updatedTransactions, affectedCount } = applyCascadeRename(
      transactions,
      parent.name,
      trimmed,
      true
    );

    const updatedHierarchy = hierarchy.map(p => {
      if (p.id === parent.id) {
        return {
          ...p,
          name: trimmed,
          subcategories: p.subcategories.map(s => ({ ...s, parentName: trimmed }))
        };
      }
      return p;
    });

    commitHierarchy(updatedHierarchy);
    commitTransactions(updatedTransactions);
    setEditingParentId(null);

    showNotification(`Categoria Pai renomeada para "${trimmed}"! ${affectedCount} transação(ões) histórica(s) atualizada(s).`);
  };

  // 2. Toggle Nature (Fixed / Variable) of Parent Category
  const handleToggleParentNature = (parent: ParentCategoryItem) => {
    const nextNature: ExpenseNature = parent.nature === 'fixed' ? 'variable' : 'fixed';

    const updatedHierarchy = hierarchy.map(p => {
      if (p.id === parent.id) {
        return {
          ...p,
          nature: nextNature,
          subcategories: p.subcategories.map(s => ({ ...s, nature: nextNature }))
        };
      }
      return p;
    });

    // Update transactions nature
    const normParent = normalizeCategoryText(parent.name);
    const updatedTransactions = transactions.map(t => {
      const parsed = parseHierarchicalCategory(t.category || t.description, hierarchy);
      if (normalizeCategoryText(parsed.parent) === normParent) {
        return { ...t, nature: nextNature };
      }
      return t;
    });

    commitHierarchy(updatedHierarchy);
    commitTransactions(updatedTransactions);

    showNotification(`Categoria "${parent.name}" alterada para ${nextNature === 'fixed' ? 'Gasto Fixo' : 'Gasto Variável'}.`);
  };

  // 3. Rename Subcategory (Cascade to transactions)
  const handleSaveSubRename = (sub: SubcategoryItem) => {
    const trimmed = editingSubName.trim();
    if (!trimmed || trimmed === sub.name) {
      setEditingSubId(null);
      return;
    }

    const newFormatted = `${sub.parentName} > ${trimmed}`;
    const { updatedTransactions, affectedCount } = applyCascadeRename(
      transactions,
      sub.name,
      newFormatted,
      false
    );

    const updatedHierarchy = hierarchy.map(p => {
      if (p.id === sub.parentId) {
        return {
          ...p,
          subcategories: p.subcategories.map(s => s.id === sub.id ? { ...s, name: trimmed } : s)
        };
      }
      return p;
    });

    commitHierarchy(updatedHierarchy);
    commitTransactions(updatedTransactions);
    setEditingSubId(null);

    showNotification(`Subcategoria renomeada para "${trimmed}"! ${affectedCount} transação(ões) histórica(s) sincronizada(s).`);
  };

  // 4. Toggle Nature of Subcategory
  const handleToggleSubNature = (sub: SubcategoryItem) => {
    const nextNature: ExpenseNature = sub.nature === 'fixed' ? 'variable' : 'fixed';

    const updatedHierarchy = hierarchy.map(p => {
      if (p.id === sub.parentId) {
        return {
          ...p,
          subcategories: p.subcategories.map(s => s.id === sub.id ? { ...s, nature: nextNature } : s)
        };
      }
      return p;
    });

    const normSub = normalizeCategoryText(sub.name);
    const updatedTransactions = transactions.map(t => {
      const parsed = parseHierarchicalCategory(t.category || t.description, hierarchy);
      if (normalizeCategoryText(parsed.sub) === normSub) {
        return { ...t, nature: nextNature };
      }
      return t;
    });

    commitHierarchy(updatedHierarchy);
    commitTransactions(updatedTransactions);

    showNotification(`Subcategoria "${sub.name}" classificada como ${nextNature === 'fixed' ? 'Fixo' : 'Variável'}.`);
  };

  // 5. Add Keyword Rule to Subcategory
  const handleAddKeywordToSub = (sub: SubcategoryItem) => {
    const cleanKw = newKeywordInput.trim().toUpperCase();
    if (!cleanKw || sub.keywords.includes(cleanKw)) {
      setAddingKeywordSubId(null);
      setNewKeywordInput('');
      return;
    }

    const updatedHierarchy = hierarchy.map(p => {
      if (p.id === sub.parentId) {
        return {
          ...p,
          subcategories: p.subcategories.map(s => {
            if (s.id === sub.id) {
              return { ...s, keywords: [...s.keywords, cleanKw] };
            }
            return s;
          })
        };
      }
      return p;
    });

    // Also link into autoRules if setAutoRules is available
    if (setAutoRules) {
      const ruleExists = autoRules.some(r => r.keyword.toUpperCase() === cleanKw);
      if (!ruleExists) {
        const newRule: AutoCategoryRule = {
          id: `rule-kw-${Date.now()}`,
          keyword: cleanKw,
          jar: sub.jarDefault || (sub.nature === 'fixed' ? 'NEC_55' : 'DIV_10'),
          category: `${sub.parentName} > ${sub.name}`,
          costCenter: 'Magno',
          account: 'Inter PF',
        };
        setAutoRules(prev => [...prev, newRule]);
      }
    }

    commitHierarchy(updatedHierarchy);
    setAddingKeywordSubId(null);
    setNewKeywordInput('');

    showNotification(`Termo gatilho "${cleanKw}" associado à subcategoria "${sub.name}"!`);
  };

  // 6. Remove Keyword from Subcategory
  const handleRemoveKeywordFromSub = (sub: SubcategoryItem, kwToRemove: string) => {
    const updatedHierarchy = hierarchy.map(p => {
      if (p.id === sub.parentId) {
        return {
          ...p,
          subcategories: p.subcategories.map(s => {
            if (s.id === sub.id) {
              return { ...s, keywords: s.keywords.filter(k => k !== kwToRemove) };
            }
            return s;
          })
        };
      }
      return p;
    });

    commitHierarchy(updatedHierarchy);
    showNotification(`Termo gatilho "${kwToRemove}" removido.`);
  };

  // 7. Add New Parent Category
  const handleCreateParent = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newParentName.trim();
    if (!cleanName) return;

    const newParent: ParentCategoryItem = {
      id: `cat-${Date.now()}`,
      name: cleanName,
      nature: newParentNature,
      subcategories: [
        {
          id: `sub-${Date.now()}-1`,
          name: 'Geral',
          parentId: `cat-${Date.now()}`,
          parentName: cleanName,
          nature: newParentNature,
          keywords: [cleanName.toUpperCase()],
        }
      ],
      colorHex: '#4F46E5',
      icon: 'Folder',
    };

    const nextHierarchy = [...hierarchy, newParent];
    commitHierarchy(nextHierarchy);
    setExpandedParents(prev => ({ ...prev, [newParent.id]: true }));
    setNewParentName('');
    setIsAddingParent(false);

    showNotification(`Categoria Pai "${cleanName}" criada com sucesso!`);
  };

  // 8. Add New Subcategory to Parent
  const handleCreateSub = (parent: ParentCategoryItem, e: React.FormEvent) => {
    e.preventDefault();
    const cleanSubName = newSubName.trim();
    if (!cleanSubName) return;

    const keywords = newSubKeywords
      .split(',')
      .map(k => k.trim().toUpperCase())
      .filter(Boolean);

    if (keywords.length === 0) {
      keywords.push(cleanSubName.toUpperCase());
    }

    const newSub: SubcategoryItem = {
      id: `sub-${Date.now()}`,
      name: cleanSubName,
      parentId: parent.id,
      parentName: parent.name,
      nature: newSubNature,
      keywords,
      jarDefault: newSubNature === 'fixed' ? 'NEC_55' : 'DIV_10',
    };

    const updatedHierarchy = hierarchy.map(p => {
      if (p.id === parent.id) {
        return {
          ...p,
          subcategories: [...p.subcategories, newSub]
        };
      }
      return p;
    });

    commitHierarchy(updatedHierarchy);
    setAddingSubParentId(null);
    setNewSubName('');
    setNewSubKeywords('');

    showNotification(`Subcategoria "${cleanSubName}" adicionada a "${parent.name}"!`);
  };

  // 9. Move Subcategory to Another Parent
  const handleExecuteMoveSub = () => {
    if (!movingSub || !targetParentForMove) return;

    const targetParent = hierarchy.find(p => p.id === targetParentForMove);
    if (!targetParent || targetParent.id === movingSub.parentId) {
      setMovingSub(null);
      return;
    }

    const { updatedTransactions, updatedHierarchy, affectedCount } = applyCascadeMoveSubcategory(
      transactions,
      movingSub.name,
      targetParent.name,
      hierarchy
    );

    commitHierarchy(updatedHierarchy);
    commitTransactions(updatedTransactions);
    setMovingSub(null);
    setTargetParentForMove('');

    showNotification(`Subcategoria "${movingSub.name}" movida para "${targetParent.name}"! ${affectedCount} transação(ões) atualizada(s).`);
  };

  // 10. Merge Subcategories (Retroactive consolidation)
  const handleExecuteMerge = () => {
    if (!mergingSub || !targetSubForMerge) return;

    const parsedTarget = parseHierarchicalCategory(targetSubForMerge, hierarchy);
    const targetFormatted = parsedTarget.formatted;

    const { updatedTransactions, affectedCount } = applyCascadeMerge(
      transactions,
      [mergingSub.name, `${mergingSub.parentName} > ${mergingSub.name}`],
      targetFormatted
    );

    // Remove source subcategory from hierarchy
    const updatedHierarchy = hierarchy.map(p => ({
      ...p,
      subcategories: p.subcategories.filter(s => s.id !== mergingSub.id)
    }));

    commitHierarchy(updatedHierarchy);
    commitTransactions(updatedTransactions);
    setMergingSub(null);
    setTargetSubForMerge('');

    showNotification(`Categorias mescladas em "${targetFormatted}"! ${affectedCount} transação(ões) unificada(s).`);
  };

  // 11. Delete Subcategory
  const handleDeleteSub = (sub: SubcategoryItem) => {
    if (!window.confirm(`Excluir a subcategoria "${sub.name}"? As transações associadas serão desvinculadas.`)) {
      return;
    }

    const updatedHierarchy = hierarchy.map(p => {
      if (p.id === sub.parentId) {
        return {
          ...p,
          subcategories: p.subcategories.filter(s => s.id !== sub.id)
        };
      }
      return p;
    });

    commitHierarchy(updatedHierarchy);
    showNotification(`Subcategoria "${sub.name}" removida.`);
  };

  // 12. Delete Parent Category
  const handleDeleteParent = (parent: ParentCategoryItem) => {
    if (parent.subcategories.length > 0) {
      if (!window.confirm(`A categoria "${parent.name}" contém ${parent.subcategories.length} subcategorias. Deseja realmente excluir o grupo e todas as suas subcategorias?`)) {
        return;
      }
    }

    const updatedHierarchy = hierarchy.filter(p => p.id !== parent.id);
    commitHierarchy(updatedHierarchy);
    showNotification(`Categoria Pai "${parent.name}" removida.`);
  };

  // 13. Batch Selection & Grouping
  const toggleSelectSub = (subId: string) => {
    setSelectedSubIds(prev => 
      prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredHierarchy.flatMap(p => p.subcategories.map(s => s.id));
    setSelectedSubIds(allFilteredIds);
  };

  const handleClearSelection = () => {
    setSelectedSubIds([]);
  };

  const handleExecuteBatchGroup = () => {
    const targetName = batchTargetParentName.trim();
    if (!targetName || selectedSubIds.length === 0) return;

    // Find all selected subcategories
    const selectedNames: string[] = [];
    hierarchy.forEach(p => {
      p.subcategories.forEach(s => {
        if (selectedSubIds.includes(s.id)) {
          selectedNames.push(s.name);
        }
      });
    });

    const { updatedTransactions, updatedHierarchy, affectedCount } = applyGroupInParentCategory(
      transactions,
      selectedNames,
      targetName,
      hierarchy
    );

    commitHierarchy(updatedHierarchy);
    commitTransactions(updatedTransactions);
    setSelectedSubIds([]);
    setIsBatchGroupModalOpen(false);
    setBatchTargetParentName('');

    showNotification(`${selectedNames.length} subcategoria(s) agrupada(s) em "${targetName}"! ${affectedCount} transação(ões) sincronizada(s).`);
  };

  // Filter hierarchy based on search query and nature filter
  const filteredHierarchy = useMemo(() => {
    const q = normalizeCategoryText(searchTerm);

    return hierarchy
      .map(parent => {
        const parentMatchesSearch = !q || normalizeCategoryText(parent.name).includes(q);
        const parentMatchesNature = natureFilter === 'all' || parent.nature === natureFilter;

        const filteredSubs = parent.subcategories.filter(sub => {
          const subMatchesSearch = !q || 
            normalizeCategoryText(sub.name).includes(q) ||
            sub.keywords.some(k => normalizeCategoryText(k).includes(q));
          const subMatchesNature = natureFilter === 'all' || sub.nature === natureFilter;
          return subMatchesSearch && subMatchesNature;
        });

        if (parentMatchesSearch && parentMatchesNature) {
          return parent;
        }

        if (filteredSubs.length > 0) {
          return {
            ...parent,
            subcategories: filteredSubs
          };
        }

        return null;
      })
      .filter((p): p is ParentCategoryItem => p !== null);
  }, [hierarchy, searchTerm, natureFilter]);

  return (
    <div 
      className={`space-y-5 ${className}`}
      data-testid="category-hierarchy-manager"
    >
      {/* Cascade Notification Banner */}
      {cascadeNotice && (
        <div 
          className="p-3.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-emerald-800 dark:text-emerald-200 text-xs font-semibold shadow-sm animate-in fade-in"
          data-testid="cascade-update-notification"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{cascadeNotice}</span>
          </div>
          <button 
            onClick={() => setCascadeNotice(null)}
            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header and Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-900">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Gerenciador de Hierarquia de Categorias
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  2 Níveis • Fixo & Variável
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize suas categorias em grupos (Categoria Pai &gt; Subcategoria) com termos gatilho para auto-categorização e atualização em cascata retroativa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setIsAddingParent(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              data-testid="btn-add-parent-category"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Categoria Pai</span>
            </button>
          </div>
        </div>

        {/* Search & Nature Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar categoria, subcategoria ou termo gatilho..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              data-testid="input-search-hierarchy"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Filtrar:</span>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
              <button
                onClick={() => setNatureFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  natureFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setNatureFilter('fixed')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  natureFilter === 'fixed'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-indigo-600'
                }`}
              >
                Fixos
              </button>
              <button
                onClick={() => setNatureFilter('variable')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  natureFilter === 'variable'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-orange-600'
                }`}
              >
                Variáveis
              </button>
              <button
                onClick={() => setNatureFilter('income')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  natureFilter === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                Receitas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Batch Action Bar (When items are checked) */}
      {selectedSubIds.length > 0 && (
        <div 
          className="p-3 bg-indigo-900 text-white rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2"
          data-testid="batch-actions-bar"
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-white/20 font-black text-white text-[11px]">
              {selectedSubIds.length} selecionada(s)
            </span>
            <span className="text-indigo-200">
              Ações em lote para categorização em cascata:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsBatchGroupModalOpen(true);
                setBatchTargetParentName(hierarchy[0]?.name || '');
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              data-testid="btn-batch-group"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Agrupar em Categoria Pai</span>
            </button>

            <button
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white font-semibold transition cursor-pointer"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* New Parent Category Inline Creator Modal/Form */}
      {isAddingParent && (
        <form
          onSubmit={handleCreateParent}
          className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-3xl border border-indigo-200 dark:border-indigo-900 space-y-3"
          data-testid="form-add-parent-category"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" />
              Cadastrar Nova Categoria Pai
            </span>
            <button
              type="button"
              onClick={() => setIsAddingParent(false)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] text-slate-500 font-bold block mb-1">
                Nome da Categoria Pai (Ex: "Saúde & Cuidados", "Tecnologia")
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Moradia, Alimentação, Estudos..."
                value={newParentName}
                onChange={(e) => setNewParentName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                data-testid="input-new-parent-name"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">
                Classificação Padrão
              </label>
              <select
                value={newParentNature}
                onChange={(e) => setNewParentNature(e.target.value as ExpenseNature)}
                className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white"
              >
                <option value="variable">Gasto Variável</option>
                <option value="fixed">Gasto Fixo</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingParent(false)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
            >
              Salvar Categoria Pai
            </button>
          </div>
        </form>
      )}

      {/* Accordion Tree View: Parent Categories and Subcategories */}
      <div className="space-y-3.5">
        {filteredHierarchy.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 space-y-2">
            <FolderTree className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
            <p className="text-sm font-semibold">Nenhuma categoria encontrada com os filtros atuais.</p>
          </div>
        ) : (
          filteredHierarchy.map(parent => {
            const isExpanded = expandedParents[parent.id] ?? true;
            const pStats = hierarchyStats[parent.id] || { totalSpent: 0, count: 0, subStats: {} };
            const isEditing = editingParentId === parent.id;

            return (
              <div
                key={parent.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition"
                data-testid={`card-parent-category-${parent.id}`}
              >
                {/* Parent Category Header */}
                <div className="p-4 sm:p-4.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleParentExpand(parent.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                      title={isExpanded ? 'Recolher subcategorias' : 'Expandir subcategorias'}
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0" 
                      style={{ backgroundColor: parent.colorHex || '#4f46e5' }} 
                    />

                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingParentName}
                          onChange={(e) => setEditingParentName(e.target.value)}
                          className="px-2 py-1 rounded-lg border border-indigo-400 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveParentRename(parent);
                            if (e.key === 'Escape') setEditingParentId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveParentRename(parent)}
                          className="p-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingParentId(null)}
                          className="p-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 hover:text-slate-800 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 truncate">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {parent.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingParentId(parent.id);
                            setEditingParentName(parent.name);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-60 hover:opacity-100 transition cursor-pointer"
                          title="Renomear Categoria Pai (Atualização em cascata)"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Tag Fixo / Variável */}
                    <button
                      type="button"
                      onClick={() => handleToggleParentNature(parent)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border transition cursor-pointer flex items-center gap-1 ${
                        parent.nature === 'fixed'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                          : 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                      }`}
                      title="Clique para alternar classificação de Gasto Fixo ou Variável"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${parent.nature === 'fixed' ? 'bg-indigo-500' : 'bg-orange-500'}`} />
                      <span>{parent.nature === 'fixed' ? 'Gasto Fixo' : 'Gasto Variável'}</span>
                    </button>

                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      ({parent.subcategories.length} subcategorias)
                    </span>
                  </div>

                  {/* Right: Total movimentado & Actions */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pl-8 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block font-semibold">Total Movimentado</span>
                      <strong className="text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-white">
                        {formatBRL(pStats.totalSpent)}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAddingSubParentId(parent.id);
                          setNewSubNature(parent.nature);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1 cursor-pointer"
                        title="Adicionar nova subcategoria a este grupo"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Nova Sub</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteParent(parent)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Excluir Categoria Pai"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subcategories List (Expanded) */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {/* Inline Form to Add New Subcategory */}
                    {addingSubParentId === parent.id && (
                      <form
                        onSubmit={(e) => handleCreateSub(parent, e)}
                        className="p-4 bg-indigo-50/40 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/60 space-y-2.5 animate-in fade-in"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-800 dark:text-indigo-200">
                            Adicionar Subcategoria em "{parent.name}":
                          </span>
                          <button
                            type="button"
                            onClick={() => setAddingSubParentId(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <input
                              type="text"
                              required
                              placeholder="Nome da Subcategoria (Ex: Delivery)"
                              value={newSubName}
                              onChange={(e) => setNewSubName(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              autoFocus
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="Palavras-chave separadas por vírgula (Ex: IFOOD, RAPPI)"
                              value={newSubKeywords}
                              onChange={(e) => setNewSubKeywords(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={newSubNature}
                              onChange={(e) => setNewSubNature(e.target.value as ExpenseNature)}
                              className="flex-1 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            >
                              <option value="variable">Gasto Variável</option>
                              <option value="fixed">Gasto Fixo</option>
                            </select>
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    {parent.subcategories.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        Nenhuma subcategoria cadastrada neste grupo. Clique em "+ Nova Sub" para adicionar.
                      </div>
                    ) : (
                      parent.subcategories.map(sub => {
                        const subStat = pStats.subStats[sub.id] || { totalSpent: 0, count: 0 };
                        const isSubEditing = editingSubId === sub.id;
                        const isChecked = selectedSubIds.includes(sub.id);

                        return (
                          <div
                            key={sub.id}
                            className={`p-3.5 sm:px-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition ${
                              isChecked ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                            }`}
                            data-testid={`row-subcategory-${sub.id}`}
                          >
                            {/* Left: Checkbox, Name, Nature, Keywords */}
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectSub(sub.id)}
                                className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                title="Selecionar para ações em lote"
                              />

                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  {isSubEditing ? (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        value={editingSubName}
                                        onChange={(e) => setEditingSubName(e.target.value)}
                                        className="px-2 py-0.5 rounded-lg border border-indigo-400 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveSubRename(sub);
                                          if (e.key === 'Escape') setEditingSubId(null);
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveSubRename(sub)}
                                        className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingSubId(null)}
                                        className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 cursor-pointer"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                        {sub.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingSubId(sub.id);
                                          setEditingSubName(sub.name);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-indigo-600 opacity-60 hover:opacity-100 transition cursor-pointer"
                                        title="Renomear subcategoria inline"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}

                                  {/* Nature Toggle */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSubNature(sub)}
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition cursor-pointer ${
                                      sub.nature === 'fixed'
                                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                        : 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                                    }`}
                                    title="Alternar entre Fixo ou Variável"
                                  >
                                    {sub.nature === 'fixed' ? 'Fixo' : 'Variável'}
                                  </button>

                                  <span className="text-[10px] text-slate-400">
                                    • {subStat.count} transação(ões)
                                  </span>
                                </div>

                                {/* Keywords Chips */}
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5 mr-0.5">
                                    <Hash className="w-3 h-3 text-slate-400" />
                                    Gatilhos:
                                  </span>
                                  {sub.keywords.map(kw => (
                                    <span
                                      key={kw}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300 group"
                                    >
                                      <span>{kw}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveKeywordFromSub(sub, kw)}
                                        className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                                        title={`Remover gatilho "${kw}"`}
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}

                                  {addingKeywordSubId === sub.id ? (
                                    <div className="inline-flex items-center gap-1">
                                      <input
                                        type="text"
                                        placeholder="Ex: IFOOD"
                                        value={newKeywordInput}
                                        onChange={(e) => setNewKeywordInput(e.target.value)}
                                        className="w-20 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleAddKeywordToSub(sub);
                                          if (e.key === 'Escape') setAddingKeywordSubId(null);
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleAddKeywordToSub(sub)}
                                        className="text-[9px] font-bold text-emerald-600 hover:underline"
                                      >
                                        OK
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddingKeywordSubId(sub.id);
                                        setNewKeywordInput('');
                                      }}
                                      className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-1"
                                      title="Associar novo termo gatilho de auto-categorização"
                                    >
                                      + Gatilho
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Spent & Inline Actions (Move, Merge, Delete) */}
                            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 dark:border-slate-800">
                              <div className="text-left md:text-right">
                                <span className="text-[10px] text-slate-400 block font-semibold">Subtotal</span>
                                <strong className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {formatBRL(subStat.totalSpent)}
                                </strong>
                              </div>

                              <div className="flex items-center gap-1">
                                {/* Mover para Grupo Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMovingSub(sub);
                                    setTargetParentForMove(parent.id);
                                  }}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
                                  title="Mover esta subcategoria para outro grupo"
                                >
                                  <MoveRight className="w-3 h-3 text-slate-400" />
                                  <span>Mover</span>
                                </button>

                                {/* Mesclar Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMergingSub(sub);
                                    setTargetSubForMerge('');
                                  }}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
                                  title="Mesclar categorias duplicadas retroativamente"
                                >
                                  <Merge className="w-3 h-3 text-slate-400" />
                                  <span>Mesclar</span>
                                </button>

                                {/* Delete Subcategory */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSub(sub)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                  title="Excluir subcategoria"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Loose Categories Section (Detected unmapped categories in transactions) */}
      {looseCategories.length > 0 && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-3xl border border-amber-200/80 dark:border-amber-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Categorias Soltas Detectadas nas Transações ({looseCategories.length})
              </h4>
            </div>
            <span className="text-[10px] text-amber-800 dark:text-amber-300">
              Transforme-as em subcategorias organizadas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {looseCategories.map(cat => (
              <div
                key={cat.name}
                className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <strong className="text-slate-800 dark:text-white block font-bold truncate">
                    "{cat.name}"
                  </strong>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {cat.count}x • {formatBRL(cat.totalSpent)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const firstParent = hierarchy[0]?.name || 'Outros';
                    const { updatedTransactions, updatedHierarchy, affectedCount } = applyGroupInParentCategory(
                      transactions,
                      [cat.name],
                      firstParent,
                      hierarchy
                    );
                    commitHierarchy(updatedHierarchy);
                    commitTransactions(updatedTransactions);
                    showNotification(`Categoria solta "${cat.name}" agrupada em "${firstParent}"! ${affectedCount} transação(ões) sincronizada(s).`);
                  }}
                  className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 font-bold text-[10px] transition cursor-pointer"
                >
                  + Agrupar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Move Subcategory to Another Parent */}
      {movingSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <MoveRight className="w-5 h-5 text-indigo-600" />
                Mover Subcategoria
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Mover <strong>"{movingSub.name}"</strong> para um novo grupo pai. Todas as transações serão atualizadas retroativamente.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Selecione a nova Categoria Pai:
              </label>
              <select
                value={targetParentForMove}
                onChange={(e) => setTargetParentForMove(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
              >
                {hierarchy.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.nature === 'fixed' ? 'Fixo' : 'Variável'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMovingSub(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteMoveSub}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                Confirmar Transferência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Merge Subcategories */}
      {mergingSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Merge className="w-5 h-5 text-indigo-600" />
                Mesclar Categorias Duplicadas
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Mesclar <strong>"{mergingSub.parentName} &gt; {mergingSub.name}"</strong> em outra categoria de destino. Todas as transações históricas serão unificadas retroativamente.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Selecione a categoria de destino:
              </label>
              <select
                value={targetSubForMerge}
                onChange={(e) => setTargetSubForMerge(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
              >
                <option value="">Selecione uma categoria...</option>
                {hierarchy.flatMap(p => 
                  p.subcategories
                    .filter(s => s.id !== mergingSub.id)
                    .map(s => (
                      <option key={s.id} value={`${p.name} > ${s.name}`}>
                        {p.name} &gt; {s.name} ({s.nature === 'fixed' ? 'Fixo' : 'Variável'})
                      </option>
                    ))
                )}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMergingSub(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!targetSubForMerge}
                onClick={handleExecuteMerge}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold"
              >
                Mesclar e Atualizar Histórico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Batch Group in Parent Category */}
      {isBatchGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Agrupar em Categoria Pai (Lote)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Você selecionou <strong>{selectedSubIds.length} subcategorias</strong> para agrupar.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCreatingNewParentForBatch(false)}
                  className={`flex-1 py-1.5 rounded-xl font-bold border transition ${
                    !isCreatingNewParentForBatch 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Grupo Existente
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewParentForBatch(true)}
                  className={`flex-1 py-1.5 rounded-xl font-bold border transition ${
                    isCreatingNewParentForBatch 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Criar Novo Grupo
                </button>
              </div>

              {isCreatingNewParentForBatch ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nome do Novo Grupo:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Assinaturas Digitais, Pets..."
                    value={batchTargetParentName}
                    onChange={(e) => setBatchTargetParentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    autoFocus
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Selecione a Categoria Pai:
                  </label>
                  <select
                    value={batchTargetParentName}
                    onChange={(e) => setBatchTargetParentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                  >
                    {hierarchy.map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchGroupModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchGroup}
                disabled={!batchTargetParentName.trim()}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold"
              >
                Confirmar e Agrupar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
