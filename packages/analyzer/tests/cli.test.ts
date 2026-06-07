import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseArgs, evaluateText } from '../src/cli.js';

describe('cli', () => {
  it('parses --file, --max-ai, --json and trailing text', () => {
    const a = parseArgs(['--file', 'README.md', '--max-ai', '60', '--json']);
    assert.equal(a.file, 'README.md');
    assert.equal(a.maxAi, 60);
    assert.equal(a.json, true);

    const b = parseArgs(['이건', '본문', '텍스트']);
    assert.equal(b.text, '이건 본문 텍스트');
    assert.equal(b.maxAi, undefined);
  });

  it('evaluateText fails the gate when AI smell exceeds maxAi', () => {
    const heavy =
      '이 솔루션의 핵심은 단순한 기능 개선이 아니라, 사용자 경험에 대한 근본적인 재정의에 있습니다. 결론적으로, 효율성을 극대화할 수 있습니다.';
    const r = evaluateText(heavy, 30);
    assert.ok(r.ai > 30, `heavy AI score ${r.ai} should exceed 30`);
    assert.equal(r.fail, true, 'gate fails on heavy text');
  });

  it('evaluateText passes clean text and reports no gate failure without maxAi', () => {
    const clean = '오늘 회의에서 두 가지를 정했어요. 다음 주 월요일 9시에 시작합니다.';
    const passed = evaluateText(clean, 50);
    assert.equal(passed.fail, false, 'clean text under threshold');

    const noGate = evaluateText(clean);
    assert.equal(noGate.fail, false, 'no maxAi means never fails');
  });
});
