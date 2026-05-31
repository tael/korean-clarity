import type { AnalyzeResult, Category, Violation } from './types.js';

// LLM 재작성 프롬프트 생성기.
// 룰 기반 도구가 못 하는 "문맥을 읽은 재작성"을 사용자가 외부 LLM에서 받도록,
// 원문 + 진단된 개선점 + 의미 보존 제약을 한 덩어리 복붙용 텍스트로 묶는다.
// 복붙 대상(LLM 입력창)을 고려해 마크다운 강조 문자(**, *, ~, 백틱)는 쓰지 않는다.

const CAT_LABEL: Record<Category, string> = {
  A: '수사 클리셰',
  B: '포맷·시각',
  C: '구조 번역체',
  D1: '표현구 직역',
  D2: '단어 직역',
  E: '격 어색',
  F: '의미 명료성',
};

const MAX_ISSUES = 15;

function buildIssueLines(result: AnalyzeResult): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  // 위반은 규칙별로 한 줄만(첫 사례를 예시로). 심각도 순으로.
  const order = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...result.violations].sort(
    (a, b) => order[a.severity] - order[b.severity],
  );
  for (const v of sorted) {
    if (seen.has(v.ruleId)) continue;
    seen.add(v.ruleId);
    const quote = v.quote ? `"${v.quote}" ` : '';
    const suggestion = v.suggestion ? ` 고치는 방향: ${v.suggestion}` : '';
    lines.push(`(${CAT_LABEL[v.category]}) ${quote}— ${v.message}.${suggestion}`);
    if (lines.length >= MAX_ISSUES) return lines;
  }

  // 통계 지표 플래그(리듬·단조 등)도 개선점에 더한다.
  for (const f of result.metrics.flags) {
    lines.push(`(리듬·다양성) ${f.message}. 고치는 방향: ${f.suggestion}.`);
    if (lines.length >= MAX_ISSUES) break;
  }
  return lines;
}

export function generatePrompt(text: string, result: AnalyzeResult): string {
  const issues = buildIssueLines(result);
  const lines: string[] = [];

  lines.push(
    '다음은 AI가 쓴 듯한 한국어 글입니다. 의미·사실·숫자·인용은 절대 바꾸지 말고, 어색한 AI 문체만 자연스럽게 다듬어 주세요.',
  );
  lines.push('');
  lines.push('[원문]');
  lines.push(text.trim());
  lines.push('');
  lines.push('[진단]');
  lines.push(`AI 냄새 지수 ${result.scores.ai}/100 (낮을수록 좋음), 명료성 지수 ${result.scores.clarity}/100 (높을수록 좋음).`);
  lines.push('');
  lines.push('[고쳐야 할 지점]');
  if (issues.length === 0) {
    lines.push('- 표면 패턴은 거의 없습니다. 어색하게 읽히는 부분만 가볍게 손보세요.');
  } else {
    issues.forEach((l, i) => lines.push(`${i + 1}. ${l}`));
  }
  lines.push('');
  lines.push('[지켜야 할 것]');
  lines.push('- 숫자, 날짜, 고유명사, 인용, 전문용어는 원문 그대로 둡니다.');
  lines.push('- 글의 장르와 분량을 유지하고, 30%를 넘겨 갈아엎지 않습니다.');
  lines.push('- 단문과 복문을 섞어 한국어다운 리듬으로 씁니다.');
  lines.push('- 없던 정보를 지어내지 않습니다.');
  lines.push('');
  lines.push('위 지점을 반영해 글 전체를 다시 써 주세요. 다듬은 글만 출력하면 됩니다.');

  return lines.join('\n');
}
