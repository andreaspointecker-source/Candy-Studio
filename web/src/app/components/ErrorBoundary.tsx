"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(
    error: Error,
    errorInfo: ErrorInfo
  ): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Fehler an externe Logging-Dienst senden
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Callback ausführen wenn definiert
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Hier könnten wir den Fehler an einen Error-Reporting-Dienst senden
    // z.B. Sentry, LogRocket, etc.
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Fehler-Informationen sammeln
    const errorData = {
      timestamp: new Date().toISOString(),
      error: error.toString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: errorInfo.componentStack,
      // Benutzer-Informationen hinzufügen (falls verfügbar)
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };

    // Hier könnten wir den Fehler an einen externen Service senden
    // z.B.:
    // fetch('/api/log-error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData),
    // });

    console.log("Error logged:", errorData);
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Custom Fallback rendern
      if (fallback) {
        return fallback(error!, errorInfo!);
      }

      // Standard Fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="mx-auto max-w-md w-full">
            <div className="rounded-lg border border-red-200 bg-white p-8 shadow-lg">
              {/* Fehler-Icon */}
              <div className="flex justify-center mb-6">
                <div className="rounded-full bg-red-100 p-4">
                  <svg
                    className="h-12 w-12 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Fehler-Titel */}
              <div className="mb-4 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Etwas ist schiefgelaufen
                </h1>
                <p className="text-gray-600">
                  Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es
                  erneut oder kontaktieren Sie den Support, falls das Problem
                  fortbesteht.
                </p>
              </div>

              {/* Fehler-Details */}
              {error && (
                <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
                  <h3 className="font-semibold text-red-900 mb-2">
                    Fehlermeldung:
                  </h3>
                  <p className="text-sm text-red-800 font-mono">
                    {error.message}
                  </p>
                </div>
              )}

              {/* Stack-Trace (optional) */}
              {errorInfo && errorInfo.componentStack && (
                <details className="mb-6 rounded-md bg-gray-50 border border-gray-200 p-4">
                  <summary className="cursor-pointer font-medium text-gray-900">
                    Technische Details anzeigen
                  </summary>
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Component Stack:
                    </h4>
                    <pre className="overflow-auto rounded-md bg-white p-3 text-xs text-gray-800 font-mono border border-gray-200">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Aktions-Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 rounded-md bg-red-600 px-4 py-2 text-base font-medium text-white hover:bg-red-700 transition-colors"
                >
                  Seite neu laden
                </button>
                <button
                  onClick={() => this.setState({ hasError: false })}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Zurück zur Anwendung
                </button>
              </div>

              {/* Support-Information */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-center text-sm text-gray-600">
                  Wenn das Problem weiterhin besteht, kontaktieren Sie bitte den
                  Support unter:
                  <a
                    href="mailto:support@example.com"
                    className="text-blue-600 hover:underline font-medium underline-offset-4"
                  >
                    support@example.com
                  </a>
                </p>
                <p className="text-center text-xs text-gray-500 mt-2">
                  Fehler-ID: {Date.now()}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Hilfskomponente für Fallback-UIs
export function ErrorFallback({
  error,
  errorInfo,
}: {
  error: Error;
  errorInfo: ErrorInfo;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="mx-auto max-w-md w-full">
        <div className="rounded-lg border border-red-200 bg-white p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-full bg-red-100 p-2">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Etwas ist schiefgelaufen
            </h1>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Fehlermeldung:
            </h3>
            <p className="text-gray-700 mb-4">{error.message}</p>
            {error.stack && (
              <details className="rounded-md bg-gray-50 border border-gray-200 p-4">
                <summary className="cursor-pointer font-medium text-gray-900">
                  Stack Trace anzeigen
                </summary>
                <pre className="mt-3 overflow-auto rounded-md bg-white p-3 text-xs text-gray-800 font-mono border border-gray-200">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 transition-colors"
            >
              Neu laden
            </button>
            <button
              onClick={() => window.history.back()}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Zurück
            </button>
          </div>
        </div>
      </div>
    );
  }
}
