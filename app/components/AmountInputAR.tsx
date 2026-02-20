'use client';

import { useMemo, useState } from 'react';

type Props = {
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  onValueChange?: (value: number | null) => void;
};

const splitRawNumber = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return { intPart: '', fracPart: '' };

  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  const sepIndex = Math.max(lastComma, lastDot);

  if (sepIndex < 0) {
    return {
      intPart: trimmed.replace(/\D/g, ''),
      fracPart: '',
    };
  }

  const left = trimmed.slice(0, sepIndex).replace(/\D/g, '');
  const right = trimmed
    .slice(sepIndex + 1)
    .replace(/\D/g, '')
    .slice(0, 2);
  return { intPart: left, fracPart: right };
};

const formatDisplay = (intPart: string, fracPart: string) => {
  if (!intPart) return fracPart ? `0,${fracPart}` : '';

  const formattedInt = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(Number(intPart));

  return fracPart ? `${formattedInt},${fracPart}` : formattedInt;
};

const toHiddenValue = (intPart: string, fracPart: string) => {
  if (!intPart) return '';
  return fracPart ? `${intPart}.${fracPart}` : intPart;
};

const initialFromDefault = (value: Props['defaultValue']) => {
  if (value == null || value === '') return '';
  const asString = String(value);
  const { intPart, fracPart } = splitRawNumber(asString);
  return formatDisplay(intPart, fracPart);
};

export default function AmountInputAR({
  name,
  defaultValue,
  placeholder,
  className,
  required,
  disabled,
  onValueChange,
}: Props) {
  const [displayValue, setDisplayValue] = useState<string>(() =>
    initialFromDefault(defaultValue),
  );

  const hiddenValue = useMemo(() => {
    const { intPart, fracPart } = splitRawNumber(displayValue);
    return toHiddenValue(intPart, fracPart);
  }, [displayValue]);

  return (
    <>
      <input type="hidden" name={name} value={hiddenValue} />
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        placeholder={placeholder}
        className={className}
        required={required}
        disabled={disabled}
        onChange={(event) => {
          const nextRaw = event.target.value;
          const { intPart, fracPart } = splitRawNumber(nextRaw);
          const nextDisplay = formatDisplay(intPart, fracPart);
          setDisplayValue(nextDisplay);

          if (onValueChange) {
            const hidden = toHiddenValue(intPart, fracPart);
            onValueChange(hidden ? Number(hidden) : null);
          }
        }}
      />
    </>
  );
}
