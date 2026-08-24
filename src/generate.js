import { parseCommitMessage, recommendBump, applyBump } from './parse.js';
import { renderNotes } from './render.js';
import { readCommits, latestTag, originSlug } from './git.js';

/**
 * Read a commit range out of a repository and render release notes for it.
 *
 * @param {object} [options]
 * @param {string} [options.cwd] repository directory, defaults to `process.cwd()`
 * @param {string} [options.range] revision range; defaults to `<latest tag>..HEAD`
 * @param {string} [options.version] heading version; defaults to the bumped latest tag
 * @param {boolean} [options.includeHidden] list housekeeping commits under "Other changes"
 * @returns {Promise<{notes: string, bump: string|null, version: string|null, count: number}>}
 */
export async function generate({ cwd, range, version, includeHidden = false } = {}) {
  const tag = await latestTag(cwd);
  const effectiveRange = range ?? (tag ? `${tag}..HEAD` : undefined);

  const raw = await readCommits({ range: effectiveRange, cwd });
  const commits = raw.map((commit) => ({ ...commit, ...parseCommitMessage(commit.message) }));

  const bump = recommendBump(commits);

  let heading = version ?? null;
  if (!heading && tag && bump) {
    try {
      heading = applyBump(tag, bump);
    } catch {
      // A non-semver tag (a date stamp, a codename) simply means no heading.
      heading = null;
    }
  }

  const slug = await originSlug(cwd);
  const commitUrl = slug
    ? (hash) => `https://github.com/${slug.owner}/${slug.repo}/commit/${hash}`
    : undefined;

  const notes = renderNotes(commits, {
    version: heading,
    date: new Date().toISOString().slice(0, 10),
    commitUrl,
    includeHidden,
  });

  return { notes, bump, version: heading, count: commits.length };
}
