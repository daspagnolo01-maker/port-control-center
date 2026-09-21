import { fonti, software, associazioni, aree, funzioni, attivita } from '@shared/schema';
import type {
  Fonte,
  InsertFonte,
  Software,
  InsertSoftware,
  Associazione,
  InsertAssociazione,
  ImportPayload,
  VoceManuale,
  AreaRecord,
  FunzioneRecord,
  AttivitaRecord,
  StrutturaArea,
  StrutturaFunzione,
} from '@shared/schema';
import {
  normalizza,
  suggerisciArea,
  suggerisciFunzione,
  suggerisciAttivita,
  AREE_PREDEFINITE,
  type Area,
} from '@shared/taxonomy';
import { GEOMETRIA_PREDEFINITA } from '@shared/geometria';
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
CREATE TABLE IF NOT EXISTS aree (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  codice TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT 'terminal',
  descrizione TEXT NOT NULL DEFAULT '',
  x INTEGER NOT NULL DEFAULT 0,
  y INTEGER NOT NULL DEFAULT 0,
  w INTEGER NOT NULL DEFAULT 240,
  h INTEGER NOT NULL DEFAULT 120,
  decoro TEXT,
  righe TEXT NOT NULL DEFAULT '[]',
  speciale INTEGER NOT NULL DEFAULT 0,
  ordine INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS funzioni (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  descrizione TEXT,
  ordine INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS attivita (
  id TEXT PRIMARY KEY,
  funzione_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  descrizione TEXT,
  ordine INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fun_area ON funzioni(area_id);
CREATE INDEX IF NOT EXISTS idx_att_fun ON attivita(funzione_id);
CREATE INDEX IF NOT EXISTS idx_sw_fonte ON software(fonte_id);
CREATE INDEX IF NOT EXISTS idx_ass_sw ON associazioni(software_id);
CREATE INDEX IF NOT EXISTS idx_ass_area ON associazioni(area_id);
`);

// Migrazioni leggere: aggiunge le colonne introdotte dopo la prima versione.
function colonnaSeManca(tabella: string, colonna: string, definizione: string) {
  const colonne = sqlite.prepare(`PRAGMA table_info(${tabella})`).all() as { name: string }[];
  if (!colonne.some((c) => c.name === colonna)) {
    sqlite.exec(`ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${definizione}`);
  }
}
colonnaSeManca('fonti', 'tipo', "TEXT NOT NULL DEFAULT 'excel'");
colonnaSeManca('software', 'tipo', 'TEXT');

export const db = drizzle(sqlite);

const ora = () => new Date().toISOString();

function sicuroJson<T>(testo: string, fallback: T): T {
  try {
    const v = JSON.parse(testo);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export class Storage {
  // ---- Struttura del porto (aree / funzioni / attività) ----

  /** Inserisce la struttura di partenza solo se il database è ancora vuoto. */
  inizializzaStruttura(): void {
    const esistenti = db.select().from(aree).all();
    if (esistenti.length) return;
    this.scriviStrutturaPredefinita();
  }

  private scriviStrutturaPredefinita(): void {
    AREE_PREDEFINITE.forEach((a, i) => {
      const g = GEOMETRIA_PREDEFINITA[a.id];
      db.insert(aree)
        .values({
          id: a.id,
          nome: a.nome,
          codice: a.codice,
          categoria: a.categoria,
          descrizione: a.descrizione,
          x: g?.x ?? 0,
          y: g?.y ?? 0,
          w: g?.w ?? 240,
          h: g?.h ?? 120,
          decoro: g?.decoro ?? null,
          righe: JSON.stringify(g?.righe ?? [a.nome]),
          speciale: g?.speciale ? 1 : 0,
          ordine: i,
        })
        .run();
      a.funzioni.forEach((f, j) => {
        db.insert(funzioni)
          .values({ id: f.id, areaId: a.id, nome: f.nome, descrizione: f.descrizione ?? null, ordine: j })
          .run();
        f.attivita.forEach((att, k) => {
          db.insert(attivita)
            .values({ id: att.id, funzioneId: f.id, nome: att.nome, descrizione: att.descrizione ?? null, ordine: k })
            .run();
        });
      });
    });
  }

  /** Struttura completa, ordinata, così come configurata dall'utente. */
  struttura(): StrutturaArea[] {
    const listaAree = db.select().from(aree).all();
    const listaFunzioni = db.select().from(funzioni).all();
    const listaAttivita = db.select().from(attivita).all();
    const perFunzione: Record<string, AttivitaRecord[]> = {};
    for (const att of listaAttivita) (perFunzione[att.funzioneId] ||= []).push(att);
    const perArea: Record<string, FunzioneRecord[]> = {};
    for (const f of listaFunzioni) (perArea[f.areaId] ||= []).push(f);

    return listaAree
      .slice()
      .sort((a, b) => a.ordine - b.ordine || a.nome.localeCompare(b.nome, 'it'))
      .map((a) => ({
        id: a.id,
        nome: a.nome,
        codice: a.codice,
        categoria: a.categoria,
        descrizione: a.descrizione,
        x: a.x,
        y: a.y,
        w: a.w,
        h: a.h,
        decoro: a.decoro,
        righe: sicuroJson<string[]>(a.righe, [a.nome]),
        speciale: a.speciale === 1,
        ordine: a.ordine,
        funzioni: (perArea[a.id] ?? [])
          .slice()
          .sort((x, y) => x.ordine - y.ordine || x.nome.localeCompare(y.nome, 'it'))
          .map<StrutturaFunzione>((f) => ({
            id: f.id,
            areaId: f.areaId,
            nome: f.nome,
            descrizione: f.descrizione,
            ordine: f.ordine,
            attivita: (perFunzione[f.id] ?? [])
              .slice()
              .sort((x, y) => x.ordine - y.ordine || x.nome.localeCompare(y.nome, 'it'))
              .map((att) => ({
                id: att.id,
                nome: att.nome,
                descrizione: att.descrizione,
                ordine: att.ordine,
              })),
          })),
      }));
  }

  /** Struttura nel formato usato dal riconoscimento automatico. */
  areeCorrenti(): Area[] {
    return this.struttura().map((a) => ({
      id: a.id,
      nome: a.nome,
      codice: a.codice,
      categoria: a.categoria as Area['categoria'],
      descrizione: a.descrizione,
      funzioni: a.funzioni.map((f) => ({
        id: f.id,
        nome: f.nome,
        descrizione: f.descrizione ?? undefined,
        attivita: f.attivita.map((att) => ({ id: att.id, nome: att.nome, descrizione: att.descrizione ?? undefined })),
      })),
    }));
  }

  private idLibero(base: string, prefisso: string, esistenti: Set<string>): string {
    const slug = normalizza(base).replace(/ /g, '-').slice(0, 48) || 'nodo';
    let candidato = prefisso ? `${prefisso}.${slug}` : slug;
    let n = 2;
    while (esistenti.has(candidato)) {
      candidato = prefisso ? `${prefisso}.${slug}-${n}` : `${slug}-${n}`;
      n++;
    }
    return candidato;
  }

  creaArea(dati: {
    nome: string;
    codice?: string;
    categoria?: string;
    descrizione?: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    righe?: string[];
  }): AreaRecord {
    const esistenti = new Set(db.select().from(aree).all().map((a) => a.id));
    const id = this.idLibero(dati.nome, '', esistenti);
    const tutte = db.select().from(aree).all();
    const ordine = tutte.reduce((m, a) => Math.max(m, a.ordine), -1) + 1;
    // nuova zona posizionata sotto le esistenti, così la pianta resta leggibile
    const bassa = tutte.reduce((m, a) => Math.max(m, a.y + a.h), 0);
    return db
      .insert(aree)
      .values({
        id,
        nome: dati.nome,
        codice: (dati.codice ?? normalizza(dati.nome).replace(/ /g, '').slice(0, 3)).toUpperCase(),
        categoria: dati.categoria ?? 'terminal',
        descrizione: dati.descrizione ?? '',
        x: dati.x ?? 40,
        y: dati.y ?? bassa + 20,
        w: dati.w ?? 300,
        h: dati.h ?? 120,
        decoro: null,
        righe: JSON.stringify(dati.righe?.length ? dati.righe : [dati.nome]),
        speciale: 0,
        ordine,
      })
      .returning()
      .get();
  }

  aggiornaArea(id: string, patch: Record<string, any>): AreaRecord | undefined {
    const dati: Record<string, any> = { ...patch };
    if (Array.isArray(patch.righe)) dati.righe = JSON.stringify(patch.righe);
    delete dati.id;
    delete dati.funzioni;
    return db.update(aree).set(dati).where(eq(aree.id, id)).returning().get();
  }

  /** Quante associazioni verrebbero perse eliminando un nodo della struttura. */
  impattoEliminazione(tipo: 'area' | 'funzione' | 'attivita', id: string): number {
    const tutte = db.select().from(associazioni).all();
    if (tipo === 'area') return tutte.filter((a) => a.areaId === id).length;
    if (tipo === 'funzione') return tutte.filter((a) => a.funzioneId === id).length;
    return tutte.filter((a) => a.attivitaId === id).length;
  }

  eliminaArea(id: string): number {
    const figlie = db.select().from(funzioni).where(eq(funzioni.areaId, id)).all();
    for (const f of figlie) db.delete(attivita).where(eq(attivita.funzioneId, f.id)).run();
    db.delete(funzioni).where(eq(funzioni.areaId, id)).run();
    const rimosse = this.impattoEliminazione('area', id);
    db.delete(associazioni).where(eq(associazioni.areaId, id)).run();
    db.delete(aree).where(eq(aree.id, id)).run();
    return rimosse;
  }

  creaFunzione(dati: { areaId: string; nome: string; descrizione?: string | null }): FunzioneRecord {
    const esistenti = new Set(db.select().from(funzioni).all().map((f) => f.id));
    const id = this.idLibero(dati.nome, dati.areaId, esistenti);
    const sorelle = db.select().from(funzioni).where(eq(funzioni.areaId, dati.areaId)).all();
    return db
      .insert(funzioni)
      .values({
        id,
        areaId: dati.areaId,
        nome: dati.nome,
        descrizione: dati.descrizione ?? null,
        ordine: sorelle.reduce((m, f) => Math.max(m, f.ordine), -1) + 1,
      })
      .returning()
      .get();
  }

  aggiornaFunzione(id: string, patch: Record<string, any>): FunzioneRecord | undefined {
    const dati = { ...patch };
    delete dati.id;
    delete dati.attivita;
    return db.update(funzioni).set(dati).where(eq(funzioni.id, id)).returning().get();
  }

  eliminaFunzione(id: string): number {
    const figlie = db.select().from(attivita).where(eq(attivita.funzioneId, id)).all();
    const idsFiglie = figlie.map((a) => a.id);
    db.delete(attivita).where(eq(attivita.funzioneId, id)).run();
    // le associazioni sul ramo eliminato risalgono all'area: nessun software viene perso
    const tutte = db.select().from(associazioni).all();
    let spostate = 0;
    for (const a of tutte) {
      if (a.funzioneId === id || (a.attivitaId && idsFiglie.includes(a.attivitaId))) {
        db.update(associazioni)
          .set({ funzioneId: null, attivitaId: null })
          .where(eq(associazioni.id, a.id))
          .run();
        spostate++;
      }
    }
    db.delete(funzioni).where(eq(funzioni.id, id)).run();
    return spostate;
  }

  creaAttivita(dati: { funzioneId: string; nome: string; descrizione?: string | null }): AttivitaRecord {
    const esistenti = new Set(db.select().from(attivita).all().map((a) => a.id));
    const id = this.idLibero(dati.nome, dati.funzioneId, esistenti);
    const sorelle = db.select().from(attivita).where(eq(attivita.funzioneId, dati.funzioneId)).all();
    return db
      .insert(attivita)
      .values({
        id,
        funzioneId: dati.funzioneId,
        nome: dati.nome,
        descrizione: dati.descrizione ?? null,
        ordine: sorelle.reduce((m, a) => Math.max(m, a.ordine), -1) + 1,
      })
      .returning()
      .get();
  }

  aggiornaAttivita(id: string, patch: Record<string, any>): AttivitaRecord | undefined {
    const dati = { ...patch };
    delete dati.id;
    return db.update(attivita).set(dati).where(eq(attivita.id, id)).returning().get();
  }

  eliminaAttivita(id: string): number {
    // l'associazione resta, ma risale alla funzione: il software non viene perso
    const tutte = db.select().from(associazioni).all().filter((a) => a.attivitaId === id);
    for (const a of tutte) {
      db.update(associazioni).set({ attivitaId: null }).where(eq(associazioni.id, a.id)).run();
    }
    db.delete(attivita).where(eq(attivita.id, id)).run();
    return tutte.length;
  }

  /** Sposta un nodo su o giù tra i suoi pari. */
  spostaNodo(tipo: 'area' | 'funzione' | 'attivita', id: string, direzione: -1 | 1): void {
    const lista =
      tipo === 'area'
        ? db.select().from(aree).all().slice().sort((a, b) => a.ordine - b.ordine)
        : tipo === 'funzione'
          ? (() => {
              const f = db.select().from(funzioni).where(eq(funzioni.id, id)).get();
              if (!f) return [];
              return db
                .select()
                .from(funzioni)
                .where(eq(funzioni.areaId, f.areaId))
                .all()
                .slice()
                .sort((a, b) => a.ordine - b.ordine);
            })()
          : (() => {
              const att = db.select().from(attivita).where(eq(attivita.id, id)).get();
              if (!att) return [];
              return db
                .select()
                .from(attivita)
                .where(eq(attivita.funzioneId, att.funzioneId))
                .all()
                .slice()
                .sort((a, b) => a.ordine - b.ordine);
            })();
    const i = lista.findIndex((n: any) => n.id === id);
    const j = i + direzione;
    if (i < 0 || j < 0 || j >= lista.length) return;
    const tabella = tipo === 'area' ? aree : tipo === 'funzione' ? funzioni : attivita;
    const a: any = lista[i];
    const b: any = lista[j];
    db.update(tabella as any).set({ ordine: b.ordine }).where(eq((tabella as any).id, a.id)).run();
    db.update(tabella as any).set({ ordine: a.ordine }).where(eq((tabella as any).id, b.id)).run();
  }

  /** Ripristina la struttura di partenza conservando i software importati. */
  ripristinaStruttura(): void {
    db.delete(attivita).run();
    db.delete(funzioni).run();
    db.delete(aree).run();
    this.scriviStrutturaPredefinita();
    // le associazioni che puntano a nodi non più esistenti vengono riportate a un livello valido
    const idsAree = new Set(db.select().from(aree).all().map((a) => a.id));
    const idsFunzioni = new Set(db.select().from(funzioni).all().map((f) => f.id));
    const idsAttivita = new Set(db.select().from(attivita).all().map((a) => a.id));
    for (const a of db.select().from(associazioni).all()) {
      if (!idsAree.has(a.areaId)) {
        db.delete(associazioni).where(eq(associazioni.id, a.id)).run();
        continue;
      }
      const patch: Record<string, any> = {};
      if (a.funzioneId && !idsFunzioni.has(a.funzioneId)) patch.funzioneId = null;
      if (a.attivitaId && !idsAttivita.has(a.attivitaId)) patch.attivitaId = null;
      if (Object.keys(patch).length) {
        db.update(associazioni).set(patch).where(eq(associazioni.id, a.id)).run();
      }
    }
  }

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
          tipo: payload.tipoFonte,
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
        tipo: payload.tipoFonte,
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
        tipo: riga.tipo ?? null,
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
  /**
   * Fonte tecnica che raccoglie le voci inserite a mano (software .exe, URL,
   * documenti). Così anche queste voci hanno una fonte tracciabile, come gli Excel.
   */
  private fonteManuale(): Fonte {
    const esistente = db.select().from(fonti).all().find((f) => f.tipo === 'manuale');
    if (esistente) return esistente;
    return db
      .insert(fonti)
      .values({
        nomeFile: 'Inserimenti manuali',
        etichetta: 'Voci inserite manualmente',
        note: null,
        fogli: '[]',
        nFogli: 0,
        nRecord: 0,
        mappaturaColonne: '{}',
        tipo: 'manuale',
        versione: 1,
        importatoIl: ora(),
        aggiornatoIl: null,
      })
      .returning()
      .get();
  }

  /** Inserisce una singola voce (sito web, eseguibile, documento) nel registro. */
  creaVoceManuale(dati: VoceManuale): { software: Software; associazione?: Associazione } {
    const fonte = this.fonteManuale();
    const creato = db
      .insert(software)
      .values({
        fonteId: fonte.id,
        foglio: null,
        rigaOrigine: null,
        codice: null,
        nome: dati.nome,
        descrizione: dati.descrizione ?? null,
        areaTesto: null,
        funzioneTesto: null,
        attivitaTesto: null,
        categoria: dati.categoria ?? null,
        url: dati.url ?? null,
        percorsoLocale: dati.percorsoLocale ?? null,
        appDesktop: dati.appDesktop ?? null,
        note: dati.note ?? null,
        stato: dati.stato ?? null,
        ruolo: dati.ruolo ?? null,
        icona: null,
        tipo: dati.tipo,
        datiGrezzi: JSON.stringify({
          origine: 'inserimento manuale',
          tipo: dati.tipo,
          url: dati.url ?? '',
          percorsoLocale: dati.percorsoLocale ?? '',
          appDesktop: dati.appDesktop ?? '',
        }),
        chiaveDuplicato: normalizza(dati.nome),
        decisioneDuplicato: null,
        principale: 0,
      })
      .returning()
      .get();

    db.update(fonti)
      .set({
        nRecord: db.select().from(software).where(eq(software.fonteId, fonte.id)).all().length,
        aggiornatoIl: ora(),
      })
      .where(eq(fonti.id, fonte.id))
      .run();

    let associazione: Associazione | undefined;
    if (dati.areaId) {
      associazione = db
        .insert(associazioni)
        .values({
          softwareId: creato.id,
          areaId: dati.areaId,
          funzioneId: dati.funzioneId ?? null,
          attivitaId: dati.attivitaId ?? null,
          origine: 'manuale',
          note: null,
        })
        .returning()
        .get();
    }
    return { software: creato, associazione };
  }

  autoAssocia(s: Software): Associazione | undefined {
    const struttura = this.areeCorrenti();
    const area = suggerisciArea(struttura, s.areaTesto) ?? suggerisciArea(struttura, s.categoria);
    const funzione =
      suggerisciFunzione(struttura, s.funzioneTesto, area?.id) ??
      (area ? undefined : suggerisciFunzione(struttura, s.funzioneTesto));
    const areaFinale =
      area?.id ??
      (funzione ? struttura.find((a) => a.funzioni.some((f) => f.id === funzione.id))?.id : undefined);
    if (!areaFinale) return undefined;
    const att = suggerisciAttivita(struttura, s.attivitaTesto, funzione?.id);
    return db
      .insert(associazioni)
      .values({
        softwareId: s.id,
        areaId: areaFinale,
        funzioneId: funzione?.id ?? null,
        attivitaId: att?.id ?? null,
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
storage.inizializzaStruttura();
