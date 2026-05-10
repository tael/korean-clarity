#!/usr/bin/env node
// Claude 스킬 설치 스크립트
// `~/.claude/skills/<name>/`로 이 레포의 skills/<name>/을 심볼릭 링크 또는 복사한다.
// 사용: node scripts/install-skills.mjs [--copy]

import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const skillsDir = join(repoRoot, 'skills');
const targetRoot = join(homedir(), '.claude', 'skills');

const useCopy = process.argv.includes('--copy');

async function copyRecursive(src, dst) {
  const stat = statSync(src);
  if (stat.isDirectory()) {
    await mkdir(dst, { recursive: true });
    for (const entry of readdirSync(src)) {
      await copyRecursive(join(src, entry), join(dst, entry));
    }
  } else {
    await copyFile(src, dst);
  }
}

async function installOne(name) {
  const src = join(skillsDir, name);
  const dst = join(targetRoot, name);

  if (!existsSync(src)) {
    console.error(`✗ source missing: ${src}`);
    return;
  }

  if (existsSync(dst) || lstatExists(dst)) {
    rmSync(dst, { recursive: true, force: true });
  }

  if (useCopy) {
    await copyRecursive(src, dst);
    console.log(`✓ copied  ${name} → ${dst}`);
  } else {
    symlinkSync(src, dst, 'dir');
    console.log(`✓ linked  ${name} → ${dst}`);
  }
}

function lstatExists(p) {
  try { lstatSync(p); return true; } catch { return false; }
}

async function main() {
  if (!existsSync(targetRoot)) {
    mkdirSync(targetRoot, { recursive: true });
  }

  const skillNames = readdirSync(skillsDir).filter((n) => {
    const p = join(skillsDir, n);
    return statSync(p).isDirectory();
  });

  if (skillNames.length === 0) {
    console.log('skills/ 안에 설치할 스킬이 없습니다.');
    return;
  }

  console.log(`${useCopy ? 'copy' : 'symlink'} mode  →  ${targetRoot}`);
  for (const name of skillNames) {
    await installOne(name);
  }
  console.log('완료. Claude Code/Desktop을 재시작하면 새 스킬이 인식됩니다.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
