import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface Props {
  children: React.ReactNode;
  /** Use compact inline UI rather than full-screen. Useful for per-route
   *  boundaries so a single page crash doesn't unmount the app shell. */
  inline?: boolean;
  /** Reset key — when this changes (e.g. route key), the boundary re-renders
   *  children. Lets the user navigate away from the broken page. */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) console.error('Error caught by boundary:', error, info);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.inline) {
        return (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 m-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <h2 className="text-base font-bold text-foreground">This page hit an error</h2>
                <p className="text-sm text-muted-foreground">Other pages still work. Try a different menu item or reload.</p>
                {import.meta.env.DEV && this.state.error && (
                  <p className="text-xs font-mono text-destructive break-words">{this.state.error.message}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>Retry</Button>
                  <Button size="sm" onClick={() => window.location.reload()} className="gap-1.5">
                    <RotateCcw size={14} /> Reload
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Please try refreshing the page.
              </p>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-xs font-mono text-destructive break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = '/'}
              >
                Go Home
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => window.location.reload()}
              >
                <RotateCcw size={16} /> Refresh
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
