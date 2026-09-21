import { useMemo, useState } from 'react';
import Shell, { Intestazione } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Network,
  ChevronRight,
  ChevronDown,
  MapPin,
  Layers,
  ListChecks,
  AppWindow,
  ExternalLink,
  Link2,
  Trash2,
  Search,
  X,
  Unplug,
} from 'lucide-react';
import { normalizza } from '@shared/taxonomy';
import { useStruttura } from '@/lib/struttura';
import type { Associazione, Software } from '@shared/schema';
import { etichettaFonte, urlNormalizzato, useRegistro } from '@/lib/dati';
import {
  DialogAssociaANodo,
  useEliminaAssociazione,
} from '@/components/associazioni';
import SchedaSoftware from '@/components/SchedaSoftware';

type Foglia = { software: Software; associazione: Associazione };

type NodoAttivita = { id: string; nome: string; software: Foglia[] };
type NodoFunzione = {
  id: string;
  nome: string;
  software: Foglia[];
  attivita: NodoAttivita[];
  /** attività previste dalla tassonomia, indipendenti dai filtri */
  nAttivita: number;
  totale: number;
};
type NodoArea = {
  id: string;
  nome: string;
  codice: string;
  software: Foglia[];
  funzioni: NodoFunzione[];
  /** funzioni previste dalla tassonomia, indipendenti dai filtri */
  nFunzioni: number;
  totale: number;
};

export default function PaginaAlbero() {
  const registro = useRegistro();
  const { aree } = useStruttura();
  const elimina = useEliminaAssociazione();
  const [aperti, setAperti] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');
  const [soloConSoftware, setSoloConSoftware] = useState(true);
  const [fonteFiltro, setFonteFiltro] = useState('__tutte__');
  const [scheda, setScheda] = useState<Software | null>(null);
  const [dialogNodo, setDialogNodo] = useState<
    { areaId: string; funzioneId?: string | null; attivitaId?: string | null } | null
  >(null);

  const termine = normalizza(q);

  const albero = useMemo<NodoArea[]>(() => {
    const swById: Record<number, Software> = {};
    for (const s of registro.software) swById[s.id] = s;

    const ammessa = (a: Associazione) => {
      const s = swById[a.softwareId];
      if (!s) return false;
      if (fonteFiltro !== '__tutte__' && String(s.fonteId) !== fonteFiltro) return false;
      return true;
    };
    const foglie = (filtro: (a: Associazione) => boolean): Foglia[] =>
      registro.associazioni
        .filter((a) => ammessa(a) && filtro(a))
        .map((a) => ({ software: swById[a.softwareId], associazione: a }))
        .sort((x, y) => x.software.nome.localeCompare(y.software.nome, 'it'));

    return aree.map((area) => {
      const funzioni: NodoFunzione[] = area.funzioni.map((f) => {
        const attivita: NodoAttivita[] = f.attivita.map((att) => ({
          id: att.id,
          nome: att.nome,
          software: foglie((a) => a.attivitaId === att.id),
        }));
        const swFunzione = foglie((a) => a.funzioneId === f.id && !a.attivitaId);
        return {
          id: f.id,
          nome: f.nome,
          software: swFunzione,
          attivita,
          nAttivita: f.attivita.length,
          totale: swFunzione.length + attivita.reduce((t, x) => t + x.software.length, 0),
        };
      });
      const swArea = foglie((a) => a.areaId === area.id && !a.funzioneId && !a.attivitaId);
      return {
        id: area.id,
        nome: area.nome,
        codice: area.codice,
        software: swArea,
        funzioni,
        nFunzioni: area.funzioni.length,
        totale: swArea.length + funzioni.reduce((t, f) => t + f.totale, 0),
      };
    });
  }, [aree, registro.software, registro.associazioni, fonteFiltro]);

  const combaciaFoglia = (f: Foglia) =>
    !termine ||
    normalizza(`${f.software.nome} ${f.software.descrizione ?? ''} ${f.software.categoria ?? ''}`).includes(
      termine
    );

  /** Filtra l'albero in base al testo cercato e al filtro sui rami vuoti. */
  const visibili = useMemo(() => {
    return albero
      .map((area) => {
        const areaCombacia = !termine || normalizza(`${area.nome} ${area.codice}`).includes(termine);
        const funzioni = area.funzioni
          .map((f) => {
            const fCombacia = areaCombacia || normalizza(f.nome).includes(termine);
            const attivita = f.attivita
              .map((att) => {
                const attCombacia = fCombacia || normalizza(att.nome).includes(termine);
                const software = attCombacia ? att.software : att.software.filter(combaciaFoglia);
                return { ...att, software, tieni: attCombacia || software.length > 0 };
              })
              .filter((att) => att.tieni && (!soloConSoftware || att.software.length > 0));
            const software = fCombacia ? f.software : f.software.filter(combaciaFoglia);
            const totale = software.length + attivita.reduce((t, x) => t + x.software.length, 0);
            return {
              ...f,
              software,
              attivita,
              totale,
              tieni: fCombacia || totale > 0,
            };
          })
          .filter((f) => f.tieni && (!soloConSoftware || f.totale > 0));
        const software = areaCombacia ? area.software : area.software.filter(combaciaFoglia);
        const totale = software.length + funzioni.reduce((t, f) => t + f.totale, 0);
        return { ...area, software, funzioni, totale, tieni: areaCombacia || totale > 0 };
      })
      .filter((area) => area.tieni && (!soloConSoftware || area.totale > 0));
  }, [albero, termine, soloConSoftware]);

  const nonClassificati = useMemo(
    () =>
      registro.software.filter(
        (s) =>
          !(registro.assPerSoftware[s.id] ?? []).length &&
          (fonteFiltro === '__tutte__' || String(s.fonteId) === fonteFiltro) &&
          (!termine || normalizza(`${s.nome} ${s.descrizione ?? ''}`).includes(termine))
      ),
    [registro.software, registro.assPerSoftware, fonteFiltro, termine]
  );

  const cercando = termine.length >= 2;
  const isAperto = (k: string) => (cercando ? aperti[k] !== false : !!aperti[k]);
  const commuta = (k: string) => setAperti((v) => ({ ...v, [k]: !isAperto(k) }));

  const espandiTutto = () => {
    const tutti: Record<string, boolean> = {};
    for (const area of albero) {
      tutti[area.id] = true;
      for (const f of area.funzioni) tutti[f.id] = true;
    }
    setAperti(tutti);
  };

  const nAssociazioniMostrate = visibili.reduce((t, a) => t + a.totale, 0);

  return (
    <Shell>
      <Intestazione
        titolo="Albero delle associazioni"
        sottotitolo="La catena porto - area - funzione - attività - software, con tutte le associazioni configurate."
        icona={Network}
      >
        <Badge variant="outline" className="num">
          {nAssociazioniMostrate} associazioni mostrate
        </Badge>
      </Intestazione>

      <div className="p-4 xl:p-5 space-y-4">
        <div className="rounded-lg border border-border bg-card/40 p-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtra per area, funzione, attività o software"
              className="pl-8 pr-8"
              data-testid="input-filtro-albero"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label="Azzera il filtro"
                data-testid="button-azzera-filtro-albero"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={fonteFiltro} onValueChange={setFonteFiltro}>
            <SelectTrigger className="w-[230px]" data-testid="select-fonte-albero">
              <SelectValue placeholder="Fonte: tutte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__tutte__">Fonte: tutte</SelectItem>
              {registro.fonti.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {etichettaFonte(f)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              id="solo-con-software"
              checked={soloConSoftware}
              onCheckedChange={setSoloConSoftware}
              data-testid="switch-solo-con-software"
            />
            <Label htmlFor="solo-con-software" className="text-sm text-muted-foreground">
              Solo rami con software
            </Label>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={espandiTutto} data-testid="button-espandi-tutto">
              Espandi tutto
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAperti({})}
              data-testid="button-comprimi-tutto"
            >
              Comprimi tutto
            </Button>
          </div>
        </div>

        {!registro.software.length ? (
          <div className="rounded-lg border border-border bg-card/40 p-6 text-sm text-muted-foreground">
            Nessun software configurato. Importare uno o più file Excel.
          </div>
        ) : !visibili.length && !nonClassificati.length ? (
          <div className="rounded-lg border border-border bg-card/40 p-6 text-sm text-muted-foreground">
            Nessun ramo corrisponde ai criteri impostati.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card/40 divide-y divide-border">
            {visibili.map((area) => {
              const apertaArea = isAperto(area.id);
              return (
                <div key={area.id}>
                  <RigaNodo
                    livello={0}
                    aperto={apertaArea}
                    espandibile={area.funzioni.length > 0 || area.software.length > 0}
                    onToggle={() => commuta(area.id)}
                    icona={MapPin}
                    titolo={area.nome}
                    sottotitolo={`${area.codice} · ${area.nFunzioni} funzioni`}
                    conteggio={area.totale}
                    onAssocia={() => setDialogNodo({ areaId: area.id })}
                    testid={`nodo-area-${area.id}`}
                  />
                  {apertaArea && (
                    <div>
                      {area.software.map((f) => (
                        <FogliaSoftware
                          key={`a-${f.associazione.id}`}
                          livello={1}
                          foglia={f}
                          onApri={setScheda}
                          onRimuovi={(id) => elimina.mutate(id)}
                          fonte={etichettaFonte(registro.fonteById[f.software.fonteId])}
                        />
                      ))}
                      {area.funzioni.map((f) => {
                        const apertaFunzione = isAperto(f.id);
                        return (
                          <div key={f.id}>
                            <RigaNodo
                              livello={1}
                              aperto={apertaFunzione}
                              espandibile={f.attivita.length > 0 || f.software.length > 0}
                              onToggle={() => commuta(f.id)}
                              icona={Layers}
                              titolo={f.nome}
                              sottotitolo={`${f.nAttivita} attività`}
                              conteggio={f.totale}
                              onAssocia={() => setDialogNodo({ areaId: area.id, funzioneId: f.id })}
                              testid={`nodo-funzione-${f.id}`}
                            />
                            {apertaFunzione && (
                              <div>
                                {f.software.map((x) => (
                                  <FogliaSoftware
                                    key={`f-${x.associazione.id}`}
                                    livello={2}
                                    foglia={x}
                                    onApri={setScheda}
                                    onRimuovi={(id) => elimina.mutate(id)}
                                    fonte={etichettaFonte(registro.fonteById[x.software.fonteId])}
                                  />
                                ))}
                                {f.attivita.map((att) => (
                                  <div key={att.id}>
                                    <RigaNodo
                                      livello={2}
                                      aperto
                                      espandibile={false}
                                      onToggle={() => {}}
                                      icona={ListChecks}
                                      titolo={att.nome}
                                      conteggio={att.software.length}
                                      onAssocia={() =>
                                        setDialogNodo({
                                          areaId: area.id,
                                          funzioneId: f.id,
                                          attivitaId: att.id,
                                        })
                                      }
                                      testid={`nodo-attivita-${att.id}`}
                                    />
                                    {att.software.map((x) => (
                                      <FogliaSoftware
                                        key={`t-${x.associazione.id}`}
                                        livello={3}
                                        foglia={x}
                                        onApri={setScheda}
                                        onRimuovi={(id) => elimina.mutate(id)}
                                        fonte={etichettaFonte(registro.fonteById[x.software.fonteId])}
                                      />
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {nonClassificati.length > 0 && (
          <div className="rounded-lg border border-border bg-card/40">
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border">
              <Unplug className="h-4 w-4 text-[hsl(38_90%_58%)]" />
              <span className="text-sm font-medium">Software fuori dall'albero</span>
              <Badge variant="outline" className="num">
                {nonClassificati.length}
              </Badge>
              <span className="etichetta text-muted-foreground ml-auto hidden sm:inline">
                nessuna associazione configurata
              </span>
            </div>
            {nonClassificati.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 px-3 py-2 border-b border-border/60 last:border-b-0"
                data-testid={`nodo-orfano-${s.id}`}
              >
                <AppWindow className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <button
                  className="text-sm text-left truncate hover:text-primary transition-colors min-w-0"
                  onClick={() => setScheda(s)}
                  data-testid={`button-scheda-orfano-${s.id}`}
                >
                  {s.nome}
                </button>
                <span className="etichetta text-muted-foreground truncate hidden md:inline">
                  {etichettaFonte(registro.fonteById[s.fonteId])}
                  {s.foglio ? ` · ${s.foglio}` : ''}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 shrink-0"
                  onClick={() => setScheda(s)}
                  data-testid={`button-associa-orfano-${s.id}`}
                >
                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                  Associa
                </Button>
              </div>
            ))}
          </div>
        )}
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

const RIENTRO = ['pl-3', 'pl-8', 'pl-[52px]', 'pl-[76px]'];

function RigaNodo({
  livello,
  aperto,
  espandibile,
  onToggle,
  icona: Icona,
  titolo,
  sottotitolo,
  conteggio,
  onAssocia,
  testid,
}: {
  livello: number;
  aperto: boolean;
  espandibile: boolean;
  onToggle: () => void;
  icona: typeof MapPin;
  titolo: string;
  sottotitolo?: string;
  conteggio: number;
  onAssocia: () => void;
  testid: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 py-2 pr-3 hover:bg-secondary/40 transition-colors ${RIENTRO[livello]}`}
      data-testid={testid}
    >
      {espandibile ? (
        <button
          type="button"
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label={aperto ? 'Comprimi' : 'Espandi'}
          data-testid={`${testid}-toggle`}
        >
          {aperto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <Icona className={`h-4 w-4 shrink-0 ${livello === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
      <button
        type="button"
        onClick={espandibile ? onToggle : undefined}
        className="min-w-0 text-left flex-1"
      >
        <span className={`block truncate ${livello === 0 ? 'text-sm font-medium' : 'text-sm'}`}>
          {titolo}
        </span>
        {sottotitolo && <span className="block etichetta text-muted-foreground truncate">{sottotitolo}</span>}
      </button>
      <span className={`num text-xs shrink-0 ${conteggio ? 'text-primary' : 'text-muted-foreground'}`}>
        {conteggio}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        title="Associa software a questo nodo"
        onClick={onAssocia}
        data-testid={`${testid}-associa`}
      >
        <Link2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function FogliaSoftware({
  livello,
  foglia,
  fonte,
  onApri,
  onRimuovi,
}: {
  livello: number;
  foglia: Foglia;
  fonte: string;
  onApri: (s: Software) => void;
  onRimuovi: (id: number) => void;
}) {
  const s = foglia.software;
  return (
    <div
      className={`flex items-center gap-2 py-1.5 pr-3 border-l-2 border-primary/25 ml-3 hover:bg-secondary/30 transition-colors ${RIENTRO[Math.min(livello, 3)]}`}
      data-testid={`foglia-software-${foglia.associazione.id}`}
    >
      <AppWindow className="h-3.5 w-3.5 text-primary shrink-0" />
      <button
        type="button"
        onClick={() => onApri(s)}
        className="text-sm truncate hover:text-primary transition-colors min-w-0 text-left"
        data-testid={`button-foglia-scheda-${s.id}`}
      >
        {s.nome}
      </button>
      {foglia.associazione.origine === 'automatica' && (
        <span className="etichetta text-muted-foreground shrink-0">auto</span>
      )}
      <span className="etichetta text-muted-foreground truncate hidden lg:inline ml-1">{fonte}</span>
      <div className="ml-auto flex items-center gap-1 shrink-0">
        {s.url && (
          <a
            href={urlNormalizzato(s.url)}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-primary p-1"
            title="Apri lo strumento"
            data-testid={`link-foglia-${s.id}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          title="Rimuovi questa associazione"
          onClick={() => onRimuovi(foglia.associazione.id)}
          data-testid={`button-rimuovi-foglia-${foglia.associazione.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
