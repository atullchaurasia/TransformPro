import { logger } from '@/utils/logger';

describe('logger', () => {
  it('exposes every log level as a function', () => {
    for (const level of ['debug', 'info', 'warn', 'error'] as const) {
      expect(typeof logger[level]).toBe('function');
    }
  });

  it('prefixes development output with the app name', () => {
    const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('hello');
    expect(spy).toHaveBeenCalledWith('[TransformPro]', 'hello');
    spy.mockRestore();
  });
});
