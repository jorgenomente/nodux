import { createCipheriv, randomBytes } from 'node:crypto';

import { getFiscalEncryptionConfig } from '@/lib/fiscal/auth/get-encryption-config';

const parseMasterKey = (rawKey: string) => {
  const trimmed = rawKey.trim();

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  return Buffer.from(trimmed, 'base64');
};

export const encryptPrivateKeyPem = (params: {
  privateKeyPem: string;
  masterKey?: string;
  keyReference?: string;
}) => {
  const privateKeyPem = params.privateKeyPem.trim();
  if (!privateKeyPem.startsWith('-----BEGIN ')) {
    throw new Error('Fiscal private key must be a PEM document');
  }

  const config = getFiscalEncryptionConfig();
  const masterKey = params.masterKey ?? config.masterKey;

  const masterKeyBuffer = parseMasterKey(masterKey);
  if (masterKeyBuffer.length !== 32) {
    throw new Error('Fiscal encryption master key must resolve to 32 bytes');
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKeyBuffer, iv);
  const ciphertext = Buffer.concat([
    cipher.update(privateKeyPem, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const encryptionKeyReference =
    params.keyReference ?? config.keyReference;

  return {
    encryptedPrivateKey: JSON.stringify({
      alg: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      encoding: 'base64',
    }),
    encryptionKeyReference,
  };
};
