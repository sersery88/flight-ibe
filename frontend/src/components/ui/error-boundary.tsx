import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, Card } from '@/components/ui';

// ============================================================================
// Error Boundary - React Error Handler
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="mx-auto max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Etwas ist schiefgelaufen
          </h2>
          <p className="mb-6 text-gray-500">
            {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
          </p>
          <Button onClick={this.handleReset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Erneut versuchen
          </Button>
        </Card>
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
    <Card className="mx-auto max-w-md p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        Etwas ist schiefgelaufen
      </h2>
      <p className="mb-6 text-gray-500">{error.message}</p>
      <Button onClick={resetErrorBoundary} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Erneut versuchen
      </Button>
    </Card>
  );
}

