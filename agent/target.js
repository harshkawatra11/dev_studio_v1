/**
 * target.js — manages the active codebase target directory.
 *
 * Default is the built-in sandbox (hard-wired). A user can switch to a local
 * folder via the Studio UI (E1 flagship). The sandbox path is always used as
 * the fallback and remains the default until the user explicitly changes it.
 */

const path = require('path');
const fs   = require('fs');

const SANDBOX_PATH = path.join(__dirname, '../sandbox');

let _target = SANDBOX_PATH;
let _isCustom = false;

function getTarget() {
  return _target;
}

function getSandboxPath() {
  return SANDBOX_PATH;
}

function isCustomTarget() {
  return _isCustom;
}

/**
 * Set a custom local folder as the active target.
 * Validates that the path exists and is a directory.
 * @param {string} dir — absolute path to the target codebase root
 */
function setTarget(dir) {
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Target directory does not exist: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    throw new Error(`Target path is not a directory: ${resolved}`);
  }
  _target   = resolved;
  _isCustom = resolved !== SANDBOX_PATH;
  return { target: _target, isCustom: _isCustom };
}

/**
 * Reset to the built-in sandbox target.
 */
function resetTarget() {
  _target   = SANDBOX_PATH;
  _isCustom = false;
  return { target: _target, isCustom: false };
}

function getTargetInfo() {
  return {
    target:   _target,
    isCustom: _isCustom,
    sandbox:  SANDBOX_PATH,
    label:    _isCustom ? path.basename(_target) : 'Sandbox (built-in)',
  };
}

module.exports = { getTarget, getSandboxPath, setTarget, resetTarget, isCustomTarget, getTargetInfo };
