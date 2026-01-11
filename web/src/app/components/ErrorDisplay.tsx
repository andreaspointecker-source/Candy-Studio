"use client";

import React, { useState } from "react";

interface ErrorDisplayProps {
  error: Error | string | null;
  title?: string;
  showStack?: boolean;
  onDismiss?: () => void;
}

export default function ErrorDisplay({
  error,
  title = "Ein Fehler ist aufgetreten",
  showStack = false,
  onDismiss,
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(showStack);

  if (!error) return null;

  const errorObj = typeof error === "string" ? new Error(error) : error;
  const errorMessage = errorObj.message || error.toString();
  const stackTrace = errorObj.stack;

  const errorType = errorObj.name || "Error";
  const suggestedSolution = getSuggestedSolution(errorObj);

  const copyToClipboard = async () => {
    const textToCopy = `${title}\n\nFehler: ${errorMessage}\n\nType: ${errorType}${
      stackTrace ? `\n\nStack Trace:\n${stackTrace}` : ""
    }`;
    await navigator.clipboard.writeText(textToCopy);
  };

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
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
          <div>
            <h3 className="text-lg font-semibold text-red-900">{title}</h3>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded-md p-1 hover:bg-red-100 transition-colors"
            aria-label="Schließen"
          >
            <svg
              className="h-5 w-5 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Error Type Badge */}
      <div className="mt-3">
        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
          {errorType}
        </span>
      </div>

      {/* Suggested Solution */}
      {suggestedSolution && (
        <div className="mt-4 rounded-md bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-blue-900">
                Empfohlene Lösung:
              </h4>
              <p className="mt-1 text-sm text-blue-800">
                {suggestedSolution}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stack Trace Toggle */}
      {stackTrace && (
        <div className="mt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-900 transition-colors"
          >
            <svg
              className={`h-4 w-4 transition-transform ${
                showDetails ? "rotate-90" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            {showDetails ? "Stack Trace ausblenden" : "Stack Trace anzeigen"}
          </button>

          {showDetails && (
            <div className="mt-3 overflow-auto rounded-md border border-red-200 bg-white p-4">
              <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap break-all">
                {stackTrace}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={copyToClipboard}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            />
          </svg>
          Fehler kopieren
        </button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            Schließen
          </button>
        )}
      </div>
    </div>
  );
}

// Helper function to provide suggested solutions for common errors
function getSuggestedSolution(error: Error): string | null {
  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes("network") || message.includes("fetch failed")) {
    return "Überprüfen Sie Ihre Internetverbindung und ob der Server erreichbar ist.";
  }

  // Timeout errors
  if (message.includes("timeout")) {
    return "Der Request hat zu lange gedauert. Versuchen Sie es erneut oder erhöhen Sie das Timeout-Limit.";
  }

  // Permission errors
  if (message.includes("permission") || message.includes("unauthorized")) {
    return "Sie haben nicht die erforderlichen Berechtigungen. Bitte melden Sie sich erneut an.";
  }

  // Validation errors
  if (message.includes("validation") || message.includes("invalid")) {
    return "Überprüfen Sie Ihre Eingaben und stellen Sie sicher, dass alle Pflichtfelder ausgefüllt sind.";
  }

  // Not found errors
  if (message.includes("not found") || message.includes("404")) {
    return "Die angefragte Ressource wurde nicht gefunden. Möglicherweise wurde sie gelöscht oder verschoben.";
  }

  // Syntax errors
  if (error.name === "SyntaxError") {
    return "Es gibt einen Syntaxfehler im Code. Überprüfen Sie die Klammern, Anführungszeichen und Semikolons.";
  }

  // Type errors
  if (error.name === "TypeError") {
    return "Ein falscher Datentyp wurde verwendet. Überprüfen Sie die Typen der Variablen und Funktionen.";
  }

  // Reference errors
  if (error.name === "ReferenceError") {
    return "Eine Variable oder Funktion wurde nicht gefunden. Überprüfen Sie die Schreibweise und ob sie definiert ist.";
  }

  // Default message
  return "Versuchen Sie, die Seite neu zu laden oder kontaktieren Sie den Support, falls das Problem fortbesteht.";
}
