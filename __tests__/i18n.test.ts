import en from '@/i18n/en.json';
import hi from '@/i18n/hi.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');

describe('translations', () => {
  const enKeys = flatten(en);
  const hiKeys = flatten(hi);

  it('Hindi has every English key (spec §11: hi.json ships complete)', () => {
    const missing = [...enKeys.keys()].filter((k) => !hiKeys.has(k));
    expect(missing).toEqual([]);
  });

  it('Hindi has no keys that English lacks', () => {
    const extra = [...hiKeys.keys()].filter((k) => !enKeys.has(k));
    expect(extra).toEqual([]);
  });

  it('every translation keeps the same {{placeholders}}', () => {
    const mismatched = [...enKeys].filter(([k, v]) => placeholders(v) !== placeholders(hiKeys.get(k) ?? ''));
    expect(mismatched.map(([k]) => k)).toEqual([]);
  });

  it('no translation is empty', () => {
    const empty = [...enKeys, ...hiKeys].filter(([, v]) => v.trim() === '');
    expect(empty).toEqual([]);
  });
});
