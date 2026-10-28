import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.join(here, '..', 'sandbox', 'run-tests.sh');

export const LANGUAGES = { cpp: 'cpp', python: 'py', javascript: 'js' };

const readOr = (file, fallback = '') => readFile(file, 'utf8').catch(() => fallback);

export function outputsMatch(actual, expected) {
  const norm = (s) => s.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();
  return norm(actual) === norm(expected);
}

function exec(cmd, args, { timeoutMs, env, onTimeout }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d));
    child.stdout.resume();
    const timer = setTimeout(() => {
      onTimeout?.();
      child.kill('SIGKILL');
    }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stderr });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stderr: String(err) });
    });
  });
}

async function runInSandbox({ language, timeLimitSec, workDir, outDir, timeoutMs }) {
  if ((process.env.JUDGE_MODE || 'docker') === 'local') {
    const buildDir = await mkdtemp(path.join(tmpdir(), 'ailog-build-'));
    try {
      return await exec('sh', [RUNNER, language, String(timeLimitSec)], {
        timeoutMs,
        env: { PATH: process.env.PATH, WORK: workDir, OUT: outDir, BUILD: buildDir }
      });
    } finally {
      await rm(buildDir, { recursive: true, force: true });
    }
  }
  const name = `ailog-judge-${randomUUID()}`;
  return exec(
    'docker',
    [
      'run', '--rm', '--name', name,
      '--network', 'none',
      '--memory', '256m', '--memory-swap', '256m',
      '--cpus', '1', '--pids-limit', '64',
      '--read-only', '--tmpfs', '/tmp:rw,exec,size=64m',
      '--security-opt', 'no-new-privileges', '--cap-drop', 'ALL',
      '-v', `${workDir}:/work:ro`,
      '-v', `${outDir}:/out:rw`,
      process.env.SANDBOX_IMAGE || 'ailogracer-sandbox',
      language, String(timeLimitSec)
    ],
    { timeoutMs, env: process.env, onTimeout: () => spawn('docker', ['kill', name]).on('error', () => {}) }
  );
}

export async function judge({ language, code, tests, timeLimitMs = 2000 }) {
  const ext = LANGUAGES[language];
  if (!ext) throw Object.assign(new Error(`Unsupported language: ${language}`), { status: 400 });

  const root = await mkdtemp(path.join(tmpdir(), 'ailog-judge-'));
  const workDir = path.join(root, 'work');
  const outDir = path.join(root, 'out');
  try {
    await mkdir(path.join(workDir, 'tests'), { recursive: true });
    await mkdir(outDir);
    await chmod(root, 0o755);
    await chmod(workDir, 0o755);
    await chmod(path.join(workDir, 'tests'), 0o755);
    await chmod(outDir, 0o777);
    await writeFile(path.join(workDir, `main.${ext}`), code, { mode: 0o644 });
    await Promise.all(
      tests.map((t, i) => writeFile(path.join(workDir, 'tests', `${String(i).padStart(3, '0')}.in`), t.input, { mode: 0o644 }))
    );

    const timeLimitSec = Math.max(1, Math.ceil(timeLimitMs / 1000));
    const run = await runInSandbox({
      language,
      timeLimitSec,
      workDir,
      outDir,
      timeoutMs: 30000 + tests.length * timeLimitSec * 1000
    });

    const compileCode = (await readOr(path.join(outDir, 'compile.code'))).trim();
    if (compileCode === '') {
      return { status: 'JUDGE_ERROR', passed: 0, total: tests.length, compileError: run.stderr.slice(0, 2000), tests: [] };
    }
    if (compileCode !== '0') {
      return {
        status: 'COMPILE_ERROR',
        passed: 0,
        total: tests.length,
        compileError: (await readOr(path.join(outDir, 'compile.err'))).slice(0, 4000),
        tests: []
      };
    }

    const results = [];
    for (let i = 0; i < tests.length; i++) {
      const base = path.join(outDir, String(i).padStart(3, '0'));
      const exitCode = Number((await readOr(`${base}.code`, '-1')).trim());
      const stdout = await readOr(`${base}.out`);
      const stderr = (await readOr(`${base}.err`)).slice(0, 2000);
      let verdict;
      if (exitCode === 137 || exitCode === 124) verdict = 'TIME_LIMIT';
      else if (exitCode !== 0) verdict = 'RUNTIME_ERROR';
      else verdict = outputsMatch(stdout, tests[i].expectedOutput ?? '') ? 'PASSED' : 'WRONG_ANSWER';
      results.push({ verdict, exitCode, stdout: stdout.slice(0, 4000), stderr });
    }

    const passed = results.filter((r) => r.verdict === 'PASSED').length;
    const firstFail = results.find((r) => r.verdict !== 'PASSED');
    const status = !firstFail ? 'ACCEPTED' : firstFail.verdict === 'TIME_LIMIT' ? 'TIME_LIMIT' : firstFail.verdict;
    return { status, passed, total: tests.length, tests: results };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
