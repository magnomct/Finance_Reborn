import { describe, it, expect } from 'bun:test';
import { 
  calculateMEIMetrics, 
  isMEITransferLoggedForMonth,
  MEI_ANNUAL_CEILING, 
  MEI_TOLERANCE_20PCT_CEILING,
  MEI_MONTHLY_SAFE_PACE,
  MEI_DAS_PRESETS
} from '../src/utils/meiMetrics.ts';

describe('MEI Financial Metrics and Payout Calculations', () => {
  it('correctly tracks annual ceiling (R$ 81.000) and remaining quota', () => {
    const metrics = calculateMEIMetrics([], { referenceMonth: '2026-10' });

    expect(metrics.annualCeiling).toBe(81000);
    expect(metrics.annualToleranceCeiling).toBe(97200);
    expect(metrics.ytdRevenue).toBeGreaterThan(25000);
    expect(metrics.ytdRevenue).toBeLessThan(81000);
    expect(metrics.remainingAnnualQuota).toBe(81000 - metrics.ytdRevenue);
    expect(metrics.consumedPct).toBeGreaterThan(30);
    expect(metrics.consumedPct).toBeLessThan(100);
    expect(metrics.exceedStatus).toBe('safe');
  });

  it('correctly uses fixed DAS based on activity preset', () => {
    // Serviços: R$ 80,90
    const mServ = calculateMEIMetrics([], { activityType: 'servicos', referenceMonth: '2026-10' });
    expect(mServ.dasConfig.amount).toBe(80.90);
    expect(mServ.dasConfig.name).toContain('Serviços');

    // Comércio: R$ 76,90
    const mCom = calculateMEIMetrics([], { activityType: 'comercio', referenceMonth: '2026-10' });
    expect(mCom.dasConfig.amount).toBe(76.90);

    // Ambos: R$ 81,90
    const mAmb = calculateMEIMetrics([], { activityType: 'ambos', referenceMonth: '2026-10' });
    expect(mAmb.dasConfig.amount).toBe(81.90);
  });

  it('calculates Mode 1: Presunção 32% (Serviços) correctly for IRPF', () => {
    const metrics = calculateMEIMetrics([], {
      referenceMonth: '2026-10',
      activityType: 'servicos',
      pjReservePct: 10,
      irpfMode: 'presuncao_32',
    });

    const expected32Pct = parseFloat((metrics.currentMonthRevenue * 0.32).toFixed(2));
    expect(metrics.exemptProfitDistribution).toBe(Math.min(metrics.totalNetProfitTransferable, expected32Pct));
    expect(metrics.baseWithdrawal).toBe(parseFloat((metrics.totalNetProfitTransferable - metrics.exemptProfitDistribution).toFixed(2)));
    expect(metrics.totalPayoutPF).toBe(metrics.totalNetProfitTransferable);
  });

  it('calculates Mode 2: Livro Caixa / Contabilidade (100% Lucro Isento)', () => {
    const metrics = calculateMEIMetrics([], {
      referenceMonth: '2026-10',
      activityType: 'servicos',
      pjReservePct: 10,
      irpfMode: 'livro_caixa_100',
    });

    // In livro caixa mode, base withdrawal is up to 1 minimum wage (R$ 1.518,00),
    // and remaining net profit is 100% exempt profit distribution
    expect(metrics.totalPayoutPF).toBe(metrics.totalNetProfitTransferable);
    expect(metrics.baseWithdrawal + metrics.exemptProfitDistribution).toBe(metrics.totalNetProfitTransferable);
  });

  it('detects when transfer is already logged in transactions', () => {
    const mockTxs = [
      {
        id: 'tx-1',
        date: '2026-10-15',
        description: 'Transferência MEI - Retirada Base',
        amount: 500,
        type: 'receita',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado',
      },
      {
        id: 'tx-2',
        date: '2026-10-15',
        description: 'Transferência MEI - Lucro Isento',
        amount: 800,
        type: 'receita',
        jar: 'LIF_10',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado',
      },
    ];

    const logCheck = isMEITransferLoggedForMonth(mockTxs, '2026-10');
    expect(logCheck.isLogged).toBe(true);
    expect(logCheck.baseTx).toBeDefined();
    expect(logCheck.exemptTx).toBeDefined();

    // For another month, should not be logged
    const logCheckNov = isMEITransferLoggedForMonth(mockTxs, '2026-11');
    expect(logCheckNov.isLogged).toBe(false);
  });
});
