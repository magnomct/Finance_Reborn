import { describe, it, expect, beforeEach } from 'bun:test';
import {
  saveCustomAccount,
  loadCustomAccounts,
  removeCustomAccount,
  getAllAvailableAccounts,
  isCustomAccount,
  POPULAR_BANKS,
  STORAGE_KEY_CUSTOM_ACCOUNTS
} from '../src/utils/customAccounts';
import { buildFreshEnvironment } from '../src/utils/environmentSetup';

// Mock localStorage for node/bun environment
const storageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true
});

describe('customAccounts utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads an empty list when localStorage is empty', () => {
    const accounts = loadCustomAccounts();
    expect(accounts).toEqual([]);
  });

  it('saves and retrieves custom accounts', () => {
    const updated = saveCustomAccount('Banco Safra');
    expect(updated).toContain('Banco Safra');

    const loaded = loadCustomAccounts();
    expect(loaded).toContain('Banco Safra');
  });

  it('does not duplicate accounts with different casing', () => {
    saveCustomAccount('Banco Safra');
    const updated = saveCustomAccount('banco safra');
    expect(updated.filter(a => a.toLowerCase() === 'banco safra').length).toBe(1);
  });

  it('trims whitespace and ignores empty account names', () => {
    saveCustomAccount('   ');
    expect(loadCustomAccounts()).toEqual([]);

    saveCustomAccount('  Caixa Tem  ');
    expect(loadCustomAccounts()).toEqual(['Caixa Tem']);
  });

  it('removes custom accounts properly', () => {
    saveCustomAccount('Conta Nomad');
    saveCustomAccount('Banco Pan');
    expect(loadCustomAccounts()).toHaveLength(2);

    const afterRemove = removeCustomAccount('Conta Nomad');
    expect(afterRemove).toEqual(['Banco Pan']);
    expect(loadCustomAccounts()).toEqual(['Banco Pan']);
  });

  it('returns all available accounts combining popular banks and custom accounts', () => {
    saveCustomAccount('Banco Original');
    const all = getAllAvailableAccounts();

    expect(all).toContain('Inter PF');
    expect(all).toContain('Nubank');
    expect(all).toContain('Banco Original');
    expect(all.length).toBeGreaterThan(POPULAR_BANKS.length);
  });

  it('correctly identifies whether an account is custom or standard', () => {
    expect(isCustomAccount('Inter PF')).toBe(false);
    expect(isCustomAccount('Nubank')).toBe(false);
    expect(isCustomAccount('C6 Bank')).toBe(false);
    expect(isCustomAccount('Banco Safra')).toBe(true);
    expect(isCustomAccount('Cooperativa Sicredi Central')).toBe(true);
  });

  it('integrates seamlessly with buildFreshEnvironment using custom account name', () => {
    const customBank = 'Banco do Nordeste';
    const env = buildFreshEnvironment({
      mode: 'custom_wizard',
      scope: 'PF',
      accountName: customBank,
      initialBalance: 3500,
      monthlyIncome: 8000,
      referenceDate: '2026-11-01'
    });

    // Verify initial balance transaction is attributed to the custom bank
    const initTx = env.transactions.find(t => t.description.includes('Saldo Inicial'));
    expect(initTx).toBeDefined();
    expect(initTx?.account).toBe(customBank);
    expect(initTx?.amount).toBe(3500);
  });
});
