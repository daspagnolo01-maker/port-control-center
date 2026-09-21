import * as XLSX from 'xlsx';
import { CAMPI_INTERNI, type CampoInterno, type RigaImport } from '@shared/schema';
import { normalizza } from '@shared/taxonomy';

export type FoglioLetto = {
  nome: string;
  colonne: string[];
  righe: Record<string, any>[];
  includi: boolean;
};

export type CartellaLetta = {
  nomeFile: string;
  fogli: FoglioLetto[];
};

/** Legge un file Excel/CSV nel browser: fogli, colonne e righe. */
export async function leggiFile(file: File): Promise<CartellaLetta> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { cellDates: true });
  const fogli: FoglioLetto[] = wb.SheetNames.map((nome) => {
    const ws = wb.Sheets[nome];
    const righe = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '', raw: false });
    const colonne: string[] = [];
    for (const r of righe) {
      for (const k of Object.keys(r)) {
        if (!colonne.includes(k) && !/^__EMPTY/.test(k)) colonne.push(k);
      }
    }
    const righePulite = righe
      .map((r) => {
        const out: Record<string, any> = {};
        for (const c of colonne) out[c] = typeof r[c] === 'string' ? r[c].trim() : r[c] ?? '';
        return out;
      })
      .filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
    return { nome, colonne, righe: righePulite, includi: righePulite.length > 0 };
  });
  return { nomeFile: file.name, fogli };
}

/** Sinonimi riconosciuti per la mappatura automatica delle colonne. */
const SINONIMI: Record<CampoInterno, string[]> = {
  codice: ['id', 'id software', 'codice', 'cod', 'sigla', 'codice software'],
  nome: [
    'nome software',
    'software',
    'nome',
    'applicazione',
    'applicativo',
    'programma',
    'denominazione',
    'titolo',
    'app',
    'sistema',
  ],
  descrizione: ['descrizione', 'description', 'scopo', 'finalita', 'dettaglio', 'cosa fa'],
  areaTesto: ['area', 'area portuale', 'zona', 'ambito', 'settore', 'reparto', 'luogo'],
  funzioneTesto: ['funzione', 'funzionalita', 'processo', 'macro processo', 'uso'],
  attivitaTesto: ['attivita', 'task', 'operazione', 'azione', 'attivita collegata'],
  categoria: ['categoria', 'tipologia', 'tipo', 'classe', 'gruppo', 'famiglia'],
  url: ['url', 'link', 'indirizzo web', 'sito', 'web', 'collegamento', 'indirizzo', 'http'],
  percorsoLocale: ['percorso', 'percorso locale', 'path', 'cartella', 'file', 'directory'],
  appDesktop: ['applicazione desktop', 'desktop', 'eseguibile', 'exe', 'client'],
  note: ['note', 'annotazioni', 'commenti', 'osservazioni', 'remarks'],
  stato: ['stato', 'status', 'attivo', 'operativo', 'in uso'],
  ruolo: ['ruolo', 'ruolo autorizzato', 'utenti', 'profilo', 'abilitazione', 'permessi'],
  icona: ['icona', 'icon', 'immagine', 'logo'],
};

export type Mappatura = Partial<Record<CampoInterno, string>>;

/** Propone una mappatura colonna Excel -> campo interno. */
export function mappaturaAutomatica(colonne: string[]): Mappatura {
  const m: Mappatura = {};
  const usate = new Set<string>();
  // Il nome è il campo obbligatorio: viene assegnato per primo, poi gli altri campi.
  const ordine = [
    ...CAMPI_INTERNI.filter((c) => c.key === 'nome'),
    ...CAMPI_INTERNI.filter((c) => c.key !== 'nome'),
  ];
  for (const campo of ordine) {
    const key = campo.key as CampoInterno;
    const sinonimi = SINONIMI[key] ?? [];
    let migliore: { col: string; punteggio: number } | undefined;
    for (const col of colonne) {
      if (usate.has(col)) continue;
      const n = normalizza(col);
      if (!n) continue;
      for (const s of sinonimi) {
        const ns = normalizza(s);
        let punteggio = 0;
        if (n === ns) punteggio = 100;
        else if (n.includes(ns) || ns.includes(n)) punteggio = 60;
        if (punteggio && (!migliore || punteggio > migliore.punteggio)) {
          migliore = { col, punteggio };
        }
      }
    }
    // Per il codice accettiamo solo una corrispondenza esatta, per evitare falsi positivi.
    if (migliore && key === 'codice' && migliore.punteggio < 100) migliore = undefined;
    if (migliore) {
      m[key] = migliore.col;
      usate.add(migliore.col);
    }
  }
  // Fallback: se nessuna colonna è riconosciuta come nome, usa la prima colonna testuale.
  if (!m.nome && colonne.length) m.nome = colonne[0];
  return m;
}

/** Trasforma i fogli selezionati in righe normalizzate pronte per l'importazione. */
export function normalizzaRighe(
  fogli: FoglioLetto[],
  mappature: Record<string, Mappatura>
): RigaImport[] {
  const out: RigaImport[] = [];
  for (const foglio of fogli) {
    if (!foglio.includi) continue;
    const map = mappature[foglio.nome] ?? {};
    foglio.righe.forEach((riga, i) => {
      const val = (campo: CampoInterno): string | null => {
        const col = map[campo];
        if (!col) return null;
        const v = riga[col];
        const s = v === null || v === undefined ? '' : String(v).trim();
        return s === '' ? null : s;
      };
      const nome = val('nome');
      if (!nome) return;
      out.push({
        foglio: foglio.nome,
        rigaOrigine: i + 2,
        codice: val('codice'),
        nome,
        descrizione: val('descrizione'),
        areaTesto: val('areaTesto'),
        funzioneTesto: val('funzioneTesto'),
        attivitaTesto: val('attivitaTesto'),
        categoria: val('categoria'),
        url: val('url'),
        percorsoLocale: val('percorsoLocale'),
        appDesktop: val('appDesktop'),
        note: val('note'),
        stato: val('stato'),
        ruolo: val('ruolo'),
        icona: val('icona'),
        datiGrezzi: riga,
      });
    });
  }
  return out;
}
