import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Sparkles, Search, RefreshCw, ExternalLink, 
  CheckCircle2, Clock, Bookmark, BookmarkCheck, Lightbulb,
  CreditCard, Home, TrendingUp, Layers, Building2, HelpCircle,
  ChevronRight, Compass, ShieldAlert, Award
} from 'lucide-react';
import { Transaction, JarType } from '../types';
import { 
  EducationalArticle, 
  ArticleTopic, 
  buildFinancialProfileSummary, 
  filterArticlesByTopic, 
  searchArticlesByKeyword, 
  getCuratedFallbackArticles 
} from '../utils/financeReading';

interface FinanceReadingCardProps {
  transactions: Transaction[];
  jarLimits: Record<JarType, number>;
  usePjProfitInPf?: boolean;
}

export const FinanceReadingCard: React.FC<FinanceReadingCardProps> = ({
  transactions,
  jarLimits,
  usePjProfitInPf = true
}) => {
  const [articles, setArticles] = useState<EducationalArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<ArticleTopic>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customSearchInput, setCustomSearchInput] = useState<string>('');
  const [isSearchingApi, setIsSearchingApi] = useState<boolean>(false);
  const [queriesUsed, setQueriesUsed] = useState<string[]>([]);
  const [fonteInfo, setFonteInfo] = useState<string>('Google Search API Grounded');
  
  // Track read/bookmarked articles in localStorage
  const [readArticleIds, setReadArticleIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('yupee_read_article_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [bookmarkedArticleIds, setBookmarkedArticleIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('yupee_bookmarked_article_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Calculate user profile summary
  const profileSummary = useMemo(() => {
    return buildFinancialProfileSummary(transactions, jarLimits, usePjProfitInPf);
  }, [transactions, jarLimits, usePjProfitInPf]);

  // Fetch articles from backend API with Google Search Grounding
  const fetchReadingSuggestions = async (customQuery?: string) => {
    setLoading(true);
    setError(null);
    if (customQuery) {
      setIsSearchingApi(true);
    }

    try {
      const response = await fetch('/api/leitura-financas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileSummary,
          userQuery: customQuery || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com status ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data.artigos) && data.artigos.length > 0) {
        setArticles(data.artigos);
        if (data.queriesUsed) setQueriesUsed(data.queriesUsed);
        if (data.fonte) setFonteInfo(data.fonte);
      } else {
        const fallbacks = getCuratedFallbackArticles(profileSummary);
        setArticles(fallbacks);
      }
    } catch {
      setError('Carregando acervo curado com base no seu perfil financeiro.');
      const fallbacks = getCuratedFallbackArticles(profileSummary);
      setArticles(fallbacks);
    } finally {
      setLoading(false);
      setIsSearchingApi(false);
    }
  };

  useEffect(() => {
    fetchReadingSuggestions();
  }, [profileSummary.primaryFocus, profileSummary.c6Total, profileSummary.overdraftInterest]);

  // Toggle read status
  const handleToggleRead = (id: string) => {
    setReadArticleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('yupee_read_article_ids', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Toggle bookmark status
  const handleToggleBookmark = (id: string) => {
    setBookmarkedArticleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('yupee_bookmarked_article_ids', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Filter and search
  const filteredArticles = useMemo(() => {
    let result = filterArticlesByTopic(articles, activeTopic);
    if (searchQuery.trim()) {
      result = searchArticlesByKeyword(result, searchQuery);
    }
    return result;
  }, [articles, activeTopic, searchQuery]);

  // Handle custom query submission to search API
  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSearchInput.trim()) return;
    fetchReadingSuggestions(customSearchInput.trim());
  };

  // Helper for topic details
  const getTopicMeta = (topic: EducationalArticle['topic']) => {
    switch (topic) {
      case 'cartao':
        return { label: 'Cartão & Fatura', icon: CreditCard, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800' };
      case 'financiamento':
        return { label: 'Financiamento', icon: Home, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800' };
      case 'investimentos':
        return { label: 'Investimentos & Reserva', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' };
      case 'pj':
        return { label: 'Operação PJ & DAS', icon: Building2, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' };
      case 'potes':
      default:
        return { label: '6 Potes & Hábitos', icon: Layers, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800' };
    }
  };

  const readCount = useMemo(() => {
    return articles.filter(a => readArticleIds.has(a.id)).length;
  }, [articles, readArticleIds]);

  return (
    <div 
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5"
      data-testid="component-finance-reading"
    >
      {/* Header com Identidade e Badge da Search API */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-600 to-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Leitura de Finanças
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300">
                <Sparkles className="w-2.5 h-2.5 text-sky-500" />
                <span>API de Busca Ativa</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Artigos educativos e guias práticos selecionados para a sua realidade financeira real.
            </p>
          </div>
        </div>

        {/* Status de Leitura & Atualizar */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>{readCount} de {articles.length} lidos</span>
          </div>

          <button
            type="button"
            onClick={() => fetchReadingSuggestions()}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            title="Buscar novas leituras educativas"
            data-testid="btn-refresh-reading"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Diagnóstico do Perfil Financeiro do Usuário */}
      <div 
        className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-emerald-500/10 border border-blue-200/70 dark:border-blue-900/40 text-xs space-y-2"
        data-testid="profile-diagnostic-box"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Diagnóstico do Seu Momento:</span>
            <span className="text-blue-600 dark:text-blue-400 underline decoration-blue-300">
              {profileSummary.primaryFocus}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            Fonte: {fonteInfo}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {profileSummary.summaryTags.map((tag, idx) => (
            <span 
              key={idx}
              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Barra de Pesquisa de Dúvidas / Tópicos com Search Grounding */}
      <form onSubmit={handleCustomSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={customSearchInput}
            onChange={e => setCustomSearchInput(e.target.value)}
            placeholder="Pergunte ao buscador educativo (ex: amortizar prazo Caixa, Tesouro Selic, faturas...)"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            data-testid="input-custom-search-topic"
          />
        </div>
        <button
          type="submit"
          disabled={!customSearchInput.trim() || isSearchingApi}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
          data-testid="btn-search-topic-api"
        >
          {isSearchingApi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>Pesquisar Artigos</span>
        </button>
      </form>

      {/* Filtros por Categoria / Pote */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
        {[
          { id: 'todos', label: 'Todos os Artigos' },
          { id: 'cartao', label: 'Cartão & Fatura' },
          { id: 'financiamento', label: 'Financiamento Imobiliário' },
          { id: 'investimentos', label: 'Investimentos & Reserva' },
          { id: 'potes', label: '6 Potes de Eker' },
          { id: 'pj', label: 'Operação PJ' },
        ].map(cat => {
          const isActive = activeTopic === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTopic(cat.id as ArticleTopic)}
              className={`px-3 py-1.5 rounded-xl border font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              data-testid={`filter-topic-${cat.id}`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center space-y-3" data-testid="loading-finance-reading">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Consultando artigos educativos e fontes oficiais...
            </p>
            <p className="text-[11px] text-slate-400">
              Conectando via Google Search aos dados de B3, Banco Central, Tesouro Direto e Sebrae.
            </p>
          </div>
        </div>
      )}

      {/* Lista de Artigos Sugeridos */}
      {!loading && filteredArticles.length === 0 && (
        <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Nenhum artigo encontrado para o filtro selecionado.
          </p>
          <button
            type="button"
            onClick={() => { setActiveTopic('todos'); setSearchQuery(''); }}
            className="text-xs text-blue-600 dark:text-blue-400 underline font-bold cursor-pointer"
          >
            Limpar filtros e ver todos os artigos
          </button>
        </div>
      )}

      {!loading && filteredArticles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="grid-finance-articles">
          {filteredArticles.map(article => {
            const meta = getTopicMeta(article.topic);
            const Icon = meta.icon;
            const isRead = readArticleIds.has(article.id);
            const isBookmarked = bookmarkedArticleIds.has(article.id);

            return (
              <div
                key={article.id}
                className={`flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all ${
                  isRead 
                    ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 opacity-80' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 shadow-2xs'
                }`}
                data-testid={`article-card-${article.id}`}
              >
                <div className="space-y-3">
                  {/* Topo do Card: Tópico, Tempo de Leitura e Ações Rápidas */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${meta.color}`}>
                        <Icon className="w-3 h-3" />
                        <span>{meta.label}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{article.readingTimeMinutes} min de leitura</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(article.id)}
                        className={`p-1 rounded-lg transition cursor-pointer ${
                          isBookmarked 
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                        title={isBookmarked ? 'Remover dos favoritos' : 'Salvar para ler depois'}
                        data-testid={`btn-bookmark-${article.id}`}
                      >
                        {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5 fill-amber-500" /> : <Bookmark className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleRead(article.id)}
                        className={`p-1 rounded-lg transition cursor-pointer ${
                          isRead 
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                        title={isRead ? 'Marcar como não lido' : 'Marcar como lido'}
                        data-testid={`btn-read-${article.id}`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isRead ? 'fill-emerald-600 text-white' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Título do Artigo */}
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {article.title}
                  </h4>

                  {/* Explicação de Relevância personalizada */}
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-1.5 text-[11px] text-amber-900 dark:text-amber-200">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span className="leading-tight font-medium">
                      <strong className="font-bold">Por que ler agora:</strong> {article.relevanceReason}
                    </span>
                  </div>

                  {/* Resumo do Artigo */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {article.summary}
                  </p>

                  {/* Pontos-chave */}
                  {article.keyTakeaways && article.keyTakeaways.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Pontos-chave:
                      </span>
                      <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        {article.keyTakeaways.slice(0, 3).map((takeaway, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                            <span className="leading-tight">{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Rodapé do Card: Fonte Confiável e Link Externo */}
                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400">Fonte:</span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                      {article.sourceName}
                    </span>
                  </div>

                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-600 dark:text-blue-300 text-xs font-bold transition shrink-0 cursor-pointer"
                    data-testid={`link-open-article-${article.id}`}
                  >
                    <span>Ler Artigo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Consultas Usadas no Grounding */}
      {queriesUsed.length > 0 && (
        <div className="pt-2 flex items-center gap-2 flex-wrap text-[10px] text-slate-400">
          <span className="font-semibold">Termos buscados na Web:</span>
          {queriesUsed.map((q, idx) => (
            <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono">
              "{q}"
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
