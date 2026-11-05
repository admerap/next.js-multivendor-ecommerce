import "server-only";

/**
 * Wrong-password brake for signed-in screens (Change Password, changing your email): after MAX_FAILURES wrong
 * current passwords within WINDOW_MS, further tries are refused until the window passes — so an unattended open
 * session can't be used to guess the password. Counted per account.
 * TODO(rate-limit): this lives in the server's memory (fine for one instance in dev); move it to Redis / the
 * database before running several instances.
 */
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
const failures = new Map<string, number[]>();

const recent = (key: string, now: number) => (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

/** Minutes left until `key` may try again, or 0 when it may try now. */
export function lockedFor(key: string, now = Date.now()) {
  const list = recent(key, now);
  if (list.length < MAX_FAILURES) return 0;
  return Math.max(1, Math.ceil((list[0] + WINDOW_MS - now) / 60_000));
}

export function recordFailure(key: string, now = Date.now()) {
  failures.set(key, [...recent(key, now), now]);
}

export function clearFailures(key: string) {
  failures.delete(key);
}

export const lockedMessage = (minutes: number) => `Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
