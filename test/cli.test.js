import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/cli.js';

test('long and short flags are equivalent', () => {
  assert.deepEqual(parseArgs(['-r', 'v1..HEAD']).range, 'v1..HEAD');
  assert.deepEqual(parseArgs(['--range', 'v1..HEAD']).range, 'v1..HEAD');
});

test('boolean flags default to false', () => {
  const options = parseArgs([]);
  assert.equal(options.includeHidden, false);
  assert.equal(options.bumpOnly, false);
  assert.equal(options.help, false);
});

test('--all and --bump set their flags', () => {
  const options = parseArgs(['--all', '--bump']);
  assert.equal(options.includeHidden, true);
  assert.equal(options.bumpOnly, true);
});

test('a value flag with a missing value is an error', () => {
  assert.throws(() => parseArgs(['--range']), /requires a value/);
  assert.throws(() => parseArgs(['--range', '--all']), /requires a value/);
});

test('an unknown option is an error', () => {
  assert.throws(() => parseArgs(['--nope']), /unknown option/);
});

test('--json is off by default and sets its flag when passed', () => {
  assert.equal(parseArgs([]).json, false);
  assert.equal(parseArgs(['--json']).json, true);
});

test('--json composes with the other flags', () => {
  const options = parseArgs(['--json', '--all', '-r', 'v1..HEAD']);
  assert.equal(options.json, true);
  assert.equal(options.includeHidden, true);
  assert.equal(options.range, 'v1..HEAD');
});
