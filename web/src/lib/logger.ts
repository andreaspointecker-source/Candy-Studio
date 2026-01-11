/**
 * Logger Klasse für strukturiertes Logging mit JSON-Formatierung
 * Basiert auf modernen Logging-Practices für TypeScript
 */

import { eventManager, EventType } from './events';

/**
 * LogLevel Enum für verschiedene Log-Level
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * LogEntry Interface für strukturierte Log-Einträge
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  correlationId?: string;
  module?: string;
  performance?: {
    duration?: number;
    memory?: {
      used: number;
      total: number;
    };
  };
}

/**
 * Logger-Konfiguration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableJson: boolean;
  enableTimestamp: boolean;
  enableCorrelationIds: boolean;
  enableEvents: boolean; // Events senden aktivieren
  maxLogSize?: number;
  rotationSize?: number;
  rotationInterval?: number;
}

/**
 * Logger Klasse
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private currentLogSize = 0;
  private correlationId?: string;
  private rotationTimer?: NodeJS.Timeout;

  public constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      enableJson: true,
      enableTimestamp: true,
      enableCorrelationIds: true,
      enableEvents: true, // Events standardmäßig aktivieren
      maxLogSize: 1000,
      rotationSize: 1024 * 1024, // 1MB
      rotationInterval: 60 * 60 * 1000, // 1 Stunde
      ...config,
    };

    this.startRotationTimer();
  }

  /**
   * Singleton-Instanz abrufen
   */
  public static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Log-Level zur Laufzeit ändern
   */
  public setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Events aktivieren/deaktivieren
   */
  public setEnableEvents(enable: boolean): void {
    this.config.enableEvents = enable;
  }

  /**
   * Correlation-ID setzen (für Request-Tracking)
   */
  public setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Correlation-ID löschen
   */
  public clearCorrelationId(): void {
    this.correlationId = undefined;
  }

  /**
   * DEBUG-Level loggen
   */
  public debug(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.DEBUG, message, context, error);
  }

  /**
   * INFO-Level loggen
   */
  public info(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.INFO, message, context, error);
  }

  /**
   * WARN-Level loggen
   */
  public warn(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  /**
   * ERROR-Level loggen
   */
  public error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * FATAL-Level loggen
   */
  public fatal(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Haupt-Methode zum Loggen
   */
  public log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
    module?: string
  ): void {
    // Log-Level prüfen
    if (level < this.config.level) {
      return;
    }

    // LogEntry erstellen
    const entry: LogEntry = {
      timestamp: this.config.enableTimestamp ? new Date().toISOString() : '',
      level,
      levelName: LogLevel[level],
      message,
      context,
      error,
      correlationId: this.config.enableCorrelationIds ? this.correlationId : undefined,
      module,
    };

    // Performance-Metrics hinzufügen
    if (context?.performance) {
      entry.performance = {
        duration: context.performance as number,
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
      };
    }

    // Logs speichern
    this.addToLogs(entry);

    // Console-Output
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Event senden
    if (this.config.enableEvents) {
      this.emitLogEvent(entry);
    }

    // File-Output (simuliert - in Produktion könnte dies in Dateien schreiben)
    if (this.config.enableFile) {
      // File-Logik könnte hier implementiert werden
    }
  }

  /**
   * Log zur Logs-Liste hinzufügen
   */
  private addToLogs(entry: LogEntry): void {
    this.logs.push(entry);
    this.currentLogSize += JSON.stringify(entry).length;

    // Max-Länge prüfen und Rotation durchführen
    if (this.logs.length > this.config.maxLogSize!) {
      this.logs.shift();
    }

    // Rotation basierend auf Größe
    if (this.currentLogSize > this.config.rotationSize!) {
      this.rotateLogs();
    }
  }

  /**
   * Console-Logging
   */
  private logToConsole(entry: LogEntry): void {
    const logMessage = this.config.enableJson
      ? JSON.stringify(entry, null, 2)
      : this.formatLogMessage(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.log(`[DEBUG] ${logMessage}`);
        break;
      case LogLevel.INFO:
        console.info(`[INFO] ${logMessage}`);
        break;
      case LogLevel.WARN:
        console.warn(`[WARN] ${logMessage}`);
        break;
      case LogLevel.ERROR:
        console.error(`[ERROR] ${logMessage}`);
        break;
      case LogLevel.FATAL:
        console.error(`[FATAL] ${logMessage}`);
        break;
    }
  }

  /**
   * Log-Nachricht formatieren (nicht-JSON)
   */
  private formatLogMessage(entry: LogEntry): string {
    const parts: string[] = [];

    if (entry.timestamp) {
      parts.push(entry.timestamp);
    }

    if (entry.module) {
      parts.push(`[${entry.module}]`);
    }

    if (entry.correlationId) {
      parts.push(`(CID: ${entry.correlationId})`);
    }

    parts.push(entry.message);

    if (entry.context) {
      parts.push(`Context: ${JSON.stringify(entry.context)}`);
    }

    if (entry.error) {
      parts.push(`Error: ${entry.error.message}`);
    }

    return parts.join(' ');
  }

  /**
   * Event für Log-Eintrag senden
   */
  private emitLogEvent(entry: LogEntry): void {
    try {
      eventManager.emit(
        EventType.LOG_ENTRY,
        {
          ...entry,
          // Error-Objekte serialisierbar machen
          error: entry.error ? {
            message: entry.error.message,
            stack: entry.error.stack,
            name: entry.error.name,
          } : undefined,
        },
        {
          correlationId: entry.correlationId,
          source: entry.module || 'Logger',
        }
      );
    } catch (error) {
      // Fehler beim Event-Sending nicht logger (um Zyklen zu vermeiden)
      console.error('[Logger] Failed to emit log event:', error);
    }
  }

  /**
   * Log-Rotation starten
   */
  private startRotationTimer(): void {
    if (this.config.rotationInterval) {
      this.rotationTimer = setInterval(() => {
        this.rotateLogs();
      }, this.config.rotationInterval);
    }
  }

  /**
   * Log-Rotation durchführen
   */
  private rotateLogs(): void {
    const rotatedLogs = this.logs;
    this.logs = [];
    this.currentLogSize = 0;

    // Rotierte Logs könnten hier gespeichert oder versendet werden
    console.info(`Log rotation performed. Rotated ${rotatedLogs.length} entries.`);
  }

  /**
   * Alle Logs abrufen
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Logs nach Level filtern
   */
  public getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Logs nach Correlation-ID filtern
   */
  public getLogsByCorrelationId(correlationId: string): LogEntry[] {
    return this.logs.filter((log) => log.correlationId === correlationId);
  }

  /**
   * Logs nach Zeitraum filtern
   */
  public getLogsByTimeRange(start: Date, end: Date): LogEntry[] {
    const startTime = start.getTime();
    const endTime = end.getTime();

    return this.logs.filter((log) => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= startTime && logTime <= endTime;
    });
  }

  /**
   * Logger aufräumen
   */
  public destroy(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    this.logs = [];
    this.currentLogSize = 0;
  }

  /**
   * Performance-Mesung helper
   */
  public measurePerformance<T>(
    operation: string,
    fn: () => T,
    context?: Record<string, unknown>
  ): T {
    const startTime = performance.now();
    const result = fn();
    const duration = performance.now() - startTime;

    this.debug(
      `Performance: ${operation}`,
      { ...context, performance: duration },
      undefined,
      'performance'
    );

    return result;
  }

  /**
   * Async Performance-Mesung helper
   */
  public async measurePerformanceAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.debug(
        `Performance: ${operation}`,
        { ...context, performance: duration },
        undefined,
        'performance'
      );

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.error(
        `Performance Error: ${operation}`,
        { ...context, performance: duration },
        error as Error
      );
      throw error;
    }
  }
}

// Singleton-Instanz exportieren
export const logger = Logger.getInstance();

// Hilfsfunktionen für verschiedene Module
export class ModuleLogger {
  private logger: Logger;
  private module: string;

  constructor(logger: Logger, module: string) {
    this.logger = logger;
    this.module = module;
  }

  public debug(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.logger.log(LogLevel.DEBUG, message, context, error, this.module);
  }

  public info(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.logger.log(LogLevel.INFO, message, context, error, this.module);
  }

  public warn(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.logger.log(LogLevel.WARN, message, context, error, this.module);
  }

  public error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.logger.log(LogLevel.ERROR, message, context, error, this.module);
  }

  public fatal(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.logger.log(LogLevel.FATAL, message, context, error, this.module);
  }

  public getLogs(): LogEntry[] {
    return this.logger.getLogs();
  }
}

export function createLogger(module: string): ModuleLogger {
  const instance = Logger.getInstance();
  return new ModuleLogger(instance, module);
}
