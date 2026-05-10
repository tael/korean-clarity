// 점수 평가 픽스처. data/corpus/eval-samples.md와 동기화.
// 가중치를 바꾸면 이 범위 안에 들어와야 한다 (회귀 방지).

export const SAMPLES: Record<string, string> = {
  ai_typical: `이 솔루션의 핵심은 단순한 기능 개선이 아니라, 사용자 경험에 대한 근본적인 재정의에 있습니다. 다음과 같은 혁신적인 접근을 통해 효율성을 극대화할 수 있습니다:

- 데이터 기반의 의사결정 프로세스 구축
- 사용자 중심의 인터페이스 설계
- 지속 가능한 성장 모델의 정립

결론적으로, 본 솔루션은 시장의 변화에 능동적으로 대응할 수 있는 전략적 토대를 제공합니다.`,

  clean_daily: `오늘 회의에서 두 가지를 정했어요. 다음 주 월요일 9시에 시작하고, 분기 목표는 지난번 그대로 둡니다. 더 다듬을 부분은 없어 보여요.`,

  clean_tech: `API 응답이 500ms 이상 걸리면 재시도합니다. 재시도는 최대 세 번이며, 사이 간격은 1초·2초·4초로 늘어납니다. 그래도 실패하면 큐에 쌓아 두고 5분 뒤 일괄 처리합니다.`,

  heavy_human: `지난 분기 동안 추진해 온 사업의 성과를 바탕으로, 향후 다양한 영역에서의 가능성을 면밀히 검토하고 있습니다. 특히 외부 환경의 변화와 내부 역량의 동시 고려를 통해, 향후 전략 수립의 방향성을 보다 명확히 정립해 나갈 예정입니다.`,

  ai_friendly: `좋은 질문입니다. 이 부분은 두 가지 방법으로 풀 수 있어요. 첫 번째는 캐싱을 켜는 거고, 두 번째는 쿼리 자체를 다시 짜는 겁니다. 우선 캐싱부터 시도해보면 어떨까요?`,

  ai_light: `정확히 말하면 이 문제는 두 가지 원인이 있습니다. 결론적으로, 캐시를 끄면 해결됩니다.`,

  false_positive_check: `그게 아니라, 이게 맞아요. 그런 게 아니라 다른 이유가 있어요.`,
};

export interface ExpectedRange {
  ai: [number, number];
  clarity: [number, number];
}

export const EXPECTED: Record<string, ExpectedRange> = {
  ai_typical: { ai: [60, 90], clarity: [30, 60] },
  clean_daily: { ai: [0, 10], clarity: [85, 100] },
  clean_tech: { ai: [0, 15], clarity: [80, 100] },
  heavy_human: { ai: [0, 25], clarity: [40, 75] },
  ai_friendly: { ai: [20, 55], clarity: [70, 100] },
  ai_light: { ai: [60, 100], clarity: [40, 80] },
  false_positive_check: { ai: [0, 10], clarity: [85, 100] },
};
