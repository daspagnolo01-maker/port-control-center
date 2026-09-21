import { useState } from 'react';
import { Link } from 'wouter';
import MappaPorto, { ETICHETTE_CATEGORIA } from '@/components/MappaPorto';
import Shell, { Intestazione } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Link2, Map as MapIcon, FileSpreadsheet, ChevronRight, Ship } from 'lucide-react';
import { AREE_BY_ID } from '@shared/taxonomy';
import { useRegistro } from '@/lib/dati';
import { CardSoftware, DialogAssociaANodo, useEliminaAssociazione } from '@/components/associazioni';
import SchedaSoftware from '@/components/SchedaSoftware';
import type { Software } from '@shared/schema';

const COLORE_CATEGORIA: Record<string, string> = {
  mare: 'hsl(190 55% 45%)',
  banchina: 'hsl(202 14% 58%)',
  terminal: 'hsl(185 74% 46%)',
  controllo: 'hsl(38 90% 58%)',
  intermodale: 'hsl(198 62% 62%)',
  servizi: 'hsl(150 45% 52%)',
};

export default function PaginaMappa() {
  const registro = useRegistro();
  const [areaId, setAreaId] = useState<string | null>(null);
  const [dialogNodo, setDialogNodo] = useState<
    { areaId: string; funzioneId?: string | null; attivitaId?: string | null } | null
  >(null);
  const [scheda, setScheda] = useState<Software | null>(null);
  const elimina = useEliminaAssociazione();

  const conteggi: Record<string, number> = Object.fromEntries(
    Object.entries(registro.perArea).map(([k, v]) => [k, v.length])
  );
  const area = areaId ? AREE_BY_ID[areaId] : undefined;

  return (
    <Shell>
      <Intestazione
        titolo="Mappa operativa del porto"
        sottotitolo="Il porto è l'interfaccia: seleziona un'area, una nave o un impianto per accedere a funzioni, attività e software."
        icona={MapIcon}
      >
        <Badge variant="outline" className="num">
          {registro.stats.nSoftware} software · {registro.stats.nFonti} file Excel
        </Badge>
        <Link href="/gestione">
          <Button size="sm" variant="outline" data-testid="button-vai-gestione">
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Gestione software
          </Button>
        </Link>
      </Intestazione>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-0">
        <div className="p-4 xl:p-5 min-w-0">
          <div className="rounded-lg border border-border overflow-x-auto scroll-sottile bg-[hsl(204_18%_9%)]">
            <div className="min-w-[760px] xl:min-w-0">
              <MappaPorto selezione={areaId} onSeleziona={setAreaId} conteggi={conteggi} />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground xl:hidden">
            Scorri la pianta in orizzontale per raggiungere tutte le aree del porto.
          </p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {ETICHETTE_CATEGORIA.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: COLORE_CATEGORIA[c.id] }}
                  aria-hidden
                />
                <span className="etichetta text-muted-foreground">{c.nome}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pannello operativo */}
        <aside className="border-t xl:border-t-0 xl:border-l border-border bg-card/30 xl:max-h-[calc(100vh-81px)] xl:overflow-y-auto scroll-sottile">
          {!area && (
            <div className="p-6 space-y-4">
              <Ship className="h-8 w-8 text-primary" />
              <h2 className="font-display text-lg font-semibold">Seleziona un elemento del porto</h2>
              <p className="text-sm text-muted-foreground">
                Ogni area fisica, nave e impianto della pianta apre le funzioni portuali corrispondenti, le
                attività operative e i software associati.
              </p>
              <div className="rounded-md border border-border p-3 space-y-2">
                <div className="etichetta text-muted-foreground">Catena di accesso</div>
                <div className="text-sm flex flex-wrap items-center gap-1.5">
                  <span>Porto</span>
                  <ChevronRight className="h-3.5 w-3.5 text-primary" />
                  <span>Area fisica</span>
                  <ChevronRight className="h-3.5 w-3.5 text-primary" />
                  <span>Funzione</span>
                  <ChevronRight className="h-3.5 w-3.5 text-primary" />
                  <span>Attività</span>
                  <ChevronRight className="h-3.5 w-3.5 text-primary" />
                  <span className="text-primary">Software</span>
                </div>
              </div>
              {registro.caricamento ? (
                <Skeleton className="h-20 w-full" />
              ) : registro.stats.nSoftware === 0 ? (
                <div className="rounded-md border border-[hsl(38_60%_40%)] bg-[hsl(38_60%_20%/0.25)] p-3 text-sm">
                  Nessun software configurato. Importare uno o più file Excel.
                  <Link href="/gestione">
                    <Button size="sm" className="mt-2.5 w-full" data-testid="button-importa-vuoto">
                      Aggiungi elenco software
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>
          )}

          {area && (
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: COLORE_CATEGORIA[area.categoria] }}
                  />
                  <span className="etichetta text-muted-foreground">{area.codice}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-7 px-2 text-xs"
                    onClick={() => setAreaId(null)}
                    data-testid="button-chiudi-area"
                  >
                    Chiudi
                  </Button>
                </div>
                <h2 className="font-display text-lg font-semibold">{area.nome}</h2>
                <p className="text-sm text-muted-foreground">{area.descrizione}</p>
                <div className="flex gap-2 pt-1">
                  <Badge variant="secondary" className="num">
                    {area.funzioni.length} funzioni
                  </Badge>
                  <Badge variant="secondary" className="num">
                    {(registro.perArea[area.id] ?? []).length} software
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => setDialogNodo({ areaId: area.id })}
                    data-testid="button-associa-area"
                  >
                    <Link2 className="h-3.5 w-3.5 mr-1.5" />
                    Associa
                  </Button>
                </div>
              </div>

              {/* software a livello di area */}
              {(() => {
                const aLivelloArea = (registro.perArea[area.id] ?? []).filter((s) =>
                  (registro.assPerSoftware[s.id] ?? []).some((a) => a.areaId === area.id && !a.funzioneId)
                );
                if (!aLivelloArea.length) return null;
                return (
                  <section className="space-y-2">
                    <h3 className="etichetta text-muted-foreground">Software di area</h3>
                    {aLivelloArea.map((s) => (
                      <CardSoftware
                        key={s.id}
                        s={s}
                        associazione={(registro.assPerSoftware[s.id] ?? []).find(
                          (a) => a.areaId === area.id && !a.funzioneId
                        )}
                        onRimuovi={(id) => elimina.mutate(id)}
                        onApriScheda={setScheda}
                      />
                    ))}
                  </section>
                );
              })()}

              <Accordion type="multiple" className="w-full">
                {area.funzioni.map((f) => {
                  const swFunzione = registro.perFunzione[f.id] ?? [];
                  return (
                    <AccordionItem key={f.id} value={f.id}>
                      <AccordionTrigger className="text-left hover:no-underline py-3">
                        <div className="flex items-start gap-2 min-w-0 pr-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{f.nome}</div>
                            <div className="etichetta text-muted-foreground mt-0.5">
                              {f.attivita.length} attività ·{' '}
                              <span className={swFunzione.length ? 'text-primary' : ''}>
                                {swFunzione.length} software
                              </span>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        {f.descrizione && <p className="text-xs text-muted-foreground">{f.descrizione}</p>}

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => setDialogNodo({ areaId: area.id, funzioneId: f.id })}
                          data-testid={`button-associa-funzione-${f.id}`}
                        >
                          <Link2 className="h-3.5 w-3.5 mr-1.5" />
                          Associa software a questa funzione
                        </Button>

                        {swFunzione
                          .filter((s) =>
                            (registro.assPerSoftware[s.id] ?? []).some(
                              (a) => a.funzioneId === f.id && !a.attivitaId
                            )
                          )
                          .map((s) => (
                            <CardSoftware
                              key={s.id}
                              s={s}
                              associazione={(registro.assPerSoftware[s.id] ?? []).find(
                                (a) => a.funzioneId === f.id && !a.attivitaId
                              )}
                              onRimuovi={(id) => elimina.mutate(id)}
                              onApriScheda={setScheda}
                            />
                          ))}

                        <div className="space-y-2.5">
                          {f.attivita.map((att) => {
                            const swAtt = registro.perAttivita[att.id] ?? [];
                            return (
                              <div
                                key={att.id}
                                className="rounded-md border border-border/70 bg-background/40 p-2.5 space-y-2"
                              >
                                <div className="flex items-start gap-2">
                                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                  <div className="text-xs flex-1 min-w-0">{att.nome}</div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 shrink-0"
                                    title="Associa software a questa attività"
                                    onClick={() =>
                                      setDialogNodo({ areaId: area.id, funzioneId: f.id, attivitaId: att.id })
                                    }
                                    data-testid={`button-associa-attivita-${att.id}`}
                                  >
                                    <Link2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                {swAtt.map((s) => (
                                  <CardSoftware
                                    key={s.id}
                                    s={s}
                                    associazione={(registro.assPerSoftware[s.id] ?? []).find(
                                      (a) => a.attivitaId === att.id
                                    )}
                                    onRimuovi={(id) => elimina.mutate(id)}
                                    onApriScheda={setScheda}
                                  />
                                ))}
                                {!swAtt.length && (
                                  <div className="etichetta text-muted-foreground pl-3.5">
                                    nessun software associato
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          )}
        </aside>
      </div>

      {dialogNodo && (
        <DialogAssociaANodo
          open={!!dialogNodo}
          onOpenChange={(v) => !v && setDialogNodo(null)}
          nodo={dialogNodo}
        />
      )}
      <SchedaSoftware software={scheda} onOpenChange={(v) => !v && setScheda(null)} />
    </Shell>
  );
}
