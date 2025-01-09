import React from 'react';
import { useCallback, useEffect, useState } from "react";
import { useEvent } from "react-use";
import { ExtensionMessage } from "../../src/shared/ExtensionMessage";
import ChatView from "./components/chat/ChatView";
import HistoryView from "./components/history/HistoryView";
import SettingsView from "./components/settings/SettingsView";
import WelcomeView from "./components/welcome/WelcomeView";
import { ExtensionStateProvider, useExtensionState } from "./context/ExtensionStateContext";
import { Container } from 'inversify';
import { TYPES } from '../../src/types';
import { NotificationService } from '../../src/services/NotificationService';
import { InjectionProvider } from '../../src/context/InjectionContext';
import { vscode } from "./utils/vscode";
import McpView from "./components/mcp/McpView";
import NotificationCenter from './components/notifications/NotificationCenter';
import styled from 'styled-components';

const AppWrapper = styled.div`
	position: relative;
	height: 100vh;
	width: 100vw;
	overflow: hidden;
`;

const AppContent = () => {
	const { didHydrateState, showWelcome, shouldShowAnnouncement } = useExtensionState();
	const [showSettings, setShowSettings] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [showMcp, setShowMcp] = useState(false);
	const [showAnnouncement, setShowAnnouncement] = useState(false);

	const handleMessage = useCallback((e: MessageEvent) => {
		const message: ExtensionMessage = e.data;
		switch (message.type) {
			case "action":
				switch (message.action!) {
					case "settingsButtonClicked":
						setShowSettings(true);
						setShowHistory(false);
						setShowMcp(false);
						break;
					case "historyButtonClicked":
						setShowSettings(false);
						setShowHistory(true);
						setShowMcp(false);
						break;
					case "mcpButtonClicked":
						setShowSettings(false);
						setShowHistory(false);
						setShowMcp(true);
						break;
					case "chatButtonClicked":
						setShowSettings(false);
						setShowHistory(false);
						setShowMcp(false);
						break;
				}
				break;
		}
	}, []);

	useEvent("message", handleMessage);

	useEffect(() => {
		if (shouldShowAnnouncement) {
			setShowAnnouncement(true);
			vscode.postMessage({ type: "didShowAnnouncement" });
		}
	}, [shouldShowAnnouncement]);

	if (!didHydrateState) {
		return null;
	}

	return (
		<>
			{showWelcome ? (
				<WelcomeView />
			) : (
				<>
					{showSettings && <SettingsView onDone={() => setShowSettings(false)} />}
					{showHistory && <HistoryView onDone={() => setShowHistory(false)} />}
					{showMcp && <McpView onDone={() => setShowMcp(false)} />}
					{/* Do not conditionally load ChatView, it's expensive and there's state we don't want to lose (user input, disableInput, askResponse promise, etc.) */}
					<ChatView
						showHistoryView={() => {
							setShowSettings(false);
							setShowMcp(false);
							setShowHistory(true);
						}}
						isHidden={showSettings || showHistory || showMcp}
						showAnnouncement={showAnnouncement}
						hideAnnouncement={() => {
							setShowAnnouncement(false);
						}}
					/>
				</>
			)}
		</>
	);
};

const App = () => {
	const container = new Container();
	container.bind<NotificationService>(TYPES.NotificationService).to(NotificationService);

	return (
		<InjectionProvider container={container}>
			<ExtensionStateProvider>
				<AppWrapper>
					<AppContent />
					<NotificationCenter />
				</AppWrapper>
			</ExtensionStateProvider>
		</InjectionProvider>
	);
};

export default App;
