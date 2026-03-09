import type { WsaaSignedCms, WsaaTra } from '@/lib/fiscal/shared/fiscal-types';

export type WsaaSignerInput = {
  traXml: string;
  certificatePem: string;
  privateKeyPem: string;
  passphrase?: string;
};

export interface WsaaSignerAdapter {
  signCmsBase64(input: WsaaSignerInput): Promise<string>;
}

const assertPem = (value: string, label: string) => {
  if (!value.trim().startsWith('-----BEGIN ')) {
    throw new Error(`${label} must be a PEM-encoded value`);
  }
};

export const signTra = async (params: {
  tra: WsaaTra;
  certificatePem: string;
  privateKeyPem: string;
  passphrase?: string;
  signer: WsaaSignerAdapter;
}): Promise<WsaaSignedCms> => {
  assertPem(params.certificatePem, 'certificatePem');
  assertPem(params.privateKeyPem, 'privateKeyPem');

  const cmsBase64 = await params.signer.signCmsBase64({
    traXml: params.tra.xml,
    certificatePem: params.certificatePem,
    privateKeyPem: params.privateKeyPem,
    passphrase: params.passphrase,
  });

  if (!cmsBase64.trim()) {
    throw new Error('WSAA signer returned an empty CMS payload');
  }

  return {
    cmsBase64,
    certificatePem: params.certificatePem,
  };
};
