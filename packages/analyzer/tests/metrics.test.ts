import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { analyze, computeMetrics } from '../src/index.js';

describe('metrics layer', () => {
  it('flags uniform sentence rhythm', () => {
    const uniform = '오늘은 날씨가 좋다. 바람이 분다. 하늘이 맑다. 기온이 높다. 사람이 많다. 거리가 붐빈다.';
    const m = computeMetrics(uniform);
    assert.equal(m.sentenceCount, 6);
    assert.ok(m.sentenceLengthStdev < 12, 'low stdev');
    assert.ok(m.flags.some((f) => f.key === 'rhythm_uniform'), 'rhythm_uniform flag');
  });

  it('flags da-streak when 6+ sentences end in 다', () => {
    const m = computeMetrics('간다. 본다. 한다. 산다. 먹는다. 잔다.');
    assert.ok(m.daStreakMax >= 6, 'streak counted');
    assert.ok(m.flags.some((f) => f.key === 'da_streak'), 'da_streak flag');
  });

  it('flags monotone endings when diversity is low', () => {
    const mono = [
      '오늘 회의를 진행했습니다.',
      '결과를 정리했습니다.',
      '다음 일정을 잡았습니다.',
      '관련 자료를 공유했습니다.',
      '추가 검토를 요청했습니다.',
      '회신을 기다리고 있습니다.',
    ].join(' ');
    const m = computeMetrics(mono);
    assert.ok(m.endingDiversity < 0.4, `low ending diversity, got ${m.endingDiversity}`);
    assert.ok(m.flags.some((f) => f.key === 'ending_monotone'), 'ending_monotone flag');
  });

  it('flags connective openers when ratio is high', () => {
    const conn = '먼저 데이터를 본다. 그리고 분석한다. 또한 검증한다. 따라서 결론을 낸다. 즉 끝을 본다.';
    const m = computeMetrics(conn);
    assert.ok(m.connectiveOpenerRate > 0.4, 'high opener rate');
    assert.ok(m.flags.some((f) => f.key === 'connective_opener'), 'connective_opener flag');
  });

  it('does not flag short text (< 5 sentences)', () => {
    const m = computeMetrics('짧은 글이다. 곧 끝난다.');
    assert.equal(m.flags.length, 0, 'no flags under threshold');
  });

  it('exposes metrics on analyze() result and skips them in label mode', () => {
    const full = analyze('오늘은 좋다. 바람이 분다. 하늘이 맑다. 기온이 높다. 사람이 많다. 거리가 붐빈다.');
    assert.ok(full.metrics.sentenceCount >= 5, 'metrics present in full mode');

    const label = analyze('합성기 (P0)', { mode: 'label' });
    assert.equal(label.metrics.sentenceCount, 0, 'metrics empty in label mode');
    assert.equal(label.metrics.flags.length, 0, 'no metric flags in label mode');
  });
});

describe('repeat-threshold (minRepeat) rules', () => {
  it('F.degree_adverb fires only when repeated', () => {
    const single = analyze('이건 매우 좋은 결과다.');
    const repeated = analyze('이건 매우 좋고 정말 빠르다.');
    assert.ok(
      !single.violations.some((v) => v.ruleId === 'F.degree_adverb'),
      'single degree adverb not flagged',
    );
    assert.ok(
      repeated.violations.some((v) => v.ruleId === 'F.degree_adverb'),
      'two degree adverbs flagged',
    );
  });

  it('B.emoji fires only at 3+ emojis', () => {
    const two = analyze('좋아요 🚀 시작합니다 ✅');
    const three = analyze('좋아요 🚀 시작 ✅ 완료 💡');
    assert.ok(!two.violations.some((v) => v.ruleId === 'B.emoji'), '2 emojis not flagged');
    assert.ok(three.violations.some((v) => v.ruleId === 'B.emoji'), '3 emojis flagged');
  });

  it('F.formal_noun fires only when 것이다-type repeats', () => {
    const r = analyze('중요한 건 속도라는 것이다. 결국 끝까지 가는 것이 핵심인 것이다.');
    assert.ok(r.violations.some((v) => v.ruleId === 'F.formal_noun'), 'repeated formal noun flagged');
  });

  it('D1.about fires only when 에 대한/대해 repeats', () => {
    const single = analyze('이 문제에 대한 답을 찾았다.');
    const repeated = analyze('이 문제에 대한 답과 저 문제에 대해 같이 생각했다.');
    assert.ok(!single.violations.some((v) => v.ruleId === 'D1.about'), 'single 에 대한 not flagged');
    assert.ok(repeated.violations.some((v) => v.ruleId === 'D1.about'), 'repeated 에 대한/대해 flagged');
  });
});

describe('new deterministic rules', () => {
  it('E.double_particle detects 에서의/으로의', () => {
    const r = analyze('도시에서의 삶은 시골에서의 삶과 다르다.');
    assert.ok(r.violations.some((v) => v.ruleId === 'E.double_particle'), 'double particle flagged');
  });

  it('C.by_passive needs a passive verb nearby (precision)', () => {
    const passive = analyze('이 건물은 화재에 의해 파괴되었다.');
    assert.ok(
      passive.violations.some((v) => v.ruleId === 'C.by_passive'),
      '에 의해 + 피동동사 flagged',
    );
  });
});
