import { useState, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Moon, Sun, Loader2 } from 'lucide-react';
import { Button, ErrorBoundary, ToastProvider } from '@/components/ui';
import { SearchForm } from '@/components/flight';
import { useThemeStore } from '@/stores/theme-store';
import { useSearchStore } from '@/stores/search-store';
import { useBookingStore } from '@/stores/booking-store';
import { usePriceFlights } from '@/hooks/use-flights';

// Code-Splitting: Lazy load pages for faster initial load
const ResultsPage = lazy(() => import('@/pages/results-page').then(m => ({ default: m.ResultsPage })));
const BookingPage = lazy(() => import('@/pages/booking-page').then(m => ({ default: m.BookingPage })));

type AppView = 'search' | 'results' | 'booking';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Theme Toggle Button
function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === 'light' ? 'Dunkel' : 'Hell'}>
      {theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

// Header Component
function Header({ onHomeClick }: { onHomeClick: () => void }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/80" style={{ maxWidth: '100vw' }}>
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:h-24">
        <button onClick={onHomeClick} className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <img src="/logo.svg" alt="Pink Travel" className="h-16 w-auto sm:h-20" />
        </button>

        <nav className="flex items-center gap-4">
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

// Loading Fallback for Code-Splitting
function PageLoadingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" aria-hidden="true" />
        <span className="text-sm text-neutral-500">Seite wird geladen...</span>
      </div>
    </div>
  );
}

// Main App Content (inside QueryClientProvider)
function AppContent() {
  const [currentView, setCurrentView] = useState<AppView>('search');
  const { searchResults, setSelectedOffer } = useSearchStore();
  const { setSelectedOffer: setBookingOffer, reset: resetBooking } = useBookingStore();
  const qc = useQueryClient();
  const priceFlightsMutation = usePriceFlights();

  const handleHomeClick = () => {
    setCurrentView('search');
    resetBooking();
  };

  const handleSearchComplete = () => {
    // Get fresh results from store (searchResults from render may be stale)
    const results = useSearchStore.getState().searchResults;
    if (results.length > 0) {
      setCurrentView('results');
    }
  };

  const handleSelectFlight = (offer: typeof searchResults[0]) => {
    // Reset booking state when selecting a new flight to clear old seats/ancillaries
    resetBooking();
    // Invalidate seatmap cache to force re-fetch for new flight
    qc.removeQueries({ queryKey: ['flights', 'seatmaps'] });
    setSelectedOffer(offer);
    setBookingOffer(offer);
    setCurrentView('booking');

    // Call pricing API to get baggage options and updated pricing
    priceFlightsMutation.mutate([offer]);
  };

  const handleBookingComplete = () => {
    handleHomeClick();
  };

  return (
    <ToastProvider>
      <ErrorBoundary onReset={handleHomeClick} onHome={handleHomeClick}>
        <div className="flex min-h-screen w-full flex-col overflow-x-hidden" style={{ maxWidth: '100vw' }}>
          <Header onHomeClick={handleHomeClick} />

          <main className="w-full flex-1 overflow-x-hidden" style={{ maxWidth: '100vw' }}>
            {currentView === 'search' && (
              <>
                {/* Hero Section */}
                <section className="w-full bg-gradient-to-br from-neutral-100 to-neutral-200 px-4 py-12 dark:from-neutral-800 dark:to-neutral-900 sm:py-20" style={{ maxWidth: '100vw' }}>
                  <div className="mx-auto w-full max-w-4xl px-0 text-center">
                    <h1 className="mb-3 text-3xl font-bold text-neutral-800 dark:text-white sm:mb-4 sm:text-4xl md:text-5xl">
                      Finden Sie Ihren perfekten Flug
                    </h1>
                    <p className="mb-6 text-base text-neutral-600 dark:text-neutral-300 sm:mb-8 sm:text-lg md:text-xl">
                      Vergleichen Sie Preise von über 400 Airlines weltweit
                    </p>

                    {/* Search Form */}
                    <div className="w-full rounded-2xl bg-white p-4 text-left text-neutral-800 shadow-2xl dark:bg-neutral-900 dark:text-white sm:p-6">
                      <SearchForm onSearchComplete={handleSearchComplete} />
                    </div>
                  </div>
                </section>


              </>
            )}

            {currentView === 'results' && (
              <Suspense fallback={<PageLoadingFallback />}>
                <ResultsPage
                  onBack={handleHomeClick}
                  onSelectFlight={handleSelectFlight}
                />
              </Suspense>
            )}

            {currentView === 'booking' && (
              <Suspense fallback={<PageLoadingFallback />}>
                <BookingPage
                  onBack={() => setCurrentView('results')}
                  onComplete={handleBookingComplete}
                />
              </Suspense>
            )}
          </main>

          {/* Footer */}
          <footer className="w-full border-t border-neutral-200 bg-neutral-50 px-4 py-6 dark:border-neutral-800 dark:bg-neutral-900 sm:py-8" style={{ maxWidth: '100vw' }}>
            <div className="mx-auto w-full max-w-6xl px-0 text-center text-xs text-neutral-500 sm:text-sm">
              <p>© 2026 Flypink by Pink Travel</p>
            </div>
          </footer>
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}

// Main App Component (Provides QueryClient)
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
