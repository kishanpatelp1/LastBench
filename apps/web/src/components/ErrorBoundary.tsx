import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('LastBench uncaught render exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/feed';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background text-center">
          <div className="w-full max-w-md p-8 border shadow-2xl bg-card rounded-2xl border-border space-y-6">
            <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={28} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">
                Oops, something went wrong on campus
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We encountered an unexpected rendering glitch. Our engineering students have been notified.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer"
              >
                <RefreshCw size={16} />
                Reload Application
              </button>

              <button
                onClick={this.handleReset}
                className="w-full py-3 rounded-xl bg-secondary text-foreground font-semibold text-sm flex items-center justify-center gap-2 border border-border hover:bg-muted transition-all cursor-pointer"
              >
                <Home size={16} />
                Return to Feed
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
