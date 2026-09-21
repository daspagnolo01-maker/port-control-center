// Tassonomia fisico-funzionale del porto commerciale.
// PORTO -> AREA FISICA -> FUNZIONE -> ATTIVITA'
// I software NON sono definiti qui: vengono importati dall'utente tramite file Excel
// e associati dinamicamente a queste chiavi.

export type Attivita = {
  id: string;
  nome: string;
  descrizione?: string;
};

export type Funzione = {
  id: string;
  nome: string;
  descrizione?: string;
  attivita: Attivita[];
};

export type Area = {
  id: string;
  nome: string;
  codice: string;
  categoria: 'mare' | 'banchina' | 'terminal' | 'controllo' | 'intermodale' | 'servizi';
  descrizione: string;
  funzioni: Funzione[];
};

const A = (id: string, nome: string, descrizione?: string): Attivita => ({ id, nome, descrizione });

export const AREE: Area[] = [
  {
    id: 'avamporto',
    nome: 'Avamporto e Imboccatura',
    codice: 'AVP',
    categoria: 'mare',
    descrizione:
      'Specchio acqueo esterno, diga foranea, imboccatura portuale e rada di attesa delle navi.',
    funzioni: [
      {
        id: 'avamporto.traffico',
        nome: 'Gestione del traffico marittimo',
        descrizione: 'Monitoraggio e regolazione dei movimenti nave in avvicinamento.',
        attivita: [
          A('avamporto.traffico.monitoraggio', 'Monitoraggio AIS e radar'),
          A('avamporto.traffico.rada', 'Assegnazione posizione in rada'),
          A('avamporto.traffico.sequenza', 'Sequenziamento ingressi e uscite'),
          A('avamporto.traffico.meteo', 'Valutazione condizioni meteo-marine'),
        ],
      },
      {
        id: 'avamporto.arrivi',
        nome: 'Notifiche di arrivo e formalità',
        descrizione: 'Preavvisi, notifiche ETA e formalità di ingresso.',
        attivita: [
          A('avamporto.arrivi.eta', 'Registrazione ETA / ETD'),
          A('avamporto.arrivi.preavviso', 'Preavviso di arrivo e pre-clearance'),
          A('avamporto.arrivi.manifesti', 'Trasmissione manifesti di arrivo'),
        ],
      },
    ],
  },
  {
    id: 'servizi-nautici',
    nome: 'Servizi Tecnico-Nautici',
    codice: 'STN',
    categoria: 'servizi',
    descrizione: 'Piloti, rimorchiatori e ormeggiatori: assistenza alla manovra nave.',
    funzioni: [
      {
        id: 'servizi-nautici.pilotaggio',
        nome: 'Pilotaggio',
        attivita: [
          A('servizi-nautici.pilotaggio.richiesta', 'Richiesta e assegnazione pilota'),
          A('servizi-nautici.pilotaggio.manovra', 'Pianificazione della manovra'),
          A('servizi-nautici.pilotaggio.consuntivo', 'Consuntivo e tariffazione servizio'),
        ],
      },
      {
        id: 'servizi-nautici.rimorchio',
        nome: 'Rimorchio e ormeggio',
        attivita: [
          A('servizi-nautici.rimorchio.assegnazione', 'Assegnazione rimorchiatori'),
          A('servizi-nautici.rimorchio.ormeggio', 'Servizio di ormeggio e disormeggio'),
          A('servizi-nautici.rimorchio.emergenza', 'Interventi di emergenza e antincendio'),
        ],
      },
    ],
  },
  {
    id: 'banchina',
    nome: 'Banchine e Accosti',
    codice: 'BNC',
    categoria: 'banchina',
    descrizione: 'Linea di banchina, bitte, parabordi, posti di accosto e servizi a nave ormeggiata.',
    funzioni: [
      {
        id: 'banchina.accosti',
        nome: 'Pianificazione accosti (berth planning)',
        attivita: [
          A('banchina.accosti.assegnazione', 'Assegnazione posto di accosto'),
          A('banchina.accosti.finestre', 'Gestione finestre di ormeggio'),
          A('banchina.accosti.conflitti', 'Risoluzione conflitti di banchina'),
          A('banchina.accosti.occupazione', 'Occupazione e produttività banchina'),
        ],
      },
      {
        id: 'banchina.operazioni',
        nome: 'Operazioni nave',
        attivita: [
          A('banchina.operazioni.piano', 'Piano di carico e scarico'),
          A('banchina.operazioni.gru', 'Assegnazione gru e squadre'),
          A('banchina.operazioni.avanzamento', 'Avanzamento operazioni in tempo reale'),
          A('banchina.operazioni.chiusura', 'Chiusura operazioni e time sheet'),
        ],
      },
      {
        id: 'banchina.servizi-nave',
        nome: 'Servizi alla nave ormeggiata',
        attivita: [
          A('banchina.servizi-nave.acqua', 'Fornitura acqua e utilities'),
          A('banchina.servizi-nave.cold-ironing', 'Alimentazione elettrica da terra'),
          A('banchina.servizi-nave.rifiuti', 'Conferimento rifiuti e residui'),
        ],
      },
    ],
  },
  {
    id: 'nave',
    nome: 'Nave in Operazione',
    codice: 'NAV',
    categoria: 'banchina',
    descrizione: 'Unità navale ormeggiata: documentazione, equipaggio, carico e controlli di bordo.',
    funzioni: [
      {
        id: 'nave.documentale',
        nome: 'Documentazione nave',
        attivita: [
          A('nave.documentale.certificati', 'Verifica certificati e classe'),
          A('nave.documentale.equipaggio', 'Liste equipaggio e passeggeri'),
          A('nave.documentale.dichiarazioni', 'Dichiarazioni sanitarie e di sicurezza'),
          A('nave.documentale.port-clearance', 'Rilascio spedizione / clearance'),
        ],
      },
      {
        id: 'nave.carico',
        nome: 'Gestione del carico di bordo',
        attivita: [
          A('nave.carico.stowage', 'Stowage plan e stabilità'),
          A('nave.carico.bayplan', 'Scambio bay plan / messaggistica'),
          A('nave.carico.imdg', 'Merci pericolose a bordo'),
          A('nave.carico.reefer', 'Monitoraggio unità reefer'),
        ],
      },
      {
        id: 'nave.ispezioni',
        nome: 'Ispezioni e controlli a bordo',
        attivita: [
          A('nave.ispezioni.psc', 'Port State Control'),
          A('nave.ispezioni.security', 'Verifiche ISPS di bordo'),
          A('nave.ispezioni.guardia', 'Visite guardia costiera e autorità'),
        ],
      },
    ],
  },
  {
    id: 'terminal-container',
    nome: 'Terminal Container',
    codice: 'TCT',
    categoria: 'terminal',
    descrizione: 'Terminal per traffico contenitori: banchina, gru di piazzale, yard e officina.',
    funzioni: [
      {
        id: 'terminal-container.tos',
        nome: 'Gestione operativa terminal',
        attivita: [
          A('terminal-container.tos.movimentazione', 'Movimentazione container'),
          A('terminal-container.tos.mezzi', 'Assegnazione mezzi di piazzale'),
          A('terminal-container.tos.turni', 'Pianificazione turni e squadre'),
          A('terminal-container.tos.kpi', 'KPI di produttività terminal'),
        ],
      },
      {
        id: 'terminal-container.yard',
        nome: 'Gestione piazzale (yard)',
        attivita: [
          A('terminal-container.yard.allocazione', 'Allocazione posizioni di stiva a terra'),
          A('terminal-container.yard.inventario', 'Inventario e riconciliazione piazzale'),
          A('terminal-container.yard.rimaneggi', 'Rimaneggi e housekeeping'),
          A('terminal-container.yard.sosta', 'Calcolo sosta e demurrage'),
        ],
      },
      {
        id: 'terminal-container.container',
        nome: 'Ciclo di vita del container',
        attivita: [
          A('terminal-container.container.identificazione', 'Identificazione e OCR sigla container'),
          A('terminal-container.container.stato', 'Stato, danni e survey'),
          A('terminal-container.container.svuotamento', 'Svuotamento e riempimento'),
          A('terminal-container.container.consegna', 'Consegna e ritiro unità'),
        ],
      },
    ],
  },
  {
    id: 'terminal-rinfuse',
    nome: 'Terminal Rinfuse',
    codice: 'TRF',
    categoria: 'terminal',
    descrizione: 'Sili, nastri trasportatori e cumuli per rinfuse solide e liquide.',
    funzioni: [
      {
        id: 'terminal-rinfuse.movimentazione',
        nome: 'Movimentazione rinfuse',
        attivita: [
          A('terminal-rinfuse.movimentazione.pesatura', 'Pesatura e misurazione quantità'),
          A('terminal-rinfuse.movimentazione.nastri', 'Gestione nastri e impianti'),
          A('terminal-rinfuse.movimentazione.stoccaggio', 'Stoccaggio in silo e cumulo'),
        ],
      },
      {
        id: 'terminal-rinfuse.qualita',
        nome: 'Qualità e sicurezza del prodotto',
        attivita: [
          A('terminal-rinfuse.qualita.campionamento', 'Campionamento e analisi'),
          A('terminal-rinfuse.qualita.polveri', 'Controllo polveri ed emissioni'),
          A('terminal-rinfuse.qualita.atex', 'Gestione rischi ATEX e infiammabili'),
        ],
      },
    ],
  },
  {
    id: 'terminal-roro',
    nome: 'Terminal Ro-Ro e Traghetti',
    codice: 'TRR',
    categoria: 'terminal',
    descrizione: 'Rampe, piazzali di imbarco, semirimorchi e traffico rotabile.',
    funzioni: [
      {
        id: 'terminal-roro.imbarco',
        nome: 'Imbarco e sbarco rotabili',
        attivita: [
          A('terminal-roro.imbarco.prenotazione', 'Prenotazioni e booking rotabili'),
          A('terminal-roro.imbarco.checkin', 'Check-in mezzi e autisti'),
          A('terminal-roro.imbarco.sequenza', 'Sequenza di imbarco e rampa'),
          A('terminal-roro.imbarco.piazzale', 'Gestione piazzale di attesa'),
        ],
      },
      {
        id: 'terminal-roro.unita',
        nome: 'Tracciamento unità di carico',
        attivita: [
          A('terminal-roro.unita.tracciamento', 'Tracciamento semirimorchi e trailer'),
          A('terminal-roro.unita.adr', 'Unità con merci pericolose ADR'),
          A('terminal-roro.unita.danni', 'Rilevazione danni e verbali'),
        ],
      },
    ],
  },
  {
    id: 'terminal-passeggeri',
    nome: 'Terminal Passeggeri e Crociere',
    codice: 'TPX',
    categoria: 'terminal',
    descrizione: 'Stazione marittima, gate passeggeri, bagagli e flussi crocieristici.',
    funzioni: [
      {
        id: 'terminal-passeggeri.flussi',
        nome: 'Gestione flussi passeggeri',
        attivita: [
          A('terminal-passeggeri.flussi.imbarco', 'Imbarco e sbarco passeggeri'),
          A('terminal-passeggeri.flussi.liste', 'Liste passeggeri e manifesti'),
          A('terminal-passeggeri.flussi.bagagli', 'Gestione e controllo bagagli'),
          A('terminal-passeggeri.flussi.accoglienza', 'Accoglienza e informazioni'),
        ],
      },
      {
        id: 'terminal-passeggeri.frontiera',
        nome: 'Controlli di frontiera passeggeri',
        attivita: [
          A('terminal-passeggeri.frontiera.documenti', 'Controllo documenti di viaggio'),
          A('terminal-passeggeri.frontiera.pnr', 'Trasmissione dati passeggeri'),
          A('terminal-passeggeri.frontiera.sanitari', 'Controlli sanitari passeggeri'),
        ],
      },
    ],
  },
  {
    id: 'area-doganale',
    nome: 'Area Doganale',
    codice: 'DOG',
    categoria: 'controllo',
    descrizione: 'Uffici e aree di controllo doganale, sdoganamento e vigilanza fiscale.',
    funzioni: [
      {
        id: 'area-doganale.documentale',
        nome: 'Controllo documentale',
        attivita: [
          A('area-doganale.documentale.dichiarazioni', 'Dichiarazioni di import ed export'),
          A('area-doganale.documentale.manifesti', 'Manifesti merci e MMA/MMP'),
          A('area-doganale.documentale.origine', 'Verifica origine e classificazione'),
          A('area-doganale.documentale.svincolo', 'Svincolo e autorizzazione a procedere'),
        ],
      },
      {
        id: 'area-doganale.fisico',
        nome: 'Controllo fisico della merce',
        attivita: [
          A('area-doganale.fisico.selezione', 'Selezione per canale di controllo'),
          A('area-doganale.fisico.visita', 'Visita merce e verbalizzazione'),
          A('area-doganale.fisico.campioni', 'Prelievo campioni e analisi'),
          A('area-doganale.fisico.sigilli', 'Apposizione e verifica sigilli'),
        ],
      },
      {
        id: 'area-doganale.transito',
        nome: 'Transito e regimi speciali',
        attivita: [
          A('area-doganale.transito.t1', 'Gestione transiti e garanzie'),
          A('area-doganale.transito.temporanea', 'Importazione temporanea e perfezionamento'),
          A('area-doganale.transito.accise', 'Accise e prodotti sottoposti a vincolo'),
        ],
      },
    ],
  },
  {
    id: 'scanner',
    nome: 'Area Scanner e Controlli Non Intrusivi',
    codice: 'SCN',
    categoria: 'controllo',
    descrizione: 'Portali radiogeni, scanner container, portali radiometrici e sale di analisi immagini.',
    funzioni: [
      {
        id: 'scanner.programmazione',
        nome: 'Programmazione dei controlli',
        attivita: [
          A('scanner.programmazione.coda', 'Coda e convocazione unità'),
          A('scanner.programmazione.slot', 'Assegnazione slot di scansione'),
          A('scanner.programmazione.priorita', 'Gestione priorità e urgenze'),
        ],
      },
      {
        id: 'scanner.analisi',
        nome: 'Analisi immagini e anomalie',
        attivita: [
          A('scanner.analisi.immagini', 'Acquisizione e archiviazione immagini'),
          A('scanner.analisi.refertazione', 'Refertazione esito scansione'),
          A('scanner.analisi.radiometrico', 'Allarmi portale radiometrico'),
          A('scanner.analisi.escalation', 'Escalation verso controllo fisico'),
        ],
      },
    ],
  },
  {
    id: 'varchi',
    nome: 'Varchi e Gate',
    codice: 'VRC',
    categoria: 'controllo',
    descrizione: 'Accessi carrabili e pedonali, controllo veicoli, persone e titoli di accesso.',
    funzioni: [
      {
        id: 'varchi.accessi',
        nome: 'Controllo accessi',
        attivita: [
          A('varchi.accessi.badge', 'Rilascio e gestione titoli di accesso'),
          A('varchi.accessi.varco-in', 'Transito in ingresso'),
          A('varchi.accessi.varco-out', 'Transito in uscita'),
          A('varchi.accessi.visitatori', 'Registrazione visitatori e fornitori'),
        ],
      },
      {
        id: 'varchi.veicoli',
        nome: 'Gestione veicoli e autotrasporto',
        attivita: [
          A('varchi.veicoli.lettura-targhe', 'Lettura targhe e riconoscimento veicolo'),
          A('varchi.veicoli.pesatura', 'Pesatura mezzi e pesa pubblica'),
          A('varchi.veicoli.booking', 'Prenotazione slot di ritiro e consegna'),
          A('varchi.veicoli.documenti', 'Verifica documenti di trasporto'),
        ],
      },
    ],
  },
  {
    id: 'deposito',
    nome: 'Magazzini e Depositi',
    codice: 'MGZ',
    categoria: 'terminal',
    descrizione: 'Magazzini generali, depositi doganali, aree temperatura controllata e merci speciali.',
    funzioni: [
      {
        id: 'deposito.giacenze',
        nome: 'Gestione giacenze',
        attivita: [
          A('deposito.giacenze.ingressi', 'Registrazione ingressi merce'),
          A('deposito.giacenze.ubicazioni', 'Ubicazioni e mappa magazzino'),
          A('deposito.giacenze.inventario', 'Inventario e rettifiche'),
          A('deposito.giacenze.uscite', 'Prelievi e uscite merce'),
        ],
      },
      {
        id: 'deposito.doganale',
        nome: 'Deposito doganale e vincoli',
        attivita: [
          A('deposito.doganale.registri', 'Registri di carico e scarico doganali'),
          A('deposito.doganale.merci-vincolate', 'Merci vincolate e sotto sequestro'),
          A('deposito.doganale.imdg', 'Stoccaggio merci pericolose'),
        ],
      },
    ],
  },
  {
    id: 'ferrovia',
    nome: 'Area Ferroviaria',
    codice: 'FER',
    categoria: 'intermodale',
    descrizione: 'Fascio di binari, terminal intermodale, gru a portale e composizione treni.',
    funzioni: [
      {
        id: 'ferrovia.treni',
        nome: 'Gestione treni e manovra',
        attivita: [
          A('ferrovia.treni.programma', 'Programmazione arrivi e partenze treni'),
          A('ferrovia.treni.manovra', 'Manovra e composizione convogli'),
          A('ferrovia.treni.binari', 'Occupazione binari e fasci'),
        ],
      },
      {
        id: 'ferrovia.intermodale',
        nome: 'Trasbordo intermodale',
        attivita: [
          A('ferrovia.intermodale.carico', 'Carico e scarico carri'),
          A('ferrovia.intermodale.lista', 'Lista di carico e pesi assiali'),
          A('ferrovia.intermodale.tracciamento', 'Tracciamento unità intermodali'),
        ],
      },
    ],
  },
  {
    id: 'torre-controllo',
    nome: 'Torre di Controllo e Sala Operativa',
    codice: 'TRC',
    categoria: 'controllo',
    descrizione: 'Sala operativa portuale, VTS, coordinamento e quadro di sintesi generale.',
    funzioni: [
      {
        id: 'torre-controllo.coordinamento',
        nome: 'Coordinamento operativo',
        attivita: [
          A('torre-controllo.coordinamento.quadro', 'Quadro sinottico del porto'),
          A('torre-controllo.coordinamento.eventi', 'Registro eventi e turni'),
          A('torre-controllo.coordinamento.comunicazioni', 'Comunicazioni radio e allerte'),
        ],
      },
      {
        id: 'torre-controllo.dati',
        nome: 'Dati e reportistica',
        attivita: [
          A('torre-controllo.dati.statistiche', 'Statistiche di traffico'),
          A('torre-controllo.dati.report', 'Reportistica direzionale'),
          A('torre-controllo.dati.interoperabilita', 'Interoperabilità e scambio dati'),
        ],
      },
    ],
  },
  {
    id: 'security',
    nome: 'Security e Sorveglianza',
    codice: 'SEC',
    categoria: 'controllo',
    descrizione: 'Perimetro, videosorveglianza, ISPS, port facility security e gestione emergenze.',
    funzioni: [
      {
        id: 'security.isps',
        nome: 'Port facility security (ISPS)',
        attivita: [
          A('security.isps.livelli', 'Gestione livelli di security'),
          A('security.isps.piani', 'Piani di security e revisioni'),
          A('security.isps.esercitazioni', 'Esercitazioni e addestramento'),
          A('security.isps.incidenti', 'Segnalazione incidenti di security'),
        ],
      },
      {
        id: 'security.sorveglianza',
        nome: 'Videosorveglianza e perimetro',
        attivita: [
          A('security.sorveglianza.tvcc', 'Monitoraggio TVCC'),
          A('security.sorveglianza.allarmi', 'Gestione allarmi perimetrali'),
          A('security.sorveglianza.pattugliamento', 'Pattugliamento e ronde'),
        ],
      },
      {
        id: 'security.emergenze',
        nome: 'Emergenze e safety',
        attivita: [
          A('security.emergenze.piano', 'Piano di emergenza portuale'),
          A('security.emergenze.antincendio', 'Antincendio e squadre'),
          A('security.emergenze.evacuazione', 'Evacuazione e punti di raccolta'),
          A('security.emergenze.infortuni', 'Infortuni e near miss'),
        ],
      },
    ],
  },
  {
    id: 'sanita',
    nome: 'Controlli Sanitari e Fitosanitari',
    codice: 'SAN',
    categoria: 'controllo',
    descrizione: 'Posti di controllo frontaliero, veterinaria, fitosanitario e sanità marittima.',
    funzioni: [
      {
        id: 'sanita.controlli',
        nome: 'Controlli su merci e alimenti',
        attivita: [
          A('sanita.controlli.notifiche', 'Notifiche preventive di partita'),
          A('sanita.controlli.ispezione', 'Ispezione veterinaria e fitosanitaria'),
          A('sanita.controlli.laboratorio', 'Invio campioni al laboratorio'),
          A('sanita.controlli.esiti', 'Esiti, respingimenti e nulla osta'),
        ],
      },
      {
        id: 'sanita.marittima',
        nome: 'Sanità marittima',
        attivita: [
          A('sanita.marittima.libera-pratica', 'Libera pratica sanitaria'),
          A('sanita.marittima.disinfestazione', 'Disinfestazione e derattizzazione'),
          A('sanita.marittima.emergenze', 'Emergenze sanitarie a bordo'),
        ],
      },
    ],
  },
  {
    id: 'ambiente',
    nome: 'Ambiente, Rifiuti e Bunkeraggio',
    codice: 'AMB',
    categoria: 'servizi',
    descrizione: 'Impianti di raccolta rifiuti, bunkeraggio carburanti, monitoraggio emissioni e acque.',
    funzioni: [
      {
        id: 'ambiente.rifiuti',
        nome: 'Gestione rifiuti portuali',
        attivita: [
          A('ambiente.rifiuti.conferimento', 'Conferimento rifiuti da nave'),
          A('ambiente.rifiuti.formulari', 'Formulari e tracciabilità'),
          A('ambiente.rifiuti.smaltimento', 'Smaltimento e recupero'),
        ],
      },
      {
        id: 'ambiente.bunkeraggio',
        nome: 'Bunkeraggio e carburanti',
        attivita: [
          A('ambiente.bunkeraggio.autorizzazioni', 'Autorizzazioni operazione di bunkeraggio'),
          A('ambiente.bunkeraggio.misure', 'Misurazioni e bunker delivery note'),
          A('ambiente.bunkeraggio.sicurezza', 'Misure di sicurezza e antinquinamento'),
        ],
      },
      {
        id: 'ambiente.monitoraggio',
        nome: 'Monitoraggio ambientale',
        attivita: [
          A('ambiente.monitoraggio.aria', 'Qualità dell aria e emissioni'),
          A('ambiente.monitoraggio.acque', 'Qualità delle acque e sversamenti'),
          A('ambiente.monitoraggio.rumore', 'Rumore e vibrazioni'),
        ],
      },
    ],
  },
  {
    id: 'truck-parking',
    nome: 'Aree Autotrasporto e Servizi',
    codice: 'TRK',
    categoria: 'intermodale',
    descrizione: 'Parcheggio mezzi pesanti, officine, uffici spedizionieri e servizi agli operatori.',
    funzioni: [
      {
        id: 'truck-parking.sosta',
        nome: 'Sosta e flussi mezzi pesanti',
        attivita: [
          A('truck-parking.sosta.prenotazione', 'Prenotazione stalli'),
          A('truck-parking.sosta.chiamata', 'Chiamata mezzi al varco'),
          A('truck-parking.sosta.tempi', 'Tempi di attesa e turnaround'),
        ],
      },
      {
        id: 'truck-parking.operatori',
        nome: 'Servizi a spedizionieri e operatori',
        attivita: [
          A('truck-parking.operatori.pratiche', 'Pratiche di spedizione'),
          A('truck-parking.operatori.fatturazione', 'Fatturazione servizi portuali'),
          A('truck-parking.operatori.assistenza', 'Assistenza e sportello operatori'),
        ],
      },
    ],
  },
];

// ---- Indici di utilità ----

export type NodoFunzione = { area: Area; funzione: Funzione };
export type NodoAttivita = { area: Area; funzione: Funzione; attivita: Attivita };

export const AREE_BY_ID: Record<string, Area> = Object.fromEntries(AREE.map((a) => [a.id, a]));

export const FUNZIONI_INDEX: Record<string, NodoFunzione> = {};
export const ATTIVITA_INDEX: Record<string, NodoAttivita> = {};

for (const area of AREE) {
  for (const funzione of area.funzioni) {
    FUNZIONI_INDEX[funzione.id] = { area, funzione };
    for (const attivita of funzione.attivita) {
      ATTIVITA_INDEX[attivita.id] = { area, funzione, attivita };
    }
  }
}

export const TOTALE_FUNZIONI = Object.keys(FUNZIONI_INDEX).length;
export const TOTALE_ATTIVITA = Object.keys(ATTIVITA_INDEX).length;

// Normalizzazione testo per il matching automatico dei valori importati da Excel.
export function normalizza(testo: string): string {
  return (testo || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Tenta di riconoscere un'area portuale da un testo libero (colonna "Area" dell'Excel). */
export function suggerisciArea(testo?: string | null): Area | undefined {
  const t = normalizza(testo || '');
  if (!t) return undefined;
  let best: { area: Area; score: number } | undefined;
  for (const area of AREE) {
    const candidati = [area.nome, area.codice, area.id.replace(/-/g, ' ')];
    for (const c of candidati) {
      const n = normalizza(c);
      if (!n) continue;
      let score = 0;
      if (n === t) score = 100;
      else if (t.includes(n) || n.includes(t)) score = 60 + Math.min(n.length, t.length);
      else {
        const paroleT = new Set(t.split(' ').filter((w) => w.length > 3));
        const paroleN = n.split(' ').filter((w) => w.length > 3);
        const comuni = paroleN.filter((w) => paroleT.has(w)).length;
        if (comuni) score = 20 * comuni;
      }
      if (score > 0 && (!best || score > best.score)) best = { area, score };
    }
  }
  return best && best.score >= 20 ? best.area : undefined;
}

/** Tenta di riconoscere una funzione portuale da un testo libero, eventualmente entro un'area. */
export function suggerisciFunzione(testo?: string | null, areaId?: string | null): Funzione | undefined {
  const t = normalizza(testo || '');
  if (!t) return undefined;
  const pool = areaId && AREE_BY_ID[areaId] ? AREE_BY_ID[areaId].funzioni : AREE.flatMap((a) => a.funzioni);
  let best: { f: Funzione; score: number } | undefined;
  for (const f of pool) {
    const n = normalizza(f.nome);
    let score = 0;
    if (n === t) score = 100;
    else if (t.includes(n) || n.includes(t)) score = 60;
    else {
      const paroleT = new Set(t.split(' ').filter((w) => w.length > 3));
      const comuni = n.split(' ').filter((w) => w.length > 3 && paroleT.has(w)).length;
      if (comuni) score = 25 * comuni;
    }
    if (score > 0 && (!best || score > best.score)) best = { f, score };
  }
  return best && best.score >= 25 ? best.f : undefined;
}

/** Tenta di riconoscere un'attività da un testo libero, eventualmente entro una funzione. */
export function suggerisciAttivita(testo?: string | null, funzioneId?: string | null): Attivita | undefined {
  const t = normalizza(testo || '');
  if (!t) return undefined;
  const pool = funzioneId && FUNZIONI_INDEX[funzioneId]
    ? FUNZIONI_INDEX[funzioneId].funzione.attivita
    : AREE.flatMap((a) => a.funzioni.flatMap((f) => f.attivita));
  let best: { a: Attivita; score: number } | undefined;
  for (const a of pool) {
    const n = normalizza(a.nome);
    let score = 0;
    if (n === t) score = 100;
    else if (t.includes(n) || n.includes(t)) score = 60;
    else {
      const paroleT = new Set(t.split(' ').filter((w) => w.length > 3));
      const comuni = n.split(' ').filter((w) => w.length > 3 && paroleT.has(w)).length;
      if (comuni) score = 25 * comuni;
    }
    if (score > 0 && (!best || score > best.score)) best = { a, score };
  }
  return best && best.score >= 25 ? best.a : undefined;
}
