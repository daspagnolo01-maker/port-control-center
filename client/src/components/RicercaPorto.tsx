import { useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, MapPin, Layers, ListChecks, AppWindow } from 'lucide-react';
import { normalizza } from '@shared/taxonomy';
import { useStruttura } from '@/lib/struttura';
import type { Software } from '@shared/schema';
import { useRegistro } from '@/lib/dati';

type Risultato =
  | { tipo: 'area'; id: string; titolo: string; contesto: string }
  | { tipo: 'funzione'; id: string; areaId: string; titolo: string; contesto: string }
  | { tipo: 'attivita'; id: string; areaId: string; funzioneId: string; titolo: string; contesto: string }
  | { tipo: 'software'; id: number; areaId?: string; titolo: string; contesto: string; record: Software };

const ICONA = {
  area: MapPin,
  funzione: Layers,
  attivita: ListChecks,
  software: AppWindow,
} as const;

const NOME_TIPO = {
  area: 'Area',
  funzione: 'Funzione',
  attivita: 'Attività',
  software: 'Software',
} as const;

/**
 * Ricerca trasversale su aree, funzioni, attività e software importati.
 * Porta direttamente al punto della pianta corrispondente.
 */
export default function RicercaPorto({
  onVaiArea,
  onApriSoftware,
}: {
  onVaiArea: (areaId: string, funzioneId?: string, attivitaId?: string) => void;
  onApriSoftware: (s: Software) => void;
}) {
  const registro = useRegistro();
  const { aree, areeById, funzioniIndex, attivitaIndex } = useStruttura();
  const [q, setQ] = useState('');
  const [aperto, setAperto] = useState(false);
  const chiusuraRef = useRef<number | null>(null);

  const risultati = useMemo<Risultato[]>(() => {
    const t = normalizza(q);
    if (t.length < 2) return [];
    const out: Risultato[] = [];

    for (const a of aree) {
      if (normalizza(`${a.nome} ${a.codice} ${a.descrizione}`).includes(t)) {
        const n = (registro.perArea[a.id] ?? []).length;
        out.push({
          tipo: 'area',
          id: a.id,
          titolo: a.nome,
          contesto: `${a.codice} · ${a.funzioni.length} funzioni · ${n} software`,
        });
      }
    }
    for (const id of Object.keys(funzioniIndex)) {
      const { area, funzione } = funzioniIndex[id];
      if (normalizza(funzione.nome).includes(t)) {
        out.push({
          tipo: 'funzione',
          id,
          areaId: area.id,
          titolo: funzione.nome,
          contesto: `${area.nome} · ${(registro.perFunzione[id] ?? []).length} software`,
        });
      }
    }
    for (const id of Object.keys(attivitaIndex)) {
      const { area, funzione, attivita } = attivitaIndex[id];
      if (normalizza(attivita.nome).includes(t)) {
        out.push({
          tipo: 'attivita',
          id,
          areaId: area.id,
          funzioneId: funzione.id,
          titolo: attivita.nome,
          contesto: `${area.nome} · ${funzione.nome}`,
        });
      }
    }
    for (const s of registro.software) {
      if (normalizza(`${s.nome} ${s.descrizione ?? ''} ${s.categoria ?? ''}`).includes(t)) {
        const ass = (registro.assPerSoftware[s.id] ?? [])[0];
        out.push({
          tipo: 'software',
          id: s.id,
          areaId: ass?.areaId,
          titolo: s.nome,
          contesto: ass
            ? `associato a ${areeById[ass.areaId]?.nome ?? ass.areaId}`
            : 'non ancora associato a un punto del porto',
          record: s,
        });
      }
    }

    const ordine = { software: 0, attivita: 1, funzione: 2, area: 3 } as const;
    return out.sort((a, b) => ordine[a.tipo] - ordine[b.tipo]).slice(0, 12);
  }, [q, aree, areeById, funzioniIndex, attivitaIndex, registro.software, registro.assPerSoftware, registro.perArea, registro.perFunzione]);

  const scegli = (r: Risultato) => {
    if (r.tipo === 'area') onVaiArea(r.id);
    if (r.tipo === 'funzione') onVaiArea(r.areaId, r.id);
    if (r.tipo === 'attivita') onVaiArea(r.areaId, r.funzioneId, r.id);
    if (r.tipo === 'software') {
      if (r.areaId) onVaiArea(r.areaId);
      onApriSoftware(r.record);
    }
    setQ('');
    setAperto(false);
  };

  return (
    <div
      className="relative"
      onBlur={() => {
        chiusuraRef.current = window.setTimeout(() => setAperto(false), 120);
      }}
      onFocus={() => {
        if (chiusuraRef.current) window.clearTimeout(chiusuraRef.current);
        setAperto(true);
      }}
    >
      <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAperto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setQ('');
            setAperto(false);
          }
          if (e.key === 'Enter' && risultati.length) scegli(risultati[0]);
        }}
        placeholder="Cerca un'area, una funzione, un'attività o un software"
        className="pl-8 pr-8"
        data-testid="input-ricerca-porto"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            setAperto(false);
          }}
          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          aria-label="Azzera la ricerca"
          data-testid="button-azzera-ricerca"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {aperto && normalizza(q).length >= 2 && (
        <div
          className="absolute z-30 mt-1.5 w-full rounded-lg border border-border bg-popover shadow-xl max-h-[340px] overflow-y-auto scroll-sottile"
          data-testid="risultati-ricerca"
        >
          {risultati.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              Nessun risultato. I software compaiono qui dopo l'importazione di un file Excel.
            </p>
          ) : (
            risultati.map((r) => {
              const Icona = ICONA[r.tipo];
              return (
                <button
                  key={`${r.tipo}-${r.id}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => scegli(r)}
                  className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-secondary/60 border-b border-border last:border-b-0"
                  data-testid={`risultato-${r.tipo}-${r.id}`}
                >
                  <Icona className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm truncate">{r.titolo}</span>
                    <span className="block etichetta text-muted-foreground truncate">{r.contesto}</span>
                  </span>
                  <span className="etichetta text-muted-foreground shrink-0 mt-0.5">{NOME_TIPO[r.tipo]}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
