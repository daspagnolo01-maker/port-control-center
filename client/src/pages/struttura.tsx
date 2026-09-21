import { useMemo, useState } from 'react';
import Shell, { Intestazione } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SlidersHorizontal,
  MapPin,
  Layers,
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import { CATEGORIE_AREA } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useRegistro } from '@/lib/dati';
import {
  impattoNodo,
  useAggiornaArea,
  useAggiornaAttivita,
  useAggiornaFunzione,
  useCreaArea,
  useCreaAttivita,
  useCreaFunzione,
  useEliminaArea,
  useEliminaAttivita,
  useEliminaFunzione,
  useRipristinaStruttura,
  useSpostaNodo,
  useStruttura,
  type StrutturaArea,
  type StrutturaAttivita,
  type StrutturaFunzione,
} from '@/lib/struttura';

type Tipo = 'area' | 'funzione' | 'attivita';

const ETICHETTA_TIPO: Record<Tipo, string> = {
  area: 'Area fisica',
  funzione: 'Funzione',
  attivita: 'Attività',
};

function nomeCategoria(id: string) {
  return CATEGORIE_AREA.find((c) => c.id === id)?.nome ?? id;
}

export default function PaginaStruttura() {
  const { toast } = useToast();
  const struttura = useStruttura();
  const registro = useRegistro();

  const [areaSel, setAreaSel] = useState<string | null>(null);
  const [funzioneSel, setFunzioneSel] = useState<string | null>(null);

  const creaArea = useCreaArea();
  const aggiornaArea = useAggiornaArea();
  const eliminaArea = useEliminaArea();
  const creaFunzione = useCreaFunzione();
  const aggiornaFunzione = useAggiornaFunzione();
  const eliminaFunzione = useEliminaFunzione();
  const creaAttivita = useCreaAttivita();
  const aggiornaAttivita = useAggiornaAttivita();
  const eliminaAttivita = useEliminaAttivita();
  const sposta = useSpostaNodo();
  const ripristina = useRipristinaStruttura();

  const area = areaSel ? struttura.areeById[areaSel] : undefined;
  const funzione = useMemo(
    () => area?.funzioni.find((f) => f.id === funzioneSel),
    [area, funzioneSel]
  );

  // dialog di eliminazione con avviso sull'impatto
  const [daEliminare, setDaEliminare] = useState<{
    tipo: Tipo;
    id: string;
    nome: string;
    associazioni: number;
  } | null>(null);
  const [ripristinoAperto, setRipristinoAperto] = useState(false);

  // dialog di modifica/creazione area
  const [schedaArea, setSchedaArea] = useState<StrutturaArea | 'nuova' | null>(null);

  async function chiediEliminazione(tipo: Tipo, id: string, nome: string) {
    const risorsa = tipo === 'area' ? 'aree' : tipo === 'funzione' ? 'funzioni' : 'attivita';
    const associazioni = await impattoNodo(risorsa, id);
    setDaEliminare({ tipo, id, nome, associazioni });
  }

  function confermaEliminazione() {
    if (!daEliminare) return;
    const { tipo, id } = daEliminare;
    const dopo = () => {
      toast({
        title: `${ETICHETTA_TIPO[tipo]} eliminata`,
        description:
          tipo === 'area'
            ? 'I software restano nel registro e compaiono come "fuori dall\'albero".'
            : 'Le associazioni presenti sono state riportate al livello superiore.',
      });
      if (tipo === 'area' && areaSel === id) {
        setAreaSel(null);
        setFunzioneSel(null);
      }
      if (tipo === 'funzione' && funzioneSel === id) setFunzioneSel(null);
      setDaEliminare(null);
    };
    if (tipo === 'area') eliminaArea.mutate({ __id: id }, { onSuccess: dopo });
    else if (tipo === 'funzione') eliminaFunzione.mutate({ __id: id }, { onSuccess: dopo });
    else eliminaAttivita.mutate({ __id: id }, { onSuccess: dopo });
  }

  const conteggioArea = (id: string) => registro.perArea[id]?.length ?? 0;

  return (
    <Shell>
      <Intestazione
        icona={SlidersHorizontal}
        titolo="Struttura del porto"
        sottotitolo="Configura aree fisiche, funzioni e attività. La catena resta area fisica → funzione → attività → software."
      >
        <Badge variant="outline" className="num">
          {struttura.totaleAree} aree · {struttura.totaleFunzioni} funzioni ·{' '}
          {struttura.totaleAttivita} attività
        </Badge>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-ripristina-struttura"
          onClick={() => setRipristinoAperto(true)}
        >
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Ripristina struttura predefinita
        </Button>
      </Intestazione>

      <div className="flex-1 overflow-auto p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* ---- Colonna aree ---- */}
          <Colonna
            titolo="Aree fisiche"
            icona={MapPin}
            testid="colonna-aree"
            azione={
              <Button
                size="sm"
                variant="outline"
                data-testid="button-nuova-area"
                onClick={() => setSchedaArea('nuova')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Nuova area
              </Button>
            }
          >
            {struttura.aree.length === 0 && (
              <p className="text-sm text-muted-foreground px-1 py-3">
                Nessuna area configurata. Aggiungere almeno un'area fisica.
              </p>
            )}
            {struttura.aree.map((a, i) => (
              <Riga
                key={a.id}
                testid={`riga-area-${a.id}`}
                attivo={areaSel === a.id}
                titolo={a.nome}
                dettaglio={`${a.codice} · ${a.funzioni.length} funzioni · ${conteggioArea(a.id)} software`}
                onClick={() => {
                  setAreaSel(a.id);
                  setFunzioneSel(null);
                }}
                onSu={i > 0 ? () => sposta.mutate({ tipo: 'area', id: a.id, direzione: -1 }) : undefined}
                onGiu={
                  i < struttura.aree.length - 1
                    ? () => sposta.mutate({ tipo: 'area', id: a.id, direzione: 1 })
                    : undefined
                }
                onModifica={() => setSchedaArea(a)}
                onElimina={() => chiediEliminazione('area', a.id, a.nome)}
              />
            ))}
          </Colonna>

          {/* ---- Colonna funzioni ---- */}
          <Colonna
            titolo="Funzioni"
            icona={Layers}
            testid="colonna-funzioni"
            sottotitolo={area ? `${area.nome} · ${nomeCategoria(area.categoria)}` : 'Selezionare un\'area fisica'}
            azione={
              area ? (
                <CampoNuovo
                  testid="nuova-funzione"
                  placeholder="Nome della nuova funzione"
                  onConferma={(nome) =>
                    creaFunzione.mutate(
                      { areaId: area.id, nome },
                      { onSuccess: () => toast({ title: 'Funzione aggiunta' }) }
                    )
                  }
                />
              ) : undefined
            }
          >
            {!area && (
              <p className="text-sm text-muted-foreground px-1 py-3">
                Selezionare un'area fisica per vederne le funzioni.
              </p>
            )}
            {area?.funzioni.length === 0 && (
              <p className="text-sm text-muted-foreground px-1 py-3">
                Nessuna funzione in questa area. Aggiungerne una.
              </p>
            )}
            {area?.funzioni.map((f, i) => (
              <RigaModificabile
                key={f.id}
                testid={`riga-funzione-${f.id}`}
                attivo={funzioneSel === f.id}
                nodo={f}
                dettaglio={`${f.attivita.length} attività`}
                onClick={() => setFunzioneSel(f.id)}
                onRinomina={(nome) =>
                  aggiornaFunzione.mutate({ __id: f.id, nome }, { onSuccess: () => toast({ title: 'Funzione aggiornata' }) })
                }
                onSu={i > 0 ? () => sposta.mutate({ tipo: 'funzione', id: f.id, direzione: -1 }) : undefined}
                onGiu={
                  i < (area?.funzioni.length ?? 0) - 1
                    ? () => sposta.mutate({ tipo: 'funzione', id: f.id, direzione: 1 })
                    : undefined
                }
                onElimina={() => chiediEliminazione('funzione', f.id, f.nome)}
              />
            ))}
          </Colonna>

          {/* ---- Colonna attività ---- */}
          <Colonna
            titolo="Attività"
            icona={ListChecks}
            testid="colonna-attivita"
            sottotitolo={funzione ? funzione.nome : 'Selezionare una funzione'}
            azione={
              funzione ? (
                <CampoNuovo
                  testid="nuova-attivita"
                  placeholder="Nome della nuova attività"
                  onConferma={(nome) =>
                    creaAttivita.mutate(
                      { funzioneId: funzione.id, nome },
                      { onSuccess: () => toast({ title: 'Attività aggiunta' }) }
                    )
                  }
                />
              ) : undefined
            }
          >
            {!funzione && (
              <p className="text-sm text-muted-foreground px-1 py-3">
                Selezionare una funzione per vederne le attività.
              </p>
            )}
            {funzione?.attivita.length === 0 && (
              <p className="text-sm text-muted-foreground px-1 py-3">
                Nessuna attività in questa funzione. Aggiungerne una.
              </p>
            )}
            {funzione?.attivita.map((t, i) => (
              <RigaModificabile
                key={t.id}
                testid={`riga-attivita-${t.id}`}
                nodo={t}
                onRinomina={(nome) =>
                  aggiornaAttivita.mutate({ __id: t.id, nome }, { onSuccess: () => toast({ title: 'Attività aggiornata' }) })
                }
                onSu={i > 0 ? () => sposta.mutate({ tipo: 'attivita', id: t.id, direzione: -1 }) : undefined}
                onGiu={
                  i < (funzione?.attivita.length ?? 0) - 1
                    ? () => sposta.mutate({ tipo: 'attivita', id: t.id, direzione: 1 })
                    : undefined
                }
                onElimina={() => chiediEliminazione('attivita', t.id, t.nome)}
              />
            ))}
          </Colonna>
        </div>

        <p className="text-xs text-muted-foreground mt-4 max-w-3xl">
          Le associazioni dei software seguono la struttura: eliminando un'attività le associazioni
          risalgono alla funzione, eliminando una funzione risalgono all'area. Eliminando un'area i
          software restano nel registro senza associazione. Nessun dato importato viene cancellato.
        </p>
      </div>

      {/* ---- Scheda area (crea / modifica) ---- */}
      <SchedaArea
        valore={schedaArea}
        onChiudi={() => setSchedaArea(null)}
        onCrea={(dati) =>
          creaArea.mutate(dati, {
            onSuccess: () => {
              toast({ title: 'Area fisica aggiunta', description: 'Posizionata in fondo alla pianta: regolare le coordinate se necessario.' });
              setSchedaArea(null);
            },
          })
        }
        onAggiorna={(id, dati) =>
          aggiornaArea.mutate(
            { __id: id, ...dati },
            {
              onSuccess: () => {
                toast({ title: 'Area fisica aggiornata' });
                setSchedaArea(null);
              },
            }
          )
        }
      />

      {/* ---- Conferma eliminazione ---- */}
      <Dialog open={!!daEliminare} onOpenChange={(o) => !o && setDaEliminare(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[hsl(38_90%_58%)]" />
              Eliminare {ETICHETTA_TIPO[daEliminare?.tipo ?? 'area'].toLowerCase()}
            </DialogTitle>
            <DialogDescription>{daEliminare?.nome}</DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <p data-testid="testo-impatto">
              Associazioni collegate: <span className="num">{daEliminare?.associazioni ?? 0}</span>
            </p>
            <p className="text-muted-foreground">
              {daEliminare?.tipo === 'attivita' &&
                'Le associazioni restano sulla funzione di appartenenza.'}
              {daEliminare?.tipo === 'funzione' &&
                'Le associazioni restano sull\'area fisica di appartenenza.'}
              {daEliminare?.tipo === 'area' &&
                'Le associazioni dell\'area vengono rimosse. I software restano nel registro e compaiono fra quelli fuori dall\'albero.'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDaEliminare(null)} data-testid="button-annulla-eliminazione">
              Annulla
            </Button>
            <Button variant="destructive" onClick={confermaEliminazione} data-testid="button-conferma-eliminazione">
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Conferma ripristino ---- */}
      <Dialog open={ripristinoAperto} onOpenChange={setRipristinoAperto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Ripristinare la struttura predefinita</DialogTitle>
            <DialogDescription>
              Aree, funzioni e attività tornano alla configurazione iniziale del porto. Le fonti software
              e i software importati non vengono toccati; le associazioni verso nodi non più
              esistenti vengono rimosse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRipristinoAperto(false)}>
              Annulla
            </Button>
            <Button
              data-testid="button-conferma-ripristino"
              onClick={() =>
                ripristina.mutate(
                  {},
                  {
                    onSuccess: () => {
                      toast({ title: 'Struttura predefinita ripristinata' });
                      setAreaSel(null);
                      setFunzioneSel(null);
                      setRipristinoAperto(false);
                    },
                  }
                )
              }
            >
              Ripristina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

/* ------------------------------ sottocomponenti ------------------------------ */

function Colonna({
  titolo,
  sottotitolo,
  icona: Icona,
  azione,
  testid,
  children,
}: {
  titolo: string;
  sottotitolo?: string;
  icona: typeof MapPin;
  azione?: React.ReactNode;
  testid: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-lg border border-border bg-card/40 flex flex-col min-h-[420px] min-w-0 overflow-hidden"
      data-testid={testid}
    >
      <header className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Icona className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold">{titolo}</h2>
        </div>
        {sottotitolo && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{sottotitolo}</p>
        )}
        {azione && <div className="mt-2.5">{azione}</div>}
      </header>
      <div className="p-2 space-y-1 overflow-auto scroll-sottile flex-1">{children}</div>
    </section>
  );
}

function Riga({
  titolo,
  dettaglio,
  attivo,
  testid,
  onClick,
  onSu,
  onGiu,
  onModifica,
  onElimina,
}: {
  titolo: string;
  dettaglio?: string;
  attivo?: boolean;
  testid: string;
  onClick?: () => void;
  onSu?: () => void;
  onGiu?: () => void;
  onModifica?: () => void;
  onElimina?: () => void;
}) {
  return (
    <div
      className={`rounded-md px-2.5 py-2 flex items-start gap-2 border ${
        attivo ? 'bg-accent/60 border-primary/50' : 'border-transparent hover:bg-accent/30'
      }`}
      data-testid={testid}
    >
      <button
        type="button"
        className="text-left min-w-0 flex-1"
        onClick={onClick}
        data-testid={`${testid}-apri`}
      >
        <div className="text-sm font-medium truncate">{titolo}</div>
        {dettaglio && <div className="etichetta text-muted-foreground mt-0.5 truncate">{dettaglio}</div>}
      </button>
      <div className="flex items-center gap-0.5 shrink-0">
        <IconaBottone titolo="Sposta su" disabilitato={!onSu} onClick={onSu} testid={`${testid}-su`}>
          <ChevronUp className="h-3.5 w-3.5" />
        </IconaBottone>
        <IconaBottone titolo="Sposta giù" disabilitato={!onGiu} onClick={onGiu} testid={`${testid}-giu`}>
          <ChevronDown className="h-3.5 w-3.5" />
        </IconaBottone>
        {onModifica && (
          <IconaBottone titolo="Modifica" onClick={onModifica} testid={`${testid}-modifica`}>
            <Pencil className="h-3.5 w-3.5" />
          </IconaBottone>
        )}
        {onElimina && (
          <IconaBottone titolo="Elimina" onClick={onElimina} testid={`${testid}-elimina`}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconaBottone>
        )}
      </div>
    </div>
  );
}

function RigaModificabile({
  nodo,
  dettaglio,
  attivo,
  testid,
  onClick,
  onRinomina,
  onSu,
  onGiu,
  onElimina,
}: {
  nodo: StrutturaFunzione | StrutturaAttivita;
  dettaglio?: string;
  attivo?: boolean;
  testid: string;
  onClick?: () => void;
  onRinomina: (nome: string) => void;
  onSu?: () => void;
  onGiu?: () => void;
  onElimina: () => void;
}) {
  const [modifica, setModifica] = useState(false);
  const [nome, setNome] = useState(nodo.nome);

  if (modifica) {
    return (
      <div className="rounded-md px-2.5 py-2 border border-primary/50 bg-accent/40 flex items-center gap-1.5">
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="h-8 text-sm"
          data-testid={`${testid}-campo`}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && nome.trim()) {
              onRinomina(nome.trim());
              setModifica(false);
            }
            if (e.key === 'Escape') setModifica(false);
          }}
        />
        <IconaBottone
          titolo="Salva"
          testid={`${testid}-salva`}
          onClick={() => {
            if (nome.trim()) onRinomina(nome.trim());
            setModifica(false);
          }}
        >
          <Check className="h-3.5 w-3.5" />
        </IconaBottone>
        <IconaBottone titolo="Annulla" testid={`${testid}-annulla`} onClick={() => setModifica(false)}>
          <X className="h-3.5 w-3.5" />
        </IconaBottone>
      </div>
    );
  }

  return (
    <Riga
      titolo={nodo.nome}
      dettaglio={dettaglio}
      attivo={attivo}
      testid={testid}
      onClick={onClick}
      onSu={onSu}
      onGiu={onGiu}
      onModifica={() => {
        setNome(nodo.nome);
        setModifica(true);
      }}
      onElimina={onElimina}
    />
  );
}

function IconaBottone({
  children,
  titolo,
  testid,
  onClick,
  disabilitato,
}: {
  children: React.ReactNode;
  titolo: string;
  testid: string;
  onClick?: () => void;
  disabilitato?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      title={titolo}
      aria-label={titolo}
      data-testid={testid}
      disabled={disabilitato}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function CampoNuovo({
  placeholder,
  testid,
  onConferma,
}: {
  placeholder: string;
  testid: string;
  onConferma: (nome: string) => void;
}) {
  const [nome, setNome] = useState('');
  function conferma() {
    if (!nome.trim()) return;
    onConferma(nome.trim());
    setNome('');
  }
  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
        data-testid={`input-${testid}`}
        onKeyDown={(e) => e.key === 'Enter' && conferma()}
      />
      <Button size="sm" variant="outline" className="h-8" data-testid={`button-${testid}`} onClick={conferma}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SchedaArea({
  valore,
  onChiudi,
  onCrea,
  onAggiorna,
}: {
  valore: StrutturaArea | 'nuova' | null;
  onChiudi: () => void;
  onCrea: (dati: any) => void;
  onAggiorna: (id: string, dati: any) => void;
}) {
  const nuova = valore === 'nuova';
  const area = nuova || !valore ? undefined : valore;
  const chiave = nuova ? 'nuova' : (area?.id ?? 'vuota');

  const [nome, setNome] = useState('');
  const [codice, setCodice] = useState('');
  const [categoria, setCategoria] = useState('terminal');
  const [descrizione, setDescrizione] = useState('');
  const [x, setX] = useState('40');
  const [y, setY] = useState('0');
  const [w, setW] = useState('300');
  const [h, setH] = useState('120');
  const [caricata, setCaricata] = useState('');

  // ricarica i campi quando cambia il nodo in scheda
  if (valore && caricata !== chiave) {
    setCaricata(chiave);
    setNome(area?.nome ?? '');
    setCodice(area?.codice ?? '');
    setCategoria(area?.categoria ?? 'terminal');
    setDescrizione(area?.descrizione ?? '');
    setX(String(area?.x ?? 40));
    setY(String(area?.y ?? 0));
    setW(String(area?.w ?? 300));
    setH(String(area?.h ?? 120));
  }

  const num = (v: string, d: number) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : d);

  function salva() {
    if (!nome.trim()) return;
    const dati: Record<string, any> = {
      nome: nome.trim(),
      codice: codice.trim() || undefined,
      categoria,
      descrizione: descrizione.trim(),
    };
    if (nuova) {
      onCrea(dati);
      return;
    }
    if (!area) return;
    onAggiorna(area.id, {
      ...dati,
      codice: codice.trim() || area.codice,
      x: num(x, area.x),
      y: num(y, area.y),
      w: num(w, area.w),
      h: num(h, area.h),
    });
  }

  return (
    <Dialog open={!!valore} onOpenChange={(o) => !o && onChiudi()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {nuova ? 'Nuova area fisica' : 'Modifica area fisica'}
          </DialogTitle>
          <DialogDescription>
            L'area è il primo livello della catena e compare come zona cliccabile sulla pianta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="area-nome">Nome</Label>
            <Input
              id="area-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              data-testid="input-area-nome"
              placeholder="Es. Terminal Container"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="area-codice">Codice</Label>
              <Input
                id="area-codice"
                value={codice}
                onChange={(e) => setCodice(e.target.value)}
                data-testid="input-area-codice"
                placeholder="Es. TCT"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger data-testid="select-area-categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIE_AREA.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="area-descrizione">Descrizione</Label>
            <Textarea
              id="area-descrizione"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              rows={2}
              data-testid="input-area-descrizione"
            />
          </div>

          {!nuova && (
            <div className="space-y-1.5">
              <Label>Posizione sulla pianta</Label>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ['X', x, setX, 'x'],
                    ['Y', y, setY, 'y'],
                    ['Largh.', w, setW, 'larghezza'],
                    ['Alt.', h, setH, 'altezza'],
                  ] as const
                ).map(([et, v, set, id]) => (
                  <div key={id} className="space-y-1">
                    <span className="etichetta text-muted-foreground">{et}</span>
                    <Input
                      value={v}
                      onChange={(e) => set(e.target.value)}
                      inputMode="numeric"
                      className="num h-9"
                      data-testid={`input-area-${id}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Coordinate della pianta, larghezza complessiva 1600. Impostare larghezza 0 per
                escludere l'area dal disegno mantenendola nell'albero.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onChiudi}>
            Annulla
          </Button>
          <Button onClick={salva} disabled={!nome.trim()} data-testid="button-salva-area">
            {nuova ? 'Aggiungi area' : 'Salva modifiche'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
