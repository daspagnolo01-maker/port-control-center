import { useQuery, useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { StrutturaArea, StrutturaFunzione, StrutturaAttivita } from '@shared/schema';

export type { StrutturaArea, StrutturaFunzione, StrutturaAttivita };

export type NodoFunzione = { area: StrutturaArea; funzione: StrutturaFunzione };
export type NodoAttivita = {
  area: StrutturaArea;
  funzione: StrutturaFunzione;
  attivita: StrutturaAttivita;
};

/**
 * Cache di modulo della struttura corrente: permette alle funzioni di utilità
 * (nomi leggibili di area, funzione, attività) di lavorare senza hook.
 */
let cache: {
  aree: StrutturaArea[];
  areeById: Record<string, StrutturaArea>;
  funzioniIndex: Record<string, NodoFunzione>;
  attivitaIndex: Record<string, NodoAttivita>;
} = { aree: [], areeById: {}, funzioniIndex: {}, attivitaIndex: {} };

export function strutturaCorrente() {
  return cache;
}

function costruisci(aree: StrutturaArea[]) {
  const areeById: Record<string, StrutturaArea> = {};
  const funzioniIndex: Record<string, NodoFunzione> = {};
  const attivitaIndex: Record<string, NodoAttivita> = {};
  for (const area of aree) {
    areeById[area.id] = area;
    for (const funzione of area.funzioni) {
      funzioniIndex[funzione.id] = { area, funzione };
      for (const attivita of funzione.attivita) {
        attivitaIndex[attivita.id] = { area, funzione, attivita };
      }
    }
  }
  return { aree, areeById, funzioniIndex, attivitaIndex };
}

export function useStruttura() {
  const q = useQuery<StrutturaArea[]>({ queryKey: ['/api/struttura'] });
  const aree = q.data ?? [];

  const dati = useMemo(() => costruisci(aree), [aree]);
  cache = dati;

  return {
    ...dati,
    caricamento: q.isLoading,
    totaleAree: dati.aree.length,
    totaleFunzioni: Object.keys(dati.funzioniIndex).length,
    totaleAttivita: Object.keys(dati.attivitaIndex).length,
  };
}

function invalida() {
  queryClient.invalidateQueries({ queryKey: ['/api/struttura'] });
  queryClient.invalidateQueries({ queryKey: ['/api/associazioni'] });
}

function mutazione<T extends Record<string, any>>(
  metodo: 'POST' | 'PATCH' | 'DELETE',
  percorso: (v: T) => string
) {
  return () =>
    useMutation({
      mutationFn: async (v: T) => {
        const { __id, ...corpo } = v as any;
        const r = await apiRequest(metodo, percorso(v), metodo === 'DELETE' ? undefined : corpo);
        return r.json();
      },
      onSuccess: invalida,
    });
}

export const useCreaArea = mutazione<{ nome: string; codice?: string; categoria?: string; descrizione?: string }>(
  'POST',
  () => '/api/aree'
);
export const useAggiornaArea = mutazione<{ __id: string } & Record<string, any>>(
  'PATCH',
  (v) => `/api/aree/${v.__id}`
);
export const useEliminaArea = mutazione<{ __id: string }>('DELETE', (v) => `/api/aree/${v.__id}`);

export const useCreaFunzione = mutazione<{ areaId: string; nome: string; descrizione?: string | null }>(
  'POST',
  () => '/api/funzioni'
);
export const useAggiornaFunzione = mutazione<{ __id: string } & Record<string, any>>(
  'PATCH',
  (v) => `/api/funzioni/${v.__id}`
);
export const useEliminaFunzione = mutazione<{ __id: string }>('DELETE', (v) => `/api/funzioni/${v.__id}`);

export const useCreaAttivita = mutazione<{ funzioneId: string; nome: string; descrizione?: string | null }>(
  'POST',
  () => '/api/attivita'
);
export const useAggiornaAttivita = mutazione<{ __id: string } & Record<string, any>>(
  'PATCH',
  (v) => `/api/attivita/${v.__id}`
);
export const useEliminaAttivita = mutazione<{ __id: string }>('DELETE', (v) => `/api/attivita/${v.__id}`);

export const useSpostaNodo = mutazione<{
  tipo: 'area' | 'funzione' | 'attivita';
  id: string;
  direzione: -1 | 1;
}>('POST', () => '/api/struttura/sposta');

export const useRipristinaStruttura = mutazione<Record<string, never>>(
  'POST',
  () => '/api/struttura/ripristina'
);

/** Quante associazioni sono collegate a un nodo della struttura. */
export async function impattoNodo(
  tipo: 'aree' | 'funzioni' | 'attivita',
  id: string
): Promise<number> {
  try {
    const r = await apiRequest('GET', `/api/${tipo}/${id}/impatto`);
    const d = await r.json();
    return d?.associazioni ?? 0;
  } catch {
    return 0;
  }
}
