#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { generate } from './generate.js';

const USAGE = `relnote - release notes from Conventional Commits

Usage:
  relnote [options]

Options:
  -r, --range <range>    git revision range (default: <latest tag>..HEAD)
  -v, --version <ver>    version heading (default: latest tag + recommended bump)
  -C, --cwd <dir>        repository directory (default: current directory)
      --all              include housekeeping commits under "Other changes"
      --bump             print only the recommended bump (major|minor|patch)
  -h, --help             show this message
`;

/**
 * Parse argv into an options object. Kept separate from `main` so the flag
 * handling is testable without spawning a process.
 *
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  const options = { includeHidden: false, bumpOnly: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('-')) {
        throw new Error(`${arg} requires a value`);
      }
      index += 1;
      return next;
    };

    switch (arg) {
      case '-r': case '--range': options.range = value(); break;
      case '-v': case '--version': options.version = value(); break;
      case '-C': case '--cwd': options.cwd = value(); break;
      case '--all': options.includeHidden = true; break;
      case '--bump': options.bumpOnly = true; break;
      case '-h': case '--help': options.help = true; break;
      default:
        throw new Error(`unknown option: ${arg}`);
    }
  }

  return options;
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>} process exit code
 */
export async function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`relnote: ${error.message}\n\n${USAGE}`);
    return 2;
  }

  if (options.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  const result = await generate(options);

  if (options.bumpOnly) {
    if (!result.bump) return 1;
    process.stdout.write(`${result.bump}\n`);
    return 0;
  }

  if (!result.notes) {
    process.stderr.write('relnote: no releasable commits in range\n');
    return 1;
  }

  process.stdout.write(result.notes);
  return 0;
}

// Importing this module must stay side-effect free so `parseArgs` and `main`
// can be exercised from tests; only run when invoked as a program.
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (error) => {
      process.stderr.write(`relnote: ${error.message}\n`);
      process.exitCode = 1;
    },
  );
}
