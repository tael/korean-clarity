import type { CategoryCounts, Prescription, Scores, Violation } from './types.js';

export function countByCategory(violations: Violation[]): CategoryCounts {
  const counts: CategoryCounts = { A: 0, B: 0, C: 0, D1: 0, D2: 0, E: 0, F: 0 };
  for (const v of violations) counts[v.category]++;
  return counts;
}

export function computeScores(text: string, violations: Violation[]): Scores {
  const length = Math.max(text.length, 50);
  const lengthFactor = length / 100;
  const counts = countByCategory(violations);

  const aiRaw =
    (counts.A * 18 + counts.B * 12 + counts.D2 * 6 + counts.E * 3) / lengthFactor;
  const ai = clamp(Math.round(aiRaw * 1.8), 0, 100);

  const fAbstractCount = (text.match(/[가-힣]+(?:성|화|적)(?:을|이|은|의|으로|인|적인)/g) || []).length;
  const formalVerbCount = (text.match(/(?:하다|되다|이루어지|만들어지|구성되|제공하)/g) || []).length;
  const sentenceCount = Math.max((text.match(/[.!?]\s|[\n]/g) || []).length, 1);

  const abstractDensity = clamp01(fAbstractCount / lengthFactor / 3.5);
  const fPenalty = clamp01(counts.F / lengthFactor / 1.2);
  const metaPenalty = clamp01(counts.A / lengthFactor / 1.5);
  const formalRatio = clamp01(formalVerbCount / sentenceCount / 1.0);
  const cChainPenalty = clamp01(counts.C / lengthFactor / 1.2);

  const clarityRaw =
    100 -
    (abstractDensity * 30 +
      fPenalty * 24 +
      metaPenalty * 22 +
      formalRatio * 12 +
      cChainPenalty * 12);
  const clarity = clamp(Math.round(clarityRaw), 0, 100);

  return { ai, clarity, counts };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

export function pickPrescriptions(violations: Violation[], scores: Scores): Prescription[] {
  const out: Prescription[] = [];
  const c = scores.counts;

  if (c.A >= 2) {
    out.push({
      title: '대조 수사·도입어 빼기',
      body: '"X가 아니라 Y", "핵심은…", "결론적으로" 같은 강조 수사가 본문보다 자리를 많이 차지함. Y만 단언으로 풀어쓰면 글이 짧아지고 의미가 또렷해짐.',
    });
  }
  if (c.F >= 2) {
    out.push({
      title: '한자 추상명사 동작화 줄이기',
      body: '"재정의·구축·정립·극대화·강화" 같은 한자어 명사 + 하다 조합이 의미를 가림. "무엇을 어떻게"를 구체로 내려가기.',
    });
  }
  const hasHaeyoDensity = violations.some((v) => v.ruleId === 'B.haeyo_density');
  const hasBFormat = violations.some((v) => v.category === 'B' && v.ruleId !== 'B.haeyo_density');

  if (hasHaeyoDensity) {
    out.push({
      title: '종결 방식 변주하기',
      body: '해요체 종결이 절반 이상. AI가 일관된 해요체를 선호하는 경향이 그대로 드러남. "~입니다", "~임", "~함", 명사 종결로 리듬을 끊어주기.',
    });
  }
  if (hasBFormat) {
    out.push({
      title: '메타 형식 정리',
      body: '"다음과 같이…할 수 있습니다:" 콜론 제목 + 글머리 + 메타 부사 묶음이 본문보다 무거움. 본문을 직접 말하기.',
    });
  }
  if (c.E >= 3) {
    out.push({
      title: '~의·~적·~성 줄이기',
      body: '"~의" 연속과 ~적·~성 접미사가 짙어 일본식 한국어로 흐름. 풀어쓸 수 있는 자리를 동사·구체어로 바꾸기.',
    });
  }
  if (c.C >= 1) {
    out.push({
      title: '능동·단순 피동으로',
      body: '이중피동·"에 의해" 수동·"가지고 있다" 같은 구조가 의미 흐름을 끊음. 주어를 바꾸고 능동으로.',
    });
  }
  if (out.length === 0) {
    if (scores.clarity < 50) {
      out.push({
        title: '명료성 점검',
        body: '표면 위반은 적지만 추상도가 높음. 한 문장에 의미 단위가 두 개 이상이면 쪼개기.',
      });
    } else {
      out.push({
        title: '괜찮은 글',
        body: 'AI 클리셰와 번역체 패턴이 거의 잡히지 않음. 명료성도 양호.',
      });
    }
  }
  return out.slice(0, 3);
}
