import { AccountType } from '../types';

export const STORAGE_KEY_CUSTOM_ACCOUNTS = 'yupee_custom_accounts';

export const POPULAR_BANKS: string[] = [
  'Inter PF',
  'Inter PJ',
  'Nubank',
  'Itaú',
  'Bradesco',
  'Banco do Brasil',
  'Santander',
  'Caixa Econômica',
  'C6 Bank',
  'BTG Pactual',
  'XP Investimentos',
  'Sicredi',
  'Sicoob',
  'Mercado Pago',
  'PagBank',
  'Passe / Transporte',
  'Dinheiro / Carteira',
  'Outro',
];

function getStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Loads custom user accounts from localStorage.
 */
export function loadCustomAccounts(): string[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY_CUSTOM_ACCOUNTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(item => item.length > 0);
    }
  } catch (err) {
    console.error('Failed to parse custom accounts:', err);
  }
  return [];
}

/**
 * Saves a new custom account or bank name to localStorage, returning the updated list.
 */
export function saveCustomAccount(accountName: string): string[] {
  const trimmed = accountName.trim();
  if (!trimmed) return loadCustomAccounts();

  const current = loadCustomAccounts();
  const existsInCustom = current.some(
    acc => acc.toLowerCase() === trimmed.toLowerCase()
  );

  let updated = current;
  if (!existsInCustom) {
    updated = [...current, trimmed];
    try {
      const storage = getStorage();
      if (storage) {
        storage.setItem(STORAGE_KEY_CUSTOM_ACCOUNTS, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to save custom account:', err);
    }
  }

  return updated;
}

/**
 * Removes a custom account from localStorage.
 */
export function removeCustomAccount(accountName: string): string[] {
  const current = loadCustomAccounts();
  const filtered = current.filter(
    acc => acc.toLowerCase() !== accountName.trim().toLowerCase()
  );
  try {
    const storage = getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY_CUSTOM_ACCOUNTS, JSON.stringify(filtered));
    }
  } catch (err) {
    console.error('Failed to remove custom account:', err);
  }
  return filtered;
}

/**
 * Returns all available accounts for dropdowns:
 * Default base list + custom accounts, deduplicated and sorted nicely.
 */
export function getAllAvailableAccounts(customAccountsList?: string[]): string[] {
  const custom = customAccountsList || loadCustomAccounts();
  const set = new Set<string>();

  // Base list
  POPULAR_BANKS.forEach(b => set.add(b));

  // Custom accounts added by the user
  custom.forEach(c => {
    if (c.trim()) {
      set.add(c.trim());
    }
  });

  return Array.from(set);
}

/**
 * Helper to check if an account name is custom (not in standard predefined popular list)
 */
export function isCustomAccount(accountName: string): boolean {
  return !POPULAR_BANKS.some(b => b.toLowerCase() === accountName.trim().toLowerCase());
}
