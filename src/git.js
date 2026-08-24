import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

/**
 * `%x00` separates fields and `%x1e` separates records, so commit bodies
 * containing newlines or pipes survive the round trip intact.
 */
const FORMAT = ['%H', '%an', '%ae', '%aI', '%B'].join('%x00') + '%x1e';

async function git(args, cwd) {
  const { stdout } = await run('git', args, { cwd, maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

/**
 * Read commits in `range` (any revision range git understands, e.g. `v1.0.0..HEAD`).
 *
 * @param {object} [options]
 * @param {string} [options.range] defaults to the whole history
 * @param {string} [options.cwd] repository directory
 * @returns {Promise<Array<{hash: string, author: string, email: string, date: string, message: string}>>}
 */
export async function readCommits({ range, cwd } = {}) {
  const args = ['log', `--format=${FORMAT}`, '--no-merges'];
  if (range) args.push(range);

  const stdout = await git(args, cwd);
  return stdout
    .split('\x1e')
    .map((record) => record.replace(/^\n/, ''))
    .filter((record) => record.trim() !== '')
    .map((record) => {
      const [hash, author, email, date, message] = record.split('\x00');
      return { hash, author, email, date, message };
    });
}

/**
 * Most recent tag reachable from HEAD, or `null` when the repository has none.
 * Used to default the range to "everything since the last release".
 */
export async function latestTag(cwd) {
  try {
    return (await git(['describe', '--tags', '--abbrev=0'], cwd)).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Derive `owner/repo` from the `origin` remote so commits can be linked.
 * Handles both SSH (`git@github.com:o/r.git`) and HTTPS remotes.
 *
 * @returns {Promise<{owner: string, repo: string}|null>}
 */
export async function originSlug(cwd) {
  let url;
  try {
    url = (await git(['remote', 'get-url', 'origin'], cwd)).trim();
  } catch {
    return null;
  }
  const match = /github\.com[:/]+([^/]+)\/(.+?)(?:\.git)?$/.exec(url);
  return match ? { owner: match[1], repo: match[2] } : null;
}
