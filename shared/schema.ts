import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * Registro delle fonti: ogni file Excel importato dall'utente.
 * L'elenco dei software NON è nel codice: arriva da questi file.
 */
export const fonti = sqliteTable('fonti', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nomeFile: text('nome_file').notNull(),
  etichetta: text('etichetta'),
  note: text('note'),
  fogli: text('fogli').notNull().default('[]'), // JSON: string[] dei fogli letti
  nFogli: integer('n_fogli').notNull().default(0),
  nRecord: integer('n_record').notNull().default(0),
  mappaturaColonne: text('mappatura_colonne').notNull().default('{}'), // JSON: campo interno -> colonna Excel
  versione: integer('versione').notNull().default(1),
  tipo: text('tipo').notNull().default('excel'), // excel | docx | manuale
  importatoIl: text('importato_il').notNull(),
  aggiornatoIl: text('aggiornato_il'),
});

/** Registro centrale dei software, alimentato dagli Excel. */
export const software = sqliteTable('software', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fonteId: integer('fonte_id').notNull(),
  foglio: text('foglio'),
  rigaOrigine: integer('riga_origine'),
  codice: text('codice'), // ID software dall'Excel, se presente
  nome: text('nome').notNull(),
  descrizione: text('descrizione'),
  areaTesto: text('area_testo'), // valore grezzo della colonna area
  funzioneTesto: text('funzione_testo'),
  attivitaTesto: text('attivita_testo'),
  categoria: text('categoria'),
  url: text('url'),
  percorsoLocale: text('percorso_locale'),
  appDesktop: text('app_desktop'),
  note: text('note'),
  stato: text('stato'),
  ruolo: text('ruolo'),
  icona: text('icona'),
  tipo: text('tipo'), // web | desktop | documento | altro
  datiGrezzi: text('dati_grezzi').notNull().default('{}'), // JSON: riga Excel completa
  chiaveDuplicato: text('chiave_duplicato'), // nome normalizzato, per rilevare duplicati
  decisioneDuplicato: text('decisione_duplicato'), // separati | collegati | stesso
  principale: integer('principale').notNull().default(0), // 1 = record principale del gruppo
});

/** Associazione software -> area / funzione / attività (modificabile in qualsiasi momento). */
export const associazioni = sqliteTable('associazioni', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  softwareId: integer('software_id').notNull(),
  areaId: text('area_id').notNull(),
  funzioneId: text('funzione_id'),
  attivitaId: text('attivita_id'),
  origine: text('origine').notNull().default('manuale'), // manuale | automatica
  note: text('note'),
});

export const insertFonteSchema = createInsertSchema(fonti).omit({ id: true });
export const insertSoftwareSchema = createInsertSchema(software).omit({ id: true });
export const insertAssociazioneSchema = createInsertSchema(associazioni).omit({ id: true });

export type Fonte = typeof fonti.$inferSelect;
export type InsertFonte = z.infer<typeof insertFonteSchema>;
export type Software = typeof software.$inferSelect;
export type InsertSoftware = z.infer<typeof insertSoftwareSchema>;
export type Associazione = typeof associazioni.$inferSelect;
export type InsertAssociazione = z.infer<typeof insertAssociazioneSchema>;

/** Campi interni normalizzati verso i quali si mappano le colonne di qualsiasi Excel. */
export const CAMPI_INTERNI = [
  { key: 'codice', label: 'ID software' },
  { key: 'nome', label: 'Nome software', obbligatorio: true },
  { key: 'descrizione', label: 'Descrizione' },
  { key: 'areaTesto', label: 'Area portuale' },
  { key: 'funzioneTesto', label: 'Funzione' },
  { key: 'attivitaTesto', label: 'Attività' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'url', label: 'URL' },
  { key: 'percorsoLocale', label: 'Percorso locale' },
  { key: 'appDesktop', label: 'Applicazione desktop' },
  { key: 'note', label: 'Note' },
  { key: 'stato', label: 'Stato' },
  { key: 'ruolo', label: 'Ruolo autorizzato' },
  { key: 'icona', label: 'Icona' },
  { key: 'tipo', label: 'Tipo di risorsa' },
] as const;

export type CampoInterno = (typeof CAMPI_INTERNI)[number]['key'];

/** Riga normalizzata inviata dal client al momento dell'importazione. */
export const rigaImportSchema = z.object({
  foglio: z.string().optional().nullable(),
  rigaOrigine: z.number().optional().nullable(),
  codice: z.string().optional().nullable(),
  nome: z.string().min(1),
  descrizione: z.string().optional().nullable(),
  areaTesto: z.string().optional().nullable(),
  funzioneTesto: z.string().optional().nullable(),
  attivitaTesto: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  percorsoLocale: z.string().optional().nullable(),
  appDesktop: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  stato: z.string().optional().nullable(),
  ruolo: z.string().optional().nullable(),
  icona: z.string().optional().nullable(),
  tipo: z.string().optional().nullable(),
  datiGrezzi: z.record(z.string(), z.any()).optional(),
});

export const importSchema = z.object({
  nomeFile: z.string().min(1),
  /** Origine dei record: cartella Excel/CSV oppure documento Word. */
  tipoFonte: z.enum(['excel', 'docx']).default('excel'),
  etichetta: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  fogli: z.array(z.string()).default([]),
  mappaturaColonne: z.record(z.string(), z.any()).default({}),
  righe: z.array(rigaImportSchema),
  autoAssocia: z.boolean().default(true),
});

export type ImportPayload = z.infer<typeof importSchema>;

/**
 * Tipi di risorsa con cui un software può essere registrato.
 * Un software non arriva necessariamente da un Excel: può essere un sito web,
 * un eseguibile locale oppure un documento (per esempio .docx).
 */
export const TIPI_VOCE = [
  { id: 'web', nome: 'Sito web o applicazione web', campo: 'url', etichettaCampo: 'Indirizzo web (URL)' },
  { id: 'desktop', nome: 'Applicazione desktop (.exe)', campo: 'percorsoLocale', etichettaCampo: 'Percorso dell\'eseguibile' },
  { id: 'documento', nome: 'Documento o file (.docx, .pdf, .xlsx)', campo: 'percorsoLocale', etichettaCampo: 'Percorso del file' },
  { id: 'altro', nome: 'Altro / non specificato', campo: 'percorsoLocale', etichettaCampo: 'Riferimento' },
] as const;

export type TipoVoce = (typeof TIPI_VOCE)[number]['id'];

/** Inserimento manuale di una singola voce nel registro software. */
export const voceManualeSchema = z.object({
  nome: z.string().min(1),
  tipo: z.enum(['web', 'desktop', 'documento', 'altro']).default('altro'),
  descrizione: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  percorsoLocale: z.string().optional().nullable(),
  appDesktop: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  stato: z.string().optional().nullable(),
  ruolo: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  areaId: z.string().optional().nullable(),
  funzioneId: z.string().optional().nullable(),
  attivitaId: z.string().optional().nullable(),
});

export type VoceManuale = z.infer<typeof voceManualeSchema>;
export type RigaImport = z.infer<typeof rigaImportSchema>;

// ---- Struttura del porto: area fisica -> funzione -> attività ----
// La catena è sempre questa, ma i suoi nodi sono configurabili dall'utente
// e vengono conservati nel database (non sono fissati nel codice).

export const aree = sqliteTable('aree', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  codice: text('codice').notNull().default(''),
  categoria: text('categoria').notNull().default('terminal'),
  descrizione: text('descrizione').notNull().default(''),
  // geometria della zona sulla pianta
  x: integer('x').notNull().default(0),
  y: integer('y').notNull().default(0),
  w: integer('w').notNull().default(240),
  h: integer('h').notNull().default(120),
  decoro: text('decoro'),
  righe: text('righe').notNull().default('[]'), // JSON: string[] delle righe di etichetta
  speciale: integer('speciale').notNull().default(0), // 1 = disegno dedicato (navi, servizi nautici)
  ordine: integer('ordine').notNull().default(0),
});

export const funzioni = sqliteTable('funzioni', {
  id: text('id').primaryKey(),
  areaId: text('area_id').notNull(),
  nome: text('nome').notNull(),
  descrizione: text('descrizione'),
  ordine: integer('ordine').notNull().default(0),
});

export const attivita = sqliteTable('attivita', {
  id: text('id').primaryKey(),
  funzioneId: text('funzione_id').notNull(),
  nome: text('nome').notNull(),
  descrizione: text('descrizione'),
  ordine: integer('ordine').notNull().default(0),
});

export type AreaRecord = typeof aree.$inferSelect;
export type FunzioneRecord = typeof funzioni.$inferSelect;
export type AttivitaRecord = typeof attivita.$inferSelect;

export const CATEGORIE_AREA = [
  { id: 'mare', nome: 'Specchio acqueo' },
  { id: 'banchina', nome: 'Banchina e nave' },
  { id: 'terminal', nome: 'Terminal operativi' },
  { id: 'controllo', nome: 'Controllo e sicurezza' },
  { id: 'intermodale', nome: 'Intermodale e strada' },
  { id: 'servizi', nome: 'Servizi e ambiente' },
] as const;

export const areaInputSchema = z.object({
  nome: z.string().min(1),
  codice: z.string().optional(),
  categoria: z.string().optional(),
  descrizione: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  righe: z.array(z.string()).optional(),
  ordine: z.number().optional(),
});

export const funzioneInputSchema = z.object({
  areaId: z.string().min(1),
  nome: z.string().min(1),
  descrizione: z.string().optional().nullable(),
  ordine: z.number().optional(),
});

export const attivitaInputSchema = z.object({
  funzioneId: z.string().min(1),
  nome: z.string().min(1),
  descrizione: z.string().optional().nullable(),
  ordine: z.number().optional(),
});

/** Struttura completa restituita al client. */
export type StrutturaAttivita = { id: string; nome: string; descrizione?: string | null; ordine: number };
export type StrutturaFunzione = {
  id: string;
  areaId: string;
  nome: string;
  descrizione?: string | null;
  ordine: number;
  attivita: StrutturaAttivita[];
};
export type StrutturaArea = {
  id: string;
  nome: string;
  codice: string;
  categoria: string;
  descrizione: string;
  x: number;
  y: number;
  w: number;
  h: number;
  decoro?: string | null;
  righe: string[];
  speciale: boolean;
  ordine: number;
  funzioni: StrutturaFunzione[];
};
