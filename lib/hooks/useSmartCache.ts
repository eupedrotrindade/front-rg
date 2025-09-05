/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef, useMemo } from "react";
import type { EventParticipant } from "@/features/eventos/types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  lastAccess: number;
}

interface CacheStats {
  size: number;
  hitRate: number;
  totalRequests: number;
  totalHits: number;
}

class SmartCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private ttl: number;
  private stats = { totalRequests: 0, totalHits: 0 };

  constructor(maxSize = 1000, ttl = 5 * 60 * 1000) {
    // 5 minutos default
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  private generateKey(params: Record<string, any>): string {
    return JSON.stringify(params, Object.keys(params).sort());
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.ttl;
  }

  private evictLRU(): void {
    if (this.cache.size < this.maxSize) return;

    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  get(params: Record<string, unknown>): T | null {
    this.stats.totalRequests++;
    const key = this.generateKey(params);
    const entry = this.cache.get(key);

    if (!entry || this.isExpired(entry)) {
      if (entry) this.cache.delete(key);
      return null;
    }

    // Atualizar estatísticas de acesso
    entry.hits++;
    entry.lastAccess = Date.now();
    this.stats.totalHits++;

    return entry.data;
  }

  set(params: Record<string, unknown>, data: T): void {
    const key = this.generateKey(params);
    const now = Date.now();

    this.evictLRU();

    this.cache.set(key, {
      data,
      timestamp: now,
      hits: 0,
      lastAccess: now,
    });
  }

  clear(): void {
    this.cache.clear();
    this.stats = { totalRequests: 0, totalHits: 0 };
  }

  getStats(): CacheStats {
    const hitRate =
      this.stats.totalRequests > 0
        ? this.stats.totalHits / this.stats.totalRequests
        : 0;

    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests: this.stats.totalRequests,
      totalHits: this.stats.totalHits,
    };
  }

  // Pré-aquecimento do cache com dados frequentemente acessados
  warmup(
    commonQueries: Array<{ params: Record<string, unknown>; data: T }>
  ): void {
    commonQueries.forEach(({ params, data }) => {
      this.set(params, data);
    });
  }
}

export function useSmartCache<T = unknown>(
  maxSize = 1000,
  ttl = 5 * 60 * 1000
) {
  const cacheRef = useRef(new SmartCache<T>(maxSize, ttl));

  const get = useCallback((params: Record<string, unknown>): T | null => {
    return cacheRef.current.get(params);
  }, []);

  const set = useCallback((params: Record<string, unknown>, data: T): void => {
    cacheRef.current.set(params, data);
  }, []);

  const clear = useCallback((): void => {
    cacheRef.current.clear();
  }, []);

  const warmup = useCallback(
    (
      commonQueries: Array<{ params: Record<string, unknown>; data: T }>
    ): void => {
      cacheRef.current.warmup(commonQueries);
    },
    []
  );

  const stats = useMemo((): CacheStats => {
    return cacheRef.current.getStats();
  }, []);

  return {
    get,
    set,
    clear,
    warmup,
    stats,
  };
}

// Hook específico para participantes
export function useParticipantCache() {
  return useSmartCache<{
    filtered?: EventParticipant[];
    total?: number;
    processingTime?: number;
    uniqueValues?: Record<string, string[]>;
    dayParticipants?: EventParticipant[];
    paginatedData?: {
      data: EventParticipant[];
      total: number;
      totalPages: number;
      currentPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>(500, 3 * 60 * 1000); // 3 minutos para dados de participantes
}
