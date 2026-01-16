import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, Check } from 'lucide-react';
import { Button, Card } from '@/components/ui';

// ============================================================================
// Error Boundary - React Error Handler with improved UX
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });

    // In production, you could send to error tracking service here
    // e.g., Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    this.props.onReset?.();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    this.props.onHome?.();
  };

  handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    const errorText = [
      `Error: ${error?.message || 'Unknown error'}`,
      `Stack: ${error?.stack || 'No stack trace'}`,
      `Component Stack: ${errorInfo?.componentStack || 'No component stack'}`,
    ].join('\n\n');

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      console.error('Failed to copy error');
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex min-h-[50vh] items-center justify-center p-4"
        >
          <Card className="mx-auto max-w-lg p-8 text-center">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
              aria-hidden="true"
            >
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              Etwas ist schiefgelaufen
            </h2>
            <p className="mb-4 text-gray-500">
              {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
            </p>

            {/* Development mode: Show error details */}
            {isDev && this.state.error?.stack && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600">
                  Fehlerdetails anzeigen
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-100 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-100 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={this.handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Erneut versuchen
              </Button>
              {this.props.onHome && (
                <Button variant="outline" onClick={this.handleHome} className="gap-2">
                  <Home className="h-4 w-4" aria-hidden="true" />
                  Zur Startseite
                </Button>
              )}
              {isDev && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.handleCopyError}
                  className="gap-2"
                  aria-label="Fehler kopieren"
                >
                  {this.state.copied ? (
                    <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                  {this.state.copied ? 'Kopiert!' : 'Fehler kopieren'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Error Fallback Component - For use with react-error-boundary
// ============================================================================

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-[50vh] items-center justify-center p-4"
    >
      <Card className="mx-auto max-w-md p-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
          aria-hidden="true"
        >
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Etwas ist schiefgelaufen
        </h2>
        <p className="mb-6 text-gray-500">{error.message}</p>
        <Button onClick={resetErrorBoundary} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Erneut versuchen
        </Button>
      </Card>
    </div>
  );
}
