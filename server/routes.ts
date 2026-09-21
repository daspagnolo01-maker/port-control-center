import type { Express } from 'express';
import type { Server } from 'node:http';
import { storage } from './storage';
import {
  importSchema,
  insertAssociazioneSchema,
  areaInputSchema,
  funzioneInputSchema,
  attivitaInputSchema,
  voceManualeSchema,
} from '@shared/schema';
import { leggiDocx } from './docx';
import { z } from 'zod';

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ---- Struttura del porto: aree fisiche, funzioni, attività ----
  app.get('/api/struttura', (_req, res) => {
    res.json(storage.struttura());
  });

  app.post('/api/aree', (req, res) => {
    const parsed = areaInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
    res.json(storage.creaArea(parsed.data));
  });

  app.patch('/api/aree/:id', (req, res) => {
    const out = storage.aggiornaArea(req.params.id, req.body ?? {});
    if (!out) return res.status(404).json({ errore: 'Area non trovata' });
    res.json(out);
  });

  app.get('/api/aree/:id/impatto', (req, res) => {
    res.json({ associazioni: storage.impattoEliminazione('area', req.params.id) });
  });

  app.delete('/api/aree/:id', (req, res) => {
    res.json({ ok: true, associazioniRimosse: storage.eliminaArea(req.params.id) });
  });

  app.post('/api/funzioni', (req, res) => {
    const parsed = funzioneInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
    res.json(storage.creaFunzione(parsed.data));
  });

  app.patch('/api/funzioni/:id', (req, res) => {
    const out = storage.aggiornaFunzione(req.params.id, req.body ?? {});
    if (!out) return res.status(404).json({ errore: 'Funzione non trovata' });
    res.json(out);
  });

  app.get('/api/funzioni/:id/impatto', (req, res) => {
    res.json({ associazioni: storage.impattoEliminazione('funzione', req.params.id) });
  });

  app.delete('/api/funzioni/:id', (req, res) => {
    res.json({ ok: true, associazioniSpostate: storage.eliminaFunzione(req.params.id) });
  });

  app.post('/api/attivita', (req, res) => {
    const parsed = attivitaInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
    res.json(storage.creaAttivita(parsed.data));
  });

  app.patch('/api/attivita/:id', (req, res) => {
    const out = storage.aggiornaAttivita(req.params.id, req.body ?? {});
    if (!out) return res.status(404).json({ errore: 'Attività non trovata' });
    res.json(out);
  });

  app.get('/api/attivita/:id/impatto', (req, res) => {
    res.json({ associazioni: storage.impattoEliminazione('attivita', req.params.id) });
  });

  app.delete('/api/attivita/:id', (req, res) => {
    res.json({ ok: true, associazioniSpostate: storage.eliminaAttivita(req.params.id) });
  });

  app.post('/api/struttura/sposta', (req, res) => {
    const schema = z.object({
      tipo: z.enum(['area', 'funzione', 'attivita']),
      id: z.string().min(1),
      direzione: z.union([z.literal(-1), z.literal(1)]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
    storage.spostaNodo(parsed.data.tipo, parsed.data.id, parsed.data.direzione);
    res.json({ ok: true });
  });

  app.post('/api/struttura/ripristina', (_req, res) => {
    storage.ripristinaStruttura();
    res.json({ ok: true });
  });

  // ---- Fonti Excel ----
  app.get('/api/fonti', (_req, res) => {
    res.json(storage.listaFonti());
  });

  app.post('/api/import', (req, res) => {
    const parsed = importSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
    try {
      const out = storage.importa(parsed.data);
      res.json(out);
    } catch (e: any) {
      res.status(500).json({ errore: e?.message ?? 'Errore di importazione' });
    }
  });

  app.post('/api/fonti/:id/reimporta', (req, res) => {
    const parsed = importSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
    try {
      const out = storage.importa(parsed.data, Number(req.params.id));
      res.json(out);
    } catch (e: any) {
      res.status(404).json({ errore: e?.message ?? 'Fonte non trovata' });
    }
  });

  app.patch('/api/fonti/:id', (req, res) => {
    const schema = z.object({ etichetta: z.string().nullish(), note: z.string().nullish() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
    const out = storage.aggiornaFonte(Number(req.params.id), parsed.data as any);
    if (!out) return res.status(404).json({ errore: 'Fonte non trovata' });
    res.json(out);
  });

  app.delete('/api/fonti/:id', (req, res) => {
    storage.eliminaFonte(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- Documenti Word: lettura di paragrafi e tabelle ----
  app.post('/api/documento', (req, res) => {
    const schema = z.object({ nomeFile: z.string().min(1), contenuto: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
    try {
      const doc = leggiDocx(parsed.data.contenuto);
      res.json({ nomeFile: parsed.data.nomeFile, ...doc });
    } catch (e: any) {
      res.status(400).json({ errore: e?.message ?? 'Documento non leggibile' });
    }
  });

  // ---- Software ----
  app.post('/api/software', (req, res) => {
    const parsed = voceManualeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
    try {
      res.json(storage.creaVoceManuale(parsed.data));
    } catch (e: any) {
      res.status(500).json({ errore: e?.message ?? 'Inserimento non riuscito' });
    }
  });

  app.get('/api/software', (_req, res) => {
    res.json(storage.listaSoftware());
  });

  app.patch('/api/software/:id', (req, res) => {
    const schema = z.object({
      nome: z.string().min(1).optional(),
      descrizione: z.string().nullish(),
      url: z.string().nullish(),
      percorsoLocale: z.string().nullish(),
      appDesktop: z.string().nullish(),
      categoria: z.string().nullish(),
      note: z.string().nullish(),
      stato: z.string().nullish(),
      ruolo: z.string().nullish(),
      icona: z.string().nullish(),
      tipo: z.string().nullish(),
      decisioneDuplicato: z.string().nullish(),
      principale: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
    const out = storage.aggiornaSoftware(Number(req.params.id), parsed.data as any);
    if (!out) return res.status(404).json({ errore: 'Software non trovato' });
    res.json(out);
  });

  app.delete('/api/software/:id', (req, res) => {
    storage.eliminaSoftware(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- Associazioni ----
  app.get('/api/associazioni', (_req, res) => {
    res.json(storage.listaAssociazioni());
  });

  app.post('/api/associazioni', (req, res) => {
    const parsed = insertAssociazioneSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
    res.json(storage.creaAssociazione(parsed.data as any));
  });

  app.patch('/api/associazioni/:id', (req, res) => {
    const schema = z.object({
      areaId: z.string().optional(),
      funzioneId: z.string().nullish(),
      attivitaId: z.string().nullish(),
      note: z.string().nullish(),
      origine: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
    const out = storage.aggiornaAssociazione(Number(req.params.id), parsed.data as any);
    if (!out) return res.status(404).json({ errore: 'Associazione non trovata' });
    res.json(out);
  });

  app.delete('/api/associazioni/:id', (req, res) => {
    storage.eliminaAssociazione(Number(req.params.id));
    res.json({ ok: true });
  });

  app.post('/api/riassocia', (_req, res) => {
    res.json({ creati: storage.riassociaTutti() });
  });

  return httpServer;
}
