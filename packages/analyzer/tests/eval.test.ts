import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { analyze } from '../src/index.js';
import { EXPECTED, SAMPLES } from './fixtures/samples.js';

describe('eval fixtures (regression guard)', () => {
  for (const id of Object.keys(SAMPLES)) {
    it(`scores ${id} within expected range`, () => {
      const text = SAMPLES[id]!;
      const exp = EXPECTED[id]!;
      const r = analyze(text);
      assert.ok(
        r.scores.ai >= exp.ai[0] && r.scores.ai <= exp.ai[1],
        `${id} AI ${r.scores.ai} not in [${exp.ai[0]}, ${exp.ai[1]}]`,
      );
      assert.ok(
        r.scores.clarity >= exp.clarity[0] && r.scores.clarity <= exp.clarity[1],
        `${id} clarity ${r.scores.clarity} not in [${exp.clarity[0]}, ${exp.clarity[1]}]`,
      );
    });
  }
});
