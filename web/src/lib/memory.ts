/**
 * Memory-Management System für Agents
 * 
 * Speichert und verwaltet Kontext-Informationen für KI-Agents
 * mit Unterstützung für Importance Scoring und Vector Similarity Search
 */

export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: number;
  importance: number; // 0-1 Score
  accessCount: number;
  lastAccessed: number;
  metadata?: {
    type: "conversation" | "fact" | "procedure" | "experience";
    source?: string;
    relatedTo?: string[];
  };
  embedding?: number[]; // Vektor-Embedding für Similarity Search
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  similarity: number;
}

export class MemoryManager {
  private memories: Map<string, MemoryEntry> = new Map();
  private maxMemories: number;
  private importanceDecay: number;

  constructor(
    maxMemories: number = 1000,
    importanceDecay: number = 0.001
  ) {
    this.maxMemories = maxMemories;
    this.importanceDecay = importanceDecay;
  }

  /**
   * Fügt eine neue Erinnerung hinzu
   */
  addMemory(content: string, metadata?: MemoryEntry["metadata"]): MemoryEntry {
    const id = this.generateId();
    const entry: MemoryEntry = {
      id,
      content,
      timestamp: Date.now(),
      importance: this.calculateInitialImportance(content, metadata),
      accessCount: 0,
      lastAccessed: Date.now(),
      metadata,
    };

    this.memories.set(id, entry);
    this.pruneIfNeeded();

    return entry;
  }

  /**
   * Holt eine Erinnerung anhand der ID
   */
  getMemory(id: string): MemoryEntry | undefined {
    const entry = this.memories.get(id);
    if (entry) {
      // Access-Statistik aktualisieren
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.memories.set(id, entry);
    }
    return entry;
  }

  /**
   * Sucht nach ähnlichen Erinnerungen (Vector Similarity)
   */
  async searchSimilar(
    query: string,
    limit: number = 5
  ): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];

    // In einer echten Implementierung würden wir hier
    // Vektor-Embeddings generieren und Cosine Similarity berechnen
    for (const entry of this.memories.values()) {
      const similarity = this.calculateTextSimilarity(query, entry.content);
      if (similarity > 0.1) {
        // Nur Ergebnisse mit relevanter Similarity
        results.push({ entry, similarity });
      }
    }

    // Nach Similarity sortieren
    results.sort((a, b) => b.similarity - a.similarity);

    // Top Ergebnisse zurückgeben
    return results.slice(0, limit);
  }

  /**
   * Holt kontextbezogene Erinnerungen
   */
  getContextualMemories(
    relatedIds: string[],
    limit: number = 10
  ): MemoryEntry[] {
    const results: MemoryEntry[] = [];

    for (const entry of this.memories.values()) {
      // Prüfen ob relatedTo übereinstimmt
      if (entry.metadata?.relatedTo?.some((id) => relatedIds.includes(id))) {
        results.push(entry);
      }
    }

    // Nach Importance sortieren
    results.sort((a, b) => b.importance - a.importance);

    return results.slice(0, limit);
  }

  /**
   * Holt die wichtigsten Erinnerungen
   */
  getImportantMemories(limit: number = 20): MemoryEntry[] {
    const entries = Array.from(this.memories.values());
    entries.sort((a, b) => {
      // Importance basierend auf Score, Access-Frequenz und Recency
      const scoreA =
        a.importance +
        Math.log(a.accessCount + 1) * 0.1 -
        (Date.now() - a.lastAccessed) * this.importanceDecay;
      const scoreB =
        b.importance +
        Math.log(b.accessCount + 1) * 0.1 -
        (Date.now() - b.lastAccessed) * this.importanceDecay;
      return scoreB - scoreA;
    });

    return entries.slice(0, limit);
  }

  /**
   * Löscht eine Erinnerung
   */
  removeMemory(id: string): boolean {
    return this.memories.delete(id);
  }

  /**
   * Aktualisiert eine Erinnerung
   */
  updateMemory(
    id: string,
    updates: Partial<Omit<MemoryEntry, "id" | "timestamp" | "accessCount">>
  ): boolean {
    const entry = this.memories.get(id);
    if (!entry) return false;

    const updated = {
      ...entry,
      ...updates,
      lastAccessed: Date.now(),
    };

    this.memories.set(id, updated);
    return true;
  }

  /**
   * Löscht alle Erinnerungen
   */
  clear(): void {
    this.memories.clear();
  }

  /**
   * Gibt Statistiken zurück
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    avgImportance: number;
  } {
    const entries = Array.from(this.memories.values());
    const total = entries.length;

    const byType: Record<string, number> = {};
    let totalImportance = 0;

    for (const entry of entries) {
      const type = entry.metadata?.type || "unknown";
      byType[type] = (byType[type] || 0) + 1;
      totalImportance += entry.importance;
    }

    return {
      total,
      byType,
      avgImportance: total > 0 ? totalImportance / total : 0,
    };
  }

  /**
   * Speichert Erinnerungen persistent
   */
  async save(path: string): Promise<void> {
    const data = Array.from(this.memories.values());
    // In einer echten Implementierung würde hier die Speicherung in Datei/DB erfolgen
    console.log(`[MemoryManager] Saving ${data.length} memories to ${path}`);
  }

  /**
   * Lädt Erinnerungen aus persistentem Speicher
   */
  async load(path: string): Promise<void> {
    // In einer echten Implementierung würde hier das Laden aus Datei/DB erfolgen
    console.log(`[MemoryManager] Loading memories from ${path}`);
  }

  // --- Private Helper-Methoden ---

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateInitialImportance(
    content: string,
    metadata?: MemoryEntry["metadata"]
  ): number {
    let score = 0.5; // Basis-Importance

    // Länge des Contents (kürzere = höhere Relevanz)
    const lengthScore = 1 - Math.min(content.length / 1000, 1);
    score += lengthScore * 0.2;

    // Typ-basierte Scoring
    if (metadata?.type === "procedure") score += 0.2; // Prozeduren sind wichtig
    if (metadata?.type === "fact") score += 0.15; // Fakten sind wichtig
    if (metadata?.type === "conversation") score += 0.1; // Gespräche sind wichtig

    // Clamp zu [0, 1]
    return Math.max(0, Math.min(1, score));
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Einfache Jaccard-Ähnlichkeit für Text
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  private pruneIfNeeded(): void {
    if (this.memories.size <= this.maxMemories) return;

    // Sortieren nach Importance + Recency
    const entries = Array.from(this.memories.entries());
    entries.sort(([, a], [, b]) => {
      const scoreA =
        a.importance -
        (Date.now() - a.lastAccessed) * this.importanceDecay;
      const scoreB =
        b.importance -
        (Date.now() - b.lastAccessed) * this.importanceDecay;
      return scoreB - scoreA;
    });

    // Wichtigste Erinnerungen behalten
    const keepCount = Math.floor(this.maxMemories * 0.9);
    entries.slice(keepCount).forEach(([id]) => this.memories.delete(id));

    console.log(`[MemoryManager] Pruned ${entries.length - keepCount} memories`);
  }
}

// --- Singleton-Instance ---

let instance: MemoryManager | null = null;

export function getMemoryManager(): MemoryManager {
  if (!instance) {
    instance = new MemoryManager();
  }
  return instance;
}
