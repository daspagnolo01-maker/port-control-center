import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Fonte, Software, Associazione } from '@shared/schema';
import { AREE, ATTIVITA_INDEX, FUNZIONI_INDEX, normalizza } from '@shared/taxonomy';

export function useFonti() {
  return useQuery<Fonte[]>({ queryKey: ['/api/fonti'] });
}
export function useSoftware() {
  return useQuery<Software[]>({ queryKey: ['/api/software'] });
}
export function useAssociazioni() {
  return useQuery<Associazione[]>({ queryKey: ['/api/associazioni'] });
}

export type Registro = {
  fonti: Fonte[];
  software: Software[];
  associazioni: Associazione[];
  caricamento: boolean;
  /** software per area */
  perArea: Record<string, Software[]>;
  /** software per funzione */
  perFunzione: Record<string, Software[]>;
  /** software per attività */
  perAttivita: Record<string, Software[]>;
  assPerSoftware: Record<number, Associazione[]>;
  fonteById: Record<number, Fonte>;
  gruppiDuplicati: { chiave: string; record: Software[] }[];
  stats: {
    nFonti: number;
    nSoftware: number;
    nFogli: number;
    nAssociazioni: number;
    senzaFunzione: number;
    senzaUrl: number;
    nonClassificati: number;
    duplicati: number;
    areeCoperte: number;
  };
};

export function useRegistro(): Registro {
  const fonti = useFonti();
  const software = useSoftware();
  const associazioni = useAssociazioni();

  const listaFonti = fonti.data ?? [];
  const listaSoftware = software.data ?? [];
  const listaAss = associazioni.data ?? [];

  return useMemo(() => {
    const swById: Record<number, Software> = {};
    for (const s of listaSoftware) swById[s.id] = s;

    const perArea: Record<string, Software[]> = {};
    const perFunzione: Record<string, Software[]> = {};
    const perAttivita: Record<string, Software[]> = {};
    const assPerSoftware: Record<number, Associazione[]> = {};

    for (const a of listaAss) {
      const s = swById[a.softwareId];
      if (!s) continue;
      (assPerSoftware[a.softwareId] ||= []).push(a);
      const push = (mappa: Record<string, Software[]>, key?: string | null) => {
        if (!key) return;
        const arr = (mappa[key] ||= []);
        if (!arr.some((x) => x.id === s.id)) arr.push(s);
      };
      push(perArea, a.areaId);
      push(perFunzione, a.funzioneId);
      push(perAttivita, a.attivitaId);
    }

    const fonteById: Record<number, Fonte> = {};
    for (const f of listaFonti) fonteById[f.id] = f;

    // duplicati: stesso nome normalizzato su record diversi
    const perChiave: Record<string, Software[]> = {};
    for (const s of listaSoftware) {
      const k = s.chiaveDuplicato || normalizza(s.nome);
      (perChiave[k] ||= []).push(s);
    }
    const gruppiDuplicati = Object.entries(perChiave)
      .filter(([, arr]) => arr.length > 1)
      .map(([chiave, record]) => ({ chiave, record }))
      .sort((a, b) => b.record.length - a.record.length);

    const senzaFunzione = listaSoftware.filter(
      (s) => !(assPerSoftware[s.id] || []).some((a) => a.funzioneId)
    ).length;
    const senzaUrl = listaSoftware.filter(
      (s) => !s.url && !s.percorsoLocale && !s.appDesktop
    ).length;
    const nonClassificati = listaSoftware.filter((s) => !(assPerSoftware[s.id] || []).length).length;

    return {
      fonti: listaFonti,
      software: listaSoftware,
      associazioni: listaAss,
      caricamento: fonti.isLoading || software.isLoading || associazioni.isLoading,
      perArea,
      perFunzione,
      perAttivita,
      assPerSoftware,
      fonteById,
      gruppiDuplicati,
      stats: {
        nFonti: listaFonti.length,
        nSoftware: listaSoftware.length,
        nFogli: listaFonti.reduce((t, f) => t + (f.nFogli || 0), 0),
        nAssociazioni: listaAss.length,
        senzaFunzione,
        senzaUrl,
        nonClassificati,
        duplicati: gruppiDuplicati.reduce((t, g) => t + g.record.length, 0),
        areeCoperte: Object.keys(perArea).length,
      },
    };
  }, [listaFonti, listaSoftware, listaAss, fonti.isLoading, software.isLoading, associazioni.isLoading]);
}

export function etichettaFonte(f?: Fonte): string {
  if (!f) return 'Fonte sconosciuta';
  return f.etichetta?.trim() ? f.etichetta : f.nomeFile;
}

export function nomeArea(areaId?: string | null) {
  return AREE.find((a) => a.id === areaId)?.nome ?? areaId ?? '—';
}
export function nomeFunzione(id?: string | null) {
  return id ? FUNZIONI_INDEX[id]?.funzione.nome ?? id : '—';
}
export function nomeAttivita(id?: string | null) {
  return id ? ATTIVITA_INDEX[id]?.attivita.nome ?? id : '—';
}

export function apriSoftware(s: Software): { tipo: 'url' | 'locale' | 'desktop' | 'nessuno'; valore?: string } {
  if (s.url) return { tipo: 'url', valore: s.url };
  if (s.percorsoLocale) return { tipo: 'locale', valore: s.percorsoLocale };
  if (s.appDesktop) return { tipo: 'desktop', valore: s.appDesktop };
  return { tipo: 'nessuno' };
}

export function urlNormalizzato(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(url)) return `https://${url}`;
  return url;
}
