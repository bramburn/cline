import { Observable } from 'rxjs';

export interface BrowserAction {
  type: string;
  payload: any;
  timestamp: number;
  result?: any;
  error?: Error;
}

export interface BrowserActionResult {
  success: boolean;
  action: BrowserAction;
  timestamp: number;
}

export interface IBrowserActionService {
  executeAction(action: Omit<BrowserAction, 'timestamp'>): Promise<BrowserActionResult>;
  getActionHistory(): BrowserAction[];
  getActionUpdates(): Observable<BrowserActionResult>;
  
  // Specific browser action methods
  navigateTo(url: string): Promise<BrowserActionResult>;
  refreshPage(): Promise<BrowserActionResult>;
  goBack(): Promise<BrowserActionResult>;
  goForward(): Promise<BrowserActionResult>;
  
  // Extension-specific actions
  toggleExtension(extensionId: string, enable: boolean): Promise<BrowserActionResult>;
  reloadExtension(extensionId: string): Promise<BrowserActionResult>;
} 