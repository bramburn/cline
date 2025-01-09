import { inject } from 'inversify-react';
import { Container } from 'inversify';
import { useContext } from 'react';
import { InjectionContext } from '../context/InjectionContext';

export const useInjection = <T>(serviceIdentifier: symbol, container?: Container): T => {
  const contextContainer = useContext(InjectionContext);
  const finalContainer = container || contextContainer;

  if (!finalContainer) {
    throw new Error('InversifyJS container not found. Make sure to wrap your component with the InjectionProvider.');
  }

  return finalContainer.get<T>(serviceIdentifier);
};
