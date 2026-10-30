import {
  attemptsLeft,
  BASE_COOLDOWN_MS,
  cooldownRemaining,
  INITIAL_LOCKOUT,
  parseLockout,
  recordFailure,
  recordSuccess,
  shouldRelock,
  type LockoutState,
} from '@/domain/lockout';
import { bytesToHex, hashPin, validatePin, verifyPin } from '@/domain/pin';

// @types/node isn't installed (RN project), so type the bit of node:crypto we use.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createHash } = require('node:crypto') as {
  createHash: (alg: string) => { update: (s: string) => { digest: (enc: 'hex') => string } };
};
const sha256 = async (s: string) => createHash('sha256').update(s).digest('hex');

describe('PIN (§8)', () => {
  it('validates 4–6 digits and the confirmation', () => {
    expect(validatePin('1234')).toBeNull();
    expect(validatePin('123456')).toBeNull();
    expect(validatePin('123')).toBe('too_short');
    expect(validatePin('1234567')).toBe('too_short');
    expect(validatePin('12a4')).toBe('not_digits');
    expect(validatePin('1234', '1234')).toBeNull();
    expect(validatePin('1234', '1235')).toBe('mismatch');
  });

  it('stores SHA-256(salt + pin), never the PIN', async () => {
    const hash = await hashPin(sha256, 'abcd', '1234');
    expect(hash).toBe(createHash('sha256').update('abcd1234').digest('hex'));
    expect(hash).not.toContain('1234');
    expect(await verifyPin(sha256, 'abcd', '1234', hash)).toBe(true);
    expect(await verifyPin(sha256, 'abcd', '1243', hash)).toBe(false);
    expect(await verifyPin(sha256, 'other', '1234', hash)).toBe(false);
    expect(bytesToHex(new Uint8Array([0, 15, 255]))).toBe('000fff');
  });
});

describe('lockout (§8)', () => {
  const failTimes = (n: number, start: LockoutState, now: number) => {
    let s = start;
    for (let i = 0; i < n; i++) s = recordFailure(s, now);
    return s;
  };

  it('5 wrong PINs → 30 s cooldown', () => {
    const four = failTimes(4, INITIAL_LOCKOUT, 0);
    expect(four.cooldownUntil).toBeNull();
    expect(attemptsLeft(four)).toBe(1);
    const five = recordFailure(four, 1000);
    expect(five).toEqual({ failedAttempts: 0, lockouts: 1, cooldownUntil: 1000 + BASE_COOLDOWN_MS });
    expect(cooldownRemaining(five, 1000)).toBe(30_000);
    expect(cooldownRemaining(five, 1000 + 30_000)).toBe(0);
  });

  it('doubles each time and resets on success', () => {
    const first = failTimes(5, INITIAL_LOCKOUT, 0);
    const second = failTimes(5, first, 100_000);
    expect(second.cooldownUntil).toBe(100_000 + 60_000);
    const third = failTimes(5, second, 200_000);
    expect(third.cooldownUntil).toBe(200_000 + 120_000);
    expect(recordSuccess()).toEqual(INITIAL_LOCKOUT);
  });

  it('caps the cooldown at one hour', () => {
    const many = { failedAttempts: 4, lockouts: 20, cooldownUntil: null };
    expect(recordFailure(many, 0).cooldownUntil).toBe(3_600_000);
  });

  it('parses stored state defensively', () => {
    expect(parseLockout(null)).toEqual(INITIAL_LOCKOUT);
    expect(parseLockout('garbage')).toEqual(INITIAL_LOCKOUT);
    expect(parseLockout('{"failedAttempts":2,"lockouts":1,"cooldownUntil":5}')).toEqual({ failedAttempts: 2, lockouts: 1, cooldownUntil: 5 });
  });

  it('relocks after lock_after_minutes in the background', () => {
    expect(shouldRelock(null, 10_000_000, 1)).toBe(false);
    expect(shouldRelock(0, 59_999, 1)).toBe(false);
    expect(shouldRelock(0, 60_000, 1)).toBe(true);
    expect(shouldRelock(0, 1, 0)).toBe(true); // "immediately"
  });
});
