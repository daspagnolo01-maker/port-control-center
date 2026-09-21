import { fonti, software, associazioni } from '@shared/schema';
import type {
  Fonte,
  InsertFonte,
  Software,
  InsertSoftware,
  Associazione,
  InsertAssociazione,
  ImportPayload,
} from '@shared/schema';
import { normalizza, suggerisciArea, suggerisciFunzione, suggerisciAttivita } from '@shared/taxonomy';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { eq, inArray } from 'drizzle-orm';

const sqlite = new Database('data.db');
sqlite.pragma('journal_mode = WAL');

sqlite.exec(`
CREATE TABLE IF NOT EXISTS fonti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_file TEXT NOT NULL,
  etichetta TEXT,
  note TEXT,
  fogli TEXT NOT NULL DEFAULT '[]',
  n_fogli INTEGER NOT NULL DEFAULT 0,
  n_record INTEGER NOT NULL DEFAULT 0,
  mappatura_colonne TEXT NOT NULL DEFAULT '{}',
  versione INTEGER NOT NULL DEFAULT 1,
  importato_il TEXT NOT NULL,
  aggiornato_il TEXT
);
CREATE TABLE IF NOT EXISTS software (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fonte_id INTEGER NOT NULL,
  foglio TEXT,
  riga_origine INTEGER,
  codice TEXT,
  nome TEXT NOT NULL,
  descrizione TEXT,
  area_testo TEXT,
  funzione_testo TEXT,
  attivita_testo TEXT,
  categoria TEXT,
  url TEXT,
  percorso_locale TEXT,
  app_desktop TEXT,
  note TEXT,
  stato TEXT,
  ruolo TEXT,
  icona TEXT,
  dati_grezzi TEXT NOT NULL DEFAULT '{}',
  chiave_duplicato TEXT,
  decisione_duplicato TEXT,
  principale INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS associazioni (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  software_id INTEGER NOT NULL,
  area_id TEXT NOT NULL,
  funzione_id TEXT,
  attivita_id TEXT,
  origine TEXT NOT NULL DEFAULT 'manuale',
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_sw_fonte ON software(fonte_id);
CREATE INDEX IF NOT EXISTS idx_ass_sw ON associazioni(software_id);
CREATE INDEX IF NOT EXISTS idx_ass_area ON associazioni(area_id);
`);

export const db = drizzle(sqlite);

const ora = () => new Date().toISOString();

export class Storage {
  // ---- Fonti (file Excel) ----
  listaFonti(): Fonte[] {
    return db.select().from(fonti).all();
  }

  getFonte(id: number): Fonte | undefined {
    return db.select().from(fonti).where(eq(fonti.id, id)).get();
  }

  aggiornaFonte(id: number, patch: Partial<InsertFonte>): Fonte | undefined {
    return db.update(fonti).set(patch).where(eq(fonti.id, id)).returning().get();
  }

  eliminaFonte(id: number): void {
    const ids = db.select().from(software).where(eq(software.fonteId, id)).all().map((s) => s.id);
    if (ids.length) db.delete(associazioni).where(inArray(associazioni.softwareId, ids)).run();
    db.delete(software).where(eq(software.fonteId, id)).run();
    db.delete(fonti).where(eq(fonti.id, id)).run();
  }

  /** Importa un nuovo file Excel (o rimpiazza il contenuto di uno già presente). */
  importa(payload: ImportPayload, fonteIdEsistente?: number): { fonte: Fonte; inseriti: number } {
    let fonte: Fonte;
    if (fonteIdEsistente) {
      const precedente = this.getFonte(fonteIdEsistente);
      if (!precedente) throw new Error('Fonte non trovata');
      // Conserva le associazioni manuali per nome software prima di sostituire i record.
      const vecchi = db.select().from(software).where(eq(software.fonteId, fonteIdEsistente)).all();
      const manualiPerNome = new Map<string, Associazione[]>();
      for (const s of vecchi) {
        const ass = db
          .select()
          .from(associazioni)
          .where(eq(associazioni.softwareId, s.id))
          .all()
          .filter((a) => a.origine === 'manuale');
        if (ass.length) manualiPerNome.set(normalizza(s.nome), ass);
      }
      const ids = vecchi.map((s) => s.id);
      if (ids.length) db.delete(associazioni).where(inArray(associazioni.softwareId, ids)).run();
      db.delete(software).where(eq(software.fonteId, fonteIdEsistente)).run();
      fonte = db
        .update(fonti)
        .set({
          nomeFile: payload.nomeFile,
          etichetta: payload.etichetta ?? precedente.etichetta,
          note: payload.note ?? precedente.note,
          fogli: JSON.stringify(payload.fogli),
          nFogli: payload.fogli.length,
          nRecord: payload.righe.length,
          mappaturaColonne: JSON.stringify(payload.mappaturaColonne),
          versione: precedente.versione + 1,
          aggiornatoIl: ora(),
        })
        .where(eq(fonti.id, fonteIdEsistente))
        .returning()
        .get();
      const inseriti = this.inserisciRighe(fonte.id, payload, manualiPerNome);
      return { fonte, inseriti };
    }

    fonte = db
      .insert(fonti)
      .values({
        nomeFile: payload.nomeFile,
        etichetta: payload.etichetta ?? null,
        note: payload.note ?? null,
        fogli: JSON.stringify(payload.fogli),
        nFogli: payload.fogli.length,
        nRecord: payload.righe.length,
        mappaturaColonne: JSON.stringify(payload.mappaturaColonne),
        versione: 1,
        importatoIl: ora(),
        aggiornatoIl: null,
      })
      .returning()
      .get();
    const inseriti = this.inserisciRighe(fonte.id, payload);
    return { fonte, inseriti };
  }

  private inserisciRighe(
    fonteId: number,
    payload: ImportPayload,
    manualiPerNome?: Map<string, Associazione[]>
  ): number {
    let inseriti = 0;
    for (const riga of payload.righe) {
      const rec: InsertSoftware = {
        fonteId,
        foglio: riga.foglio ?? null,
        rigaOrigine: riga.rigaOrigine ?? null,
        codice: riga.codice ?? null,
        nome: riga.nome,
        descrizione: riga.descrizione ?? null,
        areaTesto: riga.areaTesto ?? null,
        funzioneTesto: riga.funzioneTesto ?? null,
        attivitaTesto: riga.attivitaTesto ?? null,
        categoria: riga.categoria ?? null,
        url: riga.url ?? null,
        percorsoLocale: riga.percorsoLocale ?? null,
        appDesktop: riga.appDesktop ?? null,
        note: riga.note ?? null,
        stato: riga.stato ?? null,
        ruolo: riga.ruolo ?? null,
        icona: riga.icona ?? null,
        datiGrezzi: JSON.stringify(riga.datiGrezzi ?? {}),
        chiaveDuplicato: normalizza(riga.nome),
        decisioneDuplicato: null,
        principale: 0,
      };
      const creato = db.insert(software).values(rec).returning().get();
      inseriti++;

      // Ripristina associazioni manuali precedenti (aggiornamento di un Excel già importato).
      const manuali = manualiPerNome?.get(normalizza(riga.nome));
      if (manuali?.length) {
        for (const a of manuali) {
          db.insert(associazioni)
            .values({
              softwareId: creato.id,
              areaId: a.areaId,
              funzioneId: a.funzioneId,
              attivitaId: a.attivitaId,
              origine: 'manuale',
              note: a.note,
            })
            .run();
        }
        continue;
      }

      if (payload.autoAssocia) this.autoAssocia(creato);
    }
    return inseriti;
  }

  /** Riconosce area/funzione/attività dai testi importati e crea l'associazione automatica. */
  autoAssocia(s: Software): Associazione | undefined {
    const area = suggerisciArea(s.areaTesto) ?? suggerisciArea(s.categoria);
    const funzione =
      suggerisciFunzione(s.funzioneTesto, area?.id) ??
      (area ? undefined : suggerisciFunzione(s.funzioneTesto));
    const areaFinale = area?.id ?? (funzione ? funzione.id.split('.')[0] : undefined);
    if (!areaFinale) return undefined;
    const attivita = suggerisciAttivita(s.attivitaTesto, funzione?.id);
    return db
      .insert(associazioni)
      .values({
        softwareId: s.id,
        areaId: areaFinale,
        funzioneId: funzione?.id ?? null,
        attivitaId: attivita?.id ?? null,
        origine: 'automatica',
        note: null,
      })
      .returning()
      .get();
  }

  // ---- Software ----
  listaSoftware(): Software[] {
    return db.select().from(software).all();
  }

  getSoftware(id: number): Software | undefined {
    return db.select().from(software).where(eq(software.id, id)).get();
  }

  aggiornaSoftware(id: number, patch: Partial<InsertSoftware>): Software | undefined {
    return db.update(software).set(patch).where(eq(software.id, id)).returning().get();
  }

  eliminaSoftware(id: number): void {
    db.delete(associazioni).where(eq(associazioni.softwareId, id)).run();
    db.delete(software).where(eq(software.id, id)).run();
  }

  // ---- Associazioni ----
  listaAssociazioni(): Associazione[] {
    return db.select().from(associazioni).all();
  }

  creaAssociazione(a: InsertAssociazione): Associazione {
    return db.insert(associazioni).values(a).returning().get();
  }

  aggiornaAssociazione(id: number, patch: Partial<InsertAssociazione>): Associazione | undefined {
    return db.update(associazioni).set(patch).where(eq(associazioni.id, id)).returning().get();
  }

  eliminaAssociazione(id: number): void {
    db.delete(associazioni).where(eq(associazioni.id, id)).run();
  }

  /** Riesegue l'associazione automatica su tutti i software senza associazioni. */
  riassociaTutti(): number {
    const tutti = this.listaSoftware();
    const conAss = new Set(this.listaAssociazioni().map((a) => a.softwareId));
    let creati = 0;
    for (const s of tutti) {
      if (conAss.has(s.id)) continue;
      if (this.autoAssocia(s)) creati++;
    }
    return creati;
  }
}

export const storage = new Storage();
