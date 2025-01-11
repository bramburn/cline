import { BehaviorSubject, Observable } from 'rxjs';
import { ExtensionState } from '../../shared/ExtensionMessage';
import { HistoryItem } from '../../shared/HistoryItem';
import { AutoApprovalSettings, DEFAULT_AUTO_APPROVAL_SETTINGS } from '../../shared/AutoApprovalSettings';
import * as vscode from 'vscode';

export class StateManager {
    private readonly stateSubject: BehaviorSubject<ExtensionState>;
    private readonly context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.stateSubject = new BehaviorSubject<ExtensionState>(this.getInitialState());
        this.initializeState();
    }

    private getInitialState(): ExtensionState {
        return {
            version: this.context.extension?.packageJSON?.version ?? "",
            clineMessages: [],
            taskHistory: [],
            shouldShowAnnouncement: false,
            autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS
        };
    }

    private async initializeState() {
        const state = await this.loadState();
        this.stateSubject.next(state);
    }

    private async loadState(): Promise<ExtensionState> {
        const [
            apiConfiguration,
            lastShownAnnouncementId,
            customInstructions,
            taskHistory,
            autoApprovalSettings
        ] = await Promise.all([
            this.getGlobalState("apiConfiguration"),
            this.getGlobalState("lastShownAnnouncementId"),
            this.getGlobalState("customInstructions"),
            this.getGlobalState("taskHistory") as Promise<HistoryItem[] | undefined>,
            this.getGlobalState("autoApprovalSettings") as Promise<AutoApprovalSettings | undefined>
        ]);

        return {
            ...this.getInitialState(),
            apiConfiguration,
            customInstructions,
            taskHistory: taskHistory || [],
            shouldShowAnnouncement: lastShownAnnouncementId !== this.getLatestAnnouncementId(),
            autoApprovalSettings: autoApprovalSettings || DEFAULT_AUTO_APPROVAL_SETTINGS
        };
    }

    public getState(): Observable<ExtensionState> {
        return this.stateSubject.asObservable();
    }

    public getCurrentState(): ExtensionState {
        return this.stateSubject.getValue();
    }

    public async updateState(update: Partial<ExtensionState>): Promise<void> {
        const currentState = this.getCurrentState();
        const newState = { ...currentState, ...update };
        
        // Persist relevant state to storage
        await this.persistStateChanges(currentState, newState);
        
        this.stateSubject.next(newState);
    }

    private async persistStateChanges(oldState: ExtensionState, newState: ExtensionState): Promise<void> {
        // Only persist changes that need to be stored
        if (oldState.apiConfiguration !== newState.apiConfiguration) {
            await this.updateGlobalState("apiConfiguration", newState.apiConfiguration);
        }
        if (oldState.customInstructions !== newState.customInstructions) {
            await this.updateGlobalState("customInstructions", newState.customInstructions);
        }
        if (oldState.taskHistory !== newState.taskHistory) {
            await this.updateGlobalState("taskHistory", newState.taskHistory);
        }
        if (oldState.autoApprovalSettings !== newState.autoApprovalSettings) {
            await this.updateGlobalState("autoApprovalSettings", newState.autoApprovalSettings);
        }
    }

    private async getGlobalState(key: string): Promise<any> {
        return await this.context.globalState.get(key);
    }

    private async updateGlobalState(key: string, value: any): Promise<void> {
        await this.context.globalState.update(key, value);
    }

    private getLatestAnnouncementId(): string {
        // Implement your announcement ID logic here
        return "latest";
    }

    public async clearState(): Promise<void> {
        const initialState = this.getInitialState();
        await this.updateState(initialState);
        
        // Clear all stored state
        for (const key of this.context.globalState.keys()) {
            await this.context.globalState.update(key, undefined);
        }
    }
} 