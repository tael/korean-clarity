import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { analyze } from '../src/index.js';
import { LABELED } from './fixtures/labeled.js';

// AI냄새 라벨 코퍼스로 분석기의 정밀도·재현율을 측정한다.
// 예측 규칙: analyze().scores.ai >= THRESHOLD 이면 "AI냄새"로 예측.
// 플로어는 관측치보다 낮게 잡아 회귀 가드로만 쓴다(트립와이어가 아니라).
const THRESHOLD = 12;

describe('eval metrics (precision/recall guard)', () => {
  it(`measures precision and recall at ai>=${THRESHOLD}`, () => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;
    const falseNegatives: string[] = [];
    const falsePositives: string[] = [];

    for (const sample of LABELED) {
      const ai = analyze(sample.text).scores.ai;
      const predicted = ai >= THRESHOLD;
      if (predicted && sample.isAiSmell) tp++;
      else if (predicted && !sample.isAiSmell) {
        fp++;
        falsePositives.push(`${sample.id}(ai=${ai})`);
      } else if (!predicted && sample.isAiSmell) {
        fn++;
        falseNegatives.push(`${sample.id}(ai=${ai})`);
      } else tn++;
    }

    const precision = tp / (tp + fp || 1);
    const recall = tp / (tp + fn || 1);
    const f1 = (2 * precision * recall) / (precision + recall || 1);

    console.log(`혼동행렬: TP=${tp} FP=${fp} FN=${fn} TN=${tn}`);
    console.log(`정밀도=${precision.toFixed(2)} 재현율=${recall.toFixed(2)} F1=${f1.toFixed(2)}`);
    if (falseNegatives.length) console.log(`미탐(재현율 갭): ${falseNegatives.join(', ')}`);
    if (falsePositives.length) console.log(`오탐(정밀도 갭): ${falsePositives.join(', ')}`);

    // 정밀도는 높게 지킨다 — 사람 글 오탐은 도구 신뢰에 치명적.
    assert.ok(precision >= 0.9, `정밀도 ${precision.toFixed(2)} < 0.9 (사람 글 오탐 증가)`);
    // 경계 가드·동반어 확대로 재현율이 0.92까지 올랐다. 0.85 아래면 탐지가 후퇴한 것.
    assert.ok(recall >= 0.85, `재현율 ${recall.toFixed(2)} < 0.85 (탐지 후퇴)`);
    assert.ok(f1 >= 0.85, `F1 ${f1.toFixed(2)} < 0.85`);
  });
});
