export type RateLimiterOptions = {
  maxAttempts: number; // e.g., 5
  windowMs: number; // e.g., 15 * 60 * 1000
  blockMs: number; // e.g., 15 * 60 * 1000
};

const DEFAULTS: RateLimiterOptions = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockMs: 30 * 60 * 1000,  // 30 minutes block (increased from 15)
};

// Enhanced rate limiter with progressive delays
const PROGRESSIVE_DEFAULTS: RateLimiterOptions = {
  maxAttempts: 3,
  windowMs: 5 * 60 * 1000,   // 5 minutes window
  blockMs: 60 * 60 * 1000,   // 1 hour block for sensitive operations
};

type Entry = {
  attempts: number[]; // timestamps
  blockedUntil?: number;
};

const storageKey = (key: string) => `rl:${key.replace(/[^\w.-]/g, '')}`; // Sanitize key

function load(key: string): Entry {
  try {
    const sanitizedKey = storageKey(key);
    const raw = localStorage.getItem(sanitizedKey);
    if (!raw) return { attempts: [] };
    const parsed = JSON.parse(raw) as Entry;
    
    // Validate parsed data structure
    return {
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts.filter(t => typeof t === 'number') : [],
      blockedUntil: typeof parsed.blockedUntil === 'number' && parsed.blockedUntil > 0 ? parsed.blockedUntil : undefined,
    };
  } catch (error) {
    // Log parsing errors but don't expose them
    console.warn('Rate limiter: failed to parse storage data');
    return { attempts: [] };
  }
}

function save(key: string, entry: Entry) {
  try {
    const sanitizedKey = storageKey(key);
    // Prevent storage overflow
    const sanitizedEntry = {
      attempts: entry.attempts.slice(-10), // Keep only last 10 attempts
      blockedUntil: entry.blockedUntil
    };
    localStorage.setItem(sanitizedKey, JSON.stringify(sanitizedEntry));
  } catch (error) {
    // Handle storage quota exceeded gracefully
    console.warn('Rate limiter: storage unavailable');
  }
}

export function isBlocked(key: string): { blocked: boolean; until?: number } {
  const e = load(key);
  const now = Date.now();
  if (e.blockedUntil && e.blockedUntil > now) return { blocked: true, until: e.blockedUntil };
  return { blocked: false };
}

export function recordAttempt(key: string, ok: boolean, opts: Partial<RateLimiterOptions> = {}) {
  // Use progressive defaults for sensitive operations
  const isSensitive = key.includes('reset') || key.includes('admin');
  const defaultConfig = isSensitive ? PROGRESSIVE_DEFAULTS : DEFAULTS;
  const cfg = { ...defaultConfig, ...opts };
  
  const e = load(key);
  const now = Date.now();

  // Clear old attempts outside window
  e.attempts = (e.attempts || []).filter((t) => now - t <= cfg.windowMs);

  if (ok) {
    // Reset on success
    e.attempts = [];
    e.blockedUntil = undefined;
    save(key, e);
    return;
  }

  e.attempts.push(now);
  
  // Progressive blocking: longer blocks for repeated failures
  if (e.attempts.length >= cfg.maxAttempts) {
    const failureCount = e.attempts.length;
    const multiplier = Math.min(failureCount - cfg.maxAttempts + 1, 5); // Max 5x multiplier
    e.blockedUntil = now + (cfg.blockMs * multiplier);
    e.attempts = []; // Reset counter while blocked
  }
  save(key, e);
}

// Security function to clear rate limiter data (for GDPR compliance)
export function clearRateLimiterData(keyPattern?: string) {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('rl:') && (!keyPattern || key.includes(keyPattern))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear rate limiter data');
  }
}
