import { inflateRawSync } from 'node:zlib';

/**
 * Lettura di un file .docx senza dipendenze esterne.
 * Un .docx è un archivio ZIP: si estrae `word/document.xml` e da lì si
 * ricavano paragrafi e tabelle, così un elenco di software scritto in Word
 * può essere importato come una qualsiasi cartella Excel.
 */

type VoceZip = { nome: string; dati: Buffer };

function leggiZip(buf: Buffer, soloNomi?: string[]): VoceZip[] {
  const out: VoceZip[] = [];
  // scansione delle intestazioni locali (PK\x03\x04)
  let i = 0;
  while (i + 30 <= buf.length) {
    if (buf.readUInt32LE(i) !== 0x04034b50) {
      i++;
      continue;
    }
    const metodo = buf.readUInt16LE(i + 8);
    let dimCompressa = buf.readUInt32LE(i + 18);
    const lunNome = buf.readUInt16LE(i + 26);
    const lunExtra = buf.readUInt16LE(i + 28);
    const nome = buf.subarray(i + 30, i + 30 + lunNome).toString('utf8');
    const inizio = i + 30 + lunNome + lunExtra;

    if (dimCompressa === 0) {
      // dimensioni nel data descriptor: si cerca la prossima intestazione
      let j = inizio;
      while (j + 4 <= buf.length) {
        const firma = buf.readUInt32LE(j);
        if (firma === 0x08074b50 || firma === 0x04034b50 || firma === 0x02014b50) break;
        j++;
      }
      dimCompressa = j - inizio;
    }

    const fine = Math.min(inizio + dimCompressa, buf.length);
    if (!soloNomi || soloNomi.includes(nome)) {
      const grezzo = buf.subarray(inizio, fine);
      try {
        out.push({ nome, dati: metodo === 8 ? inflateRawSync(grezzo) : Buffer.from(grezzo) });
      } catch {
        // voce non leggibile: si ignora e si continua
      }
    }
    i = fine;
  }
  return out;
}

function testo(xml: string): string {
  return xml
    .replace(/<w:tab[^>]*\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export type TabellaDocx = { nome: string; righe: string[][] };
export type DocumentoLetto = { paragrafi: string[]; tabelle: TabellaDocx[] };

/** Estrae paragrafi e tabelle da un .docx codificato in base64. */
export function leggiDocx(base64: string): DocumentoLetto {
  const buf = Buffer.from(base64, 'base64');
  const voci = leggiZip(buf, ['word/document.xml']);
  const documento = voci.find((v) => v.nome === 'word/document.xml');
  if (!documento) throw new Error('Documento Word non leggibile: manca word/document.xml');
  const xml = documento.dati.toString('utf8');
  const corpo = xml.slice(xml.indexOf('<w:body'));

  // tabelle
  const tabelle: TabellaDocx[] = [];
  const regexTabella = /<w:tbl[ >][\s\S]*?<\/w:tbl>/g;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = regexTabella.exec(corpo))) {
    n += 1;
    const righe: string[][] = [];
    for (const riga of m[0].match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? []) {
      const celle = (riga.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) ?? []).map((c) => testo(c));
      if (celle.some((c) => c !== '')) righe.push(celle);
    }
    if (righe.length) tabelle.push({ nome: `Tabella ${n}`, righe });
  }

  // paragrafi fuori dalle tabelle
  const senzaTabelle = corpo.replace(regexTabella, '');
  const paragrafi = (senzaTabelle.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [])
    .map((p) => testo(p))
    .filter((t) => t !== '');

  return { paragrafi, tabelle };
}
