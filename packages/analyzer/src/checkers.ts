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
      if (rule.excludeWords && rule.excludeWords.some((w) => m![0].startsWith(w))) {
        if (!rule.re.flags.includes('g')) break;
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

// 조사·서술격·어미의 초성으로 쓰이는 한글 음절. 이게 뒤따르면 복합어가 아니라
// 문법 형태소가 붙은 것으로 본다. 과/와는 결과·효과 오탐 탓에 일부러 뺀다(드문 "축과"는 미탐 감수).
const PARTICLE_INITIALS = new Set([
  '이', '가', '은', '는', '을', '를', '에', '의', '도', '만', '로', '으', // 조사
  '다', '라', '네', '야', '죠', '요', // 서술격·어미 (갈래다, 갈래라, 갈래네)
]);

function isHangulSyllable(ch: string): boolean {
  return ch >= '가' && ch <= '힣';
}

// 매칭이 더 긴 한글 단어의 일부인지 판단한다(해결의 "결", 축구의 "축").
function isInsideHangulWord(text: string, idx: number, len: number): boolean {
  const before = idx > 0 ? text[idx - 1]! : '';
  const after = text[idx + len] ?? '';
  if (isHangulSyllable(before)) return true; // 앞에 한글이 붙음: 복합어 (해결, 건축, 나무결)
  if (isHangulSyllable(after) && !PARTICLE_INITIALS.has(after)) return true; // 뒤가 조사 초성이 아님 (결과, 축구)
  return false;
}

export function runLexiconChecks(text: string, _mode: Mode): Violation[] {
  const out: Violation[] = [];
  for (const entry of D2_LEXICON) {
    let idx = -1;
    while ((idx = text.indexOf(entry.word, idx + 1)) !== -1) {
      if (entry.boundary && isInsideHangulWord(text, idx, entry.word.length)) continue;
      const window = text.slice(Math.max(0, idx - 25), idx + entry.word.length + 25);
      const safe = entry.contextSafe.some((s) => window.includes(s));
      if (safe) continue;
      if (entry.requiresAbstract && !entry.requiresAbstract.some((a) => window.includes(a))) continue;
      out.push({
        ruleId: 'D2.' + entry.word,
        category: 'D2',
        group: 'D',
        severity: entry.severity,
        message:
          entry.message ??
          `"${entry.word}": 기계가 옮긴 듯한 말투. 맥락 따라 더 자연스러운 일반어가 있음`,
        suggestion: entry.natural ? `맥락이 일반적이면 "${entry.natural}"이 자연스러움` : undefined,
        span: { start: idx, end: idx + entry.word.length },
        quote: entry.word,
      });
    }
  }
  return out;
}
