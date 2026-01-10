/**
 * Fehler-Parser zum Extrahieren von Dateipfaden aus Fehlermeldungen
 * Unterstützt verschiedene Sprachen und Fehlerformate
 */

export interface ParsedError {
  filePath: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  errorType: "syntax" | "runtime" | "import" | "type" | "test" | "unknown";
  errorMessage: string;
  rawMessage: string;
}

/**
 * Regex-Patterns für verschiedene Fehlerformate
 */
const ERROR_PATTERNS = [
  // JavaScript/TypeScript Syntax Errors
  {
    regex: /SyntaxError:.*?\s+at\s+(.+?):(\d+):(\d+)/i,
    errorType: "syntax" as const,
    groups: [1, 2, 3], // filePath, line, column
  },
  // JavaScript/TypeScript Reference Errors
  {
    regex: /ReferenceError:.*?\s+at\s+(.+?):(\d+):(\d+)/i,
    errorType: "runtime" as const,
    groups: [1, 2, 3],
  },
  // JavaScript/TypeScript Type Errors
  {
    regex: /Type error:.*?\s+at\s+(.+?):(\d+):(\d+)/i,
    errorType: "type" as const,
    groups: [1, 2, 3],
  },
  // Python Syntax Errors
  {
    regex: /File "(.+?)", line (\d+)/i,
    errorType: "syntax" as const,
    groups: [1, 2], // filePath, line
  },
  // Python Import Errors
  {
    regex: /ImportError:.*?from\s+(.+?)(?:\s+at|\s*$)/i,
    errorType: "import" as const,
    groups: [1], // filePath
  },
  // Python Tracebacks
  {
    regex: /Traceback[\s\S]*?File "(.+?)", line (\d+)/i,
    errorType: "runtime" as const,
    groups: [1, 2],
  },
  // Jest/Testing Errors
  {
    regex: /at\s+(.+?):(\d+):(\d+)/i,
    errorType: "test" as const,
    groups: [1, 2, 3],
  },
  // ESLint Errors
  {
    regex: /(.+?):(\d+):(\d+):\s+error\s+/i,
    errorType: "type" as const,
    groups: [1, 2, 3],
  },
  // TypeScript Errors (ts format)
  {
    regex: /(.+?):(\d+):(\d+):\s+error\s+TS\d+:/i,
    errorType: "type" as const,
    groups: [1, 2, 3],
  },
  // Generic file path at line number
  {
    regex: /([a-zA-Z0-9_\-\.\/\\]+)\s*(?:at|line|row)?\s*(?::|\s+)?(\d+)/i,
    errorType: "unknown" as const,
    groups: [1, 2],
  },
];

/**
 * Normalisiert Dateipfade zu relativen Pfaden
 */
function normalizeFilePath(filePath: string): string {
  // Entferne führende "at " und Whitespace
  filePath = filePath.replace(/^\s*at\s+/i, "").trim();
  
  // Konvertiere Backslashes zu Forward Slashes
  filePath = filePath.replace(/\\/g, "/");
  
  // Entferne duplizierte Slashes
  filePath = filePath.replace(/\/+/g, "/");
  
  // Entferne führende Slashes für relative Pfade
  if (filePath.startsWith("/") && !filePath.startsWith("/home") && !filePath.startsWith("/Users")) {
    filePath = filePath.substring(1);
  }
  
  return filePath;
}

/**
 * Extrahiert den eigentlichen Fehlertext aus der Fehlermeldung
 */
function extractErrorMessage(rawMessage: string): string {
  // Verschiedene Fehler-Keywords zu identifizieren
  const errorKeywords = [
    "SyntaxError:",
    "ReferenceError:",
    "TypeError:",
    "ImportError:",
    "Error:",
    "RuntimeError:",
    "AssertionError:",
  ];
  
  for (const keyword of errorKeywords) {
    if (rawMessage.includes(keyword)) {
      const start = rawMessage.indexOf(keyword);
      const end = rawMessage.indexOf("\n", start);
      if (end !== -1) {
        return rawMessage.substring(start, end).trim();
      }
      return rawMessage.substring(start).trim();
    }
  }
  
  // Wenn kein Keyword gefunden, nimm die erste Zeile
  const firstLine = rawMessage.split("\n")[0];
  return firstLine || rawMessage;
}

/**
 * Hauptfunktion zum Parsen einer Fehlermeldung
 */
export function parseError(rawMessage: string): ParsedError {
  const trimmed = rawMessage.trim();
  
  // Durchsuche alle Muster
  for (const pattern of ERROR_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      const filePath = normalizeFilePath(match[pattern.groups[0]]);
      const lineNumber = pattern.groups[1] ? parseInt(match[pattern.groups[1]], 10) || null : null;
      const columnNumber = pattern.groups[2] ? parseInt(match[pattern.groups[2]], 10) || null : null;
      
      return {
        filePath,
        lineNumber,
        columnNumber,
        errorType: pattern.errorType,
        errorMessage: extractErrorMessage(trimmed),
        rawMessage: trimmed,
      };
    }
  }
  
  // Wenn kein Muster gefunden, gib Basis-Informationen zurück
  return {
    filePath: null,
    lineNumber: null,
    columnNumber: null,
    errorType: "unknown",
    errorMessage: extractErrorMessage(trimmed),
    rawMessage: trimmed,
  };
}

/**
 * Prüft, ob eine Fehlermeldung einen Dateipfad enthält
 */
export function hasFilePath(error: ParsedError): boolean {
  return error.filePath !== null && error.filePath.length > 0;
}

/**
 * Erstellt einen fokussierten Kontext-String für die KI
 */
export function createErrorContext(error: ParsedError, workspaceRoot: string): string {
  if (!hasFilePath(error)) {
    return `Kein Dateipfad im Fehler gefunden.\n\nFehlermeldung:\n${error.errorMessage}`;
  }
  
  let context = `Fehler in Datei: ${error.filePath}`;
  
  if (error.lineNumber) {
    context += ` (Zeile ${error.lineNumber}`;
    if (error.columnNumber) {
      context += `, Spalte ${error.columnNumber}`;
    }
    context += ")";
  }
  
  context += `\n\nFehlerart: ${error.errorType}`;
  context += `\n\nFehlermeldung:\n${error.errorMessage}`;
  
  return context;
}

/**
 * Extrahiert mehrere Dateipfade aus einer Fehlermeldung
 * (für komplexe Fehler mit mehreren beteiligten Dateien)
 */
export function extractAllFilePaths(rawMessage: string): string[] {
  const paths = new Set<string>();
  
  // Alle Dateipfade extrahieren (einfaches Regex für Dateipfade)
  const filePathRegex = /([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9]+)/g;
  let match;
  
  while ((match = filePathRegex.exec(rawMessage)) !== null) {
    const path = normalizeFilePath(match[1]);
    // Filtere Pfade, die zu lang oder offensichtlich keine Dateipfade sind
    if (path.length < 200 && path.includes(".")) {
      paths.add(path);
    }
  }
  
  return Array.from(paths);
}
