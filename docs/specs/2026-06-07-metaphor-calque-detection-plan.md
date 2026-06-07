# 영어 공간 은유 직역 탐지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 층위·결·갈래·지점·축을 추상 동반어가 곁에 있을 때만 잡는 D2 사전 항목으로 추가하고, 기존 D2 기본 메시지의 출신 낙인을 제거한다.

**Architecture:** 기존 D2 사전(LexiconEntry) 틀을 확장한다. LexiconEntry에 `message?`(항목별 두 축 메시지)와 `requiresAbstract?`(positive 동반어 게이트) 선택 필드를 더한다. checkers.ts의 runLexiconChecks는 negative 게이트(contextSafe) 직후에 positive 게이트 한 줄을 추가하고, 메시지는 항목이 주면 그걸, 아니면 두 축 기본 템플릿을 쓴다. score.ts·prompt.ts는 건드리지 않는다.

**Tech Stack:** TypeScript, node:test + tsx (테스트), pnpm workspace. 테스트는 repo 루트에서 `pnpm test`.

설계 출처: `docs/specs/2026-06-07-metaphor-calque-detection-design.md`

---

## File Structure

- `packages/analyzer/src/types.ts` — LexiconEntry 인터페이스에 `message?`, `requiresAbstract?` 추가 (현재 39-44행).
- `packages/analyzer/src/checkers.ts` — runLexiconChecks (현재 88-109행): 기본 메시지 두 축화 + 항목별 message 사용 + positive 게이트 한 줄.
- `packages/analyzer/src/rules.ts` — D2_LEXICON (현재 294-307행) 끝에 층위·결·갈래·지점·축 5개 항목 추가.
- `packages/analyzer/tests/analyze.test.ts` — 기본 메시지 두 축화 테스트 + 은유 탐지 매트릭스.

전체 작업 디렉토리: `/Users/taelkim/Jobs/korean-clarity`

---

## Task 1: 기존 D2 기본 메시지 두 축화 + message 필드 추가

기존 D2 도메인 명사(합성기 등) 메시지가 "영어 단어 직역 의심"이라 출신 낙인이다. 북극성(AI 티 한 축)에 맞춰 두 축 메시지로 바꾸고, 동시에 항목이 자기 메시지를 줄 수 있게 `message?` 필드를 추가한다(Task 2의 은유 항목이 쓴다).

**Files:**
- Modify: `packages/analyzer/src/types.ts:39-44`
- Modify: `packages/analyzer/src/checkers.ts:96-105`
- Test: `packages/analyzer/tests/analyze.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/analyzer/tests/analyze.test.ts`의 마지막 `it(...)` 블록 뒤, 닫는 `});` 직전에 추가:

```ts
  it('D2 기본 메시지에 출신 낙인(직역)이 없고 두 축으로 읽힌다', () => {
    const r = analyze('이 합성기는 입력을 처리합니다.');
    const v = r.violations.find((x) => x.ruleId === 'D2.합성기');
    assert.ok(v, 'D2.합성기 flagged');
    assert.ok(!v!.message.includes('직역'), 'no 직역 origin-blaming in message');
    assert.ok(!v!.message.includes('영어'), 'no 영어 origin-blaming in message');
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test`
Expected: FAIL — 현재 메시지가 `"합성기": 영어 단어 직역 의심. 맥락 확인 필요`라 `직역`/`영어` 단언이 깨진다.

- [ ] **Step 3: 타입에 message 필드 추가**

`packages/analyzer/src/types.ts`의 LexiconEntry(39-44행)를 교체:

```ts
export interface LexiconEntry {
  word: string;
  natural?: string;
  contextSafe: string[];
  /** 항목이 주면 이 메시지를 그대로 쓴다. 없으면 두 축 기본 템플릿. */
  message?: string;
  severity: Severity;
}
```

- [ ] **Step 4: 체커 기본 메시지 두 축화 + 항목 message 사용**

`packages/analyzer/src/checkers.ts`의 `out.push({ ... })`(96-105행)에서 message 줄을 교체:

기존:
```ts
        message: `"${entry.word}": 영어 단어 직역 의심. 맥락 확인 필요`,
```
변경:
```ts
        message:
          entry.message ??
          `"${entry.word}": 기계가 옮긴 듯한 말투. 맥락 따라 더 자연스러운 일반어가 있음`,
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm test`
Expected: PASS (36 → 37 tests, 새 테스트 포함 전부 통과)

- [ ] **Step 6: 커밋**

```bash
git add packages/analyzer/src/types.ts packages/analyzer/src/checkers.ts packages/analyzer/tests/analyze.test.ts
git commit -m "refactor(analyzer): drop origin-blaming from D2 default message, add per-entry message field"
```

---

## Task 2: positive 동반어 게이트 + 은유 항목 5개

추상 동반어가 윈도우(앞뒤 25자)에 있을 때만 잡는 게이트를 추가하고, 층위·결·갈래·지점·축 항목을 사전에 넣는다. 게이트가 없으면 항목만 추가해도 literal 용법까지 잡혀 과탐이 나므로, 타입·게이트·항목·테스트를 한 작업으로 묶는다.

**Files:**
- Modify: `packages/analyzer/src/types.ts` (LexiconEntry, Task 1에서 바꾼 그 인터페이스)
- Modify: `packages/analyzer/src/checkers.ts:94-95` (positive 게이트 한 줄)
- Modify: `packages/analyzer/src/rules.ts:307` (D2_LEXICON 끝, 인식기 항목 뒤)
- Test: `packages/analyzer/tests/analyze.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`analyze.test.ts` 닫는 `});` 직전에 추가:

```ts
  it('공간 은유 직역: 추상 동반어가 있으면 잡고, 구체 용법은 안 잡는다', () => {
    const flag = (text: string, word: string) =>
      analyze(text).violations.some((v) => v.ruleId === 'D2.' + word);

    // 추상 동반어 동반 → 잡힘
    assert.ok(flag('답은 두 갈래예요. 의견도 두 갈래로 갈렸다.', '갈래'), '갈래 flagged (답·의견)');
    assert.ok(flag('논의의 결이 다르다', '결'), '결 flagged (논의)');
    assert.ok(flag('두 축으로 분석하면 분명해진다', '축'), '축 flagged (분석)');
    assert.ok(flag('의미의 층위가 다르다', '층위'), '층위 flagged (의미)');

    // 구체 용법 → 안 잡힘 (추상 동반어 없음)
    assert.ok(!flag('산이 두 갈래로 갈라진다', '갈래'), '갈래 not flagged (literal)');
    assert.ok(!flag('나무결이 곱다', '결'), '결 not flagged (literal)');
    assert.ok(!flag('회전축을 중심으로 돈다', '축'), '축 not flagged (literal)');

    // 정착어는 사전에 없음 → 절대 안 잡힘
    assert.ok(!flag('맥락을 보면 이해된다', '맥락'), '맥락 not in lexicon');
    assert.ok(!flag('다른 차원의 문제다', '차원'), '차원 not in lexicon');
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test`
Expected: FAIL — 은유 항목이 사전에 없어 "잡힘" 단언이 전부 깨진다.

- [ ] **Step 3: 타입에 requiresAbstract 필드 추가**

`packages/analyzer/src/types.ts`의 LexiconEntry를 교체(Task 1 결과에 한 줄 더):

```ts
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
```

- [ ] **Step 4: 체커에 positive 게이트 추가**

`packages/analyzer/src/checkers.ts`에서 negative 게이트(94-95행) 직후에 한 줄 추가:

기존:
```ts
      const safe = entry.contextSafe.some((s) => window.includes(s));
      if (safe) continue;
```
변경:
```ts
      const safe = entry.contextSafe.some((s) => window.includes(s));
      if (safe) continue;
      if (entry.requiresAbstract && !entry.requiresAbstract.some((a) => window.includes(a))) continue;
```

- [ ] **Step 5: D2_LEXICON에 은유 항목 5개 추가**

`packages/analyzer/src/rules.ts`의 D2_LEXICON에서 인식기 항목(307행) 뒤, 닫는 `];` 직전에 추가. contextSafe는 spec대로 비워 두고(positive 게이트로 충분), requiresAbstract로 가른다:

```ts
  { word: '층위', natural: '단계·갈래', contextSafe: [], requiresAbstract: ['의미', '논의', '분석', '개념', '사고', '담론', '해석'], message: '"층위"는 추상을 층으로 쌓는 공간 은유. AI가 자주 쓰고, 단계인지 종류인지 뜻이 흐려짐', severity: 'low' },
  { word: '결', natural: '방향·성격', contextSafe: [], requiresAbstract: ['논의', '문제', '사안', '감정', '이야기', '의미', '주장'], message: '"결"을 추상 대상에 붙인 공간 은유. AI가 자주 쓰고, 방향인지 성격인지 모호해짐', severity: 'low' },
  { word: '갈래', natural: '두 가지·둘로 나뉨', contextSafe: [], requiresAbstract: ['답', '의견', '입장', '해석', '논의', '방향', '가능성', '경우'], message: '"갈래"는 추상을 가지로 가르는 공간 은유. AI가 자주 쓰고, 그냥 "두 가지"면 또렷함', severity: 'low' },
  { word: '지점', natural: '대목·부분', contextSafe: [], requiresAbstract: ['논의', '사고', '분석', '문제', '고민'], message: '"지점"을 추상 논의에 쓴 공간 은유. AI가 자주 쓰고, "대목·때"가 더 또렷함', severity: 'low' },
  { word: '축', natural: '기준·갈래', contextSafe: [], requiresAbstract: ['분석', '논의', '평가', '사고', '접근', '기준', '관점', '가치'], message: '"축"은 추상을 축으로 세우는 공간 은유. AI가 자주 쓰고, "기준·갈래"가 또렷함', severity: 'low' },
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `pnpm test`
Expected: PASS (37 → 38 tests, 전부 통과)

- [ ] **Step 7: 커밋**

```bash
git add packages/analyzer/src/types.ts packages/analyzer/src/checkers.ts packages/analyzer/src/rules.ts packages/analyzer/tests/analyze.test.ts
git commit -m "feat(analyzer): detect English spatial-metaphor calques (층위·결·갈래·지점·축) via positive companion gate"
```

---

## Task 3: 전체 회귀 확인 + typecheck

새 필드·게이트가 기존 룰/점수에 영향이 없는지 확인한다.

**Files:** 없음(검증만)

- [ ] **Step 1: 전체 테스트**

Run: `pnpm test`
Expected: PASS, 38 tests, fail 0.

- [ ] **Step 2: 타입 체크**

Run: `pnpm --filter @korean-clarity/analyzer typecheck` (또는 packages/analyzer에서 `pnpm typecheck`)
Expected: 에러 0. requiresAbstract·message가 선택 필드라 기존 항목은 그대로 컴파일된다.

- [ ] **Step 3: 출신 낙인 잔존 grep**

Run: `grep -rnE "직역|영어 단어" packages/analyzer/src/checkers.ts`
Expected: 0건(Task 1에서 기본 메시지 정리됨). rules.ts의 F.abstract_arrival_2(254행 "영어 직역 의심")는 이번 spec 밖이라 그대로 둔다.

---

## Self-Review (작성자 점검 결과)

**Spec coverage:**
- 결정1 범위/분류(D2 확장, 5단어, 맥락·차원 제외) → Task 2 Step 5 + 테스트의 "사전에 없음" 단언.
- 결정2 positive 게이트 → Task 2 Step 3·4.
- 결정3 빈도 게이트 없음 → minRepeat 미사용(사전 체커는 원래 minRepeat 없음). 누락 아님.
- 결정4 지점 한계 → 테스트는 지점을 동반어 있는 경우만 다룸. "이 지점에서" 미탐은 spec이 수용, 테스트에 넣지 않음.
- 결정5 인접 정리(D2 기본 메시지) → Task 1.

**Placeholder scan:** 모든 코드 스텝에 실제 코드·명령·기대값 포함. TBD/TODO 없음.

**Type consistency:** LexiconEntry 필드명 message·requiresAbstract가 Task 1·2 타입 정의와 checkers 사용처에서 일치. `entry.requiresAbstract`, `entry.message` 동일 표기.
