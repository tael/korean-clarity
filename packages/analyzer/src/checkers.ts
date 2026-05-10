import { D2_LEXICON, REGEX_RULES } from './rules.js';
import type { Category, CategoryGroup, Mode, Violation } from './types.js';

export function categoryGroup(c: Category): CategoryGroup {
  return c === 'D1' || c === 'D2' ? 'D' : c;
}

const LABEL_MODE_ALLOWED: Set<Category> = new Set(['A', 'D2']);

export function runRegexChecks(text: string, mode: Mode): Violation[] {
  const out: Violation[] = [];
  for (const rule of REGEX_RULES) {
    if (mode === 'label' && !LABEL_MODE_ALLOWED.has(rule.category)) continue;
    const re = new RegExp(rule.re.source, rule.re.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      out.push({
        ruleId: rule.id,
        category: rule.category,
        group: categoryGroup(rule.category),
        severity: rule.severity,
        message: rule.message,
        suggestion: rule.suggestion,
        span: { start: m.index, end: m.index + m[0].length },
        quote: m[0].trim(),
      });
      if (!rule.re.flags.includes('g')) break;
    }
  }
  return out;
}

export function runLexiconChecks(text: string, _mode: Mode): Violation[] {
  const out: Violation[] = [];
  for (const entry of D2_LEXICON) {
    let idx = -1;
    while ((idx = text.indexOf(entry.word, idx + 1)) !== -1) {
      const window = text.slice(Math.max(0, idx - 25), idx + entry.word.length + 25);
      const safe = entry.contextSafe.some((s) => window.includes(s));
      if (safe) continue;
      out.push({
        ruleId: 'D2.' + entry.word,
        category: 'D2',
        group: 'D',
        severity: entry.severity,
        message: `"${entry.word}" — 영어 단어 직역 의심. 맥락 확인 필요`,
        suggestion: entry.natural ? `맥락이 일반적이면 "${entry.natural}"이 자연스러움` : undefined,
        span: { start: idx, end: idx + entry.word.length },
        quote: entry.word,
      });
    }
  }
  return out;
}
