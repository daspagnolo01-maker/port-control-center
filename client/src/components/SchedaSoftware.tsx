import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Trash2, Plus, Save, Copy, Pencil, X, Check } from 'lucide-react';
import type { Software } from '@shared/schema';
import { etichettaFonte, urlNormalizzato, tipoRisorsa, NOMI_TIPO_RISORSA, useRegistro } from '@/lib/dati';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  EtichettaAssociazione,
  SelettoreNodo,
  useAggiornaAssociazione,
  useCreaAssociazione,
  useEliminaAssociazione,
} from './associazioni';

export default function SchedaSoftware({
  software: s,
  onOpenChange,
}: {
  software: Software | null;
  onOpenChange: (v: boolean) => void;
}) {
  const { assPerSoftware, fonteById, gruppiDuplicati, software: tutti } = useRegistro();
  const { toast } = useToast();
  const crea = useCreaAssociazione();
  const elimina = useEliminaAssociazione();
  const aggiornaAss = useAggiornaAssociazione();
  const [inModifica, setInModifica] = useState<number | null>(null);
  const [nodoModifica, setNodoModifica] = useState<{ areaId?: string; funzioneId?: string; attivitaId?: string }>({});
  const [nodo, setNodo] = useState<{ areaId?: string; funzioneId?: string; attivitaId?: string }>({});
  const [form, setForm] = useState({ nome: '', descrizione: '', url: '', categoria: '', stato: '', ruolo: '', note: '', percorsoLocale: '' });

  useEffect(() => {
    if (!s) return;
    setForm({
      nome: s.nome ?? '',
      descrizione: s.descrizione ?? '',
      url: s.url ?? '',
      categoria: s.categoria ?? '',
      stato: s.stato ?? '',
      ruolo: s.ruolo ?? '',
      note: s.note ?? '',
      percorsoLocale: s.percorsoLocale ?? '',
    });
    setNodo({});
    setInModifica(null);
  }, [s?.id]);

  const salva = useMutation({
    mutationFn: async () => (await apiRequest('PATCH', `/api/software/${s!.id}`, form)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/software'] });
      toast({ title: 'Software aggiornato' });
    },
  });

  const eliminaSoftware = useMutation({
    mutationFn: async () => (await apiRequest('DELETE', `/api/software/${s!.id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/software'] });
      queryClient.invalidateQueries({ queryKey: ['/api/associazioni'] });
      toast({ title: 'Record eliminato dal registro' });
      onOpenChange(false);
    },
  });

  const decidi = useMutation({
    mutationFn: async (dati: { decisioneDuplicato?: string | null; principale?: number }) =>
      (await apiRequest('PATCH', `/api/software/${s!.id}`, dati)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/software'] });
      toast({ title: 'Gestione duplicato aggiornata' });
    },
  });

  if (!s) return null;
  const associazioni = assPerSoftware[s.id] ?? [];
  const gruppo = gruppiDuplicati.find((g) => g.record.some((r) => r.id === s.id));
  const grezzi: Record<string, any> = (() => {
    try {
      return JSON.parse(s.datiGrezzi || '{}');
    } catch {
      return {};
    }
  })();

  return (
    <Sheet open={!!s} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto scroll-sottile">
        <SheetHeader>
          <SheetTitle className="font-display pr-6">{s.nome}</SheetTitle>
          <SheetDescription>
            {NOMI_TIPO_RISORSA[tipoRisorsa(s)]} · {etichettaFonte(fonteById[s.fonteId])}
            {s.foglio ? ` · foglio ${s.foglio}` : ''}
            {s.rigaOrigine ? ` · riga ${s.rigaOrigine}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-6">
          {s.url ? (
            <a href={urlNormalizzato(s.url)} target="_blank" rel="noreferrer">
              <Button className="w-full" data-testid="button-apri-software">
                <ExternalLink className="h-4 w-4 mr-2" />
                Apri lo strumento
              </Button>
            </a>
          ) : s.percorsoLocale || s.appDesktop ? (
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
              <div className="etichetta text-muted-foreground">
                {tipoRisorsa(s) === 'desktop' ? 'Applicazione da avviare sulla postazione' : 'File di riferimento'}
              </div>
              <div className="text-xs break-all">{s.percorsoLocale || s.appDesktop}</div>
            </div>
          ) : null}

          {/* Associazioni */}
          <section className="space-y-3">
            <h3 className="etichetta text-muted-foreground">Associazioni funzionali</h3>
            {associazioni.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nessuna associazione. Il software non compare ancora sulla mappa.
              </p>
            )}
            <div className="space-y-2">
              {associazioni.map((a) =>
                inModifica === a.id ? (
                  <div key={a.id} className="rounded-md border border-primary/50 p-3 space-y-2.5">
                    <div className="etichetta text-muted-foreground">Modifica associazione</div>
                    <SelettoreNodo valore={nodoModifica} onChange={setNodoModifica} />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={!nodoModifica.areaId || aggiornaAss.isPending}
                        onClick={() =>
                          aggiornaAss.mutate(
                            {
                              id: a.id,
                              areaId: nodoModifica.areaId,
                              funzioneId: nodoModifica.funzioneId ?? null,
                              attivitaId: nodoModifica.attivitaId ?? null,
                              origine: 'manuale',
                            },
                            {
                              onSuccess: () => {
                                setInModifica(null);
                                toast({ title: 'Associazione modificata' });
                              },
                            }
                          )
                        }
                        data-testid={`button-salva-ass-${a.id}`}
                      >
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Salva associazione
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setInModifica(null)} data-testid="button-annulla-modifica-ass">
                        <X className="h-3.5 w-3.5 mr-1.5" />
                        Annulla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div key={a.id} className="flex items-center gap-2">
                    <EtichettaAssociazione a={a} />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 ml-auto"
                      title="Modifica area, funzione o attività"
                      onClick={() => {
                        setInModifica(a.id);
                        setNodoModifica({
                          areaId: a.areaId,
                          funzioneId: a.funzioneId ?? undefined,
                          attivitaId: a.attivitaId ?? undefined,
                        });
                      }}
                      data-testid={`button-modifica-ass-${a.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Rimuovi associazione"
                      onClick={() => elimina.mutate(a.id)}
                      data-testid={`button-elimina-ass-${a.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              )}
            </div>
            <div className="rounded-md border border-border p-3 space-y-2.5">
              <div className="etichetta text-muted-foreground">Aggiungi associazione</div>
              <SelettoreNodo valore={nodo} onChange={setNodo} />
              <Button
                size="sm"
                className="w-full"
                disabled={!nodo.areaId || crea.isPending}
                onClick={() =>
                  crea.mutate(
                    {
                      softwareId: s.id,
                      areaId: nodo.areaId!,
                      funzioneId: nodo.funzioneId ?? null,
                      attivitaId: nodo.attivitaId ?? null,
                    },
                    { onSuccess: () => setNodo({}) }
                  )
                }
                data-testid="button-aggiungi-associazione"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Associa
              </Button>
            </div>
          </section>

          <Separator />

          {/* Duplicati */}
          {gruppo && gruppo.record.length > 1 && (
            <>
              <section className="space-y-2.5">
                <h3 className="etichetta text-[hsl(38_90%_62%)]">Possibile software duplicato</h3>
                <p className="text-sm text-muted-foreground">
                  Lo stesso nome compare in {gruppo.record.length} record, provenienti da:{' '}
                  {Array.from(new Set(gruppo.record.map((r) => etichettaFonte(fonteById[r.fonteId])))).join(', ')}.
                  Nessun dato viene eliminato automaticamente.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['separati', 'collegati', 'stesso'] as const).map((d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant={s.decisioneDuplicato === d ? 'default' : 'outline'}
                      onClick={() => decidi.mutate({ decisioneDuplicato: d })}
                      data-testid={`button-dup-${d}`}
                    >
                      {d === 'separati' ? 'Mantieni separati' : d === 'collegati' ? 'Collega' : 'Stesso software'}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant={s.principale ? 'default' : 'outline'}
                    onClick={() => decidi.mutate({ principale: s.principale ? 0 : 1 })}
                    data-testid="button-dup-principale"
                  >
                    {s.principale ? 'Record principale' : 'Imposta come principale'}
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {gruppo.record
                    .filter((r) => r.id !== s.id)
                    .map((r) => (
                      <div key={r.id} className="text-xs text-muted-foreground flex items-center gap-2">
                        <Badge variant="outline" className="text-[11px]">
                          {etichettaFonte(fonteById[r.fonteId])}
                        </Badge>
                        <span className="truncate">{r.url || r.percorsoLocale || 'nessun collegamento'}</span>
                      </div>
                    ))}
                </div>
              </section>
              <Separator />
            </>
          )}

          {/* Campi modificabili */}
          <section className="space-y-3">
            <h3 className="etichetta text-muted-foreground">Dati del software</h3>
            {(
              [
                ['nome', 'Nome software'],
                ['url', 'URL'],
                ['percorsoLocale', 'Percorso locale'],
                ['categoria', 'Categoria'],
                ['stato', 'Stato'],
                ['ruolo', 'Ruolo autorizzato'],
              ] as const
            ).map(([campo, etichetta]) => (
              <div key={campo} className="space-y-1.5">
                <Label className="text-xs">{etichetta}</Label>
                <Input
                  value={(form as any)[campo]}
                  onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                  data-testid={`input-${campo}`}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs">Descrizione</Label>
              <Textarea
                value={form.descrizione}
                onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                rows={3}
                data-testid="input-descrizione"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
                data-testid="input-note"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => salva.mutate()} disabled={salva.isPending} data-testid="button-salva-software">
                <Save className="h-4 w-4 mr-1.5" />
                Salva modifiche
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(JSON.stringify(grezzi, null, 2));
                  toast({ title: 'Riga Excel copiata' });
                }}
              >
                <Copy className="h-4 w-4 mr-1.5" />
                Copia riga
              </Button>
              <Button
                variant="ghost"
                className="text-destructive ml-auto"
                onClick={() => eliminaSoftware.mutate()}
                data-testid="button-elimina-software"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </section>

          <Separator />

          {/* Archivio della fonte */}
          <section className="space-y-2">
            <h3 className="etichetta text-muted-foreground">Archivio della fonte</h3>
            <div className="rounded-md border border-border overflow-hidden">
              {Object.entries(grezzi).length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">Nessun dato grezzo conservato.</div>
              )}
              {Object.entries(grezzi).map(([k, v]) => (
                <div key={k} className="flex gap-3 px-3 py-2 border-b border-border last:border-0 text-xs">
                  <span className="etichetta text-muted-foreground w-2/5 shrink-0 truncate" title={k}>
                    {k}
                  </span>
                  <span className="min-w-0 break-words">{String(v ?? '')}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
