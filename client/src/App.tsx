import { Switch, Route, Router } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import PaginaMappa from '@/pages/mappa';
import PaginaGestione from '@/pages/gestione';
import PaginaRegistro from '@/pages/registro';
import PaginaAlbero from '@/pages/albero';
import PaginaStruttura from '@/pages/struttura';

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={PaginaMappa} />
      <Route path="/gestione" component={PaginaGestione} />
      <Route path="/registro" component={PaginaRegistro} />
      <Route path="/albero" component={PaginaAlbero} />
      <Route path="/struttura" component={PaginaStruttura} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
