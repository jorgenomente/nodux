import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

const DEFAULT_KEY_REFERENCE_ENV = 'FISCAL_ENCRYPTION_KEY_REFERENCE';
const DEFAULT_MASTER_KEY_ENV = 'FISCAL_ENCRYPTION_MASTER_KEY';
const DEFAULT_DEV_SECRET_FILE = join(
  process.cwd(),
  '.nodux-secrets',
  'fiscal-encryption-dev.json',
);

type PersistedDevSecret = {
  masterKey: string;
  keyReference: string;
};

const loadPersistedDevSecret = (filePath: string) => {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as PersistedDevSecret;
    if (!parsed.masterKey || !parsed.keyReference) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const createPersistedDevSecret = (filePath: string): PersistedDevSecret => {
  const secret: PersistedDevSecret = {
    masterKey: randomBytes(32).toString('base64'),
    keyReference: 'local-dev-auto',
  };

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(secret, null, 2), 'utf8');

  return secret;
};

export const getFiscalEncryptionConfig = () => {
  const masterKey = process.env[DEFAULT_MASTER_KEY_ENV];
  const keyReference = process.env[DEFAULT_KEY_REFERENCE_ENV];

  if (masterKey) {
    return {
      masterKey,
      keyReference: keyReference ?? 'app-default',
      source: 'env' as const,
    };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing ${DEFAULT_MASTER_KEY_ENV} for fiscal private key encryption`,
    );
  }

  const devSecretFile =
    process.env.FISCAL_ENCRYPTION_DEV_SECRET_FILE ?? DEFAULT_DEV_SECRET_FILE;
  const persisted =
    loadPersistedDevSecret(devSecretFile) ??
    createPersistedDevSecret(devSecretFile);

  return {
    masterKey: persisted.masterKey,
    keyReference: persisted.keyReference,
    source: 'dev-file' as const,
    filePath: devSecretFile,
  };
};
