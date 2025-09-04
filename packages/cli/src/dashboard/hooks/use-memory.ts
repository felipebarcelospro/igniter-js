import { useState, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcp-client';
import type { MemoryItem, UseMemoryReturn, MemoryFilter, MemoryType } from '../types';

export function useMemory(type?: MemoryType): UseMemoryReturn {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<MemoryFilter>({});

  const fetchMemories = useCallback(async () => {
    try {
      setError(null);
      const allMemories = await mcpClient.getMemories(type);
      setMemories(allMemories);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchMemories();
  }, [fetchMemories]);

  const search = useCallback(async (query: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const searchResults = await mcpClient.searchMemories({
        text: query,
        includeSensitive: currentFilter.includeSensitive || false,
      });
      
      setMemories(searchResults);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentFilter.includeSensitive]);

  const filter = useCallback(async (filter: MemoryFilter) => {
    try {
      setError(null);
      setLoading(true);
      setCurrentFilter(filter);
      
      const searchQuery = {
        type: filter.type,
        tags: filter.tags,
        dateRange: filter.dateRange,
        includeSensitive: filter.includeSensitive || false,
      };
      
      const filteredMemories = await mcpClient.searchMemories(searchQuery);
      setMemories(filteredMemories);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Filter failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  return {
    memories,
    loading,
    error,
    refresh,
    search,
    filter,
  };
}