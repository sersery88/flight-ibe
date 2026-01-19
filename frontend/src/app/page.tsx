'use client';

import { useRouter } from 'next/navigation';
import { SearchForm } from '@/components/flight/search-form';

export default function HomePage() {
  const router = useRouter();

  const handleSearch = () => {
    // Navigation is handled in SearchForm
  };

  const handleSearchComplete = () => {
    // Data loading complete
  };

  return (
    <>
      {/* Hero Section */}
      <section className="w-full bg-gradient-to-br from-muted to-muted/80 px-4 py-12 sm:py-20">
        <div className="mx-auto w-full max-w-4xl text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground sm:mb-4 sm:text-4xl md:text-5xl">
            Finden Sie Ihren perfekten Flug
          </h1>
          <p className="mb-6 text-base text-muted-foreground sm:mb-8 sm:text-lg md:text-xl">
            Vergleichen Sie Preise von über 400 Airlines weltweit
          </p>

          {/* Search Form */}
          <div className="w-full rounded-2xl bg-background p-4 text-left shadow-2xl sm:p-6">
            <SearchForm
              onSearch={handleSearch}
              onSearchComplete={handleSearchComplete}
            />
          </div>
        </div>
      </section>

      {/* Inspiration Section placeholder - can be added later */}
    </>
  );
}
