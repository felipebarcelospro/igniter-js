import { useState, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcp-client';
import type { DashboardMetrics, UseDashboardDataReturn } from '../types';

export function useDashboardData(refreshInterval = 5000): UseDashboardDataReturn {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const metrics = await mcpClient.getDashboardMetrics();
      setData(metrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Initial connection and data fetch
    const initialize = async () => {
      try {
        await mcpClient.connect();
        await fetchData();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to MCP Server';
        setError(errorMessage);
        setLoading(false);
      }
    };

    initialize();

    // Set up auto-refresh
    const interval = setInterval(fetchData, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, [fetchData, refreshInterval]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}