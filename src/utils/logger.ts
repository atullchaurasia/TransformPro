// Tiny logger: prints in development, silent in production builds (CLAUDE.md §21).
// Never use console.* directly in app code — go through this.

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export const logger: { debug: LogFn; info: LogFn; warn: LogFn; error: LogFn } = isDev
  ? {
      debug: (...args) => console.debug('[TransformPro]', ...args),
      info: (...args) => console.info('[TransformPro]', ...args),
      warn: (...args) => console.warn('[TransformPro]', ...args),
      error: (...args) => console.error('[TransformPro]', ...args),
    }
  : { debug: noop, info: noop, warn: noop, error: noop };
