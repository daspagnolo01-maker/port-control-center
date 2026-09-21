import { Link, useLocation } from 'wouter';
import { Map, FileSpreadsheet, Database, Network, Anchor } from 'lucide-react';
import { useRegistro } from '@/lib/dati';
import { TOTALE_ATTIVITA, TOTALE_FUNZIONI, AREE } from '@shared/taxonomy';

export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-label="Port Control Center"
      role="img"
    >
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M1.5 21.5h29" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 25.5h20" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <rect x="8" y="12" width="7" height="6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="17" y="14.5" width="6" height="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11.5 12V6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 8.5h6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

const VOCI = [
  { href: '/', label: 'Mappa operativa', icona: Map },
  { href: '/gestione', label: 'Gestione software', icona: FileSpreadsheet },
  { href: '/registro', label: 'Registro software', icona: Database },
  { href: '/albero', label: 'Albero associazioni', icona: Network },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [percorso] = useLocation();
  const { stats } = useRegistro();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      <aside className="lg:w-64 shrink-0 bg-sidebar border-b lg:border-b-0 lg:border-r border-sidebar-border flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          <span className="text-primary">
            <Logo />
          </span>
          <div className="leading-tight">
            <div className="font-display font-semibold text-base">Port Control Center</div>
            <div className="etichetta text-muted-foreground">Porto commerciale</div>
          </div>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {VOCI.map((v) => {
            const attivo = percorso === v.href;
            const Icona = v.icona;
            return (
              <Link
                key={v.href}
                href={v.href}
                data-testid={`link-${v.href === '/' ? 'mappa' : v.href.slice(1)}`}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                  attivo
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
                }`}
              >
                <Icona className="h-4 w-4 shrink-0" />
                {v.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden lg:block p-4 border-t border-sidebar-border space-y-2.5">
          <Riga etichetta="Aree portuali" valore={AREE.length} />
          <Riga etichetta="Funzioni" valore={TOTALE_FUNZIONI} />
          <Riga etichetta="Attività" valore={TOTALE_ATTIVITA} />
          <div className="h-px bg-sidebar-border my-1" />
          <Riga etichetta="File Excel" valore={stats.nFonti} />
          <Riga etichetta="Software" valore={stats.nSoftware} accento />
          <Riga etichetta="Associazioni" valore={stats.nAssociazioni} />
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function Riga({ etichetta, valore, accento }: { etichetta: string; valore: number; accento?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="etichetta text-muted-foreground">{etichetta}</span>
      <span className={`num text-sm ${accento ? 'text-primary' : ''}`} data-testid={`text-stat-${etichetta}`}>
        {valore}
      </span>
    </div>
  );
}

export function Intestazione({
  titolo,
  sottotitolo,
  children,
  icona: Icona = Anchor,
}: {
  titolo: string;
  sottotitolo?: string;
  children?: React.ReactNode;
  icona?: typeof Anchor;
}) {
  return (
    <header className="border-b border-border px-5 py-4 flex flex-wrap items-center gap-4 justify-between bg-card/40">
      <div className="flex items-start gap-3 min-w-0">
        <Icona className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold truncate">{titolo}</h1>
          {sottotitolo && <p className="text-sm text-muted-foreground mt-0.5">{sottotitolo}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </header>
  );
}
