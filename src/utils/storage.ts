export const SCHEMA_VERSION_KEY = '@finance_app:schema_version';
export const CURRENT_SCHEMA_VERSION = '1.0';

function getLocalStorageSafely(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
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
 * Recursively checks that a parsed value contains no NaN or non-finite numbers.
 */
export function containsInvalidNumber(val: unknown): boolean {
  if (typeof val === 'number') {
    return !Number.isFinite(val);
  }
  if (Array.isArray(val)) {
    return val.some(item => containsInvalidNumber(item));
  }
  if (val && typeof val === 'object') {
    return Object.values(val as Record<string, unknown>).some(v => containsInvalidNumber(v));
  }
  return false;
}

/**
 * Replaces NaN/Infinity values inside objects/arrays with safe finite numbers (0)
 * or returns undefined if the root primitive number is invalid.
 */
export function sanitizeNumericTree<T>(val: T): T {
  if (typeof val === 'number') {
    return (Number.isFinite(val) ? val : 0) as unknown as T;
  }
  if (Array.isArray(val)) {
    return val.map(item => sanitizeNumericTree(item)) as unknown as T;
  }
  if (val && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = sanitizeNumericTree(v);
    }
    return out as T;
  }
  return val;
}

export function isValidTransactionRecord(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const tx = item as Record<string, unknown>;
  return (
    typeof tx.id === 'string' &&
    tx.id.length > 0 &&
    typeof tx.date === 'string' &&
    typeof tx.description === 'string' &&
    typeof tx.amount === 'number' &&
    Number.isFinite(tx.amount) &&
    typeof tx.type === 'string'
  );
}

export function isValidTransactionArray(val: unknown): boolean {
  if (!Array.isArray(val)) return false;
  return val.every(isValidTransactionRecord);
}

export function isValidDreamArray(val: unknown): boolean {
  if (!Array.isArray(val)) return false;
  return val.every(item => {
    if (!item || typeof item !== 'object') return false;
    const d = item as Record<string, unknown>;
    return (
      typeof d.id === 'string' &&
      typeof d.title === 'string' &&
      typeof d.target === 'number' &&
      Number.isFinite(d.target) &&
      typeof d.current === 'number' &&
      Number.isFinite(d.current)
    );
  });
}

export function isValidRecurringArray(val: unknown): boolean {
  if (!Array.isArray(val)) return false;
  return val.every(item => {
    if (!item || typeof item !== 'object') return false;
    const r = item as Record<string, unknown>;
    return (
      typeof r.id === 'string' &&
      typeof r.description === 'string' &&
      typeof r.amount === 'number' &&
      Number.isFinite(r.amount)
    );
  });
}

export function isValidAutoRulesArray(val: unknown): boolean {
  if (!Array.isArray(val)) return false;
  return val.every(item => {
    if (!item || typeof item !== 'object') return false;
    const rule = item as Record<string, unknown>;
    return typeof rule.id === 'string' && typeof rule.keyword === 'string';
  });
}

export function isValidStringArray(val: unknown): boolean {
  return Array.isArray(val) && val.every(item => typeof item === 'string');
}

/**
 * Reads and parses a JSON value from localStorage with full try/catch,
 * NaN guarding, and optional runtime validator.
 */
export function safeGetStorage<T>(
  key: string,
  fallback: T,
  validator?: (val: unknown) => boolean
): T {
  const storage = getLocalStorageSafely();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    if (raw === null || raw === '') return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;

    // Guard against NaN / Infinity numbers
    if (typeof parsed === 'number' && !Number.isFinite(parsed)) {
      return fallback;
    }
    if (containsInvalidNumber(parsed)) {
      return fallback;
    }

    if (validator && !validator(parsed)) {
      return fallback;
    }

    return parsed as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely serializes and persists a value to localStorage, guarding against
 * NaN/Infinity values and QuotaExceededError / security errors.
 */
export function safeSetStorage<T>(key: string, value: T): void {
  const storage = getLocalStorageSafely();
  if (!storage) return;

  try {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return;
    }

    const sanitized = sanitizeNumericTree(value);
    const serialized = JSON.stringify(sanitized, (_k, v) => {
      if (typeof v === 'number' && !Number.isFinite(v)) {
        return 0;
      }
      return v;
    });

    if (serialized !== undefined) {
      storage.setItem(key, serialized);
    }
  } catch {
    // Gracefully absorb QuotaExceededError or restricted storage access
  }
}

function sanitizeArrayKey(key: string, itemGuard: (item: unknown) => boolean): void {
  const storage = getLocalStorageSafely();
  if (!storage) return;

  try {
    const raw = storage.getItem(key);
    if (!raw) return;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      storage.removeItem(key);
      return;
    }

    const cleaned = parsed
      .map(entry => sanitizeNumericTree(entry))
      .filter(entry => itemGuard(entry));

    storage.setItem(key, JSON.stringify(cleaned));
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore cleanup failures
    }
  }
}

function sanitizeRecordOfNumbersKey(key: string): void {
  const storage = getLocalStorageSafely();
  if (!storage) return;

  try {
    const raw = storage.getItem(key);
    if (!raw) return;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      storage.removeItem(key);
      return;
    }

    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n) && n >= 0) {
        cleaned[k] = n;
      }
    }
    storage.setItem(key, JSON.stringify(cleaned));
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore cleanup failures
    }
  }
}

/**
 * Ensures storage carries `@finance_app:schema_version` = '1.0'.
 * When missing or mismatched, sanitizes legacy or malformed arrays/numbers
 * across known finance keys and stamps the current schema version.
 */
export function ensureStorageSchemaVersion(): string {
  const storage = getLocalStorageSafely();
  if (!storage) return CURRENT_SCHEMA_VERSION;

  try {
    const existingVersion = storage.getItem(SCHEMA_VERSION_KEY);
    if (existingVersion === CURRENT_SCHEMA_VERSION) {
      return CURRENT_SCHEMA_VERSION;
    }

    sanitizeArrayKey('yupee_transactions_v2', isValidTransactionRecord);
    sanitizeArrayKey('yupee_dreams_v2', item => {
      if (!item || typeof item !== 'object') return false;
      const d = item as Record<string, unknown>;
      return typeof d.id === 'string' && typeof d.title === 'string' && typeof d.target === 'number' && Number.isFinite(d.target);
    });
    sanitizeArrayKey('yupee_recurring_v3', item => {
      if (!item || typeof item !== 'object') return false;
      const r = item as Record<string, unknown>;
      return typeof r.id === 'string' && typeof r.description === 'string' && typeof r.amount === 'number' && Number.isFinite(r.amount);
    });
    sanitizeArrayKey('yupee_rules_v2', item => {
      if (!item || typeof item !== 'object') return false;
      const rule = item as Record<string, unknown>;
      return typeof rule.id === 'string' && typeof rule.keyword === 'string';
    });

    sanitizeRecordOfNumbersKey('yupee_jar_limits_v1');
    sanitizeRecordOfNumbersKey('yupee_jar_savings_targets_v1');
    sanitizeRecordOfNumbersKey('@finance_app:jar_percentages_v1');

    storage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
  } catch {
    // Gracefully absorb storage access failures
  }

  return CURRENT_SCHEMA_VERSION;
}
