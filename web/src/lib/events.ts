/**
 * Event-System für Kaiban Studio
 * 
 * Ein flexibles Event-System für lose Kopplung zwischen Komponenten.
 * Unterstützt synchrone und asynchrone Event-Handler.
 */

/**
 * Verfügbare Event-Typen im System
 */
export enum EventType {
  TASK_START = 'task:start',
  TASK_COMPLETE = 'task:complete',
  TASK_FAILED = 'task:failed',
  TASK_FIX = 'task:fix',
  PROJECT_CREATE = 'project:create',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  AGENT_EXECUTE = 'agent:execute',
  ERROR_OCCURRED = 'error:occurred',
  WORKFLOW_START = 'workflow:start',
  WORKFLOW_COMPLETE = 'workflow:complete',
  WORKFLOW_FAILED = 'workflow:failed',
  LOG_ENTRY = 'log:entry',
}

/**
 * Interface für Event-Payload
 */
export interface EventPayload<T = unknown> {
  type: EventType;
  timestamp: string;
  data: T;
  source?: string; // Optional: Quelle des Events
  correlationId?: string; // Optional: Korrelation für zusammengehörige Events
}

/**
 * Type für Event-Handler
 */
export type EventHandler<T = unknown> = (payload: EventPayload<T>) => void | Promise<void>;

/**
 * Event-History-Eintrag für Debugging
 */
export interface EventHistoryEntry {
  event: EventPayload;
  timestamp: string;
  handlerCount: number;
}

/**
 * Event-Listener mit Optionen (intern)
 */
type ListenerEntry = {
  handler: EventHandler;
  once: boolean;
  priority: number;
};

/**
 * Event-Manager Klasse
 * 
 * Zentrales Event-System für die gesamte Anwendung.
 */
export class EventManager {
  private listeners: Map<EventType, ListenerEntry[]> = new Map();
  private history: EventHistoryEntry[] = [];
  private maxHistorySize: number = 100;
  private wildcards: ListenerEntry[] = [];

  /**
   * Einen Event-Listener registrieren
   * 
   * @param type - Event-Typ oder '*' für alle Events
   * @param handler - Handler-Funktion
   * @param options - Optionen für den Listener
   * @returns - Unregister-Funktion
   */
  on<T = unknown>(
    type: EventType | '*',
    handler: EventHandler<T>,
    options: { once?: boolean; priority?: number } = {}
  ): () => void {
    const entry: ListenerEntry = {
      handler: handler as EventHandler,
      once: options.once ?? false,
      priority: options.priority ?? 0,
    };

    if (type === '*') {
      this.wildcards.push(entry);
      this.wildcards.sort((a, b) => b.priority - a.priority);
    } else {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, []);
      }
      const list = this.listeners.get(type)!;
      list.push(entry);
      list.sort((a, b) => b.priority - a.priority);
    }

    // Unregister-Funktion zurückgeben
    return () => this.off(type, handler);
  }

  /**
   * Einen Event-Listener entfernen
   * 
   * @param type - Event-Typ oder '*'
   * @param handler - Handler-Funktion
   */
  off<T = unknown>(type: EventType | '*', handler: EventHandler<T>): void {
    if (type === '*') {
      this.wildcards = this.wildcards.filter(
        (entry) => entry.handler !== (handler as EventHandler)
      );
    } else {
      const list = this.listeners.get(type);
      if (list) {
        this.listeners.set(
          type,
          list.filter((entry) => entry.handler !== (handler as EventHandler))
        );
      }
    }
  }

  /**
   * Ein Event synchron ausgeben
   * 
   * @param type - Event-Typ
   * @param data - Event-Daten
   * @param options - Zusätzliche Optionen
   */
  emit<T = unknown>(
    type: EventType,
    data: T,
    options: { source?: string; correlationId?: string } = {}
  ): void {
    const payload: EventPayload<T> = {
      type,
      timestamp: new Date().toISOString(),
      data,
      source: options.source,
      correlationId: options.correlationId,
    };

    // History-Eintrag hinzufügen
    this.addToHistory(payload);

    // Wildcard-Listener ausführen
    this.executeListeners(this.wildcards, payload);

    // Typ-spezifische Listener ausführen
    const listeners = this.listeners.get(type);
    if (listeners) {
      this.executeListeners(listeners, payload);
    }
  }

  /**
   * Ein Event asynchron ausgeben
   * 
   * @param type - Event-Typ
   * @param data - Event-Daten
   * @param options - Zusätzliche Optionen
   * @returns - Promise, das auf alle Handler wartet
   */
  async emitAsync<T = unknown>(
    type: EventType,
    data: T,
    options: { source?: string; correlationId?: string } = {}
  ): Promise<void> {
    const payload: EventPayload<T> = {
      type,
      timestamp: new Date().toISOString(),
      data,
      source: options.source,
      correlationId: options.correlationId,
    };

    // History-Eintrag hinzufügen
    this.addToHistory(payload);

    // Alle Handler asynchron ausführen
    const handlers: Promise<void>[] = [];

    // Wildcard-Listener
    handlers.push(
      ...this.wildcards.map((entry) => this.executeListenerAsync(entry, payload))
    );

    // Typ-spezifische Listener
    const listeners = this.listeners.get(type);
    if (listeners) {
      handlers.push(
        ...listeners.map((entry) => this.executeListenerAsync(entry, payload))
      );
    }

    await Promise.all(handlers);
  }

  /**
   * Einmaliger Listener registrieren (Sugar)
   */
  once<T = unknown>(type: EventType, handler: EventHandler<T>): () => void {
    return this.on(type, handler, { once: true });
  }

  /**
   * Listener für mehrere Event-Typen registrieren
   */
  onAny<T = unknown>(
    types: EventType[],
    handler: EventHandler<T>,
    options?: { once?: boolean; priority?: number }
  ): () => void {
    const unregisters: (() => void)[] = [];

    for (const eventType of types) {
      unregisters.push(this.on(eventType, handler, options));
    }

    // Gibt eine Funktion zurück, die alle Listener deregistriert
    return () => unregisters.forEach((unregister) => unregister());
  }

  /**
   * Alle Listener für einen Event-Typ entfernen
   */
  removeAllListeners(type?: EventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
      this.wildcards = [];
    }
  }

  /**
   * Event-History abrufen
   */
  getHistory(): EventHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Event-History für einen bestimmten Typ abrufen
   */
  getHistoryByType(type: EventType): EventHistoryEntry[] {
    return this.history.filter((entry) => entry.event.type === type);
  }

  /**
   * Event-History löschen
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Anzahl der Listener für einen Event-Typ abrufen
   */
  listenerCount(type: EventType): number {
    return this.listeners.get(type)?.length ?? 0;
  }

  /**
   * Alle registrierten Event-Typen abrufen
   */
  getRegisteredEventTypes(): EventType[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Private Methoden
   */
  private addToHistory<T>(event: EventPayload<T>): void {
    const handlerCount = this.listenerCount(event.type) + this.wildcards.length;
    
    this.history.push({
      event,
      timestamp: new Date().toISOString(),
      handlerCount,
    });

    // History-Größe begrenzen
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  private executeListeners<T>(listeners: ListenerEntry[], payload: EventPayload<T>): void {
    // Listener-Kopie erstellen, um Änderungen während der Iteration zu vermeiden
    const listenersCopy = [...listeners];

    for (const entry of listenersCopy) {
      try {
        entry.handler(payload);

        // Once-Listener nach Ausführung entfernen
        if (entry.once) {
          this.off(payload.type, entry.handler);
        }
      } catch (error) {
        console.error(`[EventManager] Error executing handler for ${payload.type}:`, error);
        
        // Fehler als Event ausgeben
        this.emit(EventType.ERROR_OCCURRED, {
          originalEvent: payload.type,
          error: error instanceof Error ? error.message : String(error),
        }, { source: 'EventManager' });
      }
    }
  }

  private async executeListenerAsync<T>(
    entry: ListenerEntry,
    payload: EventPayload<T>
  ): Promise<void> {
    try {
      await entry.handler(payload);

      // Once-Listener nach Ausführung entfernen
      if (entry.once) {
        this.off(payload.type, entry.handler);
      }
    } catch (error) {
      console.error(`[EventManager] Error executing async handler for ${payload.type}:`, error);
      
      // Fehler als Event ausgeben
      await this.emitAsync(EventType.ERROR_OCCURRED, {
        originalEvent: payload.type,
        error: error instanceof Error ? error.message : String(error),
      }, { source: 'EventManager' });
    }
  }
}

/**
 * Singleton-Instanz des EventManagers
 * 
 * Verwende diese Instanz für globale Events.
 */
export const eventManager = new EventManager();

/**
 * Convenience-Funktionen
 */
export const emit = <T = unknown>(type: EventType, data: T, options?: { source?: string; correlationId?: string }) => {
  return eventManager.emit(type, data, options);
};

export const emitAsync = <T = unknown>(type: EventType, data: T, options?: { source?: string; correlationId?: string }) => {
  return eventManager.emitAsync(type, data, options);
};

export const on = <T = unknown>(
  type: EventType | '*',
  handler: EventHandler<T>,
  options?: { once?: boolean; priority?: number }
) => {
  return eventManager.on(type, handler, options);
};

export const once = <T = unknown>(type: EventType, handler: EventHandler<T>) => {
  return eventManager.once(type, handler);
};

export const off = <T = unknown>(type: EventType | '*', handler: EventHandler<T>) => {
  return eventManager.off(type, handler);
};

export const removeAllListeners = (type?: EventType) => {
  return eventManager.removeAllListeners(type);
};

export const getHistory = () => {
  return eventManager.getHistory();
};

export const listenerCount = (type: EventType) => {
  return eventManager.listenerCount(type);
};
