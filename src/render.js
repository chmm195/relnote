/**
 * Section headings, in the order they appear in the rendered notes. Types that
 * are not listed here are housekeeping (`chore`, `ci`, `style`, ...) and are
 * hidden by default -- pass `includeHidden` to list them under "Other changes".
 */
export const SECTIONS = [
  { type: 'feat', heading: 'Features' },
  { type: 'fix', heading: 'Bug fixes' },
  { type: 'perf', heading: 'Performance' },
  { type: 'refactor', heading: 'Refactoring' },
  { type: 'docs', heading: 'Documentation' },
  { type: 'test', heading: 'Tests' },
];

const VISIBLE_TYPES = new Set(SECTIONS.map((section) => section.type));

/** `commitUrl` builds a link for a hash; omit it to render plain text notes. */
function linkFor(commit, commitUrl) {
  if (!commitUrl || !commit.hash) return null;
  return `[\`${commit.hash.slice(0, 7)}\`](${commitUrl(commit.hash)})`;
}

function renderEntry(commit, commitUrl) {
  const scope = commit.scope ? `**${commit.scope}:** ` : '';
  const link = linkFor(commit, commitUrl);
  return `- ${scope}${commit.description}${link ? ` (${link})` : ''}`;
}

/**
 * Render grouped Markdown release notes.
 *
 * @param {object[]} commits parsed commits, newest first
 * @param {object} [options]
 * @param {string} [options.version] rendered as the top-level heading
 * @param {string} [options.date] ISO date shown beside the version
 * @param {(hash: string) => string} [options.commitUrl] builds per-commit links
 * @param {boolean} [options.includeHidden] list housekeeping commits too
 * @returns {string} Markdown, newline terminated, or '' when nothing to report
 */
export function renderNotes(commits, options = {}) {
  const { version, date, commitUrl, includeHidden = false } = options;
  const lines = [];

  if (version) {
    lines.push(date ? `## ${version} (${date})` : `## ${version}`, '');
  }

  const breaking = commits.filter((commit) => commit.breaking);
  if (breaking.length > 0) {
    lines.push('### ⚠ Breaking changes', '');
    for (const commit of breaking) {
      lines.push(renderEntry(commit, commitUrl));
      if (commit.breakingDetail) lines.push(`  ${commit.breakingDetail}`);
    }
    lines.push('');
  }

  for (const { type, heading } of SECTIONS) {
    const group = commits.filter((commit) => commit.type === type && !commit.breaking);
    if (group.length === 0) continue;
    lines.push(`### ${heading}`, '');
    for (const commit of group) lines.push(renderEntry(commit, commitUrl));
    lines.push('');
  }

  if (includeHidden) {
    const other = commits.filter(
      (commit) => !commit.breaking && !VISIBLE_TYPES.has(commit.type),
    );
    if (other.length > 0) {
      lines.push('### Other changes', '');
      for (const commit of other) lines.push(renderEntry(commit, commitUrl));
      lines.push('');
    }
  }

  // Only a version heading means every commit was hidden: report nothing.
  const hasBody = lines.some((line) => line.startsWith('### '));
  if (!hasBody) return '';

  return `${lines.join('\n').trimEnd()}\n`;
}
