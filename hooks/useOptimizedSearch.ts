"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";

interface UseOptimizedSearchOptions<T> {
  data: T[];
  searchFields: (keyof T)[];
  debounceMs?: number;
  minSearchLength?: number;
  caseSensitive?: boolean;
}

interface SearchResult<T> {
  items: T[];
  total: number;
  isSearching: boolean;
  searchTerm: string;
}

export function useOptimizedSearch<T>({
  data,
  searchFields,
  debounceMs = 300,
  minSearchLength = 2,
  caseSensitive = false,
}: UseOptimizedSearchOptions<T>): [
  SearchResult<T>,
  (term: string) => void,
  () => void
] {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchCacheRef = useRef<Map<string, T[]>>(new Map());

  // Função de busca otimizada com cache
  const performSearch = useCallback(
    (term: string): T[] => {
      if (!term || term.length < minSearchLength) {
        return data;
      }

      const cacheKey = `${term.toLowerCase()}_${caseSensitive}`;

      // Verificar cache primeiro
      if (searchCacheRef.current.has(cacheKey)) {
        return searchCacheRef.current.get(cacheKey)!;
      }

      // Realizar busca
      const searchLower = caseSensitive ? term : term.toLowerCase();

      const filteredData = data.filter((item) => {
        return searchFields.some((field) => {
          const fieldValue = item[field];
          if (fieldValue == null) return false;

          const stringValue = String(fieldValue);
          const valueToSearch = caseSensitive
            ? stringValue
            : stringValue.toLowerCase();

          return valueToSearch.includes(searchLower);
        });
      });

      // Cache do resultado (limitar cache a 50 entradas)
      if (searchCacheRef.current.size >= 50) {
        const firstKey = searchCacheRef.current.keys().next().value;
        searchCacheRef.current.delete(firstKey || "");
      }

      searchCacheRef.current.set(cacheKey, filteredData);
      return filteredData;
    },
    [data, searchFields, minSearchLength, caseSensitive]
  );

  // Função de busca com debounce
  const debouncedSearch = useCallback(
    (term: string) => {
      setIsSearching(true);

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        setSearchTerm(term);
        setIsSearching(false);
      }, debounceMs);
    },
    [debounceMs]
  );

  // Resultado memoizado
  const searchResult = useMemo<SearchResult<T>>(() => {
    const items = performSearch(searchTerm);
    return {
      items,
      total: items.length,
      isSearching,
      searchTerm,
    };
  }, [searchTerm, performSearch, isSearching]);

  // Função para limpar busca
  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setIsSearching(false);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  // Limpar timeout na desmontagem
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Limpar cache quando dados mudam
  useEffect(() => {
    searchCacheRef.current.clear();
  }, [data]);

  return [searchResult, debouncedSearch, clearSearch];
}

// Hook para busca com índices (para datasets muito grandes)
interface UseIndexedSearchOptions<T> extends UseOptimizedSearchOptions<T> {
  enableIndexing?: boolean;
}

export function useIndexedSearch<T>({
  data,
  searchFields,
  enableIndexing = false,
  ...options
}: UseIndexedSearchOptions<T>): [
  SearchResult<T>,
  (term: string) => void,
  () => void
] {
  const indexRef = useRef<Map<string, Set<number>>>(new Map());
  const [isIndexing, setIsIndexing] = useState<boolean>(false);

  // Construir índice
  const buildIndex = useCallback(() => {
    if (!enableIndexing || data.length < 1000) return;

    setIsIndexing(true);
    const newIndex = new Map<string, Set<number>>();

    data.forEach((item, index) => {
      searchFields.forEach((field) => {
        const fieldValue = item[field];
        if (fieldValue == null) return;

        const words = String(fieldValue)
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length >= 2);

        words.forEach((word) => {
          if (!newIndex.has(word)) {
            newIndex.set(word, new Set());
          }
          newIndex.get(word)!.add(index);
        });
      });
    });

    indexRef.current = newIndex;
    setIsIndexing(false);
  }, [data, searchFields, enableIndexing]);

  // Busca usando índices
  const indexedSearch = useCallback(
    (term: string): T[] => {
      if (!enableIndexing || !indexRef.current.size || term.length < 2) {
        return data.filter((item) => {
          return searchFields.some((field) => {
            const fieldValue = item[field];
            if (fieldValue == null) return false;
            return String(fieldValue)
              .toLowerCase()
              .includes(term.toLowerCase());
          });
        });
      }

      const words = term
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length >= 2);
      if (!words.length) return data;

      // Encontrar intersecção de índices
      let resultIndices: Set<number> | null = null;

      words.forEach((word) => {
        const indices = indexRef.current.get(word);
        if (!indices) {
          resultIndices = new Set(); // Se alguma palavra não existe, resultado vazio
          return;
        }

        if (resultIndices === null) {
          resultIndices = new Set(indices);
        } else {
          // Intersecção
          resultIndices = new Set(
            [...resultIndices].filter((i) => indices.has(i))
          );
        }
      });

      if (!resultIndices) return [];

      return Array.from(resultIndices)
        .map((index) => data[Number(index)])
        .filter(Boolean);
    },
    [data, searchFields, enableIndexing]
  );

  // Construir índice quando necessário
  useEffect(() => {
    if (enableIndexing && data.length >= 1000) {
      // Usar setTimeout para não bloquear UI
      setTimeout(buildIndex, 0);
    }
  }, [data, buildIndex, enableIndexing]);

  // Usar busca normal com override para busca indexada
  const [result, search, clear] = useOptimizedSearch({
    data,
    searchFields,
    ...options,
  });

  // Override da função de busca se indexação estiver habilitada
  const optimizedPerformSearch = useCallback(
    (term: string): T[] => {
      if (enableIndexing && indexRef.current.size) {
        return indexedSearch(term);
      }
      return result.items;
    },
    [enableIndexing, indexedSearch, result.items]
  );

  return [
    {
      ...result,
      items: enableIndexing ? indexedSearch(result.searchTerm) : result.items,
      isSearching: result.isSearching || isIndexing,
    },
    search,
    clear,
  ] as [SearchResult<T>, (term: string) => void, () => void];
}
