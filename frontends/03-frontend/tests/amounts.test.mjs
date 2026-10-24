import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUnits, formatUnits, nextBid } from '../src/utils/amounts.mjs';

test('NEAR amounts retain every yoctoNEAR', () => {
  const input = '123456789.123456789012345678901234';
  assert.equal(parseUnits(input, 24), '123456789123456789012345678901234');
  assert.equal(formatUnits(parseUnits(input, 24), 24), input);
  assert.equal(nextBid('0.000000000000000000000001', 24), '1.000000000000000000000001');
});

test('FT precision and invalid amounts', () => {
  assert.equal(parseUnits('12.000001', 6), '12000001');
  assert.equal(formatUnits('12000001', 6), '12.000001');
  assert.equal(parseUnits('42', 0), '42');
  assert.equal(formatUnits('42', 0), '42');
  for (const input of ['-1', '1e24', 'NaN', '', '1.0000001']) {
    assert.throws(() => parseUnits(input, 6));
  }
  assert.throws(() => parseUnits((1n << 128n).toString(), 0));
});
