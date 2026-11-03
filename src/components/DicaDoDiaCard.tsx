import React, { useState, useEffect } from 'react';
import { 
  Sparkles, RefreshCw, Lightbulb, CheckCircle2, 
  ArrowRight, ShieldCheck, Flame, BookOpen, Quote
} from 'lucide-react';
import { Transaction } from '../types';
import { calculateFinancialMetrics, formatBRL } from '../utils/finance';

interface FinancialTip {
  titulo: string;
  categoria: string;
  impacto: string;
  dica: string;
  acaoRecomendada: string;
  citacaoEducativa?: string;
}

interface DicaDoDiaCardProps {
  transactions: Transaction[];
  usePjProfitInPf: boolean;
  onNavigateToScreen?: (screen: any) => void;
}

export const DicaDoDiaCard: React.FC<DicaDoDiaCardProps> = ({
  transactions,
  usePjProfitInPf,
  onNavigateToScreen
}) => {
  const [tip, setTip] = useState<FinancialTip | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const metrics = calculateFinancialMetrics(transactions, usePjProfitInPf);

  // Generate fallback tip based on current financial metrics
  const getSmartFallbackTip = (): FinancialTip => {
    if (metrics.overdraftInterest > 0) {
      return {
        titulo: 'Estanque o Cheque Especial do Financiamento',
        categoria: 'Proteção de Fluxo',
        impacto: 'Economia imediata de R$ 140/mês (R$ 1.680/ano)',
        dica: 'O débito habitacional de R$ 1.290 ocorre no dia 25, mas o reembolso de Nathan (R$ 858) cai antes. Manter um colchão mínimo de R$ 1.000 do lucro PJ na conta Inter PF evita que você pague juros desnecessários.',
        acaoRecomendada: 'Ativar o Escudo de Cheque Especial na aba Controle Automático.',
        citacaoEducativa: 'Riqueza não é apenas quanto você ganha, mas quantos vazamentos você estanca.'
      };
    }

    if (metrics.jars.DIV_10 && metrics.jars.DIV_10.usageRatio > 80) {
      return {
        titulo: 'Equilíbrio no Pote de Diversão (10%)',
        categoria: '6 Potes de Harv Eker',
        impacto: 'Preserva margem de segurança no fim do mês',
        dica: 'Seus gastos no cartão C6 dedicados ao lazer atingiram 80% do teto planejado. Aproveite o restante do mês com programas ao ar livre ou momentos em família que não demandem compras impulsivas.',
        acaoRecomendada: 'Verificar a fatura do cartão C6 na aba de 6 Potes.',
        citacaoEducativa: 'Orçamento não é restrição, é liberdade para gastar sem culpa naquilo que você planejou.'
      };
    }

    return {
      titulo: 'Consistência nos Aportes de Longo Prazo',
      categoria: 'Investimentos & Sonhos',
      impacto: 'Acelera a conquista da Reserva Familiar em até 4 meses',
      dica: 'Seu orçamento fechou em superávit consolidado (+R$ 2,31 livre e lucro PJ equilibrado). Automatizar um aporte mensal contínuo no pote de Reserva (PLP 10%) cria uma muralha de tranquilidade para os próximos anos.',
      acaoRecomendada: 'Fazer um aporte voluntário na aba Sonhos & Metas.',
      citacaoEducativa: 'Pequenos aportes regulares vencem grandes intenções esporádicas.'
    };
  };

  const fetchTipFromGemini = async () => {
    setLoading(true);
    setError(null);

    const spendingProfile = {
      rendaTotal: metrics.totalGrossIncome,
      rendaClt: metrics.cltIncome,
      lucroPj: metrics.pjNetProfit,
      totalGastoPF: metrics.totalSpentPF,
      saldoConsolidado: metrics.netBalanceConsolidated,
      chequeEspecialJuros: metrics.overdraftInterest,
      faturaC6Total: metrics.c6Total,
      potes: Object.entries(metrics.jars).map(([k, j]) => ({
        pote: j.name,
        gasto: j.spent,
        teto: j.budget,
        usoPercentual: Math.round(j.usageRatio)
      }))
    };

    try {
      const response = await fetch('/api/dica-do-dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spendingProfile })
      });

      if (!response.ok) {
        throw new Error('Falha na resposta da API');
      }

      const data = await response.json();
      if (data && data.titulo) {
        setTip(data);
        localStorage.setItem('yupee_last_tip_v2', JSON.stringify({
          tip: data,
          timestamp: Date.now()
        }));
      } else {
        throw new Error('Formato inválido retornado');
      }
    } catch (err: any) {
      console.warn('Usando dica inteligente de contingência:', err);
      const fallback = getSmartFallbackTip();
      setTip(fallback);
    } finally {
      setLoading(false);
    }
  };

  // On mount, load cached tip or generate
  useEffect(() => {
    try {
      const cached = localStorage.getItem('yupee_last_tip_v2');
      if (cached) {
        const { tip: cachedTip, timestamp } = JSON.parse(cached);
        // keep cached for 6 hours unless refreshed
        if (Date.now() - timestamp < 6 * 60 * 60 * 1000) {
          setTip(cachedTip);
          return;
        }
      }
    } catch {}

    fetchTipFromGemini();
  }, []);

  const activeTip = tip || getSmartFallbackTip();

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white p-5 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden border border-indigo-700/40">
      
      {/* Decorative gradient blur rings */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 font-black rounded-xl shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                Dica do Dia • Educação Financeira
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 font-mono">
                Gemini AI
              </span>
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-white">
              {activeTip.titulo}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[11px] font-bold">
            {activeTip.categoria}
          </span>

          <button
            onClick={fetchTipFromGemini}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition active:scale-95 disabled:opacity-50"
            title="Atualizar conselho financeiro com Gemini"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-300' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tip Content */}
      <div className="pt-3 space-y-3 relative z-10">
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
          {activeTip.dica}
        </p>

        {/* Impact & Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-emerald-500/20 text-emerald-300 rounded-lg shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] text-emerald-200 font-bold">
              Impacto: <strong>{activeTip.impacto}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-[11px] text-amber-200">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{activeTip.acaoRecomendada}</span>
          </div>
        </div>

        {/* Inspirational quote */}
        {activeTip.citacaoEducativa && (
          <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-[11px] text-slate-300/80 italic">
            <Quote className="w-3 h-3 text-amber-400 shrink-0" />
            <span>"{activeTip.citacaoEducativa}"</span>
          </div>
        )}
      </div>

    </div>
  );
};
