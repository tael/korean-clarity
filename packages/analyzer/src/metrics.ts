import type { MetricFlag, Metrics } from './types.js';

// 통계 지표 레이어. 패턴 매칭(A-F 위반)이 못 보는 문서 단위 신호를 잰다.
// im-not-ai metrics_v2.py처럼 형태소 분석기 없이 정규식·어절 분리만 쓴다.
// 문장 수가 적으면 통계가 흔들리므로 5문장 미만은 플래그를 내지 않는다.

const MIN_SENTENCES_FOR_FLAG = 5;

// 문두 접속사. 매 문장을 이걸로 여는 건 AI가 논리를 외형으로만 잇는 전형.
const OPENER_CONNECTIVES = [
  '또한', '따라서', '그러나', '하지만', '그리고', '즉', '게다가', '더욱이',
  '아울러', '나아가', '한편', '반면', '결국', '먼저', '그러므로', '이처럼',
];

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// 문장 끝 종결 신호. 마침표 등을 떼고 마지막 한글 2음절을 종결 키로 본다.
function endingKey(sentence: string): string | null {
  const stripped = sentence.replace(/[\s.!?"'”’)\]】』」]+$/u, '');
  const m = stripped.match(/([가-힣]{2})$/u);
  return m ? m[1]! : null;
}

function endsWithDa(sentence: string): boolean {
  const key = endingKey(sentence);
  return key !== null && key.endsWith('다');
}

export function computeMetrics(text: string): Metrics {
  const sentences = splitSentences(text);
  const sentenceCount = sentences.length;

  const lengths = sentences.map((s) => s.length);
  const sentenceLengthStdev = round2(stdev(lengths));

  const endings = sentences.map(endingKey).filter((e): e is string => e !== null);
  const endingDiversity = endings.length
    ? round2(new Set(endings).size / endings.length)
    : 1;

  let daStreakMax = 0;
  let daRun = 0;
  for (const s of sentences) {
    if (endsWithDa(s)) {
      daRun += 1;
      daStreakMax = Math.max(daStreakMax, daRun);
    } else {
      daRun = 0;
    }
  }

  const commaSentences = sentences.filter((s) => s.includes(',') || s.includes('，')).length;
  const commaInclusionRate = sentenceCount ? round2(commaSentences / sentenceCount) : 0;

  const openerSentences = sentences.filter((s) =>
    OPENER_CONNECTIVES.some((c) => s.startsWith(c)),
  ).length;
  const connectiveOpenerRate = sentenceCount ? round2(openerSentences / sentenceCount) : 0;

  const flags = buildFlags({
    sentenceCount,
    sentenceLengthStdev,
    endingDiversity,
    daStreakMax,
    commaInclusionRate,
    connectiveOpenerRate,
  });

  return {
    sentenceCount,
    sentenceLengthStdev,
    endingDiversity,
    daStreakMax,
    commaInclusionRate,
    connectiveOpenerRate,
    flags,
  };
}

function buildFlags(m: Omit<Metrics, 'flags'>): MetricFlag[] {
  const flags: MetricFlag[] = [];
  if (m.sentenceCount < MIN_SENTENCES_FOR_FLAG) return flags;

  // 리듬 균일성: 문장 길이가 다 비슷하면 기계적. 사람 글은 단문·장문이 섞인다.
  if (m.sentenceCount >= 6 && m.sentenceLengthStdev < 12) {
    flags.push({
      key: 'rhythm_uniform',
      severity: 'medium',
      message: `문장 길이 표준편차 ${m.sentenceLengthStdev}. 길이가 균일해 리듬이 기계적`,
      suggestion: '짧은 단문(10자 안팎)과 긴 복문을 섞어 호흡을 끊기',
      value: m.sentenceLengthStdev,
    });
  }

  // 종결 단조: 같은 종결을 반복하면 단조롭다. 해요체 검사와 보완 관계.
  if (m.sentenceCount >= 6 && m.endingDiversity < 0.4) {
    flags.push({
      key: 'ending_monotone',
      severity: 'medium',
      message: `종결어미 다양성 ${m.endingDiversity}. 문장 끝 표현이 단조로움`,
      suggestion: '"~다·~ㄴ다·~함·명사 종결"을 번갈아 쓰기',
      value: m.endingDiversity,
    });
  }

  // '-다' 연속: 평서 종결이 길게 이어지면 보고서 톤이 굳는다.
  if (m.daStreakMax >= 6) {
    flags.push({
      key: 'da_streak',
      severity: 'low',
      message: `'-다' 종결이 ${m.daStreakMax}문장 연속`,
      suggestion: '중간에 다른 종결이나 명사 종결로 끊어주기',
      value: m.daStreakMax,
    });
  }

  // 쉼표 과다: 영어 콤마 직역 습관. 문장마다 쉼표가 붙으면 분절이 잘다.
  if (m.commaInclusionRate > 0.6) {
    flags.push({
      key: 'comma_heavy',
      severity: 'low',
      message: `문장 ${Math.round(m.commaInclusionRate * 100)}%에 쉼표. 영어 콤마 직역 습관`,
      suggestion: '일부 쉼표를 마침표나 연결어미로 녹이기',
      value: m.commaInclusionRate,
    });
  }

  // 문두 접속사 남발: 논리를 접속사 외형으로만 잇는 AI 전형.
  if (m.connectiveOpenerRate > 0.4) {
    flags.push({
      key: 'connective_opener',
      severity: 'medium',
      message: `문장 ${Math.round(m.connectiveOpenerRate * 100)}%가 접속사로 시작. 논리를 외형으로만 이음`,
      suggestion: '접속사 절반을 빼고 문맥으로 잇기',
      value: m.connectiveOpenerRate,
    });
  }

  return flags;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
