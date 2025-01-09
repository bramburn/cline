import React, { createContext, useContext, ReactNode } from 'react';
import { Container } from 'inversify';

export const InjectionContext = createContext<Container | undefined>(undefined);

export const InjectionProvider: React.FC<{ container: Container; children: ReactNode }> = ({ container, children }) => {
  return (
    <InjectionContext.Provider value={container}>
      {children}
    </InjectionContext.Provider>
  );
};

export const useInjectionContext = () => {
  const context = useContext(InjectionContext);
  if (!context) {
    throw new Error('useInjectionContext must be used within an InjectionProvider');
  }
  return context;
};
