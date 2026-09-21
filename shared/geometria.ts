// Geometria predefinita delle zone sulla pianta del porto.
// Serve solo come punto di partenza: le posizioni sono conservate nel database
// e possono essere modificate dall'utente insieme alla struttura.

export type Geometria = {
  x: number;
  y: number;
  w: number;
  h: number;
  righe: string[];
  decoro?: string;
  /** 1 = l'area ha un disegno dedicato sulla pianta (navi, servizi nautici) */
  speciale?: boolean;
};

export const GEOMETRIA_PREDEFINITA: Record<string, Geometria> = {
  avamporto: { x: 40, y: 24, w: 1520, h: 104, righe: ['Avamporto e imboccatura'], decoro: 'mare' },
  'servizi-nautici': { x: 740, y: 240, w: 120, h: 60, righe: ['Servizi tecnico-nautici'], decoro: 'nautici', speciale: true },
  nave: { x: 90, y: 316, w: 1440, h: 80, righe: ['Navi in operazione'], decoro: 'nave', speciale: true },
  banchina: { x: 40, y: 418, w: 1520, h: 52, righe: ['Banchine e accosti'], decoro: 'banchina' },
  'terminal-container': { x: 40, y: 486, w: 520, h: 272, righe: ['Terminal', 'Container'], decoro: 'container' },
  'terminal-rinfuse': { x: 580, y: 486, w: 280, h: 152, righe: ['Terminal Rinfuse'], decoro: 'silos' },
  'terminal-roro': { x: 880, y: 486, w: 280, h: 152, righe: ['Terminal Ro-Ro', 'e Traghetti'], decoro: 'roro' },
  'terminal-passeggeri': { x: 1180, y: 486, w: 380, h: 152, righe: ['Terminal Passeggeri', 'e Crociere'], decoro: 'passeggeri' },
  deposito: { x: 580, y: 658, w: 280, h: 142, righe: ['Magazzini', 'e Depositi'], decoro: 'magazzino' },
  scanner: { x: 880, y: 658, w: 280, h: 142, righe: ['Scanner e controlli', 'non intrusivi'], decoro: 'scanner' },
  'area-doganale': { x: 1180, y: 658, w: 220, h: 142, righe: ['Area', 'Doganale'], decoro: 'dogana' },
  'torre-controllo': { x: 1410, y: 658, w: 150, h: 142, righe: ['Torre di', 'Controllo'], decoro: 'torre' },
  ferrovia: { x: 40, y: 778, w: 520, h: 100, righe: ['Area Ferroviaria'], decoro: 'ferrovia' },
  'truck-parking': { x: 40, y: 898, w: 560, h: 92, righe: ['Aree autotrasporto e servizi'], decoro: 'truck' },
  varchi: { x: 620, y: 800, w: 240, h: 190, righe: ['Varchi', 'e Gate'], decoro: 'varco' },
  security: { x: 880, y: 800, w: 280, h: 190, righe: ['Security', 'e Sorveglianza'], decoro: 'security' },
  sanita: { x: 1180, y: 820, w: 210, h: 170, righe: ['Controlli sanitari', 'e fitosanitari'], decoro: 'sanita' },
  ambiente: { x: 1410, y: 820, w: 150, h: 170, righe: ['Ambiente', 'Rifiuti', 'Bunker'], decoro: 'ambiente' },
};

/** Larghezza logica della pianta (viewBox). */
export const LARGHEZZA_PIANTA = 1600;
/** Altezza minima della pianta: cresce se l'utente aggiunge aree più in basso. */
export const ALTEZZA_MINIMA_PIANTA = 1010;
