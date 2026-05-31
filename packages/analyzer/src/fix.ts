import { runHaeyoCheck, runLexiconChecks, runRegexChecks } from './checkers.js';
import { REGEX_RULES } from './rules.js';
import type { AppliedFix, FixResult } from './types.js';

// 안전 자동 교정. fix가 부여된 규칙(문맥 없이 1:1로 고쳐도 의미가 안 깨지는 것)만 적용한다.
// 문맥 판단이 필요한 규칙은 손대지 않고 needsJudgment로 돌려준다 — "이건 사람이 고쳐야 한다"를
// 정직하게 알리는 게 룰 기반 도구의 옳은 태도. (전체 윤문은 LLM 영역.)
export function applyFixes(text: string): FixResult {
  const fixable = REGEX_RULES.filter((r) => r.fix !== undefined);
  const fixableIds = new Set(fixable.map((r) => r.id));

  // 교정 전 위반 목록(원문 기준) — 자동 교정 대상이 아닌 규칙을 가려내는 데 쓴다.
  const violations = [
    ...runRegexChecks(text, 'full'),
    ...runLexiconChecks(text, 'full'),
    ...runHaeyoCheck(text, 'full'),
  ];

  let fixed = text;
  const applied: AppliedFix[] = [];
  for (const rule of fixable) {
    const re = new RegExp(rule.re.source, rule.re.flags);
    const matches = fixed.match(re);
    if (!matches || matches.length === 0) continue;
    fixed = fixed.replace(re, rule.fix!);
    applied.push({
      ruleId: rule.id,
      before: matches[0]!,
      after: rule.fix!,
      count: matches.length,
    });
  }

  const needsJudgment = [
    ...new Set(violations.filter((v) => !fixableIds.has(v.ruleId)).map((v) => v.ruleId)),
  ];

  return { fixed, applied, needsJudgment };
}
