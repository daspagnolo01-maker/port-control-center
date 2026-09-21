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
  datiGrezzi: z.record(z.string(), z.any()).optional(),
});

export const importSchema = z.object({
  nomeFile: z.string().min(1),
  etichetta: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  fogli: z.array(z.string()).default([]),
  mappaturaColonne: z.record(z.string(), z.any()).default({}),
  righe: z.array(rigaImportSchema),
  autoAssocia: z.boolean().default(true),
});

export type ImportPayload = z.infer<typeof importSchema>;
export type RigaImport = z.infer<typeof rigaImportSchema>;
