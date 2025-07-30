import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface ActiveRoomContextType {
  activeRoomId: string | null;
  setActiveRoomId: (roomId: string | null) => void;
  appState: AppStateStatus;
  isUserInRoom: (roomId: string) => boolean;
}

const ActiveRoomContext = createContext<ActiveRoomContextType | undefined>(undefined);

export const ActiveRoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Monitor app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
      
      // Clear active room when app goes to background
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setActiveRoomId(null);
      }
    });

    return () => subscription?.remove();
  }, [appState]);

  const isUserInRoom = (roomId: string): boolean => {
    const result = appState === 'active' && activeRoomId === roomId;
    return result;
  };

  return (
    <ActiveRoomContext.Provider value={{
      activeRoomId,
      setActiveRoomId,
      appState,
      isUserInRoom,
    }}>
      {children}
    </ActiveRoomContext.Provider>
  );
};

export const useActiveRoom = (): ActiveRoomContextType => {
  const context = useContext(ActiveRoomContext);
  if (context === undefined) {
    throw new Error('useActiveRoom must be used within an ActiveRoomProvider');
  }
  return context;
};
