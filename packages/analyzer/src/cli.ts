#!/usr/bin/env node
// korean-clarity CLI. 텍스트나 파일을 받아 AI냄새·명료성 점수와 위반을 출력한다.
// --max-ai N: AI냄새가 N을 넘으면 종료 코드 1 (CI 프로즈 게이트용).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { analyze } from './index.js';
import type { Violation } from './types.js';

export interface CliArgs {
  file?: string;
  maxAi?: number;
  json?: boolean;
  text?: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === undefined) continue;
    if (token === '--file' || token === '-f') args.file = argv[++i];
    else if (token === '--max-ai') args.maxAi = Number(argv[++i]);
    else if (token === '--json') args.json = true;
    else rest.push(token);
  }
  if (rest.length) args.text = rest.join(' ');
  return args;
}

export interface EvalResult {
  ai: number;
  clarity: number;
  violations: Violation[];
  fail: boolean;
}

// 게이트 판정을 순수 함수로 분리해 테스트한다.
export function evaluateText(text: string, maxAi?: number): EvalResult {
  const r = analyze(text);
  const fail = maxAi !== undefined && Number.isFinite(maxAi) && r.scores.ai > maxAi;
  return { ai: r.scores.ai, clarity: r.scores.clarity, violations: r.violations, fail };
}

function readInput(args: CliArgs): string {
  if (args.file) return readFileSync(args.file, 'utf8');
  if (args.text) return args.text;
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

export function main(argv: string[]): number {
  const args = parseArgs(argv);
  const text = readInput(args);
  if (!text.trim()) {
    console.error('입력 텍스트가 없습니다. 사용법: korean-clarity [--file <path>] [--max-ai <N>] [--json] [텍스트]');
    return 2;
  }

  const result = evaluateText(text, args.maxAi);

  if (args.json) {
    console.log(JSON.stringify({ scores: { ai: result.ai, clarity: result.clarity }, violations: result.violations }, null, 2));
  } else {
    console.log(`AI냄새 ${result.ai} / 명료성 ${result.clarity}`);
    for (const v of result.violations) {
      console.log(`  [${v.ruleId}] "${v.quote}": ${v.message}`);
    }
  }

  if (result.fail) {
    console.error(`\n실패: AI냄새 ${result.ai}이(가) 임계 ${args.maxAi}을(를) 넘었습니다.`);
    return 1;
  }
  return 0;
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  process.exit(main(process.argv.slice(2)));
}
