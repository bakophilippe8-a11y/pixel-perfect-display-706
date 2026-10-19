import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
function key() {
  const secret = process.env['SELLER_CREDENTIALS_SECRET'];
  if (!secret) throw new Error('Le chiffrement des accès est indisponible.');
  return createHash('sha256').update(secret).digest();
}
export function encryptCredentials(value: Record<string, string>, owner: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(owner));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
}
export function decryptCredentials(value: string, owner: string): Record<string, string> {
  const data = Buffer.from(value, 'base64');
  const cipher = createDecipheriv('aes-256-gcm', key(), data.subarray(0, 12));
  cipher.setAAD(Buffer.from(owner));
  cipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString('utf8'));
}