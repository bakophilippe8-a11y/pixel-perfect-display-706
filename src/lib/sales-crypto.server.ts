import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Format courant : "v1:" + base64(iv | tag | données). Les anciens chiffrés sans préfixe restent lisibles.
// Rotation : placer l'ancienne valeur dans SELLER_CREDENTIALS_SECRET_PREVIOUS, puis ré-enregistrer les accès.
const VERSION = 'v1:';
const derive = (secret: string) => createHash('sha256').update(secret).digest();
function currentKey() {
  const secret = process.env['SELLER_CREDENTIALS_SECRET'];
  if (!secret) throw new Error('Le chiffrement des accès est indisponible.');
  return derive(secret);
}
function candidateKeys() {
  const previous = process.env['SELLER_CREDENTIALS_SECRET_PREVIOUS'];
  return previous ? [currentKey(), derive(previous)] : [currentKey()];
}

export function encryptCredentials(value: Record<string, string>, owner: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', currentKey(), iv);
  cipher.setAAD(Buffer.from(owner));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return VERSION + Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
}

export function decryptCredentials(value: string, owner: string): Record<string, string> {
  const data = Buffer.from(value.startsWith(VERSION) ? value.slice(VERSION.length) : value, 'base64');
  let lastError: unknown;
  for (const key of candidateKeys()) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
      decipher.setAAD(Buffer.from(owner));
      decipher.setAuthTag(data.subarray(12, 28));
      return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'));
    } catch (error) { lastError = error; }
  }
  throw lastError ?? new Error('Accès illisibles.');
}
