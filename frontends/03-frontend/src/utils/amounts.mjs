// Keep token amounts as decimal strings; JavaScript numbers lose u128 precision.
export function parseUnits(value, decimals) {
  const text = String(value);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error('Invalid token decimals');
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error('Enter a positive decimal amount');
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > decimals) throw new Error(`Use at most ${decimals} decimal places`);
  const amount = BigInt(whole + fraction.padEnd(decimals, '0'));
  if (amount > (1n << 128n) - 1n) throw new Error('Amount exceeds the token limit');
  return amount.toString();
}

export function formatUnits(value, decimals) {
  const digits = BigInt(value).toString().padStart(decimals + 1, '0');
  if (decimals === 0) return digits;
  const fraction = digits.slice(-decimals).replace(/0+$/, '');
  return digits.slice(0, -decimals) + (fraction ? `.${fraction}` : '');
}

export function nextBid(value, decimals) {
  return formatUnits(BigInt(parseUnits(value, decimals)) + 10n ** BigInt(decimals), decimals);
}
