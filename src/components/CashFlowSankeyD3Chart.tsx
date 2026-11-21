import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GitBranch, Filter, ArrowRight, Layers, User, Briefcase } from 'lucide-react';
import { Transaction } from '../types';
import {
  buildCashFlowSankeyData,
  formatBRL,
  SankeyLink,
  SankeyNode,
  SankeyPeriodFilter,
  SankeyScopeFilter,
} from '../utils/finance';

export interface CashFlowSankeyD3ChartProps {
  transactions: Transaction[];
  baseMonthlyIncome: number;
  referenceMonth?: string;
  className?: string;
}

const PERIOD_OPTIONS: Array<{ id: SankeyPeriodFilter; label: string }> = [
  { id: 'MONTH', label: 'Mês Atual' },
  { id: '3M', label: '3M' },
  { id: 'YEAR', label: 'Ano Atual' },
];

const SCOPE_OPTIONS: Array<{
  id: SankeyScopeFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
}> = [
  {
    id: 'CONSOLIDATED',
    label: 'Consolidado',
    icon: Layers,
    activeClass: 'bg-emerald-600 text-white shadow-xs',
  },
  {
    id: 'PF',
    label: 'Apenas PF',
    icon: User,
    activeClass: 'bg-indigo-600 text-white shadow-xs',
  },
  {
    id: 'MEI',
    label: 'Apenas MEI',
    icon: Briefcase,
    activeClass: 'bg-sky-600 text-white shadow-xs',
  },
];

interface PositionedNode extends SankeyNode {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  height: number;
}

interface PositionedLink extends SankeyLink {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  thickness: number;
}

type HoveredSankeyTarget =
  | { kind: 'link'; link: PositionedLink; xPx: number; yPx: number }
  | { kind: 'node'; node: PositionedNode; xPx: number; yPx: number };

function formatPctPtBr(pct: number): string {
  return `${pct.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function layoutThreeStageSankey(
  nodes: SankeyNode[],
  links: SankeyLink[],
  innerWidth: number,
  innerHeight: number
): { positionedNodes: PositionedNode[]; positionedLinks: PositionedLink[] } {
  const nodeWidth = 18;
  const nodePadding = 12;

  const colX: Record<0 | 1 | 2, number> = {
    0: 0,
    1: Math.round((innerWidth - nodeWidth) * 0.48),
    2: Math.max(nodeWidth * 2 + 60, innerWidth - nodeWidth),
  };

  const stages: Array<0 | 1 | 2> = [0, 1, 2];
  const nodeMap = new Map<string, PositionedNode>();
  const positionedNodes: PositionedNode[] = [];

  for (const stage of stages) {
    const stageNodes = nodes.filter(n => n.stage === stage);
    if (stageNodes.length === 0) continue;

    const totalVal = stageNodes.reduce((s, n) => s + n.value, 0) || 1;
    const totalPad = Math.max(0, (stageNodes.length - 1) * nodePadding);
    const availableH = Math.max(stageNodes.length * 8, innerHeight - totalPad);

    // First pass: proportional heights with minHeight = 4px
    const rawHeights = stageNodes.map(n => Math.max(4, (n.value / totalVal) * availableH));
    const rawSum = rawHeights.reduce((a, b) => a + b, 0);
    const scale = rawSum > availableH ? availableH / rawSum : 1;
    const heights = rawHeights.map(h => Math.max(4, h * scale));

    const totalUsedH = heights.reduce((a, b) => a + b, 0) + totalPad;
    let cursorY = Math.max(0, (innerHeight - totalUsedH) / 2);

    stageNodes.forEach((n, idx) => {
      const h = heights[idx];
      const x0 = colX[stage];
      const pNode: PositionedNode = {
        ...n,
        x0,
        x1: x0 + nodeWidth,
        y0: cursorY,
        y1: cursorY + h,
        height: h,
      };
      nodeMap.set(n.id, pNode);
      positionedNodes.push(pNode);
      cursorY += h + nodePadding;
    });
  }

  // Track cumulative outgoing & incoming vertical offsets inside each node bar
  const outOffset = new Map<string, number>();
  const inOffset = new Map<string, number>();
  positionedNodes.forEach(n => {
    outOffset.set(n.id, n.y0);
    inOffset.set(n.id, n.y0);
  });

  // Sort links cleanly by source vertical position, then target vertical position to minimize crossings
  const sortedLinks = [...links].sort((a, b) => {
    const sa = nodeMap.get(a.source);
    const sb = nodeMap.get(b.source);
    if (sa && sb && sa.y0 !== sb.y0) return sa.y0 - sb.y0;
    const ta = nodeMap.get(a.target);
    const tb = nodeMap.get(b.target);
    return (ta?.y0 ?? 0) - (tb?.y0 ?? 0);
  });

  const positionedLinks: PositionedLink[] = [];
  for (const link of sortedLinks) {
    const src = nodeMap.get(link.source);
    const tgt = nodeMap.get(link.target);
    if (!src || !tgt || src.value <= 0 || tgt.value <= 0) continue;

    const srcThickness = (link.value / src.value) * src.height;
    const tgtThickness = (link.value / tgt.value) * tgt.height;
    const thickness = Math.max(2, (srcThickness + tgtThickness) / 2);

    const syStart = outOffset.get(src.id) ?? src.y0;
    const tyStart = inOffset.get(tgt.id) ?? tgt.y0;

    outOffset.set(src.id, syStart + srcThickness);
    inOffset.set(tgt.id, tyStart + tgtThickness);

    const sy = Math.min(src.y1 - 1, Math.max(src.y0 + 1, syStart + srcThickness / 2));
    const ty = Math.min(tgt.y1 - 1, Math.max(tgt.y0 + 1, tyStart + tgtThickness / 2));

    positionedLinks.push({
      ...link,
      sx: src.x1,
      sy,
      tx: tgt.x0,
      ty,
      thickness,
    });
  }

  return { positionedNodes, positionedLinks };
}

function collectConnectedGraph(
  startNodeIds: string[],
  links: PositionedLink[]
): { nodeIds: Set<string>; linkIds: Set<string> } {
  const nodeIds = new Set<string>(startNodeIds);
  const linkIds = new Set<string>();

  // Traverse downstream from startNodeIds
  const downQueue = [...startNodeIds];
  while (downQueue.length > 0) {
    const curr = downQueue.shift()!;
    for (const l of links) {
      if (l.source === curr) {
        linkIds.add(l.id);
        if (!nodeIds.has(l.target)) {
          nodeIds.add(l.target);
          downQueue.push(l.target);
        }
      }
    }
  }

  // Traverse upstream from startNodeIds
  const upQueue = [...startNodeIds];
  while (upQueue.length > 0) {
    const curr = upQueue.shift()!;
    for (const l of links) {
      if (l.target === curr) {
        linkIds.add(l.id);
        if (!nodeIds.has(l.source)) {
          nodeIds.add(l.source);
          upQueue.push(l.source);
        }
      }
    }
  }

  return { nodeIds, linkIds };
}

export const CashFlowSankeyD3Chart: React.FC<CashFlowSankeyD3ChartProps> = ({
  transactions,
  baseMonthlyIncome,
  referenceMonth,
  className = '',
}) => {
  const [activePeriod, setActivePeriod] = useState<SankeyPeriodFilter>('MONTH');
  const [activeScope, setActiveScope] = useState<SankeyScopeFilter>('CONSOLIDATED');
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 880,
    height: 410,
  });
  const [hoveredTarget, setHoveredTarget] = useState<HoveredSankeyTarget | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const sankeyData = useMemo(
    () =>
      buildCashFlowSankeyData({
        transactions,
        baseMonthlyIncome,
        period: activePeriod,
        scope: activeScope,
        referenceMonth,
      }),
    [transactions, baseMonthlyIncome, activePeriod, activeScope, referenceMonth]
  );

  // Observe container size cleanly via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) {
        const targetH = w < 640 ? 390 : 420;
        setDimensions(prev =>
          prev.width === w && prev.height === targetH ? prev : { width: w, height: targetH }
        );
      }
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const obs = new ResizeObserver(update);
      obs.observe(el);
      return () => obs.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    setHoveredTarget(null);
  }, [activePeriod, activeScope]);

  // D3 Sankey Rendering
  useEffect(() => {
    const svgNode = svgRef.current;
    if (!svgNode) return;

    const svg = d3.select(svgNode);
    svg.selectAll('*').remove();

    const width = Math.max(700, dimensions.width);
    const height = Math.max(360, dimensions.height);
    const margin = {
      top: 34,
      right: 195,
      bottom: 18,
      left: 165,
    };
    const innerWidth = Math.max(240, width - margin.left - margin.right);
    const innerHeight = Math.max(220, height - margin.top - margin.bottom);

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const { positionedNodes, positionedLinks } = layoutThreeStageSankey(
      sankeyData.nodes,
      sankeyData.links,
      innerWidth,
      innerHeight
    );

    if (positionedNodes.length === 0) return;

    const defs = svg.append('defs');
    const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Column Headers
    const stageHeaders: Array<{ stage: 0 | 1 | 2; title: string; x: number; anchor: string }> = [
      { stage: 0, title: '1. Fontes de Entrada', x: 9, anchor: 'end' },
      {
        stage: 1,
        title: '2. Alocação 6 Potes',
        x: Math.round((innerWidth - 18) * 0.48) + 9,
        anchor: 'middle',
      },
      { stage: 2, title: '3. Destinos & Reserva', x: innerWidth - 9, anchor: 'start' },
    ];

    root
      .selectAll('.sankey-stage-header')
      .data(stageHeaders)
      .enter()
      .append('text')
      .attr('class', 'sankey-stage-header fill-slate-500 dark:fill-slate-400')
      .attr('x', d => d.x)
      .attr('y', -14)
      .attr('text-anchor', d => d.anchor)
      .style('font-size', '11px')
      .style('font-weight', '700')
      .text(d => d.title);

    // Gradient definitions per link (userSpaceOnUse prevents zero-height bbox failure on horizontal paths)
    positionedLinks.forEach((link, idx) => {
      const grad = defs
        .append('linearGradient')
        .attr('id', `sankey-link-grad-${idx}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.sx)
        .attr('y1', link.sy)
        .attr('x2', link.tx)
        .attr('y2', link.ty);

      grad.append('stop').attr('offset', '0%').attr('stop-color', link.sourceColor);
      grad.append('stop').attr('offset', '100%').attr('stop-color', link.targetColor);
    });

    const horizontalLink = d3
      .linkHorizontal<PositionedLink, [number, number]>()
      .source(d => [d.sx, d.sy])
      .target(d => [d.tx, d.ty]);

    const linkGroup = root.append('g').attr('fill', 'none');
    const linkPaths = linkGroup
      .selectAll<SVGPathElement, PositionedLink>('.d3-sankey-link')
      .data(positionedLinks, d => d.id)
      .enter()
      .append('path')
      .attr('class', 'd3-sankey-link')
      .attr('data-testid', d => `sankey-link-${d.id}`)
      .attr('d', d => horizontalLink(d) || '')
      .attr('stroke', (_d, idx) => `url(#sankey-link-grad-${idx})`)
      .attr('stroke-width', d => d.thickness)
      .attr('stroke-opacity', 0.32)
      .style('cursor', 'pointer')
      .style('transition', 'stroke-opacity 150ms ease');

    const nodeGroup = root.append('g');
    const nodeGroups = nodeGroup
      .selectAll<SVGGElement, PositionedNode>('.d3-sankey-node')
      .data(positionedNodes, d => d.id)
      .enter()
      .append('g')
      .attr('class', 'd3-sankey-node')
      .attr('data-testid', d => `sankey-node-${d.id}`)
      .style('cursor', 'pointer');

    const nodeRects = nodeGroups
      .append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.height)
      .attr('rx', 3)
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0.94)
      .style('transition', 'fill-opacity 150ms ease');

    // Labels positioned cleanly next to each column
    nodeGroups
      .append('text')
      .attr('x', d => {
        if (d.stage === 0) return d.x0 - 8;
        if (d.stage === 1) return d.x1 + 8;
        return d.x1 + 8;
      })
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '-0.18em')
      .attr('text-anchor', d => (d.stage === 0 ? 'end' : 'start'))
      .attr('class', 'fill-slate-800 dark:fill-slate-100')
      .style('font-size', '11px')
      .style('font-weight', '700')
      .text(d => (d.label.length > 24 ? `${d.label.slice(0, 23)}…` : d.label));

    nodeGroups
      .append('text')
      .attr('x', d => {
        if (d.stage === 0) return d.x0 - 8;
        if (d.stage === 1) return d.x1 + 8;
        return d.x1 + 8;
      })
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '0.95em')
      .attr('text-anchor', d => (d.stage === 0 ? 'end' : 'start'))
      .attr('class', 'fill-slate-500 dark:fill-slate-400')
      .style('font-size', '10px')
      .style('font-weight', '600')
      .style('font-variant-numeric', 'tabular-nums')
      .text(d => `${formatBRL(d.value)} · ${formatPctPtBr(d.percentage)}`);

    const applyHighlight = (connectedNodes: Set<string> | null, connectedLinks: Set<string> | null) => {
      if (!connectedNodes || !connectedLinks) {
        linkPaths.attr('stroke-opacity', 0.32);
        nodeRects.attr('fill-opacity', 0.94);
        return;
      }
      linkPaths.attr('stroke-opacity', d => (connectedLinks.has(d.id) ? 0.75 : 0.08));
      nodeRects.attr('fill-opacity', d => (connectedNodes.has(d.id) ? 1 : 0.28));
    };

    nodeGroups
      .on('mouseenter', function (_event, d) {
        const { nodeIds, linkIds } = collectConnectedGraph([d.id], positionedLinks);
        applyHighlight(nodeIds, linkIds);
        setHoveredTarget({
          kind: 'node',
          node: d,
          xPx: margin.left + (d.stage === 2 ? d.x0 : d.x1),
          yPx: margin.top + (d.y0 + d.y1) / 2,
        });
      })
      .on('mouseleave', () => {
        applyHighlight(null, null);
        setHoveredTarget(null);
      });

    linkPaths
      .on('mouseenter', function (_event, d) {
        const connected = new Set<string>([d.source, d.target]);
        const linkSet = new Set<string>([d.id]);
        applyHighlight(connected, linkSet);
        setHoveredTarget({
          kind: 'link',
          link: d,
          xPx: margin.left + (d.sx + d.tx) / 2,
          yPx: margin.top + (d.sy + d.ty) / 2,
        });
      })
      .on('mouseleave', () => {
        applyHighlight(null, null);
        setHoveredTarget(null);
      });
  }, [sankeyData, dimensions]);

  const effectiveRenderWidth = Math.max(700, dimensions.width);

  return (
    <section
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5 ${className}`}
      data-testid="card-cash-flow-sankey"
    >
      {/* Header Controls */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-500 shrink-0" />
            <span>Fluxo de Caixa Sankey (Entradas → 6 Potes → Destinos)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rastreie cada real desde a origem de receita até os 6 potes e categorias finais com conservação de 100% do fluxo ({sankeyData.periodLabel}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Period Pills */}
          <div
            role="group"
            aria-label="Filtrar período do fluxo Sankey"
            data-testid="sankey-period-selector"
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700"
          >
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1 shrink-0" />
            {PERIOD_OPTIONS.map(opt => {
              const isActive = activePeriod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActivePeriod(opt.id)}
                  data-testid={`btn-sankey-period-${opt.id}`}
                  aria-pressed={isActive}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Scope Pills */}
          <div
            role="group"
            aria-label="Filtrar escopo do fluxo Sankey"
            data-testid="sankey-scope-selector"
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700"
          >
            {SCOPE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isActive = activeScope === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveScope(opt.id)}
                  data-testid={`btn-sankey-scope-${opt.id}`}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? opt.activeClass
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Flow Conservation Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
        <div className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
            Entradas Totais
          </span>
          <span
            data-testid="sankey-total-inflow"
            className="text-base font-black text-slate-900 dark:text-white"
          >
            {formatBRL(sankeyData.totalInflow)}
          </span>
          {sankeyData.isFallbackIncome && (
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Base mensal estimada aplicada
            </span>
          )}
        </div>

        <div className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
            Despesas Direcionadas
          </span>
          <span
            data-testid="sankey-total-expenses"
            className="text-base font-black text-rose-600 dark:text-rose-400"
          >
            {formatBRL(sankeyData.totalExpenses)}
          </span>
        </div>

        <div className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
            Saldo Retido / Investido
          </span>
          <span
            data-testid="sankey-total-retained"
            className="text-base font-black text-emerald-600 dark:text-emerald-400"
          >
            {formatBRL(sankeyData.totalRetained)}
          </span>
        </div>
      </div>

      {/* Horizontal Scroll Container on Narrow Screens + SVG + Floating Tooltip */}
      <div
        ref={containerRef}
        className="relative w-full overflow-x-auto select-none"
        data-testid="sankey-scroll-container"
      >
        <div
          className="relative"
          style={{ minWidth: `${effectiveRenderWidth}px` }}
        >
          <svg
            ref={svgRef}
            className="w-full block overflow-visible"
            role="img"
            aria-label="Diagrama Sankey do fluxo financeiro em 3 estágios"
          />

          {hoveredTarget && (
            <div
              data-testid="sankey-hover-tooltip"
              className="pointer-events-none absolute z-20 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl text-xs space-y-1.5"
              style={{
                left:
                  hoveredTarget.xPx > effectiveRenderWidth - 275
                    ? Math.max(8, hoveredTarget.xPx - 266)
                    : Math.min(effectiveRenderWidth - 264, hoveredTarget.xPx + 14),
                top:
                  hoveredTarget.yPx < 95
                    ? Math.min(dimensions.height - 105, hoveredTarget.yPx + 12)
                    : Math.max(8, hoveredTarget.yPx - 82),
              }}
            >
              {hoveredTarget.kind === 'link' ? (
                <>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="truncate">{hoveredTarget.link.sourceLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{hoveredTarget.link.targetLabel}</span>
                  </div>
                  <div className="flex items-center justify-between tabular-nums">
                    <span className="font-black text-slate-900 dark:text-white">
                      {formatBRL(hoveredTarget.link.value)}
                    </span>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {formatPctPtBr(hoveredTarget.link.percentage)} das entradas
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-100 dark:border-slate-800 truncate">
                    {hoveredTarget.node.label}
                  </div>
                  <div className="flex items-center justify-between tabular-nums">
                    <span className="font-black text-slate-900 dark:text-white">
                      {formatBRL(hoveredTarget.node.value)}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPctPtBr(hoveredTarget.node.percentage)} do fluxo
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
