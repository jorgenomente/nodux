const SECRET_KEYS = new Set([
  'token',
  'sign',
  'private_key',
  'privateKey',
  'encrypted_private_key',
  'encryptedPrivateKey',
  'certificate',
  'certificate_pem',
  'certificatePem',
  'xml_signed',
  'xmlSigned',
]);

const redactString = (value: string) => {
  if (value.length <= 8) return '***REDACTED***';
  return `${value.slice(0, 4)}***REDACTED***${value.slice(-4)}`;
};

export const redactSecrets = (input: unknown): unknown => {
  if (input == null) return input;

  if (typeof input === 'string') {
    return input.includes('-----BEGIN') ? '***REDACTED***' : input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactSecrets(item));
  }

  if (typeof input === 'object') {
    const entries = Object.entries(input as Record<string, unknown>);
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of entries) {
      if (SECRET_KEYS.has(key)) {
        if (typeof value === 'string') {
          redacted[key] = redactString(value);
        } else {
          redacted[key] = '***REDACTED***';
        }
        continue;
      }

      redacted[key] = redactSecrets(value);
    }

    return redacted;
  }

  return input;
};
