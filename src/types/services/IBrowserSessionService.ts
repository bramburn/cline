import { Observable } from 'rxjs';

export interface BrowserSession {
  id: string;
  startTime: number;
  endTime?: number;
  url?: string;
  tabId?: number;
  windowId?: number;
  incognito?: boolean;
}

export interface BrowserTabInfo {
  id: number;
  windowId: number;
  url: string;
  active: boolean;
  incognito: boolean;
}

export interface IBrowserSessionService {
  getCurrentSession(): BrowserSession | null;
  startNewSession(options?: Partial<BrowserSession>): BrowserSession;
  endCurrentSession(): void;
  
  getAllTabs(): Promise<BrowserTabInfo[]>;
  getCurrentTab(): Promise<BrowserTabInfo | null>;
  
  getSessionHistory(): BrowserSession[];
  getSessionUpdates(): Observable<BrowserSession>;
  
  switchToTab(tabId: number): Promise<void>;
  createNewTab(url?: string, options?: { active?: boolean; incognito?: boolean }): Promise<BrowserTabInfo>;
} 