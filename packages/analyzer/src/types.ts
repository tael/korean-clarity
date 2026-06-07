export type Category = 'A' | 'B' | 'C' | 'D1' | 'D2' | 'E' | 'F';
export type CategoryGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type Severity = 'high' | 'medium' | 'low';
export type Mode = 'full' | 'label';

export interface Span {
  start: number;
  end: number;
}

export interface RegexRule {
  id: string;
  category: Category;
  re: RegExp;
  severity: Severity;
  message: string;
  suggestion?: string;
  /**
   * 반복 임계. 설정하면 전체 매칭 수가 이 값 미만일 때 위반으로 보고하지 않는다.
   * im-not-ai의 S2/S3(3회 넘게 반복될 때만 제거) 로직을 결정론으로 옮긴 것.
   * 한 번 나오는 건 자연스러운데 반복돼야 AI 티가 나는 패턴(정도부사·이모지 등)의 오탐을 줄인다.
   */
  minRepeat?: number;
  /**
   * 제외어 화이트리스트. 매칭 문자열이 이 목록의 단어로 시작하면 위반에서 버린다.
   * 굳어져서 AI 티가 안 나는 표현(예: -적 룰의 "전략적·창의적")을 결정론으로 제외한다.
   * D2 사전의 contextSafe와 같은 발상이되, 주변 맥락이 아니라 매칭 문자열 자체를 본다.
   */
  excludeWords?: string[];
  /**
   * 안전 자동 교정 치환문. 설정된 규칙만 applyFixes()가 결정론으로 고친다.
   * 문맥 판단 없이 1:1로 바꿔도 의미가 안 깨지는 기계적 치환에만 부여한다.
   * 정규식 치환 규칙을 그대로 따른다($1 등 사용 가능).
   * 문맥에 따라 다르게 고쳐야 하는 규칙은 fix를 두지 않고 suggestion(제안)만 남긴다.
   */
  fix?: string;
}

export interface LexiconEntry {
  word: string;
  natural?: string;
  contextSafe: string[];
  /** 항목이 주면 이 메시지를 그대로 쓴다. 없으면 두 축 기본 템플릿. */
  message?: string;
  /**
   * positive 게이트. 지정하면 이 동반어 중 하나가 윈도우에 있어야만 잡는다.
   * contextSafe(있으면 통과)의 반대 발상. 추상 개념과 함께 쓰일 때만 AI 티인
   * 공간 은유(층위·결·갈래·지점·축)에 쓴다.
   */
  requiresAbstract?: string[];
  severity: Severity;
}

export interface Violation {
  ruleId: string;
  category: Category;
  group: CategoryGroup;
  severity: Severity;
  message: string;
  suggestion?: string;
  span: Span;
  quote: string;
}

export interface CategoryCounts {
  A: number;
  B: number;
  C: number;
  D1: number;
  D2: number;
  E: number;
  F: number;
}

export interface Scores {
  ai: number;
  clarity: number;
  counts: CategoryCounts;
}

/**
 * 통계 지표 채널. A-F 위반 카테고리와 별개로, 문서 전체를 통계로 잰다.
 * 형태소 분석기 없이 정규식·어절 분리만 쓴다(im-not-ai metrics_v2.py와 동일한 제약).
 * 패턴 매칭이 못 잡는 "리듬·다양성·단조로움"을 본다.
 */
export type MetricKey =
  | 'rhythm_uniform'
  | 'ending_monotone'
  | 'da_streak'
  | 'comma_heavy'
  | 'connective_opener';

export interface Metrics {
  /** 분석에 쓰인 문장 수(2자 이상). 5 미만이면 통계 신뢰도가 낮아 플래그를 내지 않는다. */
  sentenceCount: number;
  /** 문장 길이(글자) 표준편차. 낮을수록 길이가 균일해 기계적 리듬. */
  sentenceLengthStdev: number;
  /** 종결어미 다양성 0..1. 문장 끝 2음절 고유 종류 / 문장 수. 낮을수록 단조. */
  endingDiversity: number;
  /** '-다' 종결이 연속된 최대 구간 길이. */
  daStreakMax: number;
  /** 쉼표를 1개 이상 포함한 문장 비율 0..1. */
  commaInclusionRate: number;
  /** 문두 접속사(또한·따라서·즉 등)로 시작한 문장 비율 0..1. */
  connectiveOpenerRate: number;
  /** 위 지표가 임계를 넘겨 발생한 진단 플래그. */
  flags: MetricFlag[];
}

export interface MetricFlag {
  key: MetricKey;
  severity: Severity;
  message: string;
  suggestion: string;
  /** 임계 판정에 쓰인 실제 값(표시·디버깅용). */
  value: number;
}

export interface AnalyzeResult {
  text: string;
  mode: Mode;
  violations: Violation[];
  scores: Scores;
  metrics: Metrics;
  prescriptions: Prescription[];
}

export interface Prescription {
  title: string;
  body: string;
}

/** 안전 자동 교정 1건. */
export interface AppliedFix {
  ruleId: string;
  before: string;
  after: string;
  count: number;
}

export interface FixResult {
  /** 안전 치환만 적용한 교정본. */
  fixed: string;
  /** 적용된 교정 목록. */
  applied: AppliedFix[];
  /**
   * 위반은 있으나 안전 자동 교정 대상이 아닌 규칙 ID(문맥 판단 필요).
   * "이건 자동으로 못 고친다"를 사용자에게 정직하게 알리는 용도.
   */
  needsJudgment: string[];
}
