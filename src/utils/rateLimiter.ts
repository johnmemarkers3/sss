export type RateLimiterOptions = {
  maxAttempts: number; // e.g., 5
  windowMs: number; // e.g., 15 * 60 * 1000
  blockMs: number; // e.g., 15 * 60 * 1000
};

const DEFAULTS: RateLimiterOptions = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
};

type Entry = {
  attempts: number[]; // timestamps
  blockedUntil?: number;
};

const storageKey = (key: string) => `rl:${key}`;

function load(key: string): Entry {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return { attempts: [] };
    const parsed = JSON.parse(raw) as Entry;
    return {
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      blockedUntil: typeof parsed.blockedUntil === 'number' ? parsed.blockedUntil : undefined,
    };
  } catch {
    return { attempts: [] };
  }
}

function save(key: string, entry: Entry) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {}
}

export function isBlocked(key: string): { blocked: boolean; until?: number } {
  const e = load(key);
  const now = Date.now();
  if (e.blockedUntil && e.blockedUntil > now) return { blocked: true, until: e.blockedUntil };
  return { blocked: false };
}

export function recordAttempt(key: string, ok: boolean, opts: Partial<RateLimiterOptions> = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  const e = load(key);
  const now = Date.now();

  // clear old attempts outside window
  e.attempts = (e.attempts || []).filter((t) => now - t <= cfg.windowMs);

  if (ok) {
    // reset on success
    e.attempts = [];
    e.blockedUntil = undefined;
    save(key, e);
    return;
  }

  e.attempts.push(now);
  if (e.attempts.length >= cfg.maxAttempts) {
    e.blockedUntil = now + cfg.blockMs;
    e.attempts = []; // reset counter while blocked
  }
  save(key, e);
}
