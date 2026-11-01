const VIETNAMESE_INTEGER = new Intl.NumberFormat('vi-VN');

interface CompactUnit {
  readonly divisor: bigint;
  readonly label: string;
}

const MONEY_UNITS: readonly CompactUnit[] = [
  { divisor: 1_000_000_000_000n, label: 'nghìn tỷ' },
  { divisor: 1_000_000_000n, label: 'tỷ' },
  { divisor: 1_000_000n, label: 'triệu' },
];

const COUNT_UNITS: readonly CompactUnit[] = [
  { divisor: 1_000_000_000n, label: 'tỷ' },
  { divisor: 1_000_000n, label: 'triệu' },
  { divisor: 1_000n, label: 'nghìn' },
];

export function formatCompactVnd(value: string | bigint): string {
  const amount = typeof value === 'bigint' ? value : BigInt(value);
  const unit = MONEY_UNITS.find(({ divisor }) => amount >= divisor);
  return unit ? `${formatOneDecimal(amount, unit.divisor)} ${unit.label}` : `${VIETNAMESE_INTEGER.format(amount)} đ`;
}

export function formatCompactCount(value: number, approximate = false): string {
  const safeValue = Math.max(0, Math.trunc(value));
  const amount = BigInt(safeValue);
  const unit = COUNT_UNITS.find(({ divisor }) => amount >= divisor);
  const formatted = unit
    ? `${formatOneDecimal(amount, unit.divisor)} ${unit.label}`
    : VIETNAMESE_INTEGER.format(safeValue);
  return approximate && safeValue > 0 ? `${formatted}+` : formatted;
}

function formatOneDecimal(value: bigint, divisor: bigint): string {
  const roundedTenths = (value * 10n + divisor / 2n) / divisor;
  const whole = roundedTenths / 10n;
  const decimal = roundedTenths % 10n;
  return decimal === 0n
    ? VIETNAMESE_INTEGER.format(whole)
    : `${VIETNAMESE_INTEGER.format(whole)},${decimal}`;
}
