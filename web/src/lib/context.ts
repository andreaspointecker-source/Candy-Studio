/**
 * Context-Management System
 * 
 * Verwaltet Kontext-Hierarchien für KI-Agents
 * mit Caching, Scoping und Prompt-Building
 */

export interface ContextVariable {
  key: string;
  value: any;
  metadata?: {
    type: "user" | "system" | "agent" | "task";
    scope: "global" | "project" | "session" | "task";
    timestamp: number;
    ttl?: number; // Time-to-live in ms
    source?: string;
  };
}

export interface ContextScope {
  id: string;
  name: string;
  parentId?: string; // Für Hierarchien
  variables: Map<string, ContextVariable>;
  children: Set<string>; // Kind-Scopes
}

export interface ContextSnapshot {
  scopeId: string;
  variables: Record<string, any>;
  timestamp: number;
}

export class ContextManager {
  private scopes: Map<string, ContextScope> = new Map();
  private rootScopeId: string;
  private currentScopeId: string;
  private snapshots: Map<string, ContextSnapshot[]> = new Map();
  private cacheEnabled: boolean;
  private cacheSize: number;
  private maxCacheSize: number = 1000;

  constructor(rootScopeId: string = "root", cacheEnabled: boolean = true) {
    this.rootScopeId = rootScopeId;
    this.currentScopeId = rootScopeId;
    this.cacheEnabled = cacheEnabled;
    this.cacheSize = 0;

    // Root-Scope erstellen
    this.createScope(rootScopeId, "Root Context");
  }

  /**
   * Erstellt einen neuen Scope
   */
  createScope(id: string, name: string, parentId?: string): ContextScope {
    // Prüfen ob Scope bereits existiert
    if (this.scopes.has(id)) {
      throw new Error(`Scope ${id} existiert bereits`);
    }

    // Prüfen ob Parent-Scope existiert (falls angegeben)
    if (parentId && !this.scopes.has(parentId)) {
      throw new Error(`Parent-Scope ${parentId} existiert nicht`);
    }

    const scope: ContextScope = {
      id,
      name,
      parentId,
      variables: new Map(),
      children: new Set(),
    };

    this.scopes.set(id, scope);

    // Zu Parent-Children hinzufügen
    if (parentId) {
      const parentScope = this.scopes.get(parentId)!;
      parentScope.children.add(id);
    }

    console.log(`[ContextManager] Created scope: ${name} (${id})`);
    return scope;
  }

  /**
   * Löscht einen Scope
   */
  deleteScope(scopeId: string): boolean {
    const scope = this.scopes.get(scopeId);
    if (!scope) return false;

    // Prüfen ob es der Root-Scope ist
    if (scopeId === this.rootScopeId) {
      throw new Error("Root-Scope kann nicht gelöscht werden");
    }

    // Kinder rekursiv löschen
    for (const childId of scope.children) {
      this.deleteScope(childId);
    }

    // Aus Parent-Children entfernen
    if (scope.parentId) {
      const parentScope = this.scopes.get(scope.parentId)!;
      parentScope.children.delete(scopeId);
    }

    // Scope löschen
    this.scopes.delete(scopeId);
    this.snapshots.delete(scopeId);

    console.log(`[ContextManager] Deleted scope: ${scopeId}`);
    return true;
  }

  /**
   * Wechselt den aktuellen Scope
   */
  switchScope(scopeId: string): void {
    if (!this.scopes.has(scopeId)) {
      throw new Error(`Scope ${scopeId} existiert nicht`);
    }
    this.currentScopeId = scopeId;
  }

  /**
   * Setzt eine Variable im aktuellen Scope
   */
  setVariable(
    key: string,
    value: any,
    metadata?: Partial<ContextVariable["metadata"]>
  ): void {
    const scope = this.scopes.get(this.currentScopeId)!;

    const variable: ContextVariable = {
      key,
      value,
      metadata: {
        type: metadata?.type || "user",
        scope: metadata?.scope || "session",
        timestamp: Date.now(),
        ttl: metadata?.ttl,
        source: metadata?.source,
      },
    };

    scope.variables.set(key, variable);

    // Cache prüfen
    if (this.cacheEnabled) {
      this.checkCacheSize();
    }
  }

  /**
   * Holt eine Variable (durchsucht Scope-Hierarchie)
   */
  getVariable(key: string): any | undefined {
    return this.getVariableInScope(key, this.currentScopeId);
  }

  /**
   * Holt eine Variable aus einem spezifischen Scope (durchsucht Hierarchie)
   */
  private getVariableInScope(key: string, scopeId: string): any | undefined {
    const scope = this.scopes.get(scopeId);
    if (!scope) return undefined;

    // Zuerst im aktuellen Scope suchen
    if (scope.variables.has(key)) {
      const variable = scope.variables.get(key)!;

      // TTL prüfen
      if (variable.metadata?.ttl) {
        const elapsed = Date.now() - variable.metadata.timestamp;
        if (elapsed > variable.metadata.ttl) {
          scope.variables.delete(key);
          return undefined;
        }
      }

      return variable.value;
    }

    // Rekursiv im Parent-Scope suchen
    if (scope.parentId) {
      return this.getVariableInScope(key, scope.parentId);
    }

    return undefined;
  }

  /**
   * Löscht eine Variable aus dem aktuellen Scope
   */
  deleteVariable(key: string): boolean {
    const scope = this.scopes.get(this.currentScopeId)!;
    return scope.variables.delete(key);
  }

  /**
   * Prüft ob eine Variable existiert
   */
  hasVariable(key: string): boolean {
    return this.getVariable(key) !== undefined;
  }

  /**
   * Holt alle Variablen aus dem aktuellen Scope (inkl. geerbte)
   */
  getAllVariables(): Record<string, any> {
    return this.getVariablesInScope(this.currentScopeId);
  }

  /**
   * Holt alle Variablen aus einem Scope (inkl. geerbte)
   */
  private getVariablesInScope(scopeId: string): Record<string, any> {
    const scope = this.scopes.get(scopeId);
    if (!scope) return {};

    let variables: Record<string, any> = {};

    // Geerbte Variablen rekursiv sammeln
    if (scope.parentId) {
      variables = this.getVariablesInScope(scope.parentId);
    }

    // Lokale Variablen hinzufügen (überschreiben geerbte)
    for (const [key, variable] of scope.variables.entries()) {
      // TTL prüfen
      if (variable.metadata?.ttl) {
        const elapsed = Date.now() - variable.metadata.timestamp;
        if (elapsed <= variable.metadata.ttl) {
          variables[key] = variable.value;
        }
      } else {
        variables[key] = variable.value;
      }
    }

    return variables;
  }

  /**
   * Erstellt ein Snapshot des aktuellen Scopes
   */
  createSnapshot(snapshotId: string): ContextSnapshot {
    const variables = this.getAllVariables();
    const snapshot: ContextSnapshot = {
      scopeId: this.currentScopeId,
      variables,
      timestamp: Date.now(),
    };

    const snapshots = this.snapshots.get(snapshotId) || [];
    snapshots.push(snapshot);
    this.snapshots.set(snapshotId, snapshots);

    console.log(`[ContextManager] Created snapshot: ${snapshotId}`);
    return snapshot;
  }

  /**
   * Stellt einen Snapshot wieder her
   */
  restoreSnapshot(snapshotId: string, index: number = -1): void {
    const snapshots = this.snapshots.get(snapshotId);
    if (!snapshots || snapshots.length === 0) {
      throw new Error(`Snapshot ${snapshotId} nicht gefunden`);
    }

    const snapshot = index < 0 ? snapshots[snapshots.length - 1] : snapshots[index];

    // Alle Variablen im Scope löschen
    const scope = this.scopes.get(snapshot.scopeId)!;
    scope.variables.clear();

    // Variablen aus Snapshot wiederherstellen
    for (const [key, value] of Object.entries(snapshot.variables)) {
      scope.variables.set(key, {
        key,
        value,
        metadata: {
          type: "user",
          scope: "session",
          timestamp: Date.now(),
        },
      });
    }

    console.log(`[ContextManager] Restored snapshot: ${snapshotId}`);
  }

  /**
   * Löscht einen Snapshot
   */
  deleteSnapshot(snapshotId: string, index?: number): void {
    const snapshots = this.snapshots.get(snapshotId);
    if (!snapshots) return;

    if (index !== undefined) {
      snapshots.splice(index, 1);
    } else {
      this.snapshots.delete(snapshotId);
    }

    if (snapshots.length === 0) {
      this.snapshots.delete(snapshotId);
    }
  }

  /**
   * Baut einen Prompt aus dem Kontext auf
   */
  buildPrompt(template: string): string {
    const variables = this.getAllVariables();

    // Template-Platzhalter ersetzen
    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      prompt = prompt.replace(new RegExp(placeholder, "g"), String(value));
    }

    return prompt;
  }

  /**
   * Komprimiert den Kontext für LLM-Verwendung
   */
  compressContext(maxTokens: number = 4000): string {
    const variables = this.getAllVariables();
    const contextParts: string[] = [];
    let usedTokens = 0;

    for (const [key, value] of Object.entries(variables)) {
      const strValue = String(value);
      const estimatedTokens = strValue.length / 4; // Grobe Schätzung

      if (usedTokens + estimatedTokens > maxTokens) {
        break;
      }

      contextParts.push(`${key}: ${strValue}`);
      usedTokens += estimatedTokens;
    }

    return contextParts.join("\n");
  }

  /**
   * Prüft die Cache-Größe und löscht wenn nötig
   */
  private checkCacheSize(): void {
    let totalSize = 0;

    for (const scope of this.scopes.values()) {
      totalSize += scope.variables.size;
    }

    this.cacheSize = totalSize;

    if (totalSize > this.maxCacheSize) {
      this.pruneCache();
    }
  }

  /**
   * Löscht alte Variablen aus dem Cache
   */
  private pruneCache(): void {
    const now = Date.now();

    for (const scope of this.scopes.values()) {
      const toDelete: string[] = [];

      for (const [key, variable] of scope.variables.entries()) {
        // Alte Variabten ohne TTL löschen
        if (!variable.metadata?.ttl) {
          const timestamp = variable.metadata?.timestamp || 0;
          const age = now - timestamp;
          if (age > 3600000) {
            // 1 Stunde
            toDelete.push(key);
          }
        }
      }

      toDelete.forEach((key) => scope.variables.delete(key));
    }

    console.log(`[ContextManager] Pruned cache: ${this.cacheSize} -> ${this.cacheSize}`);
  }

  /**
   * Holt alle Scopes
   */
  getAllScopes(): ContextScope[] {
    return Array.from(this.scopes.values());
  }

  /**
   * Holt den aktuellen Scope
   */
  getCurrentScope(): ContextScope {
    return this.scopes.get(this.currentScopeId)!;
  }

  /**
   * Gibt Statistiken zurück
   */
  getStats(): {
    totalScopes: number;
    currentScopeId: string;
    totalVariables: number;
    totalSnapshots: number;
    cacheEnabled: boolean;
    cacheSize: number;
  } {
    let totalVariables = 0;

    for (const scope of this.scopes.values()) {
      totalVariables += scope.variables.size;
    }

    return {
      totalScopes: this.scopes.size,
      currentScopeId: this.currentScopeId,
      totalVariables,
      totalSnapshots: this.snapshots.size,
      cacheEnabled: this.cacheEnabled,
      cacheSize: this.cacheSize,
    };
  }

  /**
   * Löscht alle Variablen und Scopes
   */
  clear(): void {
    const scopeIds = Array.from(this.scopes.keys());

    for (const scopeId of scopeIds) {
      if (scopeId !== this.rootScopeId) {
        this.deleteScope(scopeId);
      }
    }

    // Root-Scope zurücksetzen
    const rootScope = this.scopes.get(this.rootScopeId)!;
    rootScope.variables.clear();
    rootScope.children.clear();
    this.currentScopeId = this.rootScopeId;

    this.snapshots.clear();
  }
}

let instance: ContextManager | null = null;

export function getContextManager(rootScopeId?: string): ContextManager {
  if (!instance) {
    instance = new ContextManager(rootScopeId);
  }
  return instance;
}
