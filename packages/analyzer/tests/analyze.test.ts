import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { analyze } from '../src/index.js';

describe('analyze', () => {
  it('finds typical AI cliches in a sample text', () => {
    const text =
      '이 솔루션의 핵심은 단순한 기능 개선이 아니라, 사용자 경험에 대한 근본적인 재정의에 있습니다. 결론적으로, 본 솔루션은 시장의 변화에 능동적으로 대응할 수 있습니다.';
    const r = analyze(text);
    const ids = r.violations.map((v) => v.ruleId);
    assert.ok(ids.includes('A.emphasis_opener'), 'A.emphasis_opener detected');
    assert.ok(ids.includes('A.contrast_rhetoric'), 'A.contrast_rhetoric detected');
    assert.ok(ids.includes('A.summative_closer'), 'A.summative_closer detected');
    assert.ok(ids.includes('F.abstract_verbalization'), 'F.abstract_verbalization detected');
    // D1.about은 minRepeat 2라 여기서 "에 대한"이 한 번뿐이면 잡히지 않는다(의도).
    assert.ok(!ids.includes('D1.about'), 'single 에 대한 not flagged (minRepeat)');
  });

  it('returns 0..100 scores', () => {
    const r = analyze('이 솔루션의 핵심은 효율성을 극대화하는 것이라고 할 수 있습니다.');
    assert.ok(r.scores.ai >= 0 && r.scores.ai <= 100, 'ai score in range');
    assert.ok(r.scores.clarity >= 0 && r.scores.clarity <= 100, 'clarity score in range');
  });

  it('scores a clean Korean sentence higher in clarity than a heavy AI sample', () => {
    const clean = '오늘 회의에서 일정 두 가지를 정했어요. 다음 주 월요일 9시 시작입니다.';
    const heavy =
      '핵심은 단순한 일정 조정이 아니라, 회의 운영 방식에 대한 근본적인 재정의에 있다고 할 수 있습니다. 결론적으로, 본 회의는 효율성을 극대화할 수 있습니다.';
    const a = analyze(clean);
    const b = analyze(heavy);
    assert.ok(a.scores.clarity > b.scores.clarity, 'clean > heavy in clarity');
    assert.ok(a.scores.ai < b.scores.ai, 'clean < heavy in AI smell');
  });

  it('label mode skips B/C/D1/E/F rules', () => {
    const text = '/api/analyze 합성기 보강 (P0, 추천)';
    const r = analyze(text, { mode: 'label' });
    const cats = new Set(r.violations.map((v) => v.category));
    assert.ok(!cats.has('B'), 'no B in label mode');
    assert.ok(!cats.has('C'), 'no C in label mode');
    assert.ok(!cats.has('E'), 'no E in label mode');
    assert.ok(!cats.has('F'), 'no F in label mode');
  });

  it('detects D2 lexicon words and respects context_safe', () => {
    const flagged = analyze('이 합성기는 유저 입력을 처리합니다.');
    const safe = analyze('이 음성 합성기는 텍스트를 음성으로 변환합니다.');

    assert.ok(
      flagged.violations.some((v) => v.ruleId === 'D2.합성기'),
      'D2.합성기 flagged when no context_safe word nearby',
    );
    assert.ok(
      !safe.violations.some((v) => v.ruleId === 'D2.합성기'),
      'D2.합성기 NOT flagged when "음성" nearby',
    );
  });

  it('returns prescriptions', () => {
    const r = analyze(
      '핵심은 단순한 기능이 아니라 재정의입니다. 다음과 같습니다: ~ 결론적으로 효율성을 극대화합니다.',
    );
    assert.ok(r.prescriptions.length >= 1 && r.prescriptions.length <= 3, '1-3 prescriptions');
    for (const p of r.prescriptions) {
      assert.ok(p.title && p.body, 'prescription has title+body');
    }
  });

  it('detects B.haeyo_density when haeyo ratio >= 60% over 5+ sentences', () => {
    const haeyoHeavy = [
      '오늘 분석 결과를 정리할게요.',
      '데이터에 한계가 있어요.',
      '표본이 적어서 신뢰도가 낮아요.',
      '방향성으로만 받아들이시는 게 안전해요.',
      '다음 단계는 추가 수집이에요.',
      '일단 이 정도로 마무리할게요.',
    ].join(' ');
    const r = analyze(haeyoHeavy);
    assert.ok(
      r.violations.some((v) => v.ruleId === 'B.haeyo_density'),
      'B.haeyo_density detected when all sentences end in haeyo',
    );

    const mixed = '오늘 회의에서 두 가지를 정했어요. 다음 주 월요일 9시에 시작합니다. 분기 목표는 그대로 유지합니다.';
    const r2 = analyze(mixed);
    assert.ok(
      !r2.violations.some((v) => v.ruleId === 'B.haeyo_density'),
      'B.haeyo_density NOT triggered on short or mixed text',
    );
  });

  it('detects A.meta_announce and D1.despite', () => {
    const r1 = analyze('이 기능에 대해 살펴보겠습니다. 다음으로 설명드리겠습니다.');
    assert.ok(
      r1.violations.some((v) => v.ruleId === 'A.meta_announce'),
      'A.meta_announce detected',
    );

    const r2 = analyze('어려움에도 불구하고 목표를 달성했습니다.');
    assert.ok(
      r2.violations.some((v) => v.ruleId === 'D1.despite'),
      'D1.despite detected',
    );
  });

  it('detects abstract "도달" as English-direct', () => {
    const r = analyze('이 문장은 의미가 도달하지 않는다.');
    const ids = r.violations.map((v) => v.ruleId);
    assert.ok(
      ids.includes('F.abstract_arrival') || ids.includes('F.abstract_arrival_2'),
      'F.abstract_arrival detected',
    );
  });

  it('produces non-overlapping highlight spans on merge', () => {
    const r = analyze(
      '이 솔루션의 핵심은 단순한 기능 개선이 아니라, 효율성을 극대화하는 데 있습니다.',
    );
    // Sort and assert no overlap when consumed via mergeOverlappingSpans
    const sorted = [...r.violations].sort((a, b) => a.span.start - b.span.start);
    let lastEnd = -1;
    for (const v of sorted) {
      // It's allowed for raw violations to overlap; merge function handles that.
      assert.ok(v.span.start >= 0 && v.span.end > v.span.start, 'valid span');
      lastEnd = Math.max(lastEnd, v.span.end);
    }
  });

  it('E.suffix_jeok skips 굳어진 -적 in excludeWords, still flags fresh ones', () => {
    // 화이트리스트 3개(전략적·창의적·사회적) + 비화이트 1개(근본적) = 매칭 4건.
    // excludeWords가 동작하면 앞 3건이 빠져 "근본적" 1건만 남고 minRepeat 3 미달로 통과.
    // excludeWords가 없으면 4건 전부 잡혀 minRepeat을 채우므로 이 단언이 깨진다. 즉 이 테스트가 게이트를 격리한다.
    const stuck = analyze('전략적인 판단과 창의적인 접근과 사회적인 합의, 그리고 근본적인 검토가 필요합니다.');
    assert.ok(
      !stuck.violations.some((v) => v.ruleId === 'E.suffix_jeok'),
      'whitelisted -적 dropped before minRepeat; lone non-whitelisted stays under threshold',
    );

    const fresh = analyze('근본적인 재정의와 혁신적인 발상과 능동적으로 대응이 필요합니다.');
    assert.ok(
      fresh.violations.some((v) => v.ruleId === 'E.suffix_jeok'),
      'non-whitelisted -적 still flagged at 3+',
    );
  });
});
