import type { Express, Request, Response } from 'express';
import { spawn } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';

/**
 * Actual host-process command execution. Disabled by default.
 * Root applies only to the process namespace where this Node service runs:
 * Docker root is NOT Linux host root.
 *
 * Enable only on a private deployment:
 * HOST_CLI_ENABLED=1
 * HOST_CLI_TOKEN=<random secret of at least 32 characters>
 *
 * Never expose this operation without authentication.
 */
export function registerHostTerminal(app: Express) {
  const configuredToken = process.env.HOST_CLI_TOKEN || '';
  const enabled = process.env.HOST_CLI_ENABLED === '1' && configuredToken.length >= 32;
  const maxCommandLength = 8192;
  const maxOutputLength = 65536;

  function authorized(req: Request): boolean {
    const provided = req.get('x-host-cli-token') || '';
    const one = Buffer.from(provided, 'utf8');
    const two = Buffer.from(configuredToken, 'utf8');
    return enabled && one.length === two.length &&
      two.length >= 32 && timingSafeEqual(one, two);
  }

  function requireCli(req: Request, res: Response): boolean {
    if (!enabled) {
      res.status(503).json({
        error: 'Konsola systemowa jest wyłączona na tym serwerze. Ustaw HOST_CLI_ENABLED=1 i HOST_CLI_TOKEN (min. 32 znaki).',
        code: 'host_cli_disabled',
      });
      return false;
    }
    if (!authorized(req)) {
      res.status(401).json({ error: 'Brak poprawnego tokenu operatora konsoli.', code: 'unauthorized' });
      return false;
    }
    return true;
  }

  app.get('/api/host-cli/status', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!requireCli(req, res)) return;
    const uid = process.getuid?.() ?? null;
    res.json({
      enabled: true,
      executable: '/bin/bash',
      uid,
      isRoot: uid === 0,
      scope: 'proces aplikacji / kontener (niepotwierdzony root hosta)',
      cwd: process.env.HOST_CLI_CWD || process.cwd(),
      interactivePty: false,
    });
  });

  app.post('/api/host-cli/run', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!requireCli(req, res)) return;
    const command: unknown = req.body?.command;
    if (typeof command !== 'string' || !command.trim() ||
        command.length > maxCommandLength || command.includes('\0')) {
      return res.status(400).json({ error: 'Polecenie musi być tekstem (1–8192 znaków).' });
    }

    const started = Date.now();
    let stdout = '';
    let stderr = '';
    let truncated = false;
    let timedOut = false;
    let finished = false;

    const uid = process.getuid?.() ?? null;
    const cwd = process.env.HOST_CLI_CWD || process.cwd();
    // Do not inherit model/API secrets from the application environment.
    const shellEnvironment = {
      PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      HOME: process.env.HOME || cwd,
      LANG: 'C.UTF-8',
      TERM: 'dumb',
    };

    const child = spawn('/bin/bash', ['-lc', command], {
      cwd,
      env: shellEnvironment,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, 20000);

    function record(which: 'stdout' | 'stderr', chunk: Buffer) {
      const value = chunk.toString('utf8');
      const remaining = Math.max(0, maxOutputLength - stdout.length - stderr.length);
      if (value.length > remaining) {
        truncated = true;
        child.kill('SIGKILL');
      }
      if (which === 'stdout') stdout += value.slice(0, remaining);
      else stderr += value.slice(0, remaining);
    }

    child.stdout.on('data', (chunk: Buffer) => record('stdout', chunk));
    child.stderr.on('data', (chunk: Buffer) => record('stderr', chunk));
    child.on('error', (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      res.status(500).json({ error: 'Nie udało się uruchomić powłoki bash.', code: error.code || 'spawn_error' });
    });
    child.on('close', (code, signal) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      return res.json({
        stdout,
        stderr,
        exitCode: code,
        signal,
        timedOut,
        truncated,
        durationMs: Date.now() - started,
        uid,
        isRoot: uid === 0,
        scope: 'proces aplikacji / kontener (niepotwierdzony root hosta)',
        cwd,
      });
    });
  });
}
