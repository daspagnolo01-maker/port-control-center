import { apiRequest } from '@/lib/queryClient';
import type { CartellaLetta, FoglioLetto } from '@/lib/excel';

/**
 * Lettura di un documento Word (.docx): il file viene analizzato dal server,
 * che restituisce tabelle e paragrafi. Il risultato viene presentato con la
 * stessa anteprima usata per gli Excel, così la verifica della struttura
 * resta identica per qualsiasi tipo di elenco.
 */

async function base64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const byte = new Uint8Array(buffer);
  let binario = '';
  const passo = 0x8000;
  for (let i = 0; i < byte.length; i += passo) {
    binario += String.fromCharCode(...Array.from(byte.subarray(i, i + passo)));
  }
  return btoa(binario);
}

function intestazioneValida(righe: string[][]): boolean {
  const prima = righe[0] ?? [];
  if (prima.length < 2) return false;
  const nonVuote = prima.filter((c) => c.trim() !== '').length;
  return nonVuote >= Math.max(2, Math.floor(prima.length * 0.6));
}

export async function leggiDocumento(file: File): Promise<CartellaLetta> {
  const contenuto = await base64(file);
  const risposta = await apiRequest('POST', '/api/documento', { nomeFile: file.name, contenuto });
  const dati = (await risposta.json()) as {
    paragrafi: string[];
    tabelle: { nome: string; righe: string[][] }[];
  };

  const fogli: FoglioLetto[] = [];

  for (const tabella of dati.tabelle ?? []) {
    const righeGrezze = tabella.righe.filter((r) => r.some((c) => c.trim() !== ''));
    if (!righeGrezze.length) continue;
    const conIntestazione = intestazioneValida(righeGrezze);
    const colonne = conIntestazione
      ? righeGrezze[0].map((c, i) => c.trim() || `Colonna ${i + 1}`)
      : righeGrezze[0].map((_, i) => `Colonna ${i + 1}`);
    const corpo = conIntestazione ? righeGrezze.slice(1) : righeGrezze;
    const righe = corpo.map((r) => {
      const out: Record<string, any> = {};
      colonne.forEach((c, i) => {
        out[c] = (r[i] ?? '').trim();
      });
      return out;
    });
    fogli.push({ nome: tabella.nome, colonne, righe, includi: righe.length > 0 });
  }

  const paragrafi = (dati.paragrafi ?? []).map((t) => t.trim()).filter((t) => t.length > 1);
  if (paragrafi.length) {
    fogli.push({
      nome: 'Paragrafi del documento',
      colonne: ['Voce'],
      righe: paragrafi.map((t) => ({ Voce: t })),
      // i paragrafi contengono spesso titoli e testo libero: l'utente decide se includerli
      includi: fogli.length === 0,
    });
  }

  if (!fogli.length) throw new Error('Nel documento non sono stati trovati elenchi o tabelle.');
  return { nomeFile: file.name, fogli };
}

/** Riconosce il tipo di file scelto dall'utente. */
export function tipoFile(file: File): 'excel' | 'docx' | 'eseguibile' | 'altro' {
  const nome = file.name.toLowerCase();
  if (/\.(xlsx|xlsm|xls|csv)$/.test(nome)) return 'excel';
  if (/\.docx$/.test(nome)) return 'docx';
  if (/\.(exe|msi|bat|cmd|lnk|app)$/.test(nome)) return 'eseguibile';
  return 'altro';
}
