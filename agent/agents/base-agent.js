/**
 * BaseAgent — shared Codex CLI spawn + snapshot logic.
 *
 * Each layer agent creates a BaseAgent instance with its own config and
 * prompt builder.  `run()` snapshots the sandbox, spawns Codex CLI with
 * the layer-specific prompt, diffs to find what changed, and returns only
 * files matching this agent's `filePattern`.
 */

const { spawn, spawnSync } = require('child_process');
const fs                    = require('fs');
const path                  = require('path');
const { snapshotDir, diffSnapshots } = require('../parser');
const { getTarget }                  = require('../target');

// ── Resolve the codex.js script once at module load ──────────────────────────
const CODEX_SCRIPT = resolveCodexScript();

function resolveCodexScript() {
  const cmd  = process.platform === 'win32' ? 'where' : 'which';
  const what = process.platform === 'win32' ? 'codex.cmd' : 'codex';
  try {
    const out  = spawnSync(cmd, [what], { encoding: 'utf8' });
    const line = (out.stdout || '').split(/\r?\n/).map(s => s.trim()).find(Boolean);
    if (!line) return null;
    const dir    = path.dirname(line);
    const script = path.join(dir, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    if (fs.existsSync(script)) return script;
  } catch (_) {}
  return null;
}

// ── BaseAgent ────────────────────────────────────────────────────────────────

class BaseAgent {
  constructor(layer, buildPrompt) {
    this.layer       = layer;
    this.buildPrompt = buildPrompt;
  }

  /**
   * @param {string}      feature
   * @param {string}      slug
   * @param {Object}      context   — upstream agent outputs
   * @param {Function}    onOutput  — (line: string) => void
   * @param {AbortSignal} [signal]  — cancellation token
   */
  async run(feature, slug, context, onOutput, signal) {
    if (!CODEX_SCRIPT) {
      throw new Error('Codex CLI script not found. Run: npm install -g @openai/codex');
    }

    const target = getTarget();
    const before  = snapshotDir(target);
    const prompt  = this.buildPrompt(feature, slug, context);

    await this._spawnCodex(prompt, onOutput, target, signal);

    const after      = snapshotDir(target);
    const allDiff    = diffSnapshots(before, after);

    // Filter to only files matching this agent's file pattern (endsWith only — no includes)
    const layerChanges = {};
    for (const [filename, info] of Object.entries(allDiff)) {
      if (filename.endsWith(this.layer.filePattern)) {
        layerChanges[filename] = info;
      }
    }

    return layerChanges;
  }

  /** @private */
  _spawnCodex(prompt, onOutput, cwd, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(Object.assign(new Error('Cancelled'), { cancelled: true }));
      }

      const args = [
        CODEX_SCRIPT,
        'exec',
        '--dangerously-bypass-approvals-and-sandbox',
        '--skip-git-repo-check',
        '-'
      ];

      let proc;
      try {
        proc = spawn(process.execPath, args, {
          cwd,
          env:   { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (err) {
        return reject(new Error(`Failed to spawn Codex CLI: ${err.message}`));
      }

      // Cancel support — kill the child process when the signal fires
      const onAbort = () => {
        try { proc.kill(); } catch (_) {}
        reject(Object.assign(new Error('Cancelled'), { cancelled: true }));
      };
      if (signal) signal.addEventListener('abort', onAbort, { once: true });

      proc.stdin.write(prompt);
      proc.stdin.end();

      proc.stdout.on('data', data => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) onOutput(line.trim());
      });

      proc.stderr.on('data', data => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) onOutput(line.trim());
      });

      proc.on('close', code => {
        if (signal) signal.removeEventListener('abort', onAbort);
        if (signal?.aborted) return; // already rejected via onAbort
        if (code === 0) resolve();
        else reject(new Error(`Codex CLI exited with code ${code}`));
      });

      proc.on('error', err => {
        if (signal) signal.removeEventListener('abort', onAbort);
        if (err.code === 'ENOENT') {
          reject(new Error('Codex CLI not found. Run: npm install -g @openai/codex'));
        } else {
          reject(err);
        }
      });
    });
  }
}

module.exports = BaseAgent;
