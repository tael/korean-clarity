// AI냄새 여부 라벨 코퍼스. 분석기의 정밀도·재현율 측정용.
// isAiSmell: 사람이 판정한 AI냄새 여부. analyze()의 ai 점수가 이를 얼마나 맞히는지 잰다.
// 양성(AI)과 음성(사람 글)을 섞고, 까다로운 경계 사례(정상 피동·구체 갈래·실제 신선)를 일부러 넣었다.

export interface LabeledSample {
  id: string;
  text: string;
  isAiSmell: boolean;
  note?: string;
}

export const LABELED: LabeledSample[] = [
  // AI냄새 (positive)
  {
    id: 'ai_solution',
    text: '이 솔루션의 핵심은 단순한 기능 개선이 아니라 사용자 경험에 대한 근본적인 재정의에 있습니다. 결론적으로 효율성을 극대화할 수 있습니다.',
    isAiSmell: true,
  },
  {
    id: 'ai_meta',
    text: '좋은 질문입니다. 이 부분을 살펴보겠습니다. 다음과 같은 접근을 통해 해결할 수 있습니다.',
    isAiSmell: true,
  },
  {
    id: 'ai_passive_chain',
    text: '본 시스템은 사용자에 의해 운영되어지며, 데이터는 안전하게 보호되어지고 있습니다.',
    isAiSmell: true,
  },
  {
    id: 'ai_eui_chain',
    text: '시장의 변화의 흐름의 방향을 면밀히 검토하여 전략적 대응의 토대를 마련합니다.',
    isAiSmell: true,
  },
  {
    id: 'ai_metaphor',
    text: '답은 두 갈래로 나뉩니다. 논의의 결을 두 축으로 분석하면 명확해집니다.',
    isAiSmell: true,
  },
  {
    id: 'ai_fresh',
    text: '가장 신선한 출처에서 정보를 가져와 능동적으로 대응할 수 있습니다.',
    isAiSmell: true,
  },
  {
    id: 'ai_hedge',
    text: '이 문제는 두 가지 원인이 있다고 할 수 있습니다. 어느 정도 영향을 미친다고 볼 수 있습니다.',
    isAiSmell: true,
  },

  // 사람 글 (negative)
  {
    id: 'human_daily',
    text: '오늘 회의에서 두 가지를 정했어요. 다음 주 월요일 9시에 시작하고, 분기 목표는 그대로 둡니다.',
    isAiSmell: false,
  },
  {
    id: 'human_tech',
    text: 'API 응답이 500ms 넘으면 재시도해요. 최대 세 번, 간격은 1초·2초·4초. 그래도 안 되면 큐에 넣고 5분 뒤 다시 돌립니다.',
    isAiSmell: false,
  },
  {
    id: 'human_casual',
    text: '어제 비 와서 약속 미뤘어. 오늘은 갤지 모르겠네. 일단 우산 챙겨 가자.',
    isAiSmell: false,
  },
  {
    id: 'human_passive_ok',
    text: '조사한 데이터는 두 가지 관점으로 분석할 수 있습니다. 결과는 다음 주에 공유됩니다.',
    isAiSmell: false,
    note: '정상 피동·가능형 (과탐 함정)',
  },
  {
    id: 'human_report',
    text: '지난달 매출은 3억 2천만 원이고 전달보다 8% 늘었다. 신규 고객이 늘어난 게 컸다.',
    isAiSmell: false,
  },
  {
    id: 'human_galae_literal',
    text: '양 갈래 머리를 땋고 갈래길에서 왼쪽으로 갔다.',
    isAiSmell: false,
    note: '구체 갈래 (과탐 함정)',
  },
  {
    id: 'human_fresh_food',
    text: '시장에서 신선한 채소를 샀다. 공기가 신선해서 기분이 좋았다.',
    isAiSmell: false,
    note: '실제 식품 신선 (과탐 함정)',
  },
  {
    id: 'human_opinion',
    text: '난 그 영화 별로였어. 중반까지는 괜찮았는데 결말이 좀 허무하더라.',
    isAiSmell: false,
  },

  // 추가 AI냄새 (subtle/varied positive)
  {
    id: 'ai_meta_announce2',
    text: '이번 글에서는 세 가지를 다뤄보겠습니다. 먼저 배경부터 살펴보겠습니다.',
    isAiSmell: true,
  },
  {
    id: 'ai_via_chain',
    text: '데이터를 통해 인사이트를 도출하고, 분석을 통해 결론을 내립니다.',
    isAiSmell: true,
  },
  {
    id: 'ai_axis_reduce',
    text: '이 문제를 두 축으로 환원하면 본질이 드러납니다.',
    isAiSmell: true,
    note: '축+환원 (이전엔 미탐, 동반어 확대로 탐지)',
  },
  {
    id: 'ai_summative',
    text: '정리하자면, 본 전략은 지속 가능한 성장의 토대를 제공한다고 할 수 있습니다.',
    isAiSmell: true,
  },
  {
    id: 'ai_contrast2',
    text: '이것은 단순한 도구가 아니라 하나의 플랫폼입니다.',
    isAiSmell: true,
  },

  // 추가 사람 글 (자연스러운 negative, 정밀도 스트레스)
  {
    id: 'human_email',
    text: '안녕하세요. 첨부 파일 확인 부탁드립니다. 수정할 부분 있으면 회신 주세요.',
    isAiSmell: false,
  },
  {
    id: 'human_chat2',
    text: '그거 봤어? 어제 경기 진짜 대박이었는데. 마지막에 역전했잖아.',
    isAiSmell: false,
  },
  {
    id: 'human_review',
    text: '배터리는 하루 정도 가고 카메라는 어두운 데서 좀 약해요. 가격 생각하면 만족합니다.',
    isAiSmell: false,
  },
  {
    id: 'human_recipe',
    text: '냄비에 물 500ml 붓고 끓으면 면을 넣고 4분 둡니다. 스프는 불 끄고 넣어요.',
    isAiSmell: false,
  },
  {
    id: 'human_can_do',
    text: '이 방법으로 문제를 해결할 수 있습니다. 다만 시간이 좀 걸립니다.',
    isAiSmell: false,
    note: '정상 "할 수 있습니다" (가능형 과탐 함정)',
  },
];
