import { useMemo, useState } from 'react';
import Shell, { Intestazione } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Database, Search, ExternalLink, Download, AlertTriangle, Filter, X } from 'lucide-react';
import type { Software } from '@shared/schema';
import { useStruttura } from '@/lib/struttura';
import { etichettaFonte, nomeArea, nomeAttivita, nomeFunzione, urlNormalizzato, useRegistro } from '@/lib/dati';
import SchedaSoftware from '@/components/SchedaSoftware';
import { EtichettaAssociazione } from '@/components/associazioni';
import { useToast } from '@/hooks/use-toast';

const TUTTI = '__tutti__';

export default function PaginaRegistro() {
  const registro = useRegistro();
  const { aree, areeById, funzioniIndex } = useStruttura();
  const { toast } = useToast();
  const [scheda, setScheda] = useState<Software | null>(null);
  const [cerca, setCerca] = useState('');
  const [fArea, setFArea] = useState(TUTTI);
  const [fFunzione, setFFunzione] = useState(TUTTI);
  const [fAttivita, setFAttivita] = useState(TUTTI);
  const [fCategoria, setFCategoria] = useState(TUTTI);
  const [fFonte, setFFonte] = useState(TUTTI);
  const [fFoglio, setFFoglio] = useState(TUTTI);
  const [fStato, setFStato] = useState(TUTTI);
  const [rapido, setRapido] = useState<null | 'senzaFunzione' | 'senzaUrl' | 'nonClassificati' | 'duplicati'>(
    null
  );

  const categorie = useMemo(
    () => Array.from(new Set(registro.software.map((s) => s.categoria).filter(Boolean))) as string[],
    [registro.software]
  );
  const fogli = useMemo(
    () => Array.from(new Set(registro.software.map((s) => s.foglio).filter(Boolean))) as string[],
    [registro.software]
  );
  const stati = useMemo(
    () => Array.from(new Set(registro.software.map((s) => s.stato).filter(Boolean))) as string[],
    [registro.software]
  );
  const funzioniDisponibili =
    fArea !== TUTTI ? areeById[fArea]?.funzioni ?? [] : aree.flatMap((a) => a.funzioni);
  const attivitaDisponibili =
    fFunzione !== TUTTI ? funzioniIndex[fFunzione]?.funzione.attivita ?? [] : [];

  const idsDuplicati = useMemo(
    () => new Set(registro.gruppiDuplicati.flatMap((g) => g.record.map((r) => r.id))),
    [registro.gruppiDuplicati]
  );

  const elenco = useMemo(() => {
    const q = cerca.toLowerCase().trim();
    return registro.software.filter((s) => {
      const ass = registro.assPerSoftware[s.id] ?? [];
      if (q) {
        const testo = [s.nome, s.descrizione, s.note, s.categoria, s.url, s.codice]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!testo.includes(q)) return false;
      }
      if (fArea !== TUTTI && !ass.some((a) => a.areaId === fArea)) return false;
      if (fFunzione !== TUTTI && !ass.some((a) => a.funzioneId === fFunzione)) return false;
      if (fAttivita !== TUTTI && !ass.some((a) => a.attivitaId === fAttivita)) return false;
      if (fCategoria !== TUTTI && s.categoria !== fCategoria) return false;
      if (fFonte !== TUTTI && String(s.fonteId) !== fFonte) return false;
      if (fFoglio !== TUTTI && s.foglio !== fFoglio) return false;
      if (fStato !== TUTTI && s.stato !== fStato) return false;
      if (rapido === 'senzaFunzione' && ass.some((a) => a.funzioneId)) return false;
      if (rapido === 'senzaUrl' && (s.url || s.percorsoLocale || s.appDesktop)) return false;
      if (rapido === 'nonClassificati' && ass.length) return false;
      if (rapido === 'duplicati' && !idsDuplicati.has(s.id)) return false;
      return true;
    });
  }, [
    registro.software,
    registro.assPerSoftware,
    cerca,
    fArea,
    fFunzione,
    fAttivita,
    fCategoria,
    fFonte,
    fFoglio,
    fStato,
    rapido,
    idsDuplicati,
  ]);

  const azzera = () => {
    setCerca('');
    setFArea(TUTTI);
    setFFunzione(TUTTI);
    setFAttivita(TUTTI);
    setFCategoria(TUTTI);
    setFFonte(TUTTI);
    setFFoglio(TUTTI);
    setFStato(TUTTI);
    setRapido(null);
  };

  const esporta = () => {
    const righe = [
      [
        'Nome',
        'Descrizione',
        'Categoria',
        'Associazioni (area > funzione > attività)',
        'URL',
        'Percorso locale',
        'App desktop',
        'Stato',
        'Ruolo autorizzato',
        'Note',
        'File Excel',
        'Foglio',
        'Riga di origine',
        'Possibile duplicato',
      ],
      ...elenco.map((s) => {
        const ass = (registro.assPerSoftware[s.id] ?? [])
          .map((a) =>
            [nomeArea(a.areaId), a.funzioneId ? nomeFunzione(a.funzioneId) : '', a.attivitaId ? nomeAttivita(a.attivitaId) : '']
              .filter(Boolean)
              .join(' > ')
          )
          .join(' | ');
        return [
          s.nome,
          s.descrizione ?? '',
          s.categoria ?? '',
          ass,
          s.url ?? '',
          s.percorsoLocale ?? '',
          s.appDesktop ?? '',
          s.stato ?? '',
          s.ruolo ?? '',
          s.note ?? '',
          etichettaFonte(registro.fonteById[s.fonteId]),
          s.foglio ?? '',
          s.rigaOrigine ?? '',
          idsDuplicati.has(s.id) ? 'sì' : '',
        ];
      }),
    ];
    const csv = '\ufeff' + righe.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `registro-software-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 4000);
      toast({ title: 'Registro esportato', description: `${elenco.length} righe nel file CSV.` });
    } catch {
      navigator.clipboard?.writeText(csv);
      toast({ title: 'Registro copiato', description: `${elenco.length} righe in formato CSV.` });
    }
  };

  return (
    <Shell>
      <Intestazione
        titolo="Registro software"
        sottotitolo="Vista centrale di tutti i software rilevati negli Excel, con le loro fonti e associazioni."
        icona={Database}
      >
        <Button size="sm" variant="outline" onClick={esporta} disabled={!elenco.length} data-testid="button-esporta">
          <Download className="h-4 w-4 mr-1.5" />
          Esporta CSV
        </Button>
      </Intestazione>

      <div className="p-4 xl:p-5 space-y-5">
        {/* statistiche */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2.5">
          <Stat etichetta="File Excel" valore={registro.stats.nFonti} />
          <Stat etichetta="Fogli analizzati" valore={registro.stats.nFogli} />
          <Stat etichetta="Software" valore={registro.stats.nSoftware} accento />
          <Stat etichetta="Associazioni" valore={registro.stats.nAssociazioni} />
          <Stat
            etichetta="Senza funzione"
            valore={registro.stats.senzaFunzione}
            avviso={registro.stats.senzaFunzione > 0}
            onClick={() => setRapido(rapido === 'senzaFunzione' ? null : 'senzaFunzione')}
            attivo={rapido === 'senzaFunzione'}
          />
          <Stat
            etichetta="Senza collegamento"
            valore={registro.stats.senzaUrl}
            avviso={registro.stats.senzaUrl > 0}
            onClick={() => setRapido(rapido === 'senzaUrl' ? null : 'senzaUrl')}
            attivo={rapido === 'senzaUrl'}
          />
          <Stat
            etichetta="Possibili duplicati"
            valore={registro.stats.duplicati}
            avviso={registro.stats.duplicati > 0}
            onClick={() => setRapido(rapido === 'duplicati' ? null : 'duplicati')}
            attivo={rapido === 'duplicati'}
          />
        </div>

        <Tabs defaultValue="elenco">
          <TabsList>
            <TabsTrigger value="elenco" data-testid="tab-elenco">
              Elenco software
            </TabsTrigger>
            <TabsTrigger value="duplicati" data-testid="tab-duplicati">
              Duplicati
              {registro.gruppiDuplicati.length > 0 && (
                <Badge variant="secondary" className="ml-2 num">
                  {registro.gruppiDuplicati.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="copertura" data-testid="tab-copertura">
              Copertura funzionale
            </TabsTrigger>
          </TabsList>

          <TabsContent value="elenco" className="space-y-4 mt-4">
            {/* filtri */}
            <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="etichetta text-muted-foreground">Filtri</span>
                <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={azzera} data-testid="button-azzera-filtri">
                  <X className="h-3.5 w-3.5 mr-1" />
                  Azzera
                </Button>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={cerca}
                  onChange={(e) => setCerca(e.target.value)}
                  placeholder="Cerca per nome, descrizione, note, URL"
                  className="pl-8"
                  data-testid="input-cerca-registro"
                />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <FiltroSelect
                  valore={fArea}
                  onChange={(v) => {
                    setFArea(v);
                    setFFunzione(TUTTI);
                    setFAttivita(TUTTI);
                  }}
                  placeholder="Area"
                  opzioni={aree.map((a) => ({ value: a.id, label: a.nome }))}
                  testId="filtro-area"
                />
                <FiltroSelect
                  valore={fFunzione}
                  onChange={(v) => {
                    setFFunzione(v);
                    setFAttivita(TUTTI);
                  }}
                  placeholder="Funzione"
                  opzioni={funzioniDisponibili.map((f) => ({ value: f.id, label: f.nome }))}
                  testId="filtro-funzione"
                />
                <FiltroSelect
                  valore={fAttivita}
                  onChange={setFAttivita}
                  placeholder="Attività"
                  opzioni={attivitaDisponibili.map((a) => ({ value: a.id, label: a.nome }))}
                  testId="filtro-attivita"
                />
                <FiltroSelect
                  valore={fCategoria}
                  onChange={setFCategoria}
                  placeholder="Categoria"
                  opzioni={categorie.map((c) => ({ value: c, label: c }))}
                  testId="filtro-categoria"
                />
                <FiltroSelect
                  valore={fFonte}
                  onChange={setFFonte}
                  placeholder="File Excel di origine"
                  opzioni={registro.fonti.map((f) => ({ value: String(f.id), label: etichettaFonte(f) }))}
                  testId="filtro-fonte"
                />
                <FiltroSelect
                  valore={fFoglio}
                  onChange={setFFoglio}
                  placeholder="Foglio di origine"
                  opzioni={fogli.map((f) => ({ value: f, label: f }))}
                  testId="filtro-foglio"
                />
                <FiltroSelect
                  valore={fStato}
                  onChange={setFStato}
                  placeholder="Stato"
                  opzioni={stati.map((s) => ({ value: s, label: s }))}
                  testId="filtro-stato"
                />
                <FiltroSelect
                  valore={rapido ?? TUTTI}
                  onChange={(v) => setRapido(v === TUTTI ? null : (v as any))}
                  placeholder="Anomalie"
                  opzioni={[
                    { value: 'senzaFunzione', label: 'Senza funzione associata' },
                    { value: 'senzaUrl', label: 'Senza URL o percorso' },
                    { value: 'nonClassificati', label: 'Non classificati' },
                    { value: 'duplicati', label: 'Possibili duplicati' },
                  ]}
                  testId="filtro-anomalie"
                />
              </div>
            </div>

            <div className="etichetta text-muted-foreground">
              {elenco.length} risultati su {registro.stats.nSoftware} software
            </div>

            {registro.stats.nSoftware === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nessun software configurato. Importare uno o più file Excel.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-x-auto scroll-sottile">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60">
                    <tr>
                      {['Software', 'Categoria', 'Associazioni', 'Origine', 'Collegamento'].map((h) => (
                        <th key={h} className="etichetta text-left px-3 py-2.5 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {elenco.map((s) => {
                      const ass = registro.assPerSoftware[s.id] ?? [];
                      return (
                        <tr
                          key={s.id}
                          className="border-t border-border hover:bg-secondary/30 cursor-pointer"
                          onClick={() => setScheda(s)}
                          data-testid={`row-software-${s.id}`}
                        >
                          <td className="px-3 py-2.5 max-w-[280px]">
                            <div className="font-medium truncate flex items-center gap-1.5">
                              {idsDuplicati.has(s.id) && (
                                <span title="Possibile software duplicato" className="shrink-0">
                                  <AlertTriangle className="h-3.5 w-3.5 text-[hsl(38_90%_60%)]" />
                                </span>
                              )}
                              {s.nome}
                            </div>
                            {s.descrizione && (
                              <div className="text-xs text-muted-foreground truncate">{s.descrizione}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                            {s.categoria ?? '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            {ass.length ? (
                              <div className="flex flex-wrap gap-1">
                                {ass.slice(0, 2).map((a) => (
                                  <EtichettaAssociazione key={a.id} a={a} />
                                ))}
                                {ass.length > 2 && (
                                  <span className="etichetta text-muted-foreground">+{ass.length - 2}</span>
                                )}
                              </div>
                            ) : (
                              <span className="etichetta text-[hsl(38_90%_60%)]">non classificato</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="text-xs truncate max-w-[180px]">
                              {etichettaFonte(registro.fonteById[s.fonteId])}
                            </div>
                            <div className="etichetta text-muted-foreground">{s.foglio ?? '—'}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            {s.url ? (
                              <a
                                href={urlNormalizzato(s.url)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary inline-flex items-center gap-1 text-xs"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                apri
                              </a>
                            ) : s.percorsoLocale || s.appDesktop ? (
                              <span className="num text-xs text-muted-foreground truncate block max-w-[200px]">
                                {s.percorsoLocale || s.appDesktop}
                              </span>
                            ) : (
                              <span className="etichetta text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="duplicati" className="mt-4 space-y-3">
            {registro.gruppiDuplicati.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nessun possibile duplicato rilevato.
              </div>
            ) : (
              registro.gruppiDuplicati.map((g) => (
                <div key={g.chiave} className="rounded-lg border border-[hsl(38_60%_38%)] bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[hsl(38_90%_60%)]" />
                    <span className="font-medium text-sm">Possibile software duplicato</span>
                    <Badge variant="outline" className="num ml-auto">
                      {g.record.length} record
                    </Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    {g.record.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setScheda(r)}
                        className="text-left rounded-md border border-border bg-background/50 p-2.5 hover:border-primary transition-colors"
                        data-testid={`button-dup-record-${r.id}`}
                      >
                        <div className="text-sm font-medium truncate">{r.nome}</div>
                        <div className="etichetta text-muted-foreground truncate">
                          {etichettaFonte(registro.fonteById[r.fonteId])}
                          {r.foglio ? ` · ${r.foglio}` : ''}
                        </div>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {r.principale ? <Badge className="text-[11px]">principale</Badge> : null}
                          {r.decisioneDuplicato && (
                            <Badge variant="secondary" className="text-[11px]">
                              {r.decisioneDuplicato}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    I record restano separati fino a una tua decisione: apri una scheda per mantenerli distinti,
                    collegarli o indicare quello principale.
                  </p>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="copertura" className="mt-4">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {aree.map((a) => {
                const n = (registro.perArea[a.id] ?? []).length;
                const funzioniCoperte = a.funzioni.filter((f) => (registro.perFunzione[f.id] ?? []).length).length;
                return (
                  <div key={a.id} className="rounded-lg border border-card-border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{a.nome}</div>
                        <div className="etichetta text-muted-foreground">{a.codice}</div>
                      </div>
                      <span className={`num text-sm ${n ? 'text-primary' : 'text-muted-foreground'}`}>{n}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(funzioniCoperte / a.funzioni.length) * 100}%` }}
                      />
                    </div>
                    <div className="etichetta text-muted-foreground">
                      {funzioniCoperte}/{a.funzioni.length} funzioni coperte
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SchedaSoftware software={scheda} onOpenChange={(v) => !v && setScheda(null)} />
    </Shell>
  );
}

function Stat({
  etichetta,
  valore,
  accento,
  avviso,
  onClick,
  attivo,
}: {
  etichetta: string;
  valore: number;
  accento?: boolean;
  avviso?: boolean;
  onClick?: () => void;
  attivo?: boolean;
}) {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`rounded-lg border bg-card px-3 py-2.5 text-left transition-colors ${
        attivo ? 'border-primary' : 'border-card-border'
      } ${onClick ? 'hover:border-primary/60' : ''}`}
      data-testid={`stat-${etichetta}`}
    >
      <div
        className={`num text-lg ${
          accento ? 'text-primary' : avviso ? 'text-[hsl(38_90%_62%)]' : ''
        }`}
      >
        {valore}
      </div>
      <div className="etichetta text-muted-foreground">{etichetta}</div>
    </Comp>
  );
}

function FiltroSelect({
  valore,
  onChange,
  placeholder,
  opzioni,
  testId,
}: {
  valore: string;
  onChange: (v: string) => void;
  placeholder: string;
  opzioni: { value: string; label: string }[];
  testId: string;
}) {
  return (
    <Select value={valore} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-xs" data-testid={`select-${testId}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TUTTI}>{placeholder}: tutti</SelectItem>
        {opzioni.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
