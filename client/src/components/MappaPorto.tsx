import { useMemo, useState } from 'react';
import { CATEGORIE_AREA } from '@shared/schema';
import { useStruttura, type StrutturaArea } from '@/lib/struttura';
import { ALTEZZA_MINIMA_PIANTA, LARGHEZZA_PIANTA } from '@shared/geometria';

export type Zona = {
  areaId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  righe: string[];
  decoro?: string | null;
};

/** Spezza un nome lungo in più righe, per le aree aggiunte dall'utente. */
function righeDaNome(nome: string, larghezza: number): string[] {
  const max = Math.max(10, Math.floor(larghezza / 9));
  const parole = nome.split(/\s+/);
  const out: string[] = [];
  let riga = '';
  for (const parola of parole) {
    if (riga && (riga + ' ' + parola).length > max) {
      out.push(riga);
      riga = parola;
    } else {
      riga = riga ? riga + ' ' + parola : parola;
    }
  }
  if (riga) out.push(riga);
  return out.slice(0, 3);
}

/** La pianta è generata dalla struttura salvata: nessuna zona è fissata nel codice. */
export function zoneDaStruttura(aree: StrutturaArea[]): Zona[] {
  return aree
    .filter((a) => !a.speciale && a.w > 0 && a.h > 0)
    .map((a) => ({
      areaId: a.id,
      x: a.x,
      y: a.y,
      w: a.w,
      h: a.h,
      righe: a.righe?.length ? a.righe : righeDaNome(a.nome, a.w),
      decoro: a.decoro,
    }));
}

const COLORE_CATEGORIA: Record<string, string> = {
  mare: 'hsl(190 55% 45%)',
  banchina: 'hsl(202 14% 58%)',
  terminal: 'hsl(185 74% 46%)',
  controllo: 'hsl(38 90% 58%)',
  intermodale: 'hsl(198 62% 62%)',
  servizi: 'hsl(150 45% 52%)',
};

export const ETICHETTE_CATEGORIA = CATEGORIE_AREA;

type Props = {
  selezione?: string | null;
  onSeleziona: (areaId: string) => void;
  conteggi: Record<string, number>;
};

type Nave = {
  id: string;
  areaId: string;
  nome: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tipo: 'container' | 'bulk' | 'roro' | 'crociera';
};

const NAVI: Nave[] = [
  { id: 'nave-1', areaId: 'nave', nome: 'Portacontainer in operazione', x: 90, y: 320, w: 420, h: 74, tipo: 'container' },
  { id: 'nave-2', areaId: 'nave', nome: 'Bulk carrier in discarica', x: 580, y: 330, w: 270, h: 64, tipo: 'bulk' },
  { id: 'nave-3', areaId: 'nave', nome: 'Traghetto Ro-Ro in imbarco', x: 890, y: 332, w: 250, h: 62, tipo: 'roro' },
  { id: 'nave-4', areaId: 'nave', nome: 'Nave da crociera in sosta', x: 1190, y: 324, w: 340, h: 70, tipo: 'crociera' },
];

export default function MappaPorto({ selezione, onSeleziona, conteggi }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const { aree, areeById } = useStruttura();
  const zone = useMemo(() => zoneDaStruttura(aree), [aree]);
  const altezza = useMemo(
    () => Math.max(ALTEZZA_MINIMA_PIANTA, ...zone.map((z) => z.y + z.h + 24)),
    [zone]
  );
  const mostraNavi = !!areeById['nave'];
  const mostraNautici = !!areeById['servizi-nautici'];

  const attivo = (id: string) => selezione === id || hover === id;

  return (
    <svg
      viewBox={`0 0 ${LARGHEZZA_PIANTA} ${altezza}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label="Pianta interattiva del porto commerciale"
    >
      <defs>
        <pattern id="onde" width="46" height="26" patternUnits="userSpaceOnUse">
          <path
            d="M0 18 q11 -9 23 0 q11 9 23 0"
            fill="none"
            stroke="hsl(190 55% 34%)"
            strokeOpacity="0.5"
            strokeWidth="1.2"
          />
        </pattern>
        <pattern id="asfalto" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="hsl(204 16% 13%)" />
          <circle cx="3" cy="4" r="0.7" fill="hsl(204 10% 24%)" />
          <circle cx="11" cy="11" r="0.7" fill="hsl(204 10% 22%)" />
        </pattern>
        <linearGradient id="gradAcqua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(200 62% 11%)" />
          <stop offset="100%" stopColor="hsl(199 56% 16%)" />
        </linearGradient>
        <filter id="bagliore" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* fondo: terra */}
      <rect x="0" y="0" width={LARGHEZZA_PIANTA} height={altezza} fill="url(#asfalto)" />

      {/* specchio acqueo */}
      <rect x="0" y="0" width="1600" height="440" fill="url(#gradAcqua)" />
      <rect x="0" y="0" width="1600" height="440" fill="url(#onde)" opacity="0.55" />

      {/* diga foranea con imboccatura */}
      <g stroke="hsl(202 12% 34%)" strokeWidth="12" strokeLinecap="round" fill="none">
        <path d="M24 178 L600 152" />
        <path d="M900 152 L1576 182" />
      </g>
      <g fill="hsl(185 74% 55%)" opacity="0.9">
        <circle cx="600" cy="152" r="7" className="pulsa" />
        <circle cx="900" cy="152" r="7" className="pulsa" />
      </g>
      <text x="750" y="140" textAnchor="middle" className="etichetta" fill="hsl(190 40% 62%)" fontSize="13">
        Imboccatura
      </text>

      {/* canale di accesso */}
      <path
        d="M750 160 L750 300"
        stroke="hsl(190 55% 40%)"
        strokeWidth="1.5"
        strokeDasharray="8 10"
        opacity="0.6"
      />

      {/* mezzi tecnico-nautici: rimorchiatore e pilotina (cliccabili) */}
      {mostraNautici && (
      <g
        className="zona"
        tabIndex={0}
        role="button"
        aria-label="Servizi tecnico-nautici"
        data-testid="zona-servizi-nautici"
        onClick={() => onSeleziona('servizi-nautici')}
        onKeyDown={(e) => e.key === 'Enter' && onSeleziona('servizi-nautici')}
        onMouseEnter={() => setHover('servizi-nautici')}
        onMouseLeave={() => setHover(null)}
      >
        <rect x="960" y="200" width="200" height="86" rx="10" fill="transparent" />
        <g transform="translate(980,216)">
          <path d="M0 26 L10 40 L56 40 L64 26 Z" fill="hsl(38 80% 52%)" />
          <rect x="18" y="8" width="22" height="18" rx="3" fill="hsl(202 14% 78%)" />
          <rect x="24" y="0" width="5" height="9" fill="hsl(202 14% 60%)" />
        </g>
        <g transform="translate(1076,232)">
          <path d="M0 18 L7 28 L40 28 L46 18 Z" fill="hsl(185 60% 48%)" />
          <rect x="14" y="6" width="14" height="12" rx="2" fill="hsl(202 14% 80%)" />
        </g>
        <text
          x="1060"
          y="278"
          textAnchor="middle"
          fontSize="13"
          className="font-display"
          fill={attivo('servizi-nautici') ? 'hsl(185 74% 62%)' : 'hsl(200 14% 72%)'}
        >
          Servizi tecnico-nautici
        </text>
      </g>
      )}

      {/* navi ormeggiate */}
      {mostraNavi && NAVI.map((n) => {
        const on = attivo('nave');
        return (
          <g
            key={n.id}
            className="zona"
            tabIndex={0}
            role="button"
            aria-label={n.nome}
            data-testid={`nave-${n.id}`}
            onClick={() => onSeleziona('nave')}
            onKeyDown={(e) => e.key === 'Enter' && onSeleziona('nave')}
            onMouseEnter={() => setHover('nave')}
            onMouseLeave={() => setHover(null)}
          >
            <path
              d={`M${n.x} ${n.y} L${n.x + n.w - 34} ${n.y} L${n.x + n.w} ${n.y + n.h / 2} L${n.x + n.w - 34} ${n.y + n.h} L${n.x} ${n.y + n.h} Z`}
              fill={on ? 'hsl(202 18% 40%)' : 'hsl(203 14% 30%)'}
              stroke={on ? 'hsl(185 74% 58%)' : 'hsl(202 12% 46%)'}
              strokeWidth={on ? 2.5 : 1.4}
            />
            {n.tipo === 'container' && (
              <g pointerEvents="none">
                {Array.from({ length: 11 }).map((_, i) =>
                  Array.from({ length: 3 }).map((__, j) => (
                    <rect
                      key={`${i}-${j}`}
                      x={n.x + 16 + i * 33}
                      y={n.y + 12 + j * 17}
                      width="28"
                      height="14"
                      rx="2"
                      fill={
                        ['hsl(185 60% 40%)', 'hsl(12 60% 46%)', 'hsl(38 70% 48%)', 'hsl(198 45% 46%)'][
                          (i + j) % 4
                        ]
                      }
                      opacity="0.9"
                    />
                  ))
                )}
              </g>
            )}
            {n.tipo === 'bulk' && (
              <g pointerEvents="none">
                {Array.from({ length: 4 }).map((_, i) => (
                  <rect
                    key={i}
                    x={n.x + 22 + i * 52}
                    y={n.y + 14}
                    width="42"
                    height="36"
                    rx="3"
                    fill="hsl(28 30% 34%)"
                  />
                ))}
              </g>
            )}
            {n.tipo === 'roro' && (
              <g pointerEvents="none">
                <rect x={n.x + 14} y={n.y + 10} width={n.w - 70} height={n.h - 22} rx="4" fill="hsl(202 16% 44%)" />
                <path
                  d={`M${n.x + 10} ${n.y + n.h} L${n.x - 26} ${n.y + n.h + 26} L${n.x + 52} ${n.y + n.h + 26} Z`}
                  fill="hsl(38 70% 46%)"
                  opacity="0.85"
                />
              </g>
            )}
            {n.tipo === 'crociera' && (
              <g pointerEvents="none">
                <rect x={n.x + 20} y={n.y + 8} width={n.w - 80} height={n.h - 30} rx="6" fill="hsl(200 12% 82%)" />
                {Array.from({ length: 14 }).map((_, i) => (
                  <rect
                    key={i}
                    x={n.x + 32 + i * 18}
                    y={n.y + 16}
                    width="9"
                    height="9"
                    rx="1.5"
                    fill="hsl(200 30% 40%)"
                  />
                ))}
              </g>
            )}
            <text
              x={n.x + n.w / 2}
              y={n.y - 10}
              textAnchor="middle"
              fontSize="12"
              className="etichetta"
              fill={on ? 'hsl(185 74% 66%)' : 'hsl(200 12% 66%)'}
            >
              {n.tipo === 'container'
                ? 'Nave / Container'
                : n.tipo === 'bulk'
                  ? 'Nave / Rinfuse'
                  : n.tipo === 'roro'
                    ? 'Nave / Ro-Ro'
                    : 'Nave / Crociera'}
            </text>
          </g>
        );
      })}

      {/* gru di banchina */}
      <g pointerEvents="none">
        {[150, 300, 450].map((x) => (
          <g key={x} stroke="hsl(38 80% 56%)" strokeWidth="4" fill="none" opacity="0.9">
            <path d={`M${x} 470 L${x} 402`} />
            <path d={`M${x + 46} 470 L${x + 46} 402`} />
            <path d={`M${x - 46} 402 L${x + 86} 402`} />
            <path d={`M${x + 20} 402 L${x + 20} 386`} />
          </g>
        ))}
        {[620, 700].map((x) => (
          <g key={x} stroke="hsl(150 40% 52%)" strokeWidth="4" fill="none" opacity="0.85">
            <path d={`M${x} 470 L${x} 410`} />
            <path d={`M${x} 410 L${x - 44} 396`} />
          </g>
        ))}
      </g>

      {/* zone cliccabili */}
      {zone.map((z) => {
        const area = areeById[z.areaId];
        if (!area) return null;
        const on = attivo(z.areaId);
        const colore = COLORE_CATEGORIA[area.categoria] ?? 'hsl(185 74% 46%)';
        const n = conteggi[z.areaId] ?? 0;
        return (
          <g
            key={z.areaId}
            className="zona"
            tabIndex={0}
            role="button"
            aria-label={`${area.nome}, ${n} software associati`}
            data-testid={`zona-${z.areaId}`}
            onClick={() => onSeleziona(z.areaId)}
            onKeyDown={(e) => e.key === 'Enter' && onSeleziona(z.areaId)}
            onMouseEnter={() => setHover(z.areaId)}
            onMouseLeave={() => setHover(null)}
          >
            <rect
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              rx={z.decoro === 'mare' || z.decoro === 'banchina' ? 8 : 12}
              fill={
                z.decoro === 'mare'
                  ? on
                    ? 'hsl(199 56% 22%)'
                    : 'hsl(199 60% 15%)'
                  : z.decoro === 'banchina'
                    ? on
                      ? 'hsl(202 12% 32%)'
                      : 'hsl(202 10% 23%)'
                    : on
                      ? 'hsl(204 22% 18%)'
                      : 'hsl(204 18% 13%)'
              }
              stroke={on ? colore : 'hsl(203 14% 26%)'}
              strokeWidth={on ? 2.6 : 1.4}
            />
            {/* barra di categoria */}
            {z.decoro !== 'mare' && z.decoro !== 'banchina' && (
              <rect x={z.x} y={z.y} width={z.w} height="4" rx="2" fill={colore} opacity={on ? 1 : 0.55} />
            )}

            <Decoro zona={z} attivo={on} />

            {/* etichetta */}
            <g pointerEvents="none">
              {z.righe.map((riga, i) => (
                <text
                  key={i}
                  x={z.x + 16}
                  y={z.y + 30 + i * 18}
                  fontSize="15"
                  className="font-display"
                  fontWeight={600}
                  fill={on ? '#fff' : 'hsl(200 14% 84%)'}
                >
                  {riga}
                </text>
              ))}
              <text
                x={z.x + 16}
                y={z.y + 34 + z.righe.length * 18}
                fontSize="11"
                className="etichetta"
                fill={n > 0 ? colore : 'hsl(202 10% 50%)'}
              >
                {area.codice} · {z.w < 180 ? `${n} sw` : n > 0 ? `${n} software` : 'nessun software'}
              </text>
            </g>

            {n > 0 && (
              <g pointerEvents="none">
                <circle cx={z.x + z.w - 22} cy={z.y + 24} r="13" fill={colore} opacity="0.18" />
                <circle cx={z.x + z.w - 22} cy={z.y + 24} r="13" fill="none" stroke={colore} strokeWidth="1.5" />
                <text
                  x={z.x + z.w - 22}
                  y={z.y + 29}
                  textAnchor="middle"
                  fontSize="12"
                  className="num"
                  fill={colore}
                >
                  {n}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* collegamenti esterni: ferrovia e strada */}
      <g pointerEvents="none" opacity="0.75">
        <path d="M0 828 L40 828" stroke="hsl(198 62% 62%)" strokeWidth="3" strokeDasharray="12 8" />
        <text x="8" y="816" fontSize="11" className="etichetta" fill="hsl(198 40% 62%)">
          rete ferroviaria
        </text>
        <path d="M740 990 L740 1008" stroke="hsl(38 80% 56%)" strokeWidth="4" strokeDasharray="10 6" />
      </g>
    </svg>
  );
}

function Decoro({ zona, attivo }: { zona: Zona; attivo: boolean }) {
  const { x, y, w, h, decoro } = zona;
  const op = attivo ? 0.95 : 0.6;
  const g = (children: React.ReactNode) => <g pointerEvents="none" opacity={op}>{children}</g>;

  switch (decoro) {
    case 'container':
      return g(
        <>
          {Array.from({ length: 5 }).map((_, r) =>
            Array.from({ length: 12 }).map((__, c) => (
              <rect
                key={`${r}-${c}`}
                x={x + 24 + c * 40}
                y={y + 96 + r * 30}
                width="34"
                height="22"
                rx="2"
                fill={['hsl(185 50% 32%)', 'hsl(12 48% 36%)', 'hsl(38 55% 38%)', 'hsl(198 38% 36%)'][(r + c) % 4]}
              />
            ))
          )}
          {/* gru di piazzale */}
          {[0, 1].map((i) => (
            <g key={i} stroke="hsl(38 70% 52%)" strokeWidth="3" fill="none">
              <path d={`M${x + 20} ${y + 88 + i * 92} L${x + w - 20} ${y + 88 + i * 92}`} strokeDasharray="6 8" />
            </g>
          ))}
        </>
      );
    case 'silos':
      return g(
        <>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <circle cx={x + 48 + i * 58} cy={y + 106} r="22" fill="hsl(202 10% 30%)" stroke="hsl(202 10% 44%)" />
              <circle cx={x + 48 + i * 58} cy={y + 106} r="9" fill="hsl(28 28% 30%)" />
            </g>
          ))}
          <path
            d={`M${x + 20} ${y + 74} L${x + w - 24} ${y + 74}`}
            stroke="hsl(150 40% 48%)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </>
      );
    case 'roro':
      return g(
        <>
          {Array.from({ length: 8 }).map((_, i) => (
            <g key={i}>
              <rect x={x + 22 + (i % 4) * 62} y={y + 84 + Math.floor(i / 4) * 34} width="46" height="20" rx="3" fill="hsl(202 14% 30%)" />
              <rect x={x + 22 + (i % 4) * 62} y={y + 84 + Math.floor(i / 4) * 34} width="12" height="20" rx="3" fill="hsl(38 60% 44%)" />
            </g>
          ))}
        </>
      );
    case 'passeggeri':
      return g(
        <>
          <rect x={x + 22} y={y + 78} width={w - 44} height="52" rx="8" fill="hsl(204 14% 18%)" stroke="hsl(202 10% 34%)" />
          {Array.from({ length: 9 }).map((_, i) => (
            <rect key={i} x={x + 36 + i * 38} y={y + 92} width="22" height="24" rx="3" fill="hsl(185 40% 34%)" />
          ))}
        </>
      );
    case 'dogana':
      return g(
        <>
          <rect x={x + 22} y={y + 74} width={w - 44} height="50" rx="6" fill="hsl(204 14% 18%)" stroke="hsl(38 70% 48%)" />
          <path
            d={`M${x + 34} ${y + 100} h${w - 68}`}
            stroke="hsl(38 80% 58%)"
            strokeWidth="3"
            strokeDasharray="10 7"
          />
          <circle cx={x + w / 2} cy={y + 88} r="6" fill="hsl(38 80% 58%)" />
        </>
      );
    case 'scanner':
      return g(
        <>
          <rect x={x + 30} y={y + 82} width={w - 60} height="46" rx="6" fill="none" stroke="hsl(38 80% 56%)" strokeWidth="4" />
          <rect x={x + 30} y={y + 100} width={w - 60} height="4" fill="hsl(185 74% 60%)" className="pulsa" />
          <rect x={x + 54} y={y + 106} width="48" height="18" rx="2" fill="hsl(185 45% 32%)" />
          <rect x={x + w - 104} y={y + 106} width="48" height="18" rx="2" fill="hsl(12 45% 36%)" />
        </>
      );
    case 'varco':
      return g(
        <>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={x + 26} y={y + 88 + i * 34} width="64" height="8" rx="4" fill="hsl(38 80% 56%)" />
              <rect x={x + 96} y={y + 84 + i * 34} width="112" height="16" rx="3" fill="hsl(204 12% 22%)" stroke="hsl(202 10% 36%)" />
            </g>
          ))}
          <text x={x + 26} y={y + 186} fontSize="11" className="etichetta" fill="hsl(38 60% 62%)">
            IN / OUT
          </text>
        </>
      );
    case 'ferrovia':
      return g(
        <>
          {[0, 1].map((i) => (
            <g key={i}>
              <path d={`M${x + 12} ${y + 64 + i * 22} h${w - 24}`} stroke="hsl(198 50% 58%)" strokeWidth="2.5" />
              <path d={`M${x + 12} ${y + 71 + i * 22} h${w - 24}`} stroke="hsl(198 50% 58%)" strokeWidth="2.5" />
              {Array.from({ length: 26 }).map((_, j) => (
                <path
                  key={j}
                  d={`M${x + 18 + j * 20} ${y + 61 + i * 22} v14`}
                  stroke="hsl(202 10% 34%)"
                  strokeWidth="3"
                />
              ))}
            </g>
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <rect key={i} x={x + 40 + i * 92} y={y + 58} width="74" height="10" rx="2" fill="hsl(185 42% 34%)" />
          ))}
        </>
      );
    case 'magazzino':
      return g(
        <>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={x + 22 + i * 84} y={y + 84} width="70" height="44" rx="4" fill="hsl(204 12% 19%)" stroke="hsl(202 10% 34%)" />
              <path d={`M${x + 22 + i * 84} ${y + 96} h70`} stroke="hsl(202 10% 30%)" strokeWidth="2" />
              <rect x={x + 44 + i * 84} y={y + 110} width="26" height="18" fill="hsl(185 40% 30%)" />
            </g>
          ))}
        </>
      );
    case 'torre':
      return g(
        <>
          <circle cx={x + w / 2} cy={y + 104} r="22" fill="hsl(204 14% 18%)" stroke="hsl(38 74% 54%)" strokeWidth="2" />
          <circle cx={x + w / 2} cy={y + 104} r="7" fill="hsl(38 80% 58%)" filter="url(#bagliore)" />
          <path
            d={`M${x + w / 2} ${y + 104} L${x + w / 2 + 22} ${y + 90}`}
            stroke="hsl(185 74% 60%)"
            strokeWidth="2.5"
          />
          <circle cx={x + w / 2} cy={y + 104} r="32" fill="none" stroke="hsl(185 60% 50%)" strokeWidth="1" className="pulsa" />
        </>
      );
    case 'security':
      return g(
        <>
          <rect x={x + 22} y={y + 76} width={w - 44} height={h - 108} rx="6" fill="none" stroke="hsl(38 70% 50%)" strokeDasharray="8 6" strokeWidth="2" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${x + 44 + i * 62},${y + 104})`}>
              <path d="M0 14 L0 0 L14 0" stroke="hsl(185 60% 55%)" strokeWidth="2.5" fill="none" />
              <circle cx="16" cy="2" r="5" fill="hsl(185 60% 55%)" />
            </g>
          ))}
          <text x={x + 24} y={y + 172} fontSize="11" className="etichetta" fill="hsl(38 60% 62%)">
            ISPS · TVCC
          </text>
        </>
      );
    case 'sanita':
      return g(
        <>
          <rect x={x + 24} y={y + 74} width={w - 48} height="56" rx="6" fill="hsl(204 14% 18%)" stroke="hsl(150 40% 46%)" />
          <path
            d={`M${x + w / 2 - 14} ${y + 102} h28 M${x + w / 2} ${y + 88} v28`}
            stroke="hsl(150 55% 56%)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      );
    case 'ambiente':
      return g(
        <>
          <circle cx={x + w / 2} cy={y + 120} r="20" fill="none" stroke="hsl(150 45% 52%)" strokeWidth="2" />
          <path
            d={`M${x + w / 2} ${y + 106} q12 12 0 28 q-12 -16 0 -28`}
            fill="hsl(150 45% 42%)"
          />
          <rect x={x + 22} y={y + 150} width={w - 44} height="12" rx="3" fill="hsl(198 40% 30%)" />
        </>
      );
    case 'truck':
      return g(
        <>
          {Array.from({ length: 7 }).map((_, i) => (
            <g key={i} transform={`translate(${x + 26 + i * 76},${y + 60})`}>
              <rect x="0" y="0" width="52" height="20" rx="3" fill="hsl(204 12% 22%)" stroke="hsl(202 10% 36%)" />
              <rect x="52" y="4" width="14" height="16" rx="3" fill="hsl(38 60% 44%)" />
            </g>
          ))}
        </>
      );
    case 'banchina':
      return g(
        <>
          {Array.from({ length: 25 }).map((_, i) => (
            <circle key={i} cx={x + 250 + i * 52} cy={y + h / 2} r="5" fill="hsl(202 10% 42%)" />
          ))}
        </>
      );
    case 'mare':
      return g(
        <>
          <circle cx={x + w - 120} cy={y + h / 2} r="14" fill="none" stroke="hsl(190 55% 50%)" strokeWidth="1.5" />
          <circle cx={x + w - 120} cy={y + h / 2} r="5" fill="hsl(190 60% 55%)" />
          <text x={x + w - 96} y={y + h / 2 + 5} fontSize="11" className="etichetta" fill="hsl(190 40% 60%)">
            rada di attesa
          </text>
        </>
      );
    default:
      return null;
  }
}
