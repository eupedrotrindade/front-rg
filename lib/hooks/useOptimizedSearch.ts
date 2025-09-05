/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { EventParticipant } from "@/features/eventos/types";

// Índice invertido para busca super rápida
class SearchIndex<T = Record<string, any>> {
  private index: Map<string, Set<number>> = new Map();
  private documents: T[] = [];
  private fieldWeights: Record<string, number> = {};

  constructor(fieldWeights: Record<string, number> = {}) {
    this.fieldWeights = fieldWeights;
  }

  // Normalizar texto para indexação
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remover acentos
      .replace(/[^\w\s]/g, " ") // substituir pontuação por espaço
      .trim();
  }

  // Tokenizar texto
  private tokenize(text: string): string[] {
    return this.normalizeText(text)
      .split(/\s+/)
      .filter((token) => token.length >= 2); // apenas tokens com 2+ caracteres
  }

  // Gerar n-gramas para busca parcial
  private generateNGrams(text: string, n = 3): string[] {
    const normalized = this.normalizeText(text);
    const ngrams: string[] = [];

    for (let i = 0; i <= normalized.length - n; i++) {
      ngrams.push(normalized.slice(i, i + n));
    }

    return ngrams;
  }

  // Construir índice
  buildIndex(documents: T[], fields: string[]): void {
    this.documents = documents;
    this.index.clear();

    documents.forEach((doc, docIndex) => {
      fields.forEach((field) => {
        const value = (doc as Record<string, any>)[field] as string;
        if (!value) return;

        // Tokenização normal
        const tokens = this.tokenize(value);
        tokens.forEach((token) => {
          if (!this.index.has(token)) {
            this.index.set(token, new Set());
          }
          this.index.get(token)!.add(docIndex);
        });

        // N-gramas para busca parcial
        const ngrams = this.generateNGrams(value);
        ngrams.forEach((ngram) => {
          const key = `_ngram_${ngram}`;
          if (!this.index.has(key)) {
            this.index.set(key, new Set());
          }
          this.index.get(key)!.add(docIndex);
        });

        // Índice para CPF (números apenas)
        if (field === "cpf") {
          const cpfNumbers = value.replace(/\D/g, "");
          if (cpfNumbers) {
            if (!this.index.has(cpfNumbers)) {
              this.index.set(cpfNumbers, new Set());
            }
            this.index.get(cpfNumbers)!.add(docIndex);
          }
        }
      });
    });
  }

  // Buscar com score
  search(query: string, limit = 1000): Array<{ document: T; score: number }> {
    if (!query.trim()) return [];

    const queryTokens = this.tokenize(query);
    const queryNgrams = this.generateNGrams(query);
    const cpfQuery = query.replace(/\D/g, "");

    const documentScores = new Map<number, number>();

    // Busca por tokens exatos (maior peso)
    queryTokens.forEach((token) => {
      const matchingDocs = this.index.get(token);
      if (matchingDocs) {
        matchingDocs.forEach((docIndex) => {
          const currentScore = documentScores.get(docIndex) || 0;
          documentScores.set(docIndex, currentScore + 10);
        });
      }
    });

    // Busca por n-gramas (peso menor)
    queryNgrams.forEach((ngram) => {
      const matchingDocs = this.index.get(`_ngram_${ngram}`);
      if (matchingDocs) {
        matchingDocs.forEach((docIndex) => {
          const currentScore = documentScores.get(docIndex) || 0;
          documentScores.set(docIndex, currentScore + 1);
        });
      }
    });

    // Busca por CPF
    if (cpfQuery) {
      const matchingDocs = this.index.get(cpfQuery);
      if (matchingDocs) {
        matchingDocs.forEach((docIndex) => {
          const currentScore = documentScores.get(docIndex) || 0;
          documentScores.set(docIndex, currentScore + 15); // CPF tem peso alto
        });
      }
    }

    // Converter para array e ordenar por score
    const results = Array.from(documentScores.entries())
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, limit)
      .map(([docIndex, score]) => ({
        document: this.documents[docIndex],
        score,
      }));

    return results;
  }

  // Obter estatísticas do índice
  getStats() {
    return {
      totalTerms: this.index.size,
      totalDocuments: this.documents.length,
      averageTermsPerDocument:
        this.documents.length > 0 ? this.index.size / this.documents.length : 0,
    };
  }
}

interface OptimizedSearchConfig {
  data: EventParticipant[];
  searchFields: string[];
  fieldWeights?: Record<string, number>;
  minSearchLength?: number;
  maxResults?: number;
  debounceMs?: number;
}

interface SearchResult {
  results: EventParticipant[];
  total: number;
  searchTime: number;
  isSearching: boolean;
  isEmpty: boolean;
  query: string;
}

export function useOptimizedSearch({
  data,
  searchFields,
  fieldWeights = {},
  minSearchLength = 2,
  maxResults = 1000,
  debounceMs = 150,
}: OptimizedSearchConfig) {
  const [searchResult, setSearchResult] = useState<SearchResult>({
    results: [],
    total: 0,
    searchTime: 0,
    isSearching: false,
    isEmpty: true,
    query: "",
  });

  const searchIndexRef = useRef(
    new SearchIndex<EventParticipant>(fieldWeights)
  );
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const rebuildIndexRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Reconstruir índice quando dados mudarem (debounced)
  useEffect(() => {
    if (rebuildIndexRef.current) {
      clearTimeout(rebuildIndexRef.current);
    }

    rebuildIndexRef.current = setTimeout(() => {
      const startTime = performance.now();
      searchIndexRef.current.buildIndex(data, searchFields);
      const buildTime = performance.now() - startTime;

      console.log(
        `🔍 Índice de busca reconstruído: ${
          data.length
        } docs, ${buildTime.toFixed(2)}ms`
      );
    }, 100);

    return () => {
      if (rebuildIndexRef.current) {
        clearTimeout(rebuildIndexRef.current);
      }
    };
  }, [data, searchFields]);

  // Função de busca principal
  const performSearch = useCallback(
    (query: string) => {
      const startTime = performance.now();

      if (!query || query.length < minSearchLength) {
        setSearchResult({
          results: [],
          total: 0,
          searchTime: 0,
          isSearching: false,
          isEmpty: true,
          query: "",
        });
        return;
      }

      try {
        const searchResults = searchIndexRef.current.search(query, maxResults);
        const documents = searchResults.map((result) => result.document);
        const searchTime = performance.now() - startTime;

        setSearchResult({
          results: documents as EventParticipant[],
          total: documents.length,
          searchTime: Math.round(searchTime * 100) / 100,
          isSearching: false,
          isEmpty: documents.length === 0,
          query,
        });

        console.log(
          `🔍 Busca executada: "${query}" → ${
            documents.length
          } resultados em ${searchTime.toFixed(2)}ms`
        );
      } catch (error) {
        console.error("Erro na busca otimizada:", error);
        setSearchResult((prev) => ({
          ...prev,
          isSearching: false,
        }));
      }
    },
    [minSearchLength, maxResults]
  );

  // Função de busca com debounce
  const search = useCallback(
    (query: string) => {
      // Atualizar estado imediatamente para mostrar loading
      setSearchResult((prev) => ({
        ...prev,
        isSearching: true,
        query,
      }));

      // Limpar timeout anterior
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Busca imediata para queries vazias
      if (!query || query.length < minSearchLength) {
        performSearch(query);
        return;
      }

      // Debounce para outras queries
      debounceRef.current = setTimeout(() => {
        performSearch(query);
      }, debounceMs);
    },
    [performSearch, debounceMs, minSearchLength]
  );

  // Limpar busca
  const clearSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setSearchResult({
      results: [],
      total: 0,
      searchTime: 0,
      isSearching: false,
      isEmpty: true,
      query: "",
    });
  }, []);

  // Estatísticas do índice
  const indexStats = useMemo(() => {
    return searchIndexRef.current.getStats();
  }, [data.length]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (rebuildIndexRef.current) {
        clearTimeout(rebuildIndexRef.current);
      }
    };
  }, []);

  return {
    search,
    clearSearch,
    ...searchResult,
    indexStats,
  };
}
