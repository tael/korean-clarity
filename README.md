# korean-clarity

> "AI가 쓴 듯한 한국어"를 잡아내고 다듬는 도구·지침 모음.

표면 클리셰가 아니라 **의미 전달의 명료성**이 본질.

- 웹 도구 - https://tael.github.io/korean-clarity/
- GitHub - https://github.com/tael/korean-clarity

## 무엇을 해결하나

AI가 한국어로 답할 때 어색함이 새는 이유는 단순히 클리셰가 많아서가 아니다. 클리셰가 의미 없는 자리에 의미 있는 척 들어앉아 본문을 덮는다. 한자어를 빼거나 외래어를 순화한다고 해결되지 않는다. **글이 의미를 운반하는가**가 진짜 문제.

이 프로젝트는 그 문제를 정면으로 다룬다.

## 산출물 3종

1. **지침 MD** ([docs/](./docs)) — 의미 명료성 본질부터 시작해 AI 클리셰·번역체·어휘까지
2. **Claude 스킬 패키지** ([skills/](./skills)) — `~/.claude/skills/`로 설치하는 두 스킬
3. **웹 평가 도구** ([web/](./web)) — 텍스트를 붙여넣으면 점수와 진단을 보여주는 정적 사이트

초기 UI 목업: [mockup/index.html](./mockup/index.html)

## 분류 6 카테고리

| 카테고리 | 설명 |
|---|---|
| A | 수사 클리셰 ("핵심은", "X가 아니라 Y") |
| B | 포맷 클리셰 (콜론 제목, 글머리 남용) |
| C | 구조 번역체 (무생물 주어, 이중피동) |
| D-1 | 표현구 직역 ("위치하고 있다") |
| D-2 | 단어 직역 ("합성기", "처리기") |
| E | 격 어색함 (~의 연속, ~적·~성·~화) |
| F | **의미 명료성** (추상도, 정보 밀도, 단언 강도, 핵심 동사 비율, 메타 비율, 주어-서술어 거리) |

## 점수 두 축

- **AI 냄새 지수** (0-100, 낮을수록 좋음) — 표면 클리셰 밀도
- **명료성 지수** (0-100, 높을수록 좋음) — 의미 전달 강도

두 축이 독립이라 사람이 쓴 흐리멍덩한 글, AI가 쓴 강한 단언 모두 진단 가능.

## 빠른 시작

```bash
git clone https://github.com/tael/korean-clarity.git
cd korean-clarity
pnpm install
pnpm test                  # analyzer 단위 테스트 + 표본 회귀 테스트
pnpm dev                   # web 개발 서버 (Astro)
pnpm build                 # 전체 빌드 (analyzer dist/ + web dist/)
pnpm install-skills        # ~/.claude/skills/로 두 스킬 심볼릭 링크
pnpm install-skills --copy # 심볼릭 대신 복사
```

## 분석기 라이브러리로 사용

```ts
import { analyze } from '@korean-clarity/analyzer';

const r = analyze('이 솔루션의 핵심은 단순한 기능 개선이 아니라...');
console.log(r.scores.ai);        // 71
console.log(r.scores.clarity);   // 48
console.log(r.violations);        // [{ ruleId, category, span, message, suggestion, ... }]
console.log(r.prescriptions);     // [{ title, body }, ...]

// 짧은 표제·라벨 검사 (A·D-2만)
const r2 = analyze('/api/analyze 합성기 보강', { mode: 'label' });
```

## CLI로 사용

`pnpm -F @korean-clarity/analyzer build` 후 `korean-clarity` 명령을 쓸 수 있다.

```bash
korean-clarity "이 솔루션의 핵심은 효율성을 극대화하는 것입니다"  # 텍스트 직접
korean-clarity --file 글.md                                      # 파일
cat 글.md | korean-clarity                                       # 표준 입력
korean-clarity --file 글.md --json                               # JSON 출력
korean-clarity --file README.md --max-ai 60                      # 게이트: 임계 넘으면 종료 코드 1
```

출력은 AI냄새·명료성 점수와 위반 목록이다. `--max-ai N`은 점수가 N을 넘으면 종료 코드 1을 돌려줘 CI에서 글의 AI냄새를 막는 관문으로 쓴다.

### CI 프로즈 게이트

이 저장소는 자기 도구를 자기 문서에 돌린다. `pnpm -F @korean-clarity/analyzer lint:prose`가 사용자 대면 README를 검사하고, AI냄새가 60을 넘으면 빌드를 실패시킨다. `docs/`는 클리셰 예시를 일부러 인용하므로 게이트에서 뺀다.

## 로드맵

- **v0.1 (MVP)** ✅ — 룰 코어 + Astro 사이트 + 5장 지침 + 두 스킬 + 표본 회귀 테스트 + CLI + 정밀도/재현율 가드 + CI 프로즈 게이트
- v0.2 — kiwi-wasm 형태소 분석. F 6지표 풀. 가중치 사람 평가 보정
- v0.3 — 지침 사이트 풍부화. 스킬 npm publish. 어휘 사전 확장 (PR 워크플로)
- v0.4 — LLM 후속 (사용자 키). 의미 부정합·맥락 어색 보강

## 기여

- 어휘 사전 추가 - `packages/analyzer/src/rules.ts`의 `D2_LEXICON`에 추가하고 `tests/fixtures/samples.ts`에 표본 한 줄
- 룰 추가 - `REGEX_RULES`에 추가. 회귀 테스트로 표본 점수 범위 확인
- 지침 보강 - `docs/`에 PR

## 라이선스

MIT
