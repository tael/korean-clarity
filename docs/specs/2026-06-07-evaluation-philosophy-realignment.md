# 평가 철학 재정렬 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 냄새 축(A-E) 룰의 진단 근거를 "출신·순수주의"에서 "AI 전형성 + 글 영향" 두 축으로 재작성하고, suffix_jeok이 굳어진 -적을 잡지 않도록 화이트리스트를 더한다.

**Architecture:** 북극성은 "이게 AI스러운 문장인가" 하나다. 번역 교정도 국어 순화도 미문도 아니다. 그래서 룰 메시지에서 (1) 출신 낙인("영어 by의 직역", "일본식 접미사")과 (2) 순수주의·감정("국어답다", "한국어가 가장 싫어하는")을 빼고, 모든 근거를 (가) AI 전형성 (나) 글 영향(의미 흐림·문장 늘어짐)으로 환원한다. RegexRule에 `excludeWords` 필드를 더해 굳어진 -적(전략적·창의적 등)을 결정론으로 제외한다.

**Tech Stack:** TypeScript, node:test + tsx. 모노레포 pnpm workspace. analyzer 패키지(`packages/analyzer`).

**Scope note:** "영어 은유 직역" 부류(두 갈래·층위·결·축·차원·지점·맥락)는 새 부류 설계가 필요한 별개 작업이다. 이 plan에 넣지 않는다. Task 6에 다음 spec 착수 항목으로만 남긴다.

**Test command (전체 plan 공통):** 루트에서 `pnpm test`. 기대: 기존 테스트 전부 통과 + 새 테스트 통과.

---

### Task 1: RegexRule에 excludeWords 필드와 필터 로직 추가

매칭된 표현이 화이트리스트에 있으면 위반에서 제외하는 결정론 게이트. D2 사전의 contextSafe와 같은 발상이되, 매칭 문자열 자체가 제외어로 시작하면 버린다.

**Files:**
- Modify: `packages/analyzer/src/types.ts:23` (minRepeat 정의 뒤에 excludeWords 추가)
- Modify: `packages/analyzer/src/checkers.ts:19-35` (runRegexChecks 매칭 루프)
- Test: `packages/analyzer/tests/analyze.test.ts` (맨 끝 it 블록 추가)

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/analyzer/tests/analyze.test.ts`의 마지막 `it(...)` 다음, `describe` 닫기 `});` 직전에 추가:

```typescript
  it('E.suffix_jeok skips 굳어진 -적 in excludeWords, still flags fresh ones', () => {
    const stuck = analyze('전략적인 판단과 창의적인 접근과 사회적인 합의가 필요합니다.');
    assert.ok(
      !stuck.violations.some((v) => v.ruleId === 'E.suffix_jeok'),
      'whitelisted -적 (전략적·창의적·사회적) not flagged',
    );

    const fresh = analyze('근본적인 재정의와 혁신적인 발상과 능동적으로 대응이 필요합니다.');
    assert.ok(
      fresh.violations.some((v) => v.ruleId === 'E.suffix_jeok'),
      'non-whitelisted -적 still flagged at 3+',
    );
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test`
Expected: FAIL. 아직 excludeWords가 없어 "전략적인·창의적인·사회적인" 3건이 그대로 잡혀 `stuck` 단언이 깨진다.

- [ ] **Step 3: types.ts에 필드 추가**

`packages/analyzer/src/types.ts`의 `minRepeat?: number;` (23행) 정의 블록 바로 뒤, `fix?` 주석 앞에 추가:

```typescript
  /**
   * 제외어 화이트리스트. 매칭 문자열이 이 목록의 단어로 시작하면 위반에서 버린다.
   * 굳어져서 AI 티가 안 나는 표현(예: -적 룰의 "전략적·창의적")을 결정론으로 제외한다.
   * D2 사전의 contextSafe와 같은 발상이되, 주변 맥락이 아니라 매칭 문자열 자체를 본다.
   */
  excludeWords?: string[];
```

- [ ] **Step 4: checkers.ts 필터 추가**

`packages/analyzer/src/checkers.ts`의 `while ((m = re.exec(text)) !== null) {` 블록에서, 빈 매칭 가드(`if (m[0].length === 0)`) 다음, `hits.push({` 앞에 추가:

```typescript
      if (rule.excludeWords && rule.excludeWords.some((w) => m![0].startsWith(w))) {
        if (!rule.re.flags.includes('g')) break;
        continue;
      }
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm test`
Expected: PASS. `stuck`은 3건 모두 제외돼 minRepeat 3 미달로 안 잡히고, `fresh`는 3건 다 잡혀 통과.

- [ ] **Step 6: 커밋**

```bash
git add packages/analyzer/src/types.ts packages/analyzer/src/checkers.ts packages/analyzer/tests/analyze.test.ts
git commit -m "feat(analyzer): add excludeWords whitelist gate to RegexRule"
```

---

### Task 2: E.suffix_jeok에 화이트리스트 적용 + 메시지 재작성

Task 1의 필드를 실제 룰에 건다. 메시지를 출신 낙인에서 AI 버릇 + 글 영향으로 바꾼다.

**Files:**
- Modify: `packages/analyzer/src/rules.ts:177-185` (E.suffix_jeok 룰 객체)

- [ ] **Step 1: 룰 교체**

`packages/analyzer/src/rules.ts`의 `E.suffix_jeok` 룰 객체(177-185행 전체)를 아래로 교체:

```typescript
  {
    id: 'E.suffix_jeok',
    category: 'E',
    re: /[가-힣]+적(?:인|으로|인 것)/g,
    severity: 'low',
    message: '-적 남발. 형용사를 한자어로 굳히는 AI 버릇. 풀면 뜻이 또렷해짐',
    suggestion: '"효율적인" → "효율 좋은"처럼 풀거나 구체로',
    minRepeat: 3,
    excludeWords: [
      '전략적',
      '창의적',
      '사회적',
      '경제적',
      '정치적',
      '문화적',
      '기본적',
      '구체적',
      '적극적',
      '긍정적',
      '부정적',
    ],
  },
```

- [ ] **Step 2: 테스트 통과 확인**

Run: `pnpm test`
Expected: PASS. Task 1의 새 테스트와 기존 eval.test.ts(ai_typical은 "근본적·혁신적·능동적"이라 화이트리스트 밖, 점수 불변) 모두 통과.

- [ ] **Step 3: 커밋**

```bash
git add packages/analyzer/src/rules.ts
git commit -m "feat(analyzer): rewrite E.suffix_jeok message and whitelist 굳어진 -적"
```

---

### Task 3: ai축 룰 메시지 두 축으로 재작성

출신·순수주의·감정 문구가 든 룰 메시지를 AI 전형성 + 글 영향으로 교체한다. 점수 로직과 ruleId는 그대로라 기존 테스트는 통과한다(테스트는 ruleId만 본다).

**Files:**
- Modify: `packages/analyzer/src/rules.ts` (아래 각 룰의 message, 일부 suggestion)

- [ ] **Step 1: 메시지 교체**

`packages/analyzer/src/rules.ts`에서 각 룰의 `message:` 줄을 아래 대조표대로 바꾼다. 정규식·severity·id·minRepeat는 건드리지 않는다.

| ruleId | 새 message |
|---|---|
| C.passive_chain | `'이중피동. 행위 주체가 흐려지고 문장이 늘어짐'` |
| C.by_passive | `'"~에 의해 …되다" 수동문. 행위자가 가려지고 문장이 무거워짐. AI 생성문에 잦음'` |
| C.have_have | `'"~을 가지고 있다". 한 박자 늘어지는 군더더기'` |
| B.em_dash | `'엠대시. AI 출력의 대표 흔적'` |
| B.tilde_range | `'물결표 범위. 렌더러에 따라 취소선으로 깨지고, AI가 범위에 즐겨 씀'` |
| D1.from | `'"~로부터". 한 박자 무거워짐. "에서·에게"면 충분'` |
| D1.in_doing | `'"함에 있어서". 문장만 무거워지는 상투구'` |
| E.eui_chain | `'"~의" 연속. 명사를 겹쳐 쌓아 뜻이 흐려짐'` |
| E.double_particle | `'이중 조사. 조사를 겹쳐 문장이 굳음. 하나면 풀림'` |
| F.abstract_arrival | `'"의미가 도달한다" 류. 독자에게 안 닿는 추상 표현. AI가 즐겨 씀'` |
| A.emphasis_opener | `'강조 도입어. 무겁게 운만 떼고 정작 정보는 안 줌. AI 전형 패턴'` |
| B.colon_title | `'"다음과 같이" 콜론 제목. 본문 대신 틀이 자리를 먹음. AI 출력 형식'` |

`F.abstract_arrival`의 suggestion은 기존 `'"잘 전달되다" / "통하다"'` 그대로 둔다.

- [ ] **Step 2: 테스트 통과 확인**

Run: `pnpm test`
Expected: PASS. ruleId·카테고리·점수가 안 변해 기존 단언 전부 통과.

- [ ] **Step 3: 커밋**

```bash
git add packages/analyzer/src/rules.ts
git commit -m "refactor(analyzer): rewrite ai-axis rule messages to AI-tell + readability framing"
```

---

### Task 4: score.ts E 카테고리 처방 문구 교체

**Files:**
- Modify: `packages/analyzer/src/score.ts:102-107` (c.E >= 3 처방)

- [ ] **Step 1: 처방 본문 교체**

`packages/analyzer/src/score.ts`의 `if (c.E >= 3)` 블록(102-107행)에서 title과 body를 교체:

```typescript
  if (c.E >= 3) {
    out.push({
      title: '~의·~적·~성 줄이기',
      body: '"~의" 연속과 ~적·~성 접미사가 짙음. AI가 즐기는 추상화로, 풀어쓸 자리를 동사·구체어로 바꾸면 또렷해짐.',
    });
  }
```

- [ ] **Step 2: 테스트 통과 확인**

Run: `pnpm test`
Expected: PASS. 처방은 title/body 존재만 단언하므로 통과.

- [ ] **Step 3: 커밋**

```bash
git add packages/analyzer/src/score.ts
git commit -m "refactor(analyzer): drop 일본식 framing from E prescription"
```

---

### Task 5: docs 04장 E.2 톤 정렬

문서의 "일본식으로 흐른다" 프레이밍을 "AI가 남발하는 추상 접미사"로 바꾼다. 장 제목·구조는 건드리지 않는다.

**Files:**
- Modify: `packages/analyzer/../../docs/04-translationese.md:104-111` (E.2 일본식 접미사 절)

> 경로 주의: docs는 레포 루트 `docs/04-translationese.md`다.

- [ ] **Step 1: E.2 절 교체**

`docs/04-translationese.md`의 E.2 절(104-111행)을 아래로 교체:

```markdown
### E.2 추상 접미사 남발 (~적·~성·~화)

```
나쁨: 효율적인 방법으로 체계적으로 진행하여 일관성을 유지한다.
좋음: 효율 좋은 방법으로 차례대로 진행해 일관되게 지킨다.
```

이미 굳어진 표현(전략적, 창의적)은 무리해서 풀지 않는다. 그러나 AI는 형용사·부사를 한자어 접미사로 굳히는 버릇이 있어, 한 단락에 ~적·~성·~화가 다섯 번 이상 몰리면 글이 추상으로 붕 뜬다. 풀 수 있는 자리를 동사·구체어로 내리면 뜻이 또렷해진다.
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm build`
Expected: 성공(문서 변경은 빌드에 영향 없음, 회귀 없음 확인용).

- [ ] **Step 3: 커밋**

```bash
git add docs/04-translationese.md
git commit -m "docs: reframe E.2 from 일본식 to AI 추상 접미사 남발"
```

---

### Task 6: (다음 spec) 영어 은유 직역 부류 — 착수 항목만

이번 plan 범위 밖. 별도 brainstorm → spec → plan 사이클로 진행한다. 여기서는 다음 작업의 씨앗만 적어 둔다.

- [ ] **다음 spec 주제:** "영어 은유 직역" 부류 탐지
  - 대상어 후보: 두 갈래, 층위, 결, 축, 차원, 지점, 맥락 (영어 branch/layer/grain/axis/dimension/point/context 은유의 직역)
  - 핵심 난점: 단어마다 한국어 정착도가 다르다(맥락·차원은 정착, 층위·지점은 번역체 색 짙음). 단어 일률 매칭은 정상 쓰임까지 잡아 과탐을 낸다.
  - 설계 방향: D2 사전 틀 확장. 은유 전용어 사전 + 추상 선행어 동반 조건("답·문제·논의·관점"이 앞) + minRepeat 빈도 게이트 + "의심 플래그(맥락 확인 필요)". 정착도가 높은 단어는 임계를 높이고 번역체 색 짙은 단어는 낮춘다.
  - 분류 위치 결정 필요: D1(표현구 직역) 확장인지 새 하위 카테고리인지.

---

## Self-Review

- **Spec coverage:** 메시지 재작성(Task 2·3), suffix_jeok 로직(Task 1·2), score 처방(Task 4), docs 동기화(Task 5), 은유 부류 분리(Task 6) — 합의 항목 전부 태스크로 매핑됨.
- **Placeholder scan:** 모든 코드·문구 블록에 실제 내용 기입. TBD 없음.
- **Type consistency:** `excludeWords?: string[]`를 Task 1에서 정의하고 Task 2에서 동일 이름으로 사용. checkers.ts 필터는 `rule.excludeWords` / `m[0].startsWith(w)`로 일관.
- **회귀 안전:** eval.test.ts의 ai_typical은 "근본적·혁신적·능동적"으로 화이트리스트 밖 → suffix_jeok 3건 유지 → 점수 불변. 메시지 텍스트 변경은 score.ts가 카운트·심각도만 보므로 점수 무영향.
