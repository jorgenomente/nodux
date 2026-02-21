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

const NON_DIGIT_REGEX = /\D/g;

const splitRawNumber = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return { intPart: '', fracPart: '' };

  const commaIndex = trimmed.lastIndexOf(',');
  if (commaIndex >= 0) {
    const left = trimmed.slice(0, commaIndex).replace(NON_DIGIT_REGEX, '');
    const right = trimmed
      .slice(commaIndex + 1)
      .replace(NON_DIGIT_REGEX, '')
      .slice(0, 2);
    return { intPart: left, fracPart: right };
  }

  const dotMatches = trimmed.match(/\./g) ?? [];
  if (dotMatches.length === 1) {
    const dotIndex = trimmed.lastIndexOf('.');
    const leftRaw = trimmed.slice(0, dotIndex);
    const rightRaw = trimmed.slice(dotIndex + 1);
    const leftDigits = leftRaw.replace(NON_DIGIT_REGEX, '');
    const rightDigits = rightRaw.replace(NON_DIGIT_REGEX, '');
    const isLikelyDotDecimal =
      leftDigits.length > 3 &&
      rightDigits.length > 0 &&
      rightDigits.length <= 2;

    if (isLikelyDotDecimal) {
      return {
        intPart: leftDigits,
        fracPart: rightDigits.slice(0, 2),
      };
    }
  }

  return {
    intPart: trimmed.replace(NON_DIGIT_REGEX, ''),
    fracPart: '',
  };
};

const formatDisplay = (intPart: string, fracPart: string) => {
  if (!intPart) return fracPart ? `0,${fracPart}` : '';

  const formattedInt = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(Number(intPart));

  return fracPart ? `${formattedInt},${fracPart}` : formattedInt;
};

const toHiddenValue = (intPart: string, fracPart: string) => {
  if (!intPart) return fracPart ? `0.${fracPart}` : '';
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
