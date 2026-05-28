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
const { snapshotDir, diffSnapshots, SANDBOX } = require('../parser');

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
  /**
   * @param {Object} layer        — from AGENT_LAYERS (id, name, shortName, filePattern, color, description)
   * @param {Function} buildPrompt — (feature, slug, context) => string
   */
  constructor(layer, buildPrompt) {
    this.layer       = layer;
    this.buildPrompt = buildPrompt;
  }

  /**
   * Run this agent's Codex CLI invocation.
   *
   * @param {string}   feature   — the user's feature request
   * @param {string}   slug      — slugified feature name
   * @param {Object}   context   — { key: content } of upstream agent outputs to inject into the prompt
   * @param {Function} onOutput  — (line: string) => void — called for every line of Codex stdout/stderr
   * @returns {Promise<Object>}  — { filename: { original, generated, isNew, language } } for this layer only
   */
  async run(feature, slug, context, onOutput) {
    if (!CODEX_SCRIPT) {
      throw new Error('Codex CLI script not found. Run: npm install -g @openai/codex');
    }

    // 1. Snapshot before
    const before = snapshotDir(SANDBOX);

    // 2. Build the layer-specific prompt
    const prompt = this.buildPrompt(feature, slug, context);

    // 3. Spawn Codex CLI
    await this._spawnCodex(prompt, onOutput);

    // 4. Snapshot after & diff
    const after   = snapshotDir(SANDBOX);
    const allDiff = diffSnapshots(before, after);

    // 5. Filter to only files matching this agent's file pattern
    const layerChanges = {};
    for (const [filename, info] of Object.entries(allDiff)) {
      if (filename.endsWith(this.layer.filePattern) || filename.includes(this.layer.filePattern)) {
        layerChanges[filename] = info;
      }
    }

    return layerChanges;
  }

  /** @private */
  _spawnCodex(prompt, onOutput) {
    return new Promise((resolve, reject) => {
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
          cwd:   SANDBOX,
          env:   { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (err) {
        return reject(new Error(`Failed to spawn Codex CLI: ${err.message}`));
      }

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
        if (code === 0 || code === null) resolve();
        else reject(new Error(`Codex CLI exited with code ${code}`));
      });

      proc.on('error', err => {
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
