import { createDecipheriv } from 'node:crypto';

import { getFiscalEncryptionConfig } from '@/lib/fiscal/auth/get-encryption-config';

type EncryptedPayload = {
  alg?: string;
  iv: string;
  tag: string;
  ciphertext: string;
  encoding?: 'base64' | 'hex';
};

const parseMasterKey = (rawKey: string) => {
  const trimmed = rawKey.trim();

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  return Buffer.from(trimmed, 'base64');
};

const parseEncryptedPayload = (value: string): EncryptedPayload => {
  const trimmed = value.trim();

  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as EncryptedPayload;
    if (!parsed.iv || !parsed.tag || !parsed.ciphertext) {
      throw new Error('Encrypted private key JSON payload is incomplete');
    }
    return parsed;
  }

  const parts = trimmed.split(':');
  if (parts.length === 3) {
    const [iv, tag, ciphertext] = parts;
    return {
      iv,
      tag,
      ciphertext,
      encoding: 'base64',
    };
  }

  throw new Error('Unsupported encrypted private key payload format');
};

const decodePart = (value: string, encoding: 'base64' | 'hex') =>
  Buffer.from(value, encoding);

export const decryptPrivateKeyPem = (params: {
  encryptedPrivateKey: string;
  encryptionKeyReference: string;
  masterKey?: string;
  expectedKeyReference?: string;
  allowPlaintextPem?: boolean;
}) => {
  const allowPlaintextPem =
    params.allowPlaintextPem ||
    process.env.FISCAL_ALLOW_PLAINTEXT_PRIVATE_KEY === 'true';

  if (
    allowPlaintextPem &&
    params.encryptedPrivateKey.trim().startsWith('-----BEGIN ')
  ) {
    return params.encryptedPrivateKey;
  }

  const config = getFiscalEncryptionConfig();
  const expectedKeyReference =
    params.expectedKeyReference ?? config.keyReference;
  if (
    expectedKeyReference &&
    expectedKeyReference !== params.encryptionKeyReference
  ) {
    throw new Error(
      `Encryption key reference mismatch: expected ${expectedKeyReference}, received ${params.encryptionKeyReference}`,
    );
  }

  const masterKey = params.masterKey ?? config.masterKey;

  const masterKeyBuffer = parseMasterKey(masterKey);
  if (masterKeyBuffer.length !== 32) {
    throw new Error('Fiscal encryption master key must resolve to 32 bytes');
  }

  const payload = parseEncryptedPayload(params.encryptedPrivateKey);
  const encoding = payload.encoding ?? 'base64';
  const algorithm = payload.alg ?? 'aes-256-gcm';

  if (algorithm !== 'aes-256-gcm') {
    throw new Error(`Unsupported fiscal encryption algorithm: ${algorithm}`);
  }

  const decipher = createDecipheriv(
    algorithm,
    masterKeyBuffer,
    decodePart(payload.iv, encoding),
  );
  decipher.setAuthTag(decodePart(payload.tag, encoding));

  const decrypted = Buffer.concat([
    decipher.update(decodePart(payload.ciphertext, encoding)),
    decipher.final(),
  ]).toString('utf8');

  if (!decrypted.trim().startsWith('-----BEGIN ')) {
    throw new Error('Decrypted fiscal private key is not a PEM document');
  }

  return decrypted;
};
