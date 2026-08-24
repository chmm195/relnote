/**
 * Parser for the Conventional Commits 1.0.0 header grammar:
 *
 *     <type>[optional scope][!]: <description>
 *
 * The parser is deliberately tolerant. A commit that does not match the grammar
 * is not an error -- it is returned with `conventional: false` so callers can
 * decide whether to list it under "Other changes" or drop it entirely.
 */

const HEADER = /^(?<type>[a-zA-Z]+)(?:\((?<scope>[^()]*)\))?(?<breaking>!)?:[ \t]+(?<description>.+)$/;

/** `BREAKING CHANGE:` / `BREAKING-CHANGE:` may appear as a footer instead of `!`. */
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:[ \t]*(?<detail>.*)$/;

/**
 * Parse a single commit message.
 *
 * @param {string} message full commit message, subject and body
 * @returns {{
 *   conventional: boolean,
 *   type: string|null,
 *   scope: string|null,
 *   description: string,
 *   breaking: boolean,
 *   breakingDetail: string|null,
 *   body: string,
 * }}
 */
export function parseCommitMessage(message) {
  const text = String(message ?? '').replace(/\r\n/g, '\n').trim();
  const [subject = '', ...rest] = text.split('\n');
  const body = rest.join('\n').trim();

  let breaking = false;
  let breakingDetail = null;
  for (const line of body.split('\n')) {
    const footer = BREAKING_FOOTER.exec(line.trim());
    if (footer) {
      breaking = true;
      breakingDetail = footer.groups.detail.trim() || null;
      break;
    }
  }

  const match = HEADER.exec(subject.trim());
  if (!match) {
    return {
      conventional: false,
      type: null,
      scope: null,
      description: subject.trim(),
      breaking,
      breakingDetail,
      body,
    };
  }

  const { type, scope, description } = match.groups;
  return {
    conventional: true,
    type: type.toLowerCase(),
    scope: scope?.trim() || null,
    description: description.trim(),
    breaking: breaking || Boolean(match.groups.breaking),
    breakingDetail,
    body,
  };
}

/**
 * Semantic version bump implied by a set of parsed commits.
 *
 * A breaking change wins over everything; otherwise a `feat` implies a minor
 * bump and anything else a patch. Returns `null` when nothing releasable is
 * present, so callers can skip cutting an empty release.
 *
 * @param {ReturnType<typeof parseCommitMessage>[]} commits
 * @returns {'major'|'minor'|'patch'|null}
 */
export function recommendBump(commits) {
  let bump = null;
  for (const commit of commits) {
    if (commit.breaking) return 'major';
    if (commit.type === 'feat') bump = 'minor';
    else if (bump === null && commit.conventional) bump = 'patch';
  }
  return bump;
}

/**
 * Apply a bump to a `major.minor.patch` string, dropping any prerelease suffix.
 *
 * @param {string} version
 * @param {'major'|'minor'|'patch'} bump
 * @returns {string}
 */
export function applyBump(version, bump) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(version).trim());
  if (!match) throw new TypeError(`not a semantic version: ${version}`);
  let [, major, minor, patch] = match.map(Number);

  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new TypeError(`unknown bump: ${bump}`);
}
