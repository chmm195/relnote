import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNotes } from '../src/render.js';
import { parseCommitMessage } from '../src/parse.js';

const commit = (message, hash = 'abcdef1234567890') => ({
  hash,
  ...parseCommitMessage(message),
});

test('groups commits under their section headings', () => {
  const notes = renderNotes([
    commit('feat: add a thing'),
    commit('fix: remove a bug'),
    commit('feat: add another thing'),
  ]);

  assert.match(notes, /### Features/);
  assert.match(notes, /### Bug fixes/);
  assert.ok(notes.indexOf('### Features') < notes.indexOf('### Bug fixes'));
  assert.match(notes, /- add a thing/);
});

test('renders the scope in bold ahead of the description', () => {
  assert.match(renderNotes([commit('fix(cli): handle -h')]), /- \*\*cli:\*\* handle -h/);
});

test('breaking changes are lifted into their own leading section', () => {
  const notes = renderNotes([commit('feat!: drop node 16'), commit('feat: keep going')]);
  assert.ok(notes.indexOf('Breaking changes') < notes.indexOf('### Features'));
  // The breaking commit must not also appear under Features.
  assert.equal(notes.match(/drop node 16/g).length, 1);
});

test('a breaking footer detail is indented beneath its entry', () => {
  const notes = renderNotes([commit('feat: rework\n\nBREAKING CHANGE: signature changed')]);
  assert.match(notes, /\n {2}signature changed/);
});

test('commitUrl turns hashes into short links', () => {
  const notes = renderNotes([commit('fix: thing', 'deadbeefcafe')], {
    commitUrl: (hash) => `https://example.test/c/${hash}`,
  });
  assert.match(notes, /\(\[`deadbee`\]\(https:\/\/example\.test\/c\/deadbeefcafe\)\)/);
});

test('without commitUrl the entries carry no link', () => {
  assert.doesNotMatch(renderNotes([commit('fix: thing')]), /\[`/);
});

test('housekeeping commits are hidden unless asked for', () => {
  const commits = [commit('chore: bump deps'), commit('feat: real change')];
  assert.doesNotMatch(renderNotes(commits), /bump deps/);
  assert.match(renderNotes(commits, { includeHidden: true }), /### Other changes/);
});

test('a version heading is rendered with its date', () => {
  const notes = renderNotes([commit('feat: x')], { version: '1.4.0', date: '2026-08-24' });
  assert.match(notes, /^## 1\.4\.0 \(2026-08-24\)/);
});

test('an all-housekeeping range renders nothing at all', () => {
  assert.equal(renderNotes([commit('chore: tidy')], { version: '1.0.1' }), '');
});

test('output ends with exactly one newline', () => {
  const notes = renderNotes([commit('feat: x')]);
  assert.ok(notes.endsWith('\n'));
  assert.ok(!notes.endsWith('\n\n'));
});
