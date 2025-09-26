import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../config/api';

interface NetworkStatus {
  isOnline: boolean;
  isReconnecting: boolean;
  lastOnlineTime: Date | null;
  retryCount: number;
  connectionType: string | null;
}

interface UseNetworkStatusReturn extends NetworkStatus {
  retry: () => Promise<boolean>;
  resetRetryCount: () => void;
}

export const useNetworkStatus = (): UseNetworkStatusReturn => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isReconnecting: false,
    lastOnlineTime: navigator.onLine ? new Date() : null,
    retryCount: 0,
    connectionType: getConnectionType(),
  });

  // Get connection type if available
  function getConnectionType(): string | null {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || connection?.type || null;
    }
    return null;
  }

  // Test actual connectivity by making a request
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a small resource to test actual connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(API_ENDPOINTS.HEALTH, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log('Connection test failed:', error);
      // Don't immediately go offline if backend is unreachable
      // Only go offline if navigator.onLine is false
      return navigator.onLine;
    }
  }, []);

  // Retry connection
  const retry = useCallback(async (): Promise<boolean> => {
    setNetworkStatus(prev => ({ ...prev, isReconnecting: true }));
    
    const isConnected = await testConnection();
    
    setNetworkStatus(prev => ({
      ...prev,
      isReconnecting: false,
      isOnline: isConnected,
      lastOnlineTime: isConnected ? new Date() : prev.lastOnlineTime,
      retryCount: prev.retryCount + 1,
    }));
    
    return isConnected;
  }, [testConnection]);

  // Reset retry count
  const resetRetryCount = useCallback(() => {
    setNetworkStatus(prev => ({ ...prev, retryCount: 0 }));
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: true,
        lastOnlineTime: new Date(),
        retryCount: 0,
      }));
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
      }));
    };

    const handleConnectionChange = () => {
      setNetworkStatus(prev => ({
        ...prev,
        connectionType: getConnectionType(),
      }));
    };

    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to connection changes if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', handleConnectionChange);
    }

    // Test connection on mount (only if navigator says we're offline)
    const testInitialConnection = async () => {
      if (!navigator.onLine) {
        // Only test if navigator says we're offline
        const isConnected = await testConnection();
        setNetworkStatus(prev => ({
          ...prev,
          isOnline: isConnected,
          lastOnlineTime: isConnected ? new Date() : null,
        }));
      }
    };

    // Only test connection if we start offline
    if (!navigator.onLine) {
      testInitialConnection();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [testConnection]);

  return {
    ...networkStatus,
    retry,
    resetRetryCount,
  };
};
