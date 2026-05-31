import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { analyze, generatePrompt } from '../src/index.js';

describe('generatePrompt (LLM rewrite handoff)', () => {
  it('bundles original text, diagnosis, issues and constraints', () => {
    const text = '이 솔루션의 핵심은 단순한 기능 개선이 아니라, 사용자 경험의 근본적인 재정의에 있습니다.';
    const p = generatePrompt(text, analyze(text));
    assert.ok(p.includes(text), 'original text embedded');
    assert.ok(p.includes('[고쳐야 할 지점]'), 'issues section present');
    assert.ok(p.includes('수사 클리셰'), 'category label surfaced');
    assert.ok(p.includes('의미·사실·숫자·인용은 절대 바꾸지'), 'meaning-preservation constraint');
    assert.ok(p.includes('다듬은 글만 출력'), 'output instruction present');
  });

  it('is copy-paste safe — no markdown emphasis characters', () => {
    const text = '핵심은 단순한 개선이 아니라 재정의입니다. 결론적으로 효율성을 극대화합니다.';
    const p = generatePrompt(text, analyze(text));
    assert.ok(!p.includes('**'), 'no bold markers');
    assert.ok(!p.includes('`'), 'no backticks');
    assert.ok(!/[~]/.test(p), 'no tilde');
  });

  it('handles clean text with a light instruction', () => {
    const clean = '오늘 회의에서 두 가지를 정했어요. 다음 주 월요일 9시에 시작합니다.';
    const p = generatePrompt(clean, analyze(clean));
    assert.ok(p.includes('표면 패턴은 거의 없습니다'), 'clean-text branch');
  });
});
