export type ImportedContact = {
  nom: string;
  telephone: string;
};

function normalizePhone(raw: string): string {
  // Garde le + éventuel puis uniquement les chiffres
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return (hasPlus ? "+" : "") + digits;
}

/**
 * Parse un export vCard (.vcf) — format standard exporté par Google Contacts,
 * l'app Contacts iOS/Android, Outlook, etc. Un fichier peut contenir plusieurs
 * BEGIN:VCARD ... END:VCARD.
 */
export function parseVCF(text: string): ImportedContact[] {
  const contacts: ImportedContact[] = [];
  const cards = text.split(/BEGIN:VCARD/i).slice(1);

  for (const card of cards) {
    const lines = card.split(/\r\n|\n|\r/);
    let nom = "";
    const phones: string[] = [];

    for (const line of lines) {
      const unfolded = line.trim();
      if (!unfolded) continue;

      if (/^FN[:;]/i.test(unfolded)) {
        nom = unfolded.split(":").slice(1).join(":").trim();
      } else if (!nom && /^N[:;]/i.test(unfolded)) {
        // N:Nom;Prénom;;; — fallback si FN absent
        const parts = unfolded.split(":").slice(1).join(":").split(";");
        nom = [parts[1], parts[0]].filter(Boolean).join(" ").trim();
      } else if (/^TEL[:;]/i.test(unfolded)) {
        const value = unfolded.split(":").slice(1).join(":").trim();
        if (value) phones.push(normalizePhone(value));
      }
    }

    if (phones.length > 0) {
      // Un contact peut avoir plusieurs numéros : on crée une entrée par numéro
      for (const phone of phones) {
        contacts.push({ nom: nom || phone, telephone: phone });
      }
    }
  }

  return contacts;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim().replace(/^"|"$/g, ""));
}

const NAME_HEADERS = ["nom", "name", "full name", "nom complet", "contact"];
const PHONE_HEADERS = [
  "telephone",
  "téléphone",
  "phone",
  "phone number",
  "numero",
  "numéro",
  "mobile",
  "phone 1 - value",
];

/**
 * Parse un export CSV (Google Contacts "Exporter en CSV", carnet d'adresses, etc.)
 * Détecte les colonnes nom/téléphone par en-tête ; à défaut, prend les deux
 * premières colonnes.
 */
export function parseCSV(text: string): ImportedContact[] {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0] ?? "").map((h) => h.toLowerCase());
  let nameIdx = header.findIndex((h) => NAME_HEADERS.includes(h));
  let phoneIdx = header.findIndex((h) => PHONE_HEADERS.some((p) => h.includes(p)));

  let startRow = 1;
  if (nameIdx === -1 && phoneIdx === -1) {
    // Pas d'en-tête reconnue : on suppose colonne 0 = nom, colonne 1 = téléphone
    nameIdx = 0;
    phoneIdx = 1;
    startRow = 0;
  } else {
    if (nameIdx === -1) nameIdx = 0;
    if (phoneIdx === -1) phoneIdx = 1;
  }

  const contacts: ImportedContact[] = [];
  for (let i = startRow; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i] ?? "");
    const nom = cells[nameIdx]?.trim() ?? "";
    const telephoneRaw = cells[phoneIdx]?.trim() ?? "";
    if (!telephoneRaw) continue;

    // Certains exports mettent plusieurs numéros séparés par " ::: " ou "/"
    const phoneParts = telephoneRaw
      .split(/:::|\/|;/)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const part of phoneParts.length > 0 ? phoneParts : [telephoneRaw]) {
      const phone = normalizePhone(part);
      if (phone) contacts.push({ nom: nom || phone, telephone: phone });
    }
  }

  return contacts;
}

/**
 * Détecte le format (VCF ou CSV) à partir du contenu et/ou du nom de fichier,
 * puis parse. Dédoublonne ensuite par numéro de téléphone normalisé.
 */
export function parseContactsFile(fileName: string, content: string): ImportedContact[] {
  const isVcf = /\.vcf$/i.test(fileName) || /BEGIN:VCARD/i.test(content);
  const raw = isVcf ? parseVCF(content) : parseCSV(content);

  const seen = new Set<string>();
  const deduped: ImportedContact[] = [];
  for (const c of raw) {
    if (!c.telephone || c.telephone.length < 5) continue;
    if (seen.has(c.telephone)) continue;
    seen.add(c.telephone);
    deduped.push(c);
  }
  return deduped;
}
