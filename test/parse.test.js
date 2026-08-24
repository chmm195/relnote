import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommitMessage, recommendBump, applyBump } from '../src/parse.js';

test('parses type, scope and description', () => {
  const commit = parseCommitMessage('feat(parser): support scoped headers');
  assert.equal(commit.conventional, true);
  assert.equal(commit.type, 'feat');
  assert.equal(commit.scope, 'parser');
  assert.equal(commit.description, 'support scoped headers');
  assert.equal(commit.breaking, false);
});

test('a bare type needs no scope', () => {
  const commit = parseCommitMessage('fix: stop crashing on empty input');
  assert.equal(commit.type, 'fix');
  assert.equal(commit.scope, null);
});

test('the bang marker flags a breaking change', () => {
  assert.equal(parseCommitMessage('feat!: drop node 16').breaking, true);
});

test('a BREAKING CHANGE footer flags a breaking change and keeps its detail', () => {
  const commit = parseCommitMessage(
    'refactor(api): rework client\n\nBREAKING CHANGE: createClient now takes an object',
  );
  assert.equal(commit.breaking, true);
  assert.equal(commit.breakingDetail, 'createClient now takes an object');
});

test('the hyphenated BREAKING-CHANGE spelling is accepted', () => {
  assert.equal(parseCommitMessage('fix: x\n\nBREAKING-CHANGE: y').breaking, true);
});

test('a non-conventional subject is reported, not rejected', () => {
  const commit = parseCommitMessage('updated the readme');
  assert.equal(commit.conventional, false);
  assert.equal(commit.type, null);
  assert.equal(commit.description, 'updated the readme');
});

test('CRLF line endings are normalised', () => {
  const commit = parseCommitMessage('fix: windows\r\n\r\nBREAKING CHANGE: yes\r\n');
  assert.equal(commit.breaking, true);
  assert.equal(commit.breakingDetail, 'yes');
});

test('type matching is case insensitive but normalised to lower case', () => {
  assert.equal(parseCommitMessage('FEAT: shout').type, 'feat');
});

test('a header with no space after the colon is not conventional', () => {
  assert.equal(parseCommitMessage('feat:no space').conventional, false);
});

test('recommendBump prefers the strongest signal present', () => {
  assert.equal(recommendBump([{ type: 'fix', conventional: true }]), 'patch');
  assert.equal(
    recommendBump([{ type: 'fix', conventional: true }, { type: 'feat', conventional: true }]),
    'minor',
  );
  assert.equal(
    recommendBump([{ type: 'feat', conventional: true }, { type: 'fix', breaking: true }]),
    'major',
  );
});

test('recommendBump returns null when nothing is releasable', () => {
  assert.equal(recommendBump([]), null);
  assert.equal(recommendBump([{ conventional: false, type: null }]), null);
});

test('applyBump resets the lower components', () => {
  assert.equal(applyBump('1.2.3', 'major'), '2.0.0');
  assert.equal(applyBump('1.2.3', 'minor'), '1.3.0');
  assert.equal(applyBump('1.2.3', 'patch'), '1.2.4');
});

test('applyBump tolerates a leading v and a prerelease suffix', () => {
  assert.equal(applyBump('v0.9.1', 'minor'), '0.10.0');
  assert.equal(applyBump('2.0.0-rc.1', 'patch'), '2.0.1');
});

test('applyBump rejects a non-semver tag', () => {
  assert.throws(() => applyBump('release-2024', 'patch'), TypeError);
});
