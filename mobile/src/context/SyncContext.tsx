import React, { createContext, useContext, useEffect, useState } from 'react';
import { syncEngine } from '../services/syncEngine';

interface SyncContextType {
  isOnline: boolean;
  pendingCount: number;
  triggerSync: () => void;
}

const SyncContext = createContext<SyncContextType>({
  isOnline: true,
  pendingCount: 0,
  triggerSync: () => {},
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(syncEngine.getIsConnected());
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const unsubNet = syncEngine.subscribeNetwork((connected) => {
      setIsOnline(connected);
    });

    const unsubQueue = syncEngine.subscribeQueue((count) => {
      setPendingCount(count);
    });

    return () => {
      unsubNet();
      unsubQueue();
    };
  }, []);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        pendingCount,
        triggerSync: () => syncEngine.triggerSync(),
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);

