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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileSpreadsheet,
  FileText,
  Upload,
  Trash2,
  RefreshCw,
  X,
  Check,
  Table2,
  Pencil,
  Plus,
  Globe,
  MonitorDown,
  ArrowRight,
} from 'lucide-react';
import { CAMPI_INTERNI, TIPI_VOCE, type TipoVoce } from '@shared/schema';
import { leggiFile, mappaturaAutomatica, normalizzaRighe, type CartellaLetta, type Mappatura } from '@/lib/excel';
import { leggiDocumento, tipoFile } from '@/lib/documenti';
import { SelettoreNodo } from '@/components/associazioni';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { etichettaFonte, useRegistro } from '@/lib/dati';

type Bozza = {
  key: string;
  tipoFonte: 'excel' | 'docx';
  cartella: CartellaLetta;
  includi: Record<string, boolean>;
  mappature: Record<string, Mappatura>;
  etichetta: string;
  note: string;
  autoAssocia: boolean;
  fonteTarget: string; // 'nuova' | id fonte esistente
};

/** Voce singola in inserimento: sito web, applicazione .exe, documento o altro. */
type Voce = {
  nome: string;
  tipo: TipoVoce;
  url: string;
  percorsoLocale: string;
  descrizione: string;
  categoria: string;
  stato: string;
  note: string;
  nodo: { areaId?: string; funzioneId?: string; attivitaId?: string };
};

function vocePredefinita(): Voce {
  return {
    nome: '',
    tipo: 'web',
    url: '',
    percorsoLocale: '',
    descrizione: '',
    categoria: '',
    stato: '',
    note: '',
    nodo: {},
  };
}

const ICONA_TIPO: Record<string, typeof Globe> = {
  web: Globe,
  desktop: MonitorDown,
  documento: FileText,
  altro: Plus,
};

function iconaFonte(tipo: string) {
  if (tipo === 'docx') return FileText;
  if (tipo === 'manuale') return Plus;
  return FileSpreadsheet;
}

function etichettaTipoFonte(tipo: string) {
  if (tipo === 'docx') return 'Documento Word';
  if (tipo === 'manuale') return 'Voci singole';
  return 'Cartella Excel';
}

export default function PaginaGestione() {
  const registro = useRegistro();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [bozze, setBozze] = useState<Bozza[]>([]);
  const [targetPendente, setTargetPendente] = useState<string | null>(null);
  const [lettura, setLettura] = useState(false);
  const [daEliminare, setDaEliminare] = useState<number | null>(null);
  const [modifica, setModifica] = useState<{ id: number; etichetta: string; note: string } | null>(null);
  const [voce, setVoce] = useState<Voce | null>(null);

  async function onFile(files: FileList | null) {
    if (!files?.length) return;
    const target = targetPendente ?? 'nuova';
    setTargetPendente(null);
    setLettura(true);
    try {
      const nuove: Bozza[] = [];
      for (const file of Array.from(files)) {
        const tipo = tipoFile(file);
        if (tipo === 'eseguibile' || tipo === 'altro') {
          // Un .exe o un singolo file non è un elenco: diventa una voce del registro.
          setVoce({
            ...vocePredefinita(),
            tipo: tipo === 'eseguibile' ? 'desktop' : 'documento',
            nome: file.name.replace(/\.[^.]+$/, ''),
            percorsoLocale: file.name,
          });
          continue;
        }
        const cartella = tipo === 'docx' ? await leggiDocumento(file) : await leggiFile(file);
        const includi: Record<string, boolean> = {};
        const mappature: Record<string, Mappatura> = {};
        for (const f of cartella.fogli) {
          includi[f.nome] = f.righe.length > 0;
          mappature[f.nome] = mappaturaAutomatica(f.colonne);
        }
        nuove.push({
          key: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tipoFonte: tipo === 'docx' ? 'docx' : 'excel',
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
        tipoFonte: b.tipoFonte,
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
      toast({ title: 'Fonte rimossa dal sistema' });
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

  const salvaVoce = useMutation({
    mutationFn: async (v: Voce) => {
      const payload = {
        nome: v.nome.trim(),
        tipo: v.tipo,
        descrizione: v.descrizione.trim() || null,
        url: v.tipo === 'web' ? v.url.trim() || null : null,
        percorsoLocale: v.tipo === 'web' ? null : v.percorsoLocale.trim() || null,
        categoria: v.categoria.trim() || null,
        stato: v.stato.trim() || null,
        note: v.note.trim() || null,
        areaId: v.nodo.areaId ?? null,
        funzioneId: v.nodo.funzioneId ?? null,
        attivitaId: v.nodo.attivitaId ?? null,
      };
      return (await apiRequest('POST', '/api/software', payload)).json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fonti'] });
      queryClient.invalidateQueries({ queryKey: ['/api/software'] });
      queryClient.invalidateQueries({ queryKey: ['/api/associazioni'] });
      setVoce(null);
      toast({ title: 'Software aggiunto al registro' });
    },
    onError: (e: any) =>
      toast({ title: 'Inserimento non riuscito', description: String(e?.message), variant: 'destructive' }),
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
        sottotitolo="Registra i software da file Excel, documenti Word, indirizzi web o applicazioni .exe, senza toccare l'applicazione."
        icona={FileSpreadsheet}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv,.docx,.exe,.msi,.lnk,.bat,.cmd"
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
          {lettura ? 'Lettura in corso…' : 'Aggiungi elenco da file'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVoce(vocePredefinita())}
          data-testid="button-voce-singola"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Aggiungi singolo software
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
            <h2 className="font-display text-base font-semibold">Fonti presenti nel sistema</h2>
            <span className="etichetta text-muted-foreground">
              {registro.stats.nFonti} {registro.stats.nFonti === 1 ? 'fonte' : 'fonti'} ·{' '}
              {registro.stats.nFogli} fogli · {registro.stats.nSoftware} software
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
                Aggiungi elenco da file
              </Button>
              <p className="text-xs text-muted-foreground">
                Oltre agli Excel si possono importare elenchi da documenti Word (.docx) oppure inserire un
                singolo software indicando un indirizzo web, un eseguibile .exe o un documento.
              </p>
              <Button
                variant="outline"
                onClick={() => setVoce(vocePredefinita())}
                data-testid="button-primo-voce"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Aggiungi singolo software
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
              const IconaFonte = iconaFonte(f.tipo);
              return (
                <div
                  key={f.id}
                  className="rounded-lg border border-card-border bg-card p-4 space-y-3"
                  data-testid={`card-fonte-${f.id}`}
                >
                  <div className="flex items-start gap-3">
                    <IconaFonte className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{etichettaFonte(f)}</div>
                      <div className="etichetta text-muted-foreground truncate">
                        {etichettaTipoFonte(f.tipo)}
                        {f.etichetta?.trim() ? ` · ${f.nomeFile}` : ''}
                      </div>
                    </div>
                    {f.tipo !== 'manuale' && (
                      <Badge variant="outline" className="num shrink-0">
                        v{f.versione}
                      </Badge>
                    )}
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
                      disabled={f.tipo === 'manuale'}
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
            <AlertDialogTitle>Eliminare questa fonte dal sistema?</AlertDialogTitle>
            <AlertDialogDescription>
              Vengono rimossi i software provenienti da questa fonte e le relative associazioni. Le altre fonti
              restano invariate.
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

      <DialogVoce
        voce={voce}
        onChange={(v) => setVoce(v)}
        onChiudi={() => setVoce(null)}
        onSalva={() => voce && salvaVoce.mutate(voce)}
        inCorso={salvaVoce.isPending}
      />
    </Shell>
  );
}

/** Inserimento di un singolo software: sito web, applicazione .exe o documento. */
function DialogVoce({
  voce,
  onChange,
  onChiudi,
  onSalva,
  inCorso,
}: {
  voce: Voce | null;
  onChange: (v: Voce) => void;
  onChiudi: () => void;
  onSalva: () => void;
  inCorso: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  if (!voce) return null;
  const definizione = TIPI_VOCE.find((t) => t.id === voce.tipo) ?? TIPI_VOCE[3];
  const Icona = ICONA_TIPO[voce.tipo] ?? Plus;
  const valido = voce.nome.trim().length > 0;

  return (
    <Dialog open onOpenChange={(v) => !v && onChiudi()}>
      <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto scroll-sottile">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Icona className="h-4 w-4 text-primary" />
            Aggiungi un singolo software
          </DialogTitle>
          <DialogDescription>
            Per i software che non arrivano da un elenco: un sito web, un eseguibile installato sulla
            postazione oppure un documento di riferimento. La voce viene registrata come tutte le altre e
            può essere associata subito a un'area, una funzione e un'attività.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo di risorsa</Label>
            <Select value={voce.tipo} onValueChange={(v) => onChange({ ...voce, tipo: v as TipoVoce })}>
              <SelectTrigger data-testid="select-tipo-voce">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPI_VOCE.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome del software</Label>
            <Input
              value={voce.nome}
              onChange={(e) => onChange({ ...voce, nome: e.target.value })}
              placeholder="es. Portale prenotazione varchi"
              data-testid="input-voce-nome"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{definizione.etichettaCampo}</Label>
            {voce.tipo === 'web' ? (
              <Input
                value={voce.url}
                onChange={(e) => onChange({ ...voce, url: e.target.value })}
                placeholder="https://"
                data-testid="input-voce-url"
              />
            ) : (
              <div className="flex gap-2">
                <Input
                  value={voce.percorsoLocale}
                  onChange={(e) => onChange({ ...voce, percorsoLocale: e.target.value })}
                  placeholder={
                    voce.tipo === 'desktop' ? 'C:\\Programmi\\Applicazione\\app.exe' : 'C:\\Documenti\\manuale.docx'
                  }
                  data-testid="input-voce-percorso"
                />
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    onChange({
                      ...voce,
                      percorsoLocale: file.name,
                      nome: voce.nome.trim() || file.name.replace(/\.[^.]+$/, ''),
                    });
                    e.target.value = '';
                  }}
                  data-testid="input-voce-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  data-testid="button-voce-scegli-file"
                >
                  Scegli file
                </Button>
              </div>
            )}
            <p className="etichetta text-muted-foreground">
              {voce.tipo === 'web'
                ? 'Indirizzo completo da aprire dalla mappa del porto.'
                : 'Scegliendo un file viene proposto il suo nome: completare il percorso come appare sulla postazione.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descrizione</Label>
            <Textarea
              value={voce.descrizione}
              onChange={(e) => onChange({ ...voce, descrizione: e.target.value })}
              rows={2}
              data-testid="input-voce-descrizione"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <Input
                value={voce.categoria}
                onChange={(e) => onChange({ ...voce, categoria: e.target.value })}
                placeholder="es. Dogana"
                data-testid="input-voce-categoria"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stato</Label>
              <Input
                value={voce.stato}
                onChange={(e) => onChange({ ...voce, stato: e.target.value })}
                placeholder="es. in uso"
                data-testid="input-voce-stato"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-xs">Associazione (facoltativa)</Label>
            <SelettoreNodo valore={voce.nodo} onChange={(nodo) => onChange({ ...voce, nodo })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Note</Label>
            <Textarea
              value={voce.note}
              onChange={(e) => onChange({ ...voce, note: e.target.value })}
              rows={2}
              data-testid="input-voce-note"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onChiudi}>
            Annulla
          </Button>
          <Button onClick={onSalva} disabled={!valido || inCorso} data-testid="button-salva-voce">
            <Check className="h-4 w-4 mr-1.5" />
            {inCorso ? 'Salvataggio…' : 'Aggiungi al registro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
            {bozza.tipoFonte === 'docx' ? 'Documento Word' : 'Cartella Excel'} ·{' '}
            {bozza.cartella.fogli.length} {bozza.tipoFonte === 'docx' ? 'sezioni rilevate' : 'fogli rilevati'} ·{' '}
            {righe.length} righe pronte all'importazione
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
              <SelectItem value="nuova">Nuova fonte nel registro</SelectItem>
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
        <Label className="text-xs">{bozza.tipoFonte === 'docx' ? 'Sezioni da importare' : 'Fogli da importare'}</Label>
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
                Normalizzazione colonne · {bozza.tipoFonte === 'docx' ? 'sezione' : 'foglio'}{' '}
                <span className="num">{foglio.nome}</span>
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
