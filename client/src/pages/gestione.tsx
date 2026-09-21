import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Shell, { Intestazione } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileSpreadsheet,
  Upload,
  Trash2,
  RefreshCw,
  X,
  Check,
  Table2,
  Pencil,
  ArrowRight,
} from 'lucide-react';
import { CAMPI_INTERNI } from '@shared/schema';
import { leggiFile, mappaturaAutomatica, normalizzaRighe, type CartellaLetta, type Mappatura } from '@/lib/excel';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { etichettaFonte, useRegistro } from '@/lib/dati';

type Bozza = {
  key: string;
  cartella: CartellaLetta;
  includi: Record<string, boolean>;
  mappature: Record<string, Mappatura>;
  etichetta: string;
  note: string;
  autoAssocia: boolean;
  fonteTarget: string; // 'nuova' | id fonte esistente
};

export default function PaginaGestione() {
  const registro = useRegistro();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [bozze, setBozze] = useState<Bozza[]>([]);
  const [targetPendente, setTargetPendente] = useState<string | null>(null);
  const [lettura, setLettura] = useState(false);
  const [daEliminare, setDaEliminare] = useState<number | null>(null);
  const [modifica, setModifica] = useState<{ id: number; etichetta: string; note: string } | null>(null);

  async function onFile(files: FileList | null) {
    if (!files?.length) return;
    const target = targetPendente ?? 'nuova';
    setTargetPendente(null);
    setLettura(true);
    try {
      const nuove: Bozza[] = [];
      for (const file of Array.from(files)) {
        const cartella = await leggiFile(file);
        const includi: Record<string, boolean> = {};
        const mappature: Record<string, Mappatura> = {};
        for (const f of cartella.fogli) {
          includi[f.nome] = f.righe.length > 0;
          mappature[f.nome] = mappaturaAutomatica(f.colonne);
        }
        nuove.push({
          key: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          cartella,
          includi,
          mappature,
          etichetta: '',
          note: '',
          autoAssocia: true,
          fonteTarget: target,
        });
      }
      setBozze((b) => [...b, ...nuove]);
    } catch (e: any) {
      toast({ title: 'Lettura non riuscita', description: String(e?.message), variant: 'destructive' });
    } finally {
      setLettura(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const importa = useMutation({
    mutationFn: async (b: Bozza) => {
      const fogli = b.cartella.fogli.map((f) => ({ ...f, includi: !!b.includi[f.nome] }));
      const righe = normalizzaRighe(fogli, b.mappature);
      const payload = {
        nomeFile: b.cartella.nomeFile,
        etichetta: b.etichetta || null,
        note: b.note || null,
        fogli: fogli.filter((f) => f.includi).map((f) => f.nome),
        mappaturaColonne: b.mappature,
        righe,
        autoAssocia: b.autoAssocia,
      };
      const url = b.fonteTarget === 'nuova' ? '/api/import' : `/api/fonti/${b.fonteTarget}/reimporta`;
      return (await apiRequest('POST', url, payload)).json();
    },
    onSuccess: (dati: any, b) => {
      queryClient.invalidateQueries({ queryKey: ['/api/fonti'] });
      queryClient.invalidateQueries({ queryKey: ['/api/software'] });
      queryClient.invalidateQueries({ queryKey: ['/api/associazioni'] });
      setBozze((prev) => prev.filter((x) => x.key !== b.key));
      toast({
        title: b.fonteTarget === 'nuova' ? 'File importato' : 'File aggiornato',
        description: `${dati?.inseriti ?? 0} software nel registro.`,
      });
    },
    onError: (e: any) =>
      toast({ title: 'Importazione non riuscita', description: String(e?.message), variant: 'destructive' }),
  });

  const elimina = useMutation({
    mutationFn: async (id: number) => (await apiRequest('DELETE', `/api/fonti/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fonti'] });
      queryClient.invalidateQueries({ queryKey: ['/api/software'] });
      queryClient.invalidateQueries({ queryKey: ['/api/associazioni'] });
      setDaEliminare(null);
      toast({ title: 'File Excel rimosso dal sistema' });
    },
  });

  const salvaEtichetta = useMutation({
    mutationFn: async (m: { id: number; etichetta: string; note: string }) =>
      (await apiRequest('PATCH', `/api/fonti/${m.id}`, { etichetta: m.etichetta || null, note: m.note || null })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fonti'] });
      setModifica(null);
      toast({ title: 'Scheda file aggiornata' });
    },
  });

  const riassocia = useMutation({
    mutationFn: async () => (await apiRequest('POST', '/api/riassocia')).json(),
    onSuccess: (d: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/associazioni'] });
      toast({ title: 'Riconoscimento eseguito', description: `${d?.creati ?? 0} nuove associazioni automatiche.` });
    },
  });

  return (
    <Shell>
      <Intestazione
        titolo="Gestione software"
        sottotitolo="L'elenco dei software vive nei tuoi file Excel: aggiungili, aggiornali o rimuovili senza toccare l'applicazione."
        icona={FileSpreadsheet}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv"
          multiple
          className="hidden"
          onChange={(e) => onFile(e.target.files)}
          data-testid="input-file-excel"
        />
        <Button
          onClick={() => {
            setTargetPendente(null);
            inputRef.current?.click();
          }}
          disabled={lettura}
          data-testid="button-aggiungi-elenco"
        >
          <Upload className="h-4 w-4 mr-1.5" />
          {lettura ? 'Lettura in corso…' : 'Aggiungi elenco software'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => riassocia.mutate()}
          disabled={riassocia.isPending || registro.stats.nSoftware === 0}
          data-testid="button-riassocia"
        >
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Riconosci associazioni
        </Button>
      </Intestazione>

      <div className="p-4 xl:p-5 space-y-6 max-w-[1200px]">
        {/* Bozze in importazione */}
        {bozze.map((b) => (
          <BozzaImport
            key={b.key}
            bozza={b}
            fonti={registro.fonti}
            onChange={(patch) => setBozze((prev) => prev.map((x) => (x.key === b.key ? { ...x, ...patch } : x)))}
            onAnnulla={() => setBozze((prev) => prev.filter((x) => x.key !== b.key))}
            onImporta={() => importa.mutate(b)}
            inCorso={importa.isPending}
          />
        ))}

        {/* Elenco file importati */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-semibold">File Excel presenti nel sistema</h2>
            <span className="etichetta text-muted-foreground">
              {registro.stats.nFonti} file · {registro.stats.nFogli} fogli · {registro.stats.nSoftware} software
            </span>
          </div>

          {registro.fonti.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
              <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Nessun software configurato. Importare uno o più file Excel. Il sistema riconosce
                automaticamente fogli e colonne, e conserva sempre l'indicazione del file di origine.
              </p>
              <Button
                onClick={() => {
                  setTargetPendente(null);
                  inputRef.current?.click();
                }}
                data-testid="button-primo-import"
              >
                <Upload className="h-4 w-4 mr-1.5" />
                Aggiungi elenco software
              </Button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            {registro.fonti.map((f) => {
              const nSw = registro.software.filter((s) => s.fonteId === f.id).length;
              const fogli: string[] = (() => {
                try {
                  return JSON.parse(f.fogli || '[]');
                } catch {
                  return [];
                }
              })();
              return (
                <div
                  key={f.id}
                  className="rounded-lg border border-card-border bg-card p-4 space-y-3"
                  data-testid={`card-fonte-${f.id}`}
                >
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{etichettaFonte(f)}</div>
                      {f.etichetta?.trim() ? (
                        <div className="etichetta text-muted-foreground truncate">{f.nomeFile}</div>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="num shrink-0">
                      v{f.versione}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Metrica etichetta="Software" valore={nSw} />
                    <Metrica etichetta="Fogli" valore={f.nFogli} />
                    <Metrica etichetta="Righe" valore={f.nRecord} />
                  </div>

                  {fogli.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {fogli.map((nome) => (
                        <Badge key={nome} variant="secondary" className="text-[11px]">
                          {nome}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {f.note && <p className="text-xs text-muted-foreground">{f.note}</p>}

                  <div className="etichetta text-muted-foreground">
                    importato {new Date(f.importatoIl).toLocaleString('it-IT')}
                    {f.aggiornatoIl ? ` · aggiornato ${new Date(f.aggiornatoIl).toLocaleString('it-IT')}` : ''}
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTargetPendente(String(f.id));
                        inputRef.current?.click();
                      }}
                      title="Carica una nuova versione del file: i dati sostituiranno quelli attuali, mantenendo le associazioni manuali"
                      data-testid={`button-aggiorna-${f.id}`}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Aggiorna
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setModifica({ id: f.id, etichetta: f.etichetta ?? '', note: f.note ?? '' })}
                      data-testid={`button-modifica-${f.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Scheda
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 ml-auto text-destructive"
                      onClick={() => setDaEliminare(f.id)}
                      data-testid={`button-elimina-fonte-${f.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* modifica scheda file */}
        {modifica && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3 max-w-lg">
            <h3 className="font-display font-semibold text-sm">Scheda del file</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Etichetta descrittiva</Label>
              <Input
                value={modifica.etichetta}
                onChange={(e) => setModifica({ ...modifica, etichetta: e.target.value })}
                placeholder="es. Software doganali"
                data-testid="input-etichetta-fonte"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note</Label>
              <Textarea
                value={modifica.note}
                onChange={(e) => setModifica({ ...modifica, note: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => salvaEtichetta.mutate(modifica)} data-testid="button-salva-fonte">
                <Check className="h-4 w-4 mr-1.5" />
                Salva
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setModifica(null)}>
                Annulla
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={daEliminare !== null} onOpenChange={(v) => !v && setDaEliminare(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il file Excel dal sistema?</AlertDialogTitle>
            <AlertDialogDescription>
              Vengono rimossi i software importati da questo file e le relative associazioni. Gli altri file
              restano invariati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => daEliminare && elimina.mutate(daEliminare)}
              data-testid="button-conferma-elimina"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}

function Metrica({ etichetta, valore }: { etichetta: string; valore: number }) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-2 py-1.5">
      <div className="num text-sm">{valore}</div>
      <div className="etichetta text-muted-foreground">{etichetta}</div>
    </div>
  );
}

function BozzaImport({
  bozza,
  fonti,
  onChange,
  onAnnulla,
  onImporta,
  inCorso,
}: {
  bozza: Bozza;
  fonti: { id: number; nomeFile: string; etichetta: string | null }[];
  onChange: (patch: Partial<Bozza>) => void;
  onAnnulla: () => void;
  onImporta: () => void;
  inCorso: boolean;
}) {
  const fogliSelezionati = bozza.cartella.fogli.map((f) => ({ ...f, includi: !!bozza.includi[f.nome] }));
  const righe = normalizzaRighe(fogliSelezionati, bozza.mappature);
  const [foglioAperto, setFoglioAperto] = useState<string>(bozza.cartella.fogli[0]?.nome ?? '');

  return (
    <section className="rounded-lg border border-primary/40 bg-card p-4 space-y-4" data-testid="pannello-import">
      <div className="flex items-start gap-3">
        <Table2 className="h-5 w-5 text-primary mt-0.5" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-semibold">{bozza.cartella.nomeFile}</h2>
          <p className="etichetta text-muted-foreground">
            {bozza.cartella.fogli.length} fogli rilevati · {righe.length} righe pronte all'importazione
          </p>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onAnnulla} data-testid="button-annulla-import">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* destinazione */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Destinazione</Label>
          <Select value={bozza.fonteTarget} onValueChange={(v) => onChange({ fonteTarget: v })}>
            <SelectTrigger data-testid="select-destinazione">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nuova">Nuovo file nel registro</SelectItem>
              {fonti.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  Aggiorna: {f.etichetta || f.nomeFile}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Etichetta descrittiva (opzionale)</Label>
          <Input
            value={bozza.etichetta}
            onChange={(e) => onChange({ etichetta: e.target.value })}
            placeholder="es. Software dogana"
            data-testid="input-etichetta-import"
          />
        </div>
      </div>

      {/* fogli */}
      <div className="space-y-2">
        <Label className="text-xs">Fogli da importare</Label>
        <div className="flex flex-wrap gap-2">
          {bozza.cartella.fogli.map((f) => {
            const on = !!bozza.includi[f.nome];
            return (
              <div
                key={f.nome}
                className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                  on ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
                } ${foglioAperto === f.nome ? 'ring-1 ring-primary/60' : ''}`}
              >
                <Checkbox
                  checked={on}
                  onCheckedChange={() => onChange({ includi: { ...bozza.includi, [f.nome]: !on } })}
                  className="h-3.5 w-3.5"
                  data-testid={`checkbox-foglio-${f.nome}`}
                />
                <button
                  type="button"
                  onClick={() => setFoglioAperto(f.nome)}
                  className="flex items-center gap-2"
                  data-testid={`button-foglio-${f.nome}`}
                >
                  {f.nome}
                  <span className="num text-[11px] text-muted-foreground">{f.righe.length}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* mappatura colonne del foglio aperto */}
      {(() => {
        const foglio = bozza.cartella.fogli.find((f) => f.nome === foglioAperto);
        if (!foglio) return null;
        const map = bozza.mappature[foglio.nome] ?? {};
        return (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs">
                Normalizzazione colonne · foglio <span className="num">{foglio.nome}</span>
              </Label>
              <span className="etichetta text-muted-foreground">
                {foglio.colonne.length} colonne rilevate
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {CAMPI_INTERNI.map((campo) => (
                <div key={campo.key} className="space-y-1">
                  <div className="etichetta text-muted-foreground flex items-center gap-1">
                    {campo.label}
                    {'obbligatorio' in campo && campo.obbligatorio && <span className="text-primary">*</span>}
                  </div>
                  <Select
                    value={(map as any)[campo.key] ?? '__no__'}
                    onValueChange={(v) =>
                      onChange({
                        mappature: {
                          ...bozza.mappature,
                          [foglio.nome]: {
                            ...map,
                            [campo.key]: v === '__no__' ? undefined : v,
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs" data-testid={`select-colonna-${campo.key}`}>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__no__">— non presente —</SelectItem>
                      {foglio.colonne.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* anteprima */}
      <div className="space-y-2">
        <Label className="text-xs">Anteprima dati normalizzati</Label>
        <div className="rounded-md border border-border overflow-x-auto scroll-sottile">
          <table className="w-full text-xs">
            <thead className="bg-secondary/60">
              <tr>
                {['Foglio', 'Nome software', 'Area', 'Funzione', 'URL / percorso'].map((h) => (
                  <th key={h} className="etichetta text-left px-3 py-2 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {righe.slice(0, 6).map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.foglio}</td>
                  <td className="px-3 py-2">{r.nome}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.areaTesto ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.funzioneTesto ?? '—'}</td>
                  <td className="px-3 py-2 num truncate max-w-[220px]">
                    {r.url ?? r.percorsoLocale ?? '—'}
                  </td>
                </tr>
              ))}
              {righe.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-muted-foreground">
                    Nessuna riga valida: verifica la colonna mappata su "Nome software".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {righe.length > 6 && (
          <p className="etichetta text-muted-foreground">
            altre {righe.length - 6} righe verranno importate
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={bozza.autoAssocia}
            onCheckedChange={(v) => onChange({ autoAssocia: v })}
            data-testid="switch-auto-associa"
          />
          <span className="text-xs text-muted-foreground">
            Riconosci automaticamente area e funzione dai dati
          </span>
        </div>
        <Button
          className="ml-auto"
          onClick={onImporta}
          disabled={righe.length === 0 || inCorso}
          data-testid="button-conferma-import"
        >
          {inCorso ? 'Importazione…' : 'Importa nel registro'}
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </section>
  );
}
