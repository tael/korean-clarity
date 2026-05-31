import { D2_LEXICON, REGEX_RULES } from './rules.js';
import type { Category, CategoryGroup, Mode, Violation } from './types.js';

const HAEYO_ENDING = /(?:어요|아요|이에요|게요|네요|예요|래요|해요|죠)\s*[.!?]?\s*$/;

export function categoryGroup(c: Category): CategoryGroup {
  return c === 'D1' || c === 'D2' ? 'D' : c;
}

const LABEL_MODE_ALLOWED: Set<Category> = new Set(['A', 'D2']);

export function runRegexChecks(text: string, mode: Mode): Violation[] {
  const out: Violation[] = [];
  for (const rule of REGEX_RULES) {
    if (mode === 'label' && !LABEL_MODE_ALLOWED.has(rule.category)) continue;
    const re = new RegExp(rule.re.source, rule.re.flags);
    const hits: Violation[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      hits.push({
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
    // 반복 임계: 한 번 나오는 건 자연스럽고 반복돼야 AI 티가 나는 패턴은
    // 임계 미만이면 통째로 버린다. 오탐을 줄이는 결정론적 게이트.
    if (rule.minRepeat && hits.length < rule.minRepeat) continue;
    out.push(...hits);
  }
  return out;
}

export function runHaeyoCheck(text: string, mode: Mode): Violation[] {
  if (mode === 'label') return [];

  const rawSentences = text.split(/(?<=[.!?])\s+/);
  const sentences = rawSentences.map((s) => s.trim()).filter((s) => s.length >= 5);
  if (sentences.length < 5) return [];

  let haeyoCount = 0;
  let firstHaeyoIdx = -1;
  let searchPos = 0;

  for (const s of sentences) {
    const idx = text.indexOf(s, searchPos);
    if (HAEYO_ENDING.test(s)) {
      haeyoCount++;
      if (firstHaeyoIdx < 0 && idx >= 0) firstHaeyoIdx = idx;
    }
    if (idx >= 0) searchPos = idx + s.length;
  }

  const ratio = haeyoCount / sentences.length;
  if (ratio < 0.6 || firstHaeyoIdx < 0) return [];

  const dotIdx = text.indexOf('.', firstHaeyoIdx);
  const spanEnd = dotIdx >= 0 ? dotIdx + 1 : Math.min(text.length, firstHaeyoIdx + 40);

  return [
    {
      ruleId: 'B.haeyo_density',
      category: 'B',
      group: categoryGroup('B'),
      severity: 'medium',
      message: `해요체 종결이 ${Math.round(ratio * 100)}%. 종결 방식이 단조로워 독자 피로로 이어짐`,
      suggestion: '"~입니다", "~이다", "~함", 명사 종결 등으로 변주',
      span: { start: firstHaeyoIdx, end: spanEnd },
      quote: text.slice(firstHaeyoIdx, spanEnd).trim(),
    },
  ];
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
        message: `"${entry.word}": 영어 단어 직역 의심. 맥락 확인 필요`,
        suggestion: entry.natural ? `맥락이 일반적이면 "${entry.natural}"이 자연스러움` : undefined,
        span: { start: idx, end: idx + entry.word.length },
        quote: entry.word,
      });
    }
  }
  return out;
}
