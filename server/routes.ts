import type { Express } from 'express';
import type { Server } from 'node:http';
import { storage } from './storage';
import { importSchema, insertAssociazioneSchema } from '@shared/schema';
import { z } from 'zod';

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
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

  // ---- Software ----
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
