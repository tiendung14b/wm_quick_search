import { createClient, Client } from '@libsql/client';

let client: Client | null = null;

export function getTursoClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL || 'libsql://wmquicksearch-tiendung14b.aws-ap-northeast-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE5MDk3MzIsImlkIjoiMDFhMTM2MjQtN2QwMS03ZTg5LWEzZmEtNWVhZmM3NGZjNDhmIiwia2lkIjoidGc1eGpzeWtfU0dWNG1XQ2tKMU1CdzJFUnBNTFBmWUowbTFLM0Itc3hnWSIsInJpZCI6IjU0NTc5ZWI4LTRlYjQtNDlmZS05YmYyLTJkZGU3MDYzN2FhYyJ9.eyFaQWxaJlnv3JltIATntLd_KXToSDXwtMU000_OqdtLD_EWHKpKgS4Wlhb77nMMXp2fpOreqwa8UP9H4kk5Cg';

  if (!url || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be defined');
  }

  client = createClient({
    url,
    authToken,
  });

  return client;
}
