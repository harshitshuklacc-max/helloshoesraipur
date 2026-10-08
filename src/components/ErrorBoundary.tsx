import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let parsedError: { error?: string; operationType?: string; path?: string } | null = null;
      try {
        parsedError = JSON.parse(this.state.errorMessage);
      } catch {
        parsedError = null;
      }

      const isQuotaError =
        this.state.errorMessage.includes('Quota exceeded') ||
        (parsedError?.error && parsedError.error.includes('Quota exceeded'));

      return (
        <div className="min-h-screen bg-[#F9F8F6] text-stone-900 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-stone-200 p-8">
            <div className="flex items-center gap-3 text-amber-800 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold">
                {isQuotaError ? 'Daily Database Quota Reached' : 'Service Notice'}
              </h1>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-6">
              {isQuotaError
                ? 'The free daily Firestore quota has been reached. Quota resets automatically the next day.'
                : parsedError?.error
                ? `Database operation (${parsedError.operationType} on ${parsedError.path}) could not be completed: ${parsedError.error}`
                : this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Storefront
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
