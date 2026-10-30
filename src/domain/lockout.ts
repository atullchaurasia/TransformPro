// Wrong-PIN lockout (spec §8): 5 wrong PINs → 30 s cooldown, doubling each time.

export const MAX_ATTEMPTS = 5;
export const BASE_COOLDOWN_MS = 30_000;

export type LockoutState = {
  /** Wrong PINs since the last cooldown (or success). */
  failedAttempts: number;
  /** Cooldowns served so far — drives the doubling. */
  lockouts: number;
  /** Epoch ms; null when not cooling down. */
  cooldownUntil: number | null;
};

export const INITIAL_LOCKOUT: LockoutState = { failedAttempts: 0, lockouts: 0, cooldownUntil: null };

/** Milliseconds left in the current cooldown (0 when the keypad is usable). */
export function cooldownRemaining(state: LockoutState, now: number): number {
  return state.cooldownUntil == null ? 0 : Math.max(0, state.cooldownUntil - now);
}

export function recordFailure(state: LockoutState, now: number): LockoutState {
  const failedAttempts = state.failedAttempts + 1;
  if (failedAttempts < MAX_ATTEMPTS) return { ...state, failedAttempts };
  // 30 s, 60 s, 120 s … capped at 1 hour so the gym is never locked out for days.
  const ms = Math.min(BASE_COOLDOWN_MS * 2 ** state.lockouts, 60 * 60_000);
  return { failedAttempts: 0, lockouts: state.lockouts + 1, cooldownUntil: now + ms };
}

/** A correct PIN clears everything, including the doubling. */
export function recordSuccess(): LockoutState {
  return INITIAL_LOCKOUT;
}

/** Wrong PINs left before the next cooldown. */
export function attemptsLeft(state: LockoutState): number {
  return MAX_ATTEMPTS - state.failedAttempts;
}

export function parseLockout(json: string | null): LockoutState {
  if (!json) return INITIAL_LOCKOUT;
  try {
    const v = JSON.parse(json) as Partial<LockoutState>;
    return {
      failedAttempts: Number.isInteger(v.failedAttempts) ? (v.failedAttempts as number) : 0,
      lockouts: Number.isInteger(v.lockouts) ? (v.lockouts as number) : 0,
      cooldownUntil: typeof v.cooldownUntil === 'number' ? v.cooldownUntil : null,
    };
  } catch {
    return INITIAL_LOCKOUT;
  }
}

/** Lock after the app has been in the background longer than `lock_after_minutes`. */
export function shouldRelock(backgroundedAt: number | null, now: number, lockAfterMinutes: number): boolean {
  if (backgroundedAt == null) return false;
  return now - backgroundedAt >= lockAfterMinutes * 60_000;
}
