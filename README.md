# relnote

Turn a range of [Conventional Commits](https://www.conventionalcommits.org/) into grouped,
linked Markdown release notes — and tell you which semantic version bump they imply.

No dependencies, no config file, no lockfile churn. One `git log` call and some string handling.

```
$ relnote
## 1.4.0 (2026-08-24)

### ⚠ Breaking changes

- **api:** `createClient` now takes an options object ([`9f2c1ab`](https://github.com/o/r/commit/9f2c1ab))
  Pass `{ token }` instead of a positional string.

### Features

- **parser:** accept the hyphenated `BREAKING-CHANGE` footer ([`3ed77c0`](https://github.com/o/r/commit/3ed77c0))
- add `--bump` for release automation ([`c40b91e`](https://github.com/o/r/commit/c40b91e))

### Bug fixes

- **cli:** stop swallowing the exit code on parse errors ([`77aa312`](https://github.com/o/r/commit/77aa312))
```

## Install

```sh
npx relnote            # one-off
npm i -D relnote       # in a project
```

Requires Node 18 or newer.

## Use

By default `relnote` reads everything since the latest reachable tag and picks a version
heading by applying the recommended bump to that tag.

```sh
relnote                          # <latest tag>..HEAD
relnote -r v1.2.0..HEAD          # an explicit range
relnote -v 2.0.0                 # force the heading
relnote --all                    # also list chore/ci/style commits
relnote -C ../other-repo         # a different working tree
```

| Flag | Meaning |
| --- | --- |
| `-r, --range <range>` | Any revision range git understands. Default: `<latest tag>..HEAD`. |
| `-v, --version <ver>` | Version heading. Default: latest tag + recommended bump. |
| `-C, --cwd <dir>` | Repository directory. Default: the current directory. |
| `--all` | Include housekeeping commits under **Other changes**. |
| `--bump` | Print only `major`, `minor` or `patch` and exit. |
| `-h, --help` | Usage. |

Exit codes: `0` success, `1` nothing releasable in the range, `2` bad usage.

### In CI

`--bump` makes `relnote` composable with whatever tags and publishes:

```yaml
- id: bump
  run: echo "level=$(npx relnote --bump)" >> "$GITHUB_OUTPUT"
- run: npx relnote > RELEASE_NOTES.md
- run: npm version "${{ steps.bump.outputs.level }}" && npm publish
```

## Use as a library

```js
import { generate, parseCommitMessage, renderNotes } from 'relnote';

const { notes, bump, version } = await generate({ range: 'v1.0.0..HEAD' });

parseCommitMessage('feat(api)!: drop v1');
// { conventional: true, type: 'feat', scope: 'api', breaking: true, ... }
```

| Export | Purpose |
| --- | --- |
| `generate(options)` | Read a range and render notes. Returns `{ notes, bump, version, count }`. |
| `parseCommitMessage(message)` | Parse one commit header/body. Never throws on malformed input. |
| `recommendBump(commits)` | `'major' \| 'minor' \| 'patch' \| null`. |
| `applyBump(version, bump)` | `applyBump('1.2.3', 'minor') === '1.3.0'`. |
| `renderNotes(commits, options)` | Markdown from already-parsed commits. |
| `readCommits(options)` | Raw `git log` records. |

## How commits are grouped

`feat` → Features · `fix` → Bug fixes · `perf` → Performance · `refactor` → Refactoring ·
`docs` → Documentation · `test` → Tests.

Anything else (`chore`, `ci`, `build`, `style`, …) is treated as housekeeping and hidden
unless you pass `--all`. Commits whose subject is not a conventional header are never
dropped silently — they show up under **Other changes** with `--all`.

A commit is breaking if its type carries a `!` (`feat!:`) **or** its body has a
`BREAKING CHANGE:` / `BREAKING-CHANGE:` footer. Breaking commits are lifted into their own
section at the top and are not repeated under their type.

Merge commits are excluded, so a squash-merge workflow and a merge-commit workflow produce
the same notes.

## Development

```sh
npm test    # node:test, no runner to install
```

## License

MIT
