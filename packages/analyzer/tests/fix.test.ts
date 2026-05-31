import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { applyFixes } from '../src/index.js';

describe('applyFixes (safe auto-fix)', () => {
  it('rewrites mechanical patterns without changing meaning', () => {
    const r = applyFixes('서버는 데이터센터에 위치하고 있다. 운영함에 있어 안정성이 중요하다. 응답은 1~2초 걸린다.');
    assert.ok(r.fixed.includes('데이터센터에 있다'), '위치하고 있다 → 있다');
    assert.ok(r.fixed.includes('운영할 때'), '함에 있어 → 할 때');
    assert.ok(r.fixed.includes('1에서 2초'), '1~2 → 1에서 2');
    const ids = r.applied.map((a) => a.ruleId);
    assert.ok(ids.includes('D1.locating') && ids.includes('D1.in_doing') && ids.includes('B.tilde_range'));
  });

  it('does NOT touch context-dependent cliches, and reports them as needsJudgment', () => {
    const text =
      '이 솔루션의 핵심은 단순한 기능 개선이 아니라, 사용자 경험의 근본적인 재정의에 있습니다. 결론적으로 효율성을 극대화합니다.';
    const r = applyFixes(text);
    assert.equal(r.fixed, text, 'no auto-fix applied to context-dependent text');
    assert.equal(r.applied.length, 0, 'nothing applied');
    assert.ok(r.needsJudgment.includes('A.emphasis_opener'), 'emphasis opener needs judgment');
    assert.ok(r.needsJudgment.includes('A.contrast_rhetoric'), 'contrast rhetoric needs judgment');
    assert.ok(r.needsJudgment.includes('F.abstract_verbalization'), 'abstract verbalization needs judgment');
  });

  it('leaves clean text untouched with empty reports', () => {
    const clean = '오늘 회의에서 두 가지를 정했어요. 다음 주 월요일 9시에 시작합니다.';
    const r = applyFixes(clean);
    assert.equal(r.fixed, clean);
    assert.equal(r.applied.length, 0);
    assert.equal(r.needsJudgment.length, 0);
  });
});
