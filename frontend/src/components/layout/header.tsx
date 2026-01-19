'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render placeholder with same dimensions to avoid layout shift
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      title={theme === 'light' ? 'Dunkel' : 'Hell'}
    >
      {theme === 'light' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:h-24">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Image
            src="/logo.svg"
            alt="Pink Travel"
            width={200}
            height={80}
            className="h-16 w-auto sm:h-20"
            priority
          />
        </Link>

        <nav className="flex items-center gap-4">
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
