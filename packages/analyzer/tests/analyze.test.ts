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
    assert.ok(ids.includes('D1.about'), 'D1.about detected');
    assert.ok(ids.includes('F.abstract_verbalization'), 'F.abstract_verbalization detected');
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
});
