import { createContext, useContext } from 'react';
import { NotificationService } from '../../../src/services/NotificationService';

export interface Store {
  notificationService: NotificationService;
}

const store: Store = {
  notificationService: new NotificationService(),
};

const StoreContext = createContext<Store>(store);

export const useStore = () => useContext(StoreContext);

export const StoreProvider = StoreContext.Provider; 