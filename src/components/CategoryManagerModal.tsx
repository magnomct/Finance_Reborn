import React, { useState, useMemo } from 'react';
import { 
  X, Search, Plus, Edit2, Trash2, Check, AlertTriangle, 
  RotateCcw, FolderTree, ChevronDown, ChevronRight, Sparkles, 
  CheckCircle2, Layers, Tag, ShieldAlert, ArrowRight, DollarSign
} from 'lucide-react';
import { 
  ParentCategoryItem, 
  SubcategoryItem, 
  ExpenseNature, 
  Transaction, 
  AutoCategoryRule 
} from '../types';
import { 
  saveCategoryHierarchy, 
  resetCategoryHierarchyToDefaults,
  isParentCategoryNameDuplicate,
  isSubcategoryNameDuplicate,
  countTransactionsUsingCategory,
  applySafeDeleteCategory,
  applyCascadeRename,
  normalizeCategoryText
} from '../utils/categoryHierarchy';

export interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  hierarchy: ParentCategoryItem[];
  setHierarchy?: React.Dispatch<React.SetStateAction<ParentCategoryItem[]>>;
  transactions?: Transaction[];
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  autoRules?: AutoCategoryRule[];
  setAutoRules?: React.Dispatch<React.SetStateAction<AutoCategoryRule[]>>;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#F97316', // Orange
  '#0EA5E9', // Sky
  '#A855F7', // Purple
  '#10B981', // Emerald
  '#EF4444', // Red
  '#EAB308', // Amber
  '#64748B', // Slate
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  hierarchy,
  setHierarchy,
  transactions = [],
  setTransactions,
  autoRules = [],
  setAutoRules,
}) => {
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'fixed' | 'variable' | 'income'>('all');

  // Expanded accordions
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    hierarchy.forEach(p => { init[p.id] = true; });
    return init;
  });

  // Adding Parent Category form
  const [isAddingParent, setIsAddingParent] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [newParentNature, setNewParentNature] = useState<ExpenseNature>('variable');
  const [newParentColor, setNewParentColor] = useState(PRESET_COLORS[0]);
  const [parentFormError, setParentFormError] = useState<string | null>(null);

  // Inline rename state for Parent
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editingParentName, setEditingParentName] = useState('');
  const [renameParentError, setRenameParentError] = useState<string | null>(null);

  // Adding Subcategory form (per parentId)
  const [addingSubParentId, setAddingSubParentId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubKeywords, setNewSubKeywords] = useState('');
  const [newSubNature, setNewSubNature] = useState<ExpenseNature>('variable');
  const [subFormError, setSubFormError] = useState<string | null>(null);

  // Inline rename state for Subcategory
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubParentId, setEditingSubParentId] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState('');
  const [renameSubError, setRenameSubError] = useState<string | null>(null);

  // Deletion state & modal
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    name: string;
    isParent: boolean;
    parentId?: string;
    affectedCount: number;
  } | null>(null);

  // Reset to defaults confirmation
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Feedback Notification banner
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const commitHierarchy = (newH: ParentCategoryItem[]) => {
    if (setHierarchy) setHierarchy(newH);
    saveCategoryHierarchy(newH);
  };

  const commitTransactions = (newT: Transaction[]) => {
    if (setTransactions) setTransactions(newT);
  };

  const toggleParentExpand = (parentId: string) => {
    setExpandedParents(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  // Filtered hierarchy list based on tab and search
  const filteredHierarchy = useMemo(() => {
    const normSearch = normalizeCategoryText(searchTerm);

    return hierarchy.filter(parent => {
      // Filter by tab nature
      const currentNature = parent.nature || parent.type || 'variable';
      if (activeTab !== 'all' && currentNature !== activeTab) {
        return false;
      }

      // Filter by search
      if (!normSearch) return true;

      const parentMatch = normalizeCategoryText(parent.name).includes(normSearch);
      const subMatch = parent.subcategories.some(s => 
        normalizeCategoryText(s.name).includes(normSearch) ||
        s.keywords.some(k => normalizeCategoryText(k).includes(normSearch))
      );

      return parentMatch || subMatch;
    });
  }, [hierarchy, activeTab, searchTerm]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: hierarchy.length,
      fixed: hierarchy.filter(p => (p.nature || p.type) === 'fixed').length,
      variable: hierarchy.filter(p => (p.nature || p.type) === 'variable').length,
      income: hierarchy.filter(p => (p.nature || p.type) === 'income').length,
    };
  }, [hierarchy]);

  // Handle Add Parent Category
  const handleSaveParentCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setParentFormError(null);

    const trimmed = newParentName.trim();
    if (!trimmed) {
      setParentFormError('Informe o nome da categoria pai.');
      return;
    }

    if (isParentCategoryNameDuplicate(trimmed, hierarchy)) {
      setParentFormError(`A categoria pai "${trimmed}" já existe. Escolha outro nome.`);
      return;
    }

    const newParent: ParentCategoryItem = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      nature: newParentNature,
      type: newParentNature,
      colorHex: newParentColor,
      color: newParentColor,
      icon: newParentNature === 'income' ? 'TrendingUp' : 'Layers',
      subcategories: [
        {
          id: `sub-${Date.now()}-geral`,
          name: 'Geral',
          parentId: '',
          parentName: trimmed,
          nature: newParentNature,
          type: newParentNature,
          keywords: [trimmed.toUpperCase()],
          color: newParentColor,
        }
      ]
    };
    newParent.subcategories[0].parentId = newParent.id;

    const nextH = [...hierarchy, newParent];
    commitHierarchy(nextH);
    setExpandedParents(prev => ({ ...prev, [newParent.id]: true }));

    setNewParentName('');
    setIsAddingParent(false);
    showNotification(`Categoria Pai "${trimmed}" criada com sucesso!`);
  };

  // Handle Inline Rename Parent Category (Cascading)
  const handleStartRenameParent = (parent: ParentCategoryItem) => {
    setEditingParentId(parent.id);
    setEditingParentName(parent.name);
    setRenameParentError(null);
  };

  const handleSaveRenameParent = (parent: ParentCategoryItem) => {
    const trimmed = editingParentName.trim();
    if (!trimmed) {
      setRenameParentError('O nome não pode ficar vazio.');
      return;
    }

    if (trimmed !== parent.name && isParentCategoryNameDuplicate(trimmed, hierarchy, parent.id)) {
      setRenameParentError(`Já existe uma categoria pai chamada "${trimmed}".`);
      return;
    }

    if (trimmed === parent.name) {
      setEditingParentId(null);
      return;
    }

    const oldName = parent.name;
    const nextH = hierarchy.map(p => {
      if (p.id === parent.id) {
        return {
          ...p,
          name: trimmed,
          subcategories: p.subcategories.map(s => ({
            ...s,
            parentName: trimmed
          }))
        };
      }
      return p;
    });

    commitHierarchy(nextH);

    // Cascade update transactions
    const { updatedTransactions, affectedCount } = applyCascadeRename(
      transactions,
      oldName,
      trimmed,
      true
    );

    if (affectedCount > 0) {
      commitTransactions(updatedTransactions);
      showNotification(`Categoria renomeada para "${trimmed}"! ${affectedCount} transações atualizadas.`);
    } else {
      showNotification(`Categoria renomeada para "${trimmed}".`);
    }

    setEditingParentId(null);
    setEditingParentName('');
  };

  // Handle Add Subcategory
  const handleStartAddSub = (parentId: string, parentNature: ExpenseNature) => {
    setAddingSubParentId(parentId);
    setNewSubName('');
    setNewSubKeywords('');
    setNewSubNature(parentNature);
    setSubFormError(null);
    setExpandedParents(prev => ({ ...prev, [parentId]: true }));
  };

  const handleSaveSubcategory = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    setSubFormError(null);

    const trimmed = newSubName.trim();
    if (!trimmed) {
      setSubFormError('Informe o nome da subcategoria.');
      return;
    }

    if (isSubcategoryNameDuplicate(trimmed, parentId, hierarchy)) {
      setSubFormError(`A subcategoria "${trimmed}" já existe nesta categoria pai.`);
      return;
    }

    const parent = hierarchy.find(p => p.id === parentId);
    if (!parent) return;

    const keywords = newSubKeywords
      .split(',')
      .map(k => k.trim().toUpperCase())
      .filter(Boolean);

    if (keywords.length === 0) {
      keywords.push(trimmed.toUpperCase());
    }

    const newSub: SubcategoryItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      parentId: parent.id,
      parentName: parent.name,
      nature: newSubNature,
      type: newSubNature,
      keywords,
      color: parent.colorHex || parent.color,
    };

    const nextH = hierarchy.map(p => {
      if (p.id === parentId) {
        return {
          ...p,
          subcategories: [...p.subcategories, newSub]
        };
      }
      return p;
    });

    commitHierarchy(nextH);
    setAddingSubParentId(null);
    setNewSubName('');
    setNewSubKeywords('');
    showNotification(`Subcategoria "${trimmed}" adicionada em "${parent.name}"!`);
  };

  // Handle Inline Rename Subcategory (Cascading)
  const handleStartRenameSub = (sub: SubcategoryItem) => {
    setEditingSubId(sub.id);
    setEditingSubParentId(sub.parentId);
    setEditingSubName(sub.name);
    setRenameSubError(null);
  };

  const handleSaveRenameSub = (sub: SubcategoryItem, parent: ParentCategoryItem) => {
    const trimmed = editingSubName.trim();
    if (!trimmed) {
      setRenameSubError('O nome não pode ficar vazio.');
      return;
    }

    if (trimmed !== sub.name && isSubcategoryNameDuplicate(trimmed, parent.id, hierarchy, sub.id)) {
      setRenameSubError(`Já existe uma subcategoria "${trimmed}" nesta categoria.`);
      return;
    }

    if (trimmed === sub.name) {
      setEditingSubId(null);
      return;
    }

    const oldFormatted = `${parent.name} > ${sub.name}`;
    const newFormatted = `${parent.name} > ${trimmed}`;

    const nextH = hierarchy.map(p => {
      if (p.id === parent.id) {
        return {
          ...p,
          subcategories: p.subcategories.map(s => {
            if (s.id === sub.id) {
              return {
                ...s,
                name: trimmed
              };
            }
            return s;
          })
        };
      }
      return p;
    });

    commitHierarchy(nextH);

    // Cascade update transactions
    const { updatedTransactions, affectedCount } = applyCascadeRename(
      transactions,
      sub.name,
      newFormatted,
      false
    );

    if (affectedCount > 0) {
      commitTransactions(updatedTransactions);
      showNotification(`Subcategoria renomeada para "${trimmed}"! ${affectedCount} transações atualizadas.`);
    } else {
      showNotification(`Subcategoria renomeada para "${trimmed}".`);
    }

    setEditingSubId(null);
    setEditingSubName('');
  };

  // Safe Deletion confirmation preparation
  const prepareDelete = (id: string, name: string, isParent: boolean, parentId?: string) => {
    const count = countTransactionsUsingCategory(transactions, name, isParent);
    setItemToDelete({
      id,
      name,
      isParent,
      parentId,
      affectedCount: count
    });
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;

    const { updatedTransactions, updatedHierarchy, affectedCount, deletedName } = applySafeDeleteCategory(
      transactions,
      hierarchy,
      itemToDelete.id,
      itemToDelete.isParent
    );

    commitHierarchy(updatedHierarchy);

    if (affectedCount > 0) {
      commitTransactions(updatedTransactions);
      showNotification(
        `"${deletedName}" excluída! ${affectedCount} transação(ões) reatribuída(s) com segurança para "Outros > Diversos".`,
        'info'
      );
    } else {
      showNotification(`"${deletedName}" excluída com sucesso!`);
    }

    setItemToDelete(null);
  };

  // Restore Defaults
  const handleRestoreDefaults = () => {
    const defaults = resetCategoryHierarchyToDefaults();
    if (setHierarchy) setHierarchy(defaults);
    setIsResetConfirmOpen(false);
    showNotification('Categorias padrão restauradas com sucesso!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  Gerenciador de Categorias
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Tempo Real
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Organize suas Categorias Pai e Subcategorias com sincronização imediata no formulário de Nova Transação.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
            data-testid="btn-close-category-manager"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className={`mx-6 mt-3 p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{notification.message}</span>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search, Filter Tabs and Top Actions */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 space-y-3.5 shrink-0">
          
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por categoria ou palavra-chave..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                data-testid="input-search-categories"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Restaurar lista de categorias padrão do aplicativo"
                data-testid="btn-restore-defaults"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Restaurar Padrões</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAddingParent(prev => !prev);
                  setParentFormError(null);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                data-testid="btn-add-parent-category"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Categoria Pai</span>
              </button>
            </div>
          </div>

          {/* Nature Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl gap-1">
            {[
              { id: 'all', label: 'Todas', count: tabCounts.all },
              { id: 'fixed', label: 'Fixos', count: tabCounts.fixed, colorClass: 'text-blue-500' },
              { id: 'variable', label: 'Variáveis', count: tabCounts.variable, colorClass: 'text-amber-500' },
              { id: 'income', label: 'Receitas', count: tabCounts.income, colorClass: 'text-emerald-500' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                data-testid={`tab-filter-${tab.id}`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-200/60 dark:bg-slate-700 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

        </div>

        {/* Content Body: Add Form & Accordion List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* New Parent Category Form */}
          {isAddingParent && (
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3.5 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                    Cadastrar Nova Categoria Pai
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingParent(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {parentFormError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{parentFormError}</span>
                </div>
              )}

              <form onSubmit={handleSaveParentCategory} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Nome da Categoria Pai *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Investimentos, Pets, Educação"
                      value={newParentName}
                      onChange={e => setNewParentName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                      data-testid="input-new-parent-name"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Classificação Padrão
                    </label>
                    <select
                      value={newParentNature}
                      onChange={e => setNewParentNature(e.target.value as ExpenseNature)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      data-testid="select-new-parent-nature"
                    >
                      <option value="fixed">Gasto Fixo (Previsível)</option>
                      <option value="variable">Gasto Variável (Oscilante)</option>
                      <option value="income">Receita / Entrada</option>
                    </select>
                  </div>
                </div>

                {/* Color presets */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                    Cor de Identificação
                  </label>
                  <div className="flex items-center gap-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewParentColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                          newParentColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900">
                  <button
                    type="button"
                    onClick={() => setIsAddingParent(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition"
                    data-testid="btn-save-new-parent"
                  >
                    Salvar Categoria
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Accordion Categories List */}
          {filteredHierarchy.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FolderTree className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold">Nenhuma categoria encontrada.</p>
              <p className="text-xs text-slate-400 mt-1">
                Tente ajustar os filtros ou clique em "Nova Categoria Pai" para adicionar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHierarchy.map(parent => {
                const isExpanded = expandedParents[parent.id] ?? true;
                const parentNature = parent.nature || parent.type || 'variable';
                const parentColor = parent.colorHex || parent.color || '#3B82F6';
                const linkedTxCount = countTransactionsUsingCategory(transactions, parent.name, true);

                return (
                  <div
                    key={parent.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                    data-testid={`card-parent-category-${parent.id}`}
                  >
                    {/* Parent Category Header */}
                    <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
                      
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Expand Toggle Chevron */}
                        <button
                          type="button"
                          onClick={() => toggleParentExpand(parent.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
                          title={isExpanded ? 'Recolher' : 'Expandir'}
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        {/* Color swatch indicator */}
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: parentColor }}
                        />

                        {/* Name or Inline Rename */}
                        {editingParentId === parent.id ? (
                          <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                            <input
                              type="text"
                              value={editingParentName}
                              onChange={e => setEditingParentName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveRenameParent(parent);
                                if (e.key === 'Escape') setEditingParentId(null);
                              }}
                              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-500 text-xs font-bold text-slate-900 dark:text-white flex-1 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRenameParent(parent)}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Salvar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingParentId(null)}
                              className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 truncate">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                              {parent.name}
                            </h4>

                            {/* Nature Badge */}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                              parentNature === 'fixed'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : parentNature === 'income'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {parentNature === 'fixed' ? 'Fixo' : parentNature === 'income' ? 'Receita' : 'Variável'}
                            </span>

                            <span className="text-[11px] text-slate-400 font-medium shrink-0">
                              • {parent.subcategories.length} subcategoria{parent.subcategories.length === 1 ? '' : 's'}
                            </span>

                            {linkedTxCount > 0 && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                                {linkedTxCount} txs
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Parent Actions */}
                      <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartAddSub(parent.id, parentNature)}
                          className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Adicionar Subcategoria"
                          data-testid={`btn-add-sub-to-${parent.id}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Subcategoria</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartRenameParent(parent)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                          title="Renomear Categoria Pai"
                          data-testid={`btn-rename-parent-${parent.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => prepareDelete(parent.id, parent.name, true)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Excluir Categoria Pai"
                          data-testid={`btn-delete-parent-${parent.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>

                    {renameParentError && editingParentId === parent.id && (
                      <div className="px-4 py-1.5 bg-rose-50 text-rose-700 text-xs font-semibold border-b border-rose-200">
                        {renameParentError}
                      </div>
                    )}

                    {/* Subcategories inside Parent Accordion */}
                    {isExpanded && (
                      <div className="p-3 sm:p-4 space-y-2.5 bg-white dark:bg-slate-900">
                        
                        {/* Subcategory List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {parent.subcategories.map(sub => {
                            const subNature = sub.nature || sub.type || parentNature;
                            const subTxCount = countTransactionsUsingCategory(transactions, sub.name, false);

                            return (
                              <div
                                key={sub.id}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-between gap-2 group transition"
                                data-testid={`card-sub-${sub.id}`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />

                                  {editingSubId === sub.id ? (
                                    <div className="flex items-center gap-1.5 flex-1">
                                      <input
                                        type="text"
                                        value={editingSubName}
                                        onChange={e => setEditingSubName(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleSaveRenameSub(sub, parent);
                                          if (e.key === 'Escape') setEditingSubId(null);
                                        }}
                                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-indigo-500 text-xs font-bold flex-1 focus:outline-none"
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveRenameSub(sub, parent)}
                                        className="p-1 rounded bg-emerald-600 text-white"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingSubId(null)}
                                        className="p-1 rounded bg-slate-200 text-slate-600"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                          {sub.name}
                                        </span>
                                        {subTxCount > 0 && (
                                          <span className="text-[9px] font-bold text-slate-400 bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                                            {subTxCount}
                                          </span>
                                        )}
                                      </div>

                                      {/* Keywords preview */}
                                      {sub.keywords && sub.keywords.length > 0 && (
                                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                          {sub.keywords.slice(0, 2).map(kw => (
                                            <span
                                              key={kw}
                                              className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
                                            >
                                              {kw}
                                            </span>
                                          ))}
                                          {sub.keywords.length > 2 && (
                                            <span className="text-[9px] text-slate-400">
                                              +{sub.keywords.length - 2}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Subcategory Actions */}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleStartRenameSub(sub)}
                                    className="p-1 rounded text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                    title="Renomear Subcategoria"
                                    data-testid={`btn-rename-sub-${sub.id}`}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => prepareDelete(sub.id, sub.name, false, parent.id)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                    title="Excluir Subcategoria"
                                    data-testid={`btn-delete-sub-${sub.id}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>

                              </div>
                            );
                          })}
                        </div>

                        {/* Inline Add Subcategory form */}
                        {addingSubParentId === parent.id && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-900 space-y-2.5 animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                + Nova Subcategoria em "{parent.name}"
                              </span>
                              <button
                                type="button"
                                onClick={() => setAddingSubParentId(null)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {subFormError && (
                              <div className="text-xs text-rose-600 font-semibold">
                                {subFormError}
                              </div>
                            )}

                            <form onSubmit={e => handleSaveSubcategory(e, parent.id)} className="space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  required
                                  placeholder="Nome da subcategoria (ex: Delivery, Cinema)"
                                  value={newSubName}
                                  onChange={e => setNewSubName(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  autoFocus
                                  data-testid={`input-new-sub-name-${parent.id}`}
                                />

                                <input
                                  type="text"
                                  placeholder="Palavras-chave (ex: IFOOD, RAPPI)"
                                  value={newSubKeywords}
                                  onChange={e => setNewSubKeywords(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>

                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setAddingSubParentId(null)}
                                  className="px-2.5 py-1 rounded text-xs font-semibold text-slate-500"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="px-3.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                                  data-testid={`btn-save-new-sub-${parent.id}`}
                                >
                                  Salvar Subcategoria
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>As alterações são salvas automaticamente no <strong>localStorage</strong> e sincronizadas.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Concluir & Fechar
          </button>
        </div>

      </div>

      {/* Safe Deletion Confirmation Dialog */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full p-5 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  Excluir {itemToDelete.isParent ? 'Categoria Pai' : 'Subcategoria'}?
                </h4>
                <span className="text-xs text-slate-500 font-semibold">
                  "{itemToDelete.name}"
                </span>
              </div>
            </div>

            {itemToDelete.affectedCount > 0 ? (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <p className="font-bold">
                  ⚠️ Atenção: Esta categoria possui {itemToDelete.affectedCount} transação(ões) vinculada(s).
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  Para não quebrar o histórico dos seus gráficos e relatórios mensais, ao confirmar a exclusão essas transações serão transferidas com segurança para a categoria fallback <strong>"Outros &gt; Diversos"</strong>.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Nenhuma transação vinculada foi encontrada para esta categoria. A exclusão é segura e definitiva.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                data-testid="btn-confirm-safe-delete"
              >
                {itemToDelete.affectedCount > 0 ? 'Confirmar e Reatribuir' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Defaults Confirmation Dialog */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full p-5 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  Restaurar Categorias Padrão?
                </h4>
                <span className="text-xs text-slate-500 font-semibold">
                  Moradia, Alimentação, Transporte, Lazer, Saúde, Bancos e Receitas
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Esta ação redefinirá a estrutura hierárquica salva no navegador para o padrão inicial do Yupee. Suas transações registradas permanecerão salvas.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                data-testid="btn-confirm-restore-defaults"
              >
                Sim, Restaurar Padrões
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
