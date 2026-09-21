import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Folder, MonitorSmartphone, Link2, Unlink, Search, Plus } from 'lucide-react';
import type { Associazione, Software } from '@shared/schema';
import { useStruttura } from '@/lib/struttura';
import { etichettaFonte, nomeArea, nomeAttivita, nomeFunzione, urlNormalizzato, useRegistro } from '@/lib/dati';
import { useToast } from '@/hooks/use-toast';

const invalida = () => {
  queryClient.invalidateQueries({ queryKey: ['/api/associazioni'] });
  queryClient.invalidateQueries({ queryKey: ['/api/software'] });
  queryClient.invalidateQueries({ queryKey: ['/api/fonti'] });
};

export function useCreaAssociazione() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (dati: {
      softwareId: number;
      areaId: string;
      funzioneId?: string | null;
      attivitaId?: string | null;
    }) => (await apiRequest('POST', '/api/associazioni', { ...dati, origine: 'manuale' })).json(),
    onSuccess: () => {
      invalida();
      toast({ title: 'Associazione creata' });
    },
    onError: (e: any) => toast({ title: 'Errore', description: String(e?.message), variant: 'destructive' }),
  });
}

export function useEliminaAssociazione() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => (await apiRequest('DELETE', `/api/associazioni/${id}`)).json(),
    onSuccess: () => {
      invalida();
      toast({ title: 'Associazione rimossa' });
    },
  });
}

export function useAggiornaAssociazione() {
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: number } & Record<string, any>) =>
      (await apiRequest('PATCH', `/api/associazioni/${id}`, patch)).json(),
    onSuccess: invalida,
  });
}

/** Riquadro compatto di un software, con accesso diretto allo strumento. */
export function CardSoftware({
  s,
  associazione,
  onRimuovi,
  onApriScheda,
}: {
  s: Software;
  associazione?: Associazione;
  onRimuovi?: (id: number) => void;
  onApriScheda?: (s: Software) => void;
}) {
  const { fonteById } = useRegistro();
  const accesso = s.url
    ? { icona: ExternalLink, testo: 'Apri', href: urlNormalizzato(s.url) }
    : s.percorsoLocale
      ? { icona: Folder, testo: 'Percorso locale', href: undefined }
      : s.appDesktop
        ? { icona: MonitorSmartphone, testo: 'App desktop', href: undefined }
        : undefined;

  return (
    <div
      className="rounded-md border border-card-border bg-card p-3 flex flex-col gap-2"
      data-testid={`card-software-${s.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          className="text-left min-w-0 group"
          onClick={() => onApriScheda?.(s)}
          data-testid={`button-scheda-${s.id}`}
        >
          <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
            {s.nome}
          </div>
          {s.descrizione && (
            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{s.descrizione}</div>
          )}
        </button>
        {onRimuovi && associazione && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            title="Rimuovi associazione"
            onClick={() => onRimuovi(associazione.id)}
            data-testid={`button-rimuovi-ass-${associazione.id}`}
          >
            <Unlink className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {s.categoria && (
          <Badge variant="secondary" className="text-[11px]">
            {s.categoria}
          </Badge>
        )}
        {s.stato && (
          <Badge variant="outline" className="text-[11px]">
            {s.stato}
          </Badge>
        )}
        {associazione?.origine === 'automatica' && (
          <Badge variant="outline" className="text-[11px] text-muted-foreground">
            auto
          </Badge>
        )}
        <span className="etichetta text-muted-foreground ml-auto truncate max-w-[45%]" title={etichettaFonte(fonteById[s.fonteId])}>
          {etichettaFonte(fonteById[s.fonteId])}
        </span>
      </div>

      {accesso ? (
        accesso.href ? (
          <a href={accesso.href} target="_blank" rel="noreferrer" data-testid={`link-apri-${s.id}`}>
            <Button size="sm" variant="outline" className="w-full h-8">
              <accesso.icona className="h-3.5 w-3.5 mr-1.5" />
              {accesso.testo}
            </Button>
          </a>
        ) : (
          <div className="num text-[11px] text-muted-foreground truncate rounded border border-border bg-secondary/40 px-2 py-1.5">
            {s.percorsoLocale || s.appDesktop}
          </div>
        )
      ) : (
        <div className="etichetta text-muted-foreground">nessun collegamento indicato</div>
      )}
    </div>
  );
}

/** Associa uno o più software del registro a un nodo (area / funzione / attività). */
export function DialogAssociaANodo({
  open,
  onOpenChange,
  nodo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nodo: { areaId: string; funzioneId?: string | null; attivitaId?: string | null };
}) {
  const { software, fonteById, assPerSoftware } = useRegistro();
  const [cerca, setCerca] = useState('');
  const crea = useCreaAssociazione();

  const elenco = useMemo(() => {
    const q = cerca.toLowerCase().trim();
    return software
      .filter((s) => !q || s.nome.toLowerCase().includes(q) || (s.descrizione ?? '').toLowerCase().includes(q))
      .slice(0, 200);
  }, [software, cerca]);

  const giaAssociato = (s: Software) =>
    (assPerSoftware[s.id] || []).some(
      (a) =>
        a.areaId === nodo.areaId &&
        (a.funzioneId ?? null) === (nodo.funzioneId ?? null) &&
        (a.attivitaId ?? null) === (nodo.attivitaId ?? null)
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Associa software</DialogTitle>
          <DialogDescription>
            {nomeArea(nodo.areaId)}
            {nodo.funzioneId ? ` → ${nomeFunzione(nodo.funzioneId)}` : ''}
            {nodo.attivitaId ? ` → ${nomeAttivita(nodo.attivitaId)}` : ''}
          </DialogDescription>
        </DialogHeader>

        {software.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun software configurato. Importare uno o più file Excel dalla sezione Gestione software.
          </p>
        ) : (
          <>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={cerca}
                onChange={(e) => setCerca(e.target.value)}
                placeholder="Cerca software nel registro"
                className="pl-8"
                data-testid="input-cerca-software"
              />
            </div>
            <div className="max-h-72 overflow-y-auto scroll-sottile divide-y divide-border rounded-md border border-border">
              {elenco.map((s) => (
                <div key={s.id} className="flex items-center gap-2 p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{s.nome}</div>
                    <div className="etichetta text-muted-foreground truncate">
                      {etichettaFonte(fonteById[s.fonteId])}
                      {s.foglio ? ` · ${s.foglio}` : ''}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={giaAssociato(s) ? 'secondary' : 'outline'}
                    disabled={giaAssociato(s) || crea.isPending}
                    onClick={() =>
                      crea.mutate({
                        softwareId: s.id,
                        areaId: nodo.areaId,
                        funzioneId: nodo.funzioneId ?? null,
                        attivitaId: nodo.attivitaId ?? null,
                      })
                    }
                    data-testid={`button-associa-${s.id}`}
                  >
                    {giaAssociato(s) ? 'Associato' : <><Plus className="h-3.5 w-3.5 mr-1" />Associa</>}
                  </Button>
                </div>
              ))}
              {elenco.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">Nessun risultato per la ricerca.</div>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} data-testid="button-chiudi-associa">
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Seleziona area → funzione → attività per un software (usato dal registro). */
export function SelettoreNodo({
  valore,
  onChange,
}: {
  valore: { areaId?: string; funzioneId?: string; attivitaId?: string };
  onChange: (v: { areaId?: string; funzioneId?: string; attivitaId?: string }) => void;
}) {
  const { aree, areeById, funzioniIndex } = useStruttura();
  const area = valore.areaId ? areeById[valore.areaId] : undefined;
  const funzione = valore.funzioneId ? funzioniIndex[valore.funzioneId]?.funzione : undefined;

  return (
    <div className="grid gap-2">
      <Select
        value={valore.areaId ?? ''}
        onValueChange={(v) => onChange({ areaId: v })}
      >
        <SelectTrigger data-testid="select-area">
          <SelectValue placeholder="Area portuale" />
        </SelectTrigger>
        <SelectContent>
          {aree.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={valore.funzioneId ?? '__nessuna__'}
        onValueChange={(v) =>
          onChange({ areaId: valore.areaId, funzioneId: v === '__nessuna__' ? undefined : v })
        }
        disabled={!area}
      >
        <SelectTrigger data-testid="select-funzione">
          <SelectValue placeholder="Funzione (opzionale)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__nessuna__">Tutta l'area (nessuna funzione)</SelectItem>
          {area?.funzioni.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={valore.attivitaId ?? '__nessuna__'}
        onValueChange={(v) =>
          onChange({
            areaId: valore.areaId,
            funzioneId: valore.funzioneId,
            attivitaId: v === '__nessuna__' ? undefined : v,
          })
        }
        disabled={!funzione}
      >
        <SelectTrigger data-testid="select-attivita">
          <SelectValue placeholder="Attività (opzionale)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__nessuna__">Tutte le attività</SelectItem>
          {funzione?.attivita.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function EtichettaAssociazione({ a }: { a: Associazione }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border bg-secondary/50 px-1.5 py-0.5 text-[11px]">
      <Link2 className="h-3 w-3 text-primary" />
      {nomeArea(a.areaId)}
      {a.funzioneId ? ` · ${nomeFunzione(a.funzioneId)}` : ''}
      {a.attivitaId ? ` · ${nomeAttivita(a.attivitaId)}` : ''}
    </span>
  );
}
