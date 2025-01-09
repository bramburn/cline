import React, { createContext, useState, useContext, ReactNode } from 'react';
import { APIConfiguration } from '../../../src/services/APIConfigurationService';
import { CustomInstruction } from '../../../src/services/CustomInstructionsService';

interface ExtensionState {
	didHydrateState: boolean;
	showWelcome: boolean;
	shouldShowAnnouncement: boolean;
	apiConfiguration: APIConfiguration;
	customInstructions: CustomInstruction[];
	mcpServers: string[];
	filePaths: string[];
	showAnnouncement: boolean;
	setApiConfiguration: (value: APIConfiguration) => void;
	setCustomInstructions: (value: CustomInstruction[]) => void;
	setMcpServers: (value: string[]) => void;
	setFilePaths: (value: string[]) => void;
	setShowAnnouncement: (value: boolean) => void;
	setDidHydrateState: (value: boolean) => void;
	setShowWelcome: (value: boolean) => void;
	setShouldShowAnnouncement: (value: boolean) => void;
}

const ExtensionStateContext = createContext<ExtensionState | undefined>(undefined);

export const ExtensionStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [state, setState] = useState<Omit<ExtensionState, 'setApiConfiguration' | 'setCustomInstructions' | 'setMcpServers' | 'setFilePaths' | 'setShowAnnouncement' | 'setDidHydrateState' | 'setShowWelcome' | 'setShouldShowAnnouncement'>>({
		didHydrateState: false,
		showWelcome: true,
		shouldShowAnnouncement: false,
		apiConfiguration: {
			selectedModel: 'gpt-3.5-turbo',
			models: [
				{
					name: 'gpt-3.5-turbo',
					contextWindow: 4096,
					supportsStreaming: true,
					supportedFeatures: ['text-completion', 'chat']
				},
				{
					name: 'gpt-4',
					contextWindow: 8192,
					supportsStreaming: true,
					supportedFeatures: ['text-completion', 'chat', 'advanced-reasoning']
				}
			]
		},
		customInstructions: [],
		mcpServers: [],
		filePaths: [],
		showAnnouncement: false
	});

	return (
		<ExtensionStateContext.Provider value={{
			...state,
			setApiConfiguration: (value) =>
				setState((prevState) => ({
					...prevState,
					apiConfiguration: value,
				})),
			setCustomInstructions: (value) =>
				setState((prevState) => ({
					...prevState,
					customInstructions: value,
				})),
			setMcpServers: (value) =>
				setState((prevState) => ({
					...prevState,
					mcpServers: value,
				})),
			setFilePaths: (value) =>
				setState((prevState) => ({
					...prevState,
					filePaths: value,
				})),
			setShowAnnouncement: (value) =>
				setState((prevState) => ({
					...prevState,
					showAnnouncement: value,
				})),
			setDidHydrateState: (value) =>
				setState((prevState) => ({
					...prevState,
					didHydrateState: value,
				})),
			setShowWelcome: (value) =>
				setState((prevState) => ({
					...prevState,
					showWelcome: value,
				})),
			setShouldShowAnnouncement: (value) =>
				setState((prevState) => ({
					...prevState,
					shouldShowAnnouncement: value,
				})),
		}}>
			{children}
		</ExtensionStateContext.Provider>
	);
};

export const useExtensionState = () => {
	const context = useContext(ExtensionStateContext);
	if (context === undefined) {
		throw new Error('useExtensionState must be used within an ExtensionStateProvider');
	}
	return context;
};
