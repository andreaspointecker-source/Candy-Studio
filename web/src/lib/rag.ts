/**
 * RAG (Retrieval-Augmented Generation) Integration
 * 
 * Kombiniert Vektor-Suche mit Kontext-Building für erweiterte KI-Antworten
 */

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
    type: "code" | "documentation" | "conversation" | "custom";
  };
  embedding?: number[]; // Vektor-Embedding
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  similarity: number;
}

export interface RetrievalOptions {
  maxChunks?: number;
  minSimilarity?: number;
  sourceFilter?: string[];
  typeFilter?: DocumentChunk["metadata"]["type"][];
}

export class RAGSystem {
  private documents: Map<string, DocumentChunk[]> = new Map();
  private embeddingDimension: number;

  constructor(embeddingDimension: number = 1536) {
    this.embeddingDimension = embeddingDimension;
  }

  /**
   * Fügt Dokument-Chunks zum Index hinzu
   */
  addDocument(chunks: DocumentChunk[]): void {
    chunks.forEach((chunk) => {
      const existing = this.documents.get(chunk.metadata.source) || [];
      existing.push(chunk);
      this.documents.set(chunk.metadata.source, existing);
    });
  }

  /**
   * Sucht nach relevanten Dokument-Chunks
   */
  async retrieve(
    query: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult[]> {
    const {
      maxChunks = 10,
      minSimilarity = 0.1,
      sourceFilter,
      typeFilter,
    } = options;

    const results: RetrievalResult[] = [];

    // Alle Chunks sammeln
    for (const chunks of this.documents.values()) {
      for (const chunk of chunks) {
        // Source-Filter prüfen
        if (sourceFilter && !sourceFilter.includes(chunk.metadata.source)) {
          continue;
        }

        // Typ-Filter prüfen
        if (typeFilter && !typeFilter.includes(chunk.metadata.type)) {
          continue;
        }

        // Ähnlichkeit berechnen
        const similarity = this.calculateSimilarity(query, chunk.content);
        if (similarity >= minSimilarity) {
          results.push({
            chunk,
            similarity,
          });
        }
      }
    }

    // Nach Ähnlichkeit sortieren
    results.sort((a, b) => b.similarity - a.similarity);

    // Top-Ergebnisse zurückgeben
    return results.slice(0, maxChunks);
  }

  /**
   * Baut Kontext für die KI aus den abgerufenen Dokumenten
   */
  buildContext(
    results: RetrievalResult[],
    maxContextLength: number = 4000
  ): {
    context: string;
    sources: string[];
    metadata: any[];
  } {
    const sources = [...new Set(results.map((r) => r.chunk.metadata.source))];
    const metadata = results.map((r) => ({
      source: r.chunk.metadata.source,
      chunkIndex: r.chunk.metadata.chunkIndex,
      similarity: r.similarity,
    }));

    // Kontext-Text aufbauen
    const contextParts: string[] = [];
    let currentLength = 0;

    for (const result of results) {
      const chunkWithSource = `[${result.chunk.metadata.source} - Chunk ${result.chunk.metadata.chunkIndex}/${result.chunk.metadata.totalChunks}]\n${result.chunk.content}`;

      if (currentLength + chunkWithSource.length <= maxContextLength) {
        contextParts.push(chunkWithSource);
        currentLength += chunkWithSource.length;
      } else {
        break;
      }
    }

    const context = contextParts.join("\n\n");

    return {
      context,
      sources,
      metadata,
    };
  }

  /**
   * Rerankiert Ergebnisse basierend auf diversen Faktoren
   */
  async rerank(
    results: RetrievalResult[],
    query: string
  ): Promise<RetrievalResult[]> {
    // In einer echten Implementierung würde hier ein LLM
    // für Reranking verwendet werden
    return results;
  }

  /**
   * Führt hybride Suche durch (Vektor + Keyword)
   */
  async hybridSearch(
    query: string,
    options: RetrievalOptions = {}
  ): Promise<{
    vectorResults: RetrievalResult[];
    keywordResults: RetrievalResult[];
    combined: RetrievalResult[];
  }> {
    // Vektor-Suche
    const vectorResults = await this.retrieve(query, {
      ...options,
      maxChunks: options.maxChunks || 5,
    });

    // Keyword-Suche
    const keywordResults = this.keywordSearch(query, options);

    // Ergebnisse kombinieren und deduplizieren
    const combined = [...vectorResults];
    for (const keywordResult of keywordResults) {
      if (
        !combined.some(
          (cr) => cr.chunk.id === keywordResult.chunk.id
        )
      ) {
        combined.push(keywordResult);
      }
    }

    // Sortieren und limitieren
    combined.sort((a, b) => b.similarity - a.similarity);
    combined.slice(0, options.maxChunks || 10);

    return {
      vectorResults,
      keywordResults,
      combined,
    };
  }

  /**
   * Aktualisiert den Index für ein Dokument
   */
  async updateIndex(
    source: string,
    chunks: DocumentChunk[]
  ): Promise<void> {
    // Alte Chunks entfernen
    if (this.documents.has(source)) {
      this.documents.delete(source);
    }

    // Neue Chunks hinzufügen
    chunks.forEach((chunk) => {
      const existing = this.documents.get(source) || [];
      existing.push(chunk);
      this.documents.set(source, existing);
    });

    console.log(`[RAGSystem] Updated index for ${source}: ${chunks.length} chunks`);
  }

  /**
   * Löscht ein Dokument aus dem Index
   */
  removeDocument(source: string): boolean {
    return this.documents.delete(source);
  }

  /**
   * Gibt Index-Statistiken zurück
   */
  getStats(): {
    totalDocuments: number;
    totalChunks: number;
    averageChunksPerDocument: number;
    byType: Record<string, number>;
  } {
    const sources = Array.from(this.documents.keys());
    const totalDocuments = sources.length;

    let totalChunks = 0;
    const byType: Record<string, number> = {};

    for (const chunks of this.documents.values()) {
      totalChunks += chunks.length;
      for (const chunk of chunks) {
        const type = chunk.metadata.type;
        byType[type] = (byType[type] || 0) + 1;
      }
    }

    return {
      totalDocuments,
      totalChunks,
      averageChunksPerDocument:
        totalDocuments > 0 ? totalChunks / totalDocuments : 0,
      byType,
    };
  }

  // --- Private Helper-Methoden ---

  private calculateSimilarity(query: string, content: string): number {
    // Einfache Jaccard-Ähnlichkeit für Text
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const contentWords = new Set(content.toLowerCase().split(/\s+/));

    if (queryWords.size === 0 && contentWords.size === 0) return 1;

    const intersection = new Set(
      [...queryWords].filter((x) => contentWords.has(x))
    );
    const union = new Set([...queryWords, ...contentWords]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  private keywordSearch(
    query: string,
    options: RetrievalOptions
  ): RetrievalResult[] {
    const results: RetrievalResult[] = [];
    const queryLower = query.toLowerCase();

    // Alle Chunks durchsuchen
    for (const chunks of this.documents.values()) {
      for (const chunk of chunks) {
        // Filter prüfen
        if (options.sourceFilter && !options.sourceFilter.includes(chunk.metadata.source)) {
          continue;
        }
        if (options.typeFilter && !options.typeFilter.includes(chunk.metadata.type)) {
          continue;
        }

        // Keyword-Match
        const contentLower = chunk.content.toLowerCase();
        if (contentLower.includes(queryLower)) {
          results.push({
            chunk,
            similarity: 0.8, // Feste Ähnlichkeit für Keyword-Matches
          });
        }
      }
    }

    return results;
  }
}

// --- Singleton-Instance ---

let instance: RAGSystem | null = null;

export function getRAGSystem(): RAGSystem {
  if (!instance) {
    instance = new RAGSystem();
  }
  return instance;
}
