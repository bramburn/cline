// Remove the type exports
// export type { AssistantMessageContent, Anthropic } from '../types/Cline';

import { Anthropic } from "@anthropic-ai/sdk"
import cloneDeep from "clone-deep"
import delay from "delay"
import fs from "fs/promises"
import os from "os"
import pWaitFor from "p-wait-for"
import * as path from "path"
import { serializeError } from "serialize-error"
import * as vscode from "vscode"
import { ApiHandler, buildApiHandler } from "../api"
import { ApiStream } from "../api/transform/stream"
import { DIFF_VIEW_URI_SCHEME, DiffViewProvider } from "../integrations/editor/DiffViewProvider"
import { findToolName, formatContentBlockToMarkdown } from "../integrations/misc/export-markdown"
import { extractTextFromFile } from "../integrations/misc/extract-text"
import { TerminalManager } from "../integrations/terminal/TerminalManager"
import { BrowserSession } from "../services/browser/BrowserSession"
import { UrlContentFetcher } from "../services/browser/UrlContentFetcher"
import { listFiles } from "../services/glob/list-files"
import { regexSearchFiles } from "../services/ripgrep"
import { parseSourceCodeForDefinitionsTopLevel } from "../services/tree-sitter"
import { ApiConfiguration } from "../shared/api"
import { findLast, findLastIndex } from "../shared/array"
import { AutoApprovalSettings } from "../shared/AutoApprovalSettings"
import { combineApiRequests } from "../shared/combineApiRequests"
import { combineCommandSequences, COMMAND_REQ_APP_STRING } from "../shared/combineCommandSequences"

import {
	BrowserAction,
	BrowserActionResult,
	browserActions,
	ClineApiReqCancelReason,
	ClineApiReqInfo,
	ClineAsk,
	ClineAskUseMcpServer,
	ClineMessage,
	ClineSay,
	ClineSayBrowserAction,
	ClineSayTool,
	COMPLETION_RESULT_CHANGES_FLAG,
} from "../shared/ExtensionMessage"
import { getApiMetrics } from "../shared/getApiMetrics"
import { HistoryItem } from "../shared/HistoryItem"
import { ClineAskResponse, ClineCheckpointRestore } from "../shared/WebviewMessage"
import { calculateApiCost } from "../utils/cost"
import { fileExistsAtPath } from "../utils/fs"
import { arePathsEqual, getReadablePath } from "../utils/path"
import { AssistantMessageContent, parseAssistantMessage, ToolParamName, ToolUseName } from "./assistant-message"
import { constructNewFileContent } from "./assistant-message/diff"
import { parseMentions } from "./mentions"
import { formatResponse } from "./prompts/responses"
import { addUserInstructions, SYSTEM_PROMPT } from "./prompts/system"
import { getNextTruncationRange, getTruncatedMessages } from "./sliding-window"
import { ClineProvider, GlobalFileNames } from "./webview/ClineProvider"
import { showSystemNotification } from "../integrations/notifications"
import { removeInvalidChars } from "../utils/string"
import { fixModelHtmlEscaping } from "../utils/string"
import { OpenAiHandler } from "../api/providers/openai"
import CheckpointTracker from "../integrations/checkpoints/CheckpointTracker"
import getFolderSize from "get-folder-size"
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { ConversationHistoryService } from '../services/ConversationHistoryService';
import { firstValueFrom } from 'rxjs';
import { MessageService } from '../services/MessageService';
import { ConversationStateService } from '../services/ConversationStateService';
import { ToolCallOptimizationAgent } from './agents/ToolCallOptimizationAgent';
import { PatternAnalysis, ErrorReport } from '../types/ToolCallOptimization';
import { ApiRequestService } from '../services/ApiRequestService';
import { Subject } from 'rxjs';
import { ClineStateService } from '../services/ClineStateService';
import { ToolExecutionService } from '../services/ToolExecutionService';

const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop") // may or may not exist but fs checking existence would immediately ask for permission which would be bad UX, need to come up with a better solution

type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>
type UserContentBlock = 
  | Anthropic.TextBlockParam 
  | Anthropic.ImageBlockParam 
  | Anthropic.ToolUseBlockParam 
  | Anthropic.ToolResultBlockParam;

type UserContent = UserContentBlock[];
function isValidUserContent(content: any): content is UserContent {
  return Array.isArray(content) && 
    content.every(block => 
      block && (
        'type' in block && 
        ['text', 'image', 'tool_use', 'tool_result'].includes(block.type)
      )
    );
}

export class Cline {
	readonly taskId: string;
	private readonly api: ApiHandler;
	private readonly terminalManager: TerminalManager;
	private readonly urlContentFetcher: UrlContentFetcher;
	private readonly browserSession: BrowserSession;
	private readonly diffViewProvider: DiffViewProvider;
	private readonly toolCallOptimizationAgent: ToolCallOptimizationAgent;
	private readonly apiRequestService: ApiRequestService;
	private readonly messageService: MessageService;
	private readonly conversationStateService: ConversationStateService;
	private readonly clineStateService: ClineStateService;
	private readonly providerRef: WeakRef<ClineProvider>;
	private readonly abortSubject: Subject<boolean>;
	private conversationHistoryService!: ConversationHistoryService;
	private readonly toolExecutionService: ToolExecutionService;

	private didEditFile: boolean = false;
	private customInstructions?: string;
	private autoApprovalSettings: AutoApprovalSettings;
	private apiConversationHistory: Anthropic.MessageParam[] = [];
	private clineMessages: ClineMessage[] = [];
	private askResponse?: ClineAskResponse;
	private askResponseText?: string;
	private askResponseImages?: string[];
	private lastMessageTs?: number;
	private consecutiveAutoApprovedRequestsCount: number = 0;
	private consecutiveMistakeCount: number = 0;
	private _abort: boolean = false;
	private didFinishAbortingStream = false;
	private abandoned = false;
	private checkpointTracker?: CheckpointTracker;
	private checkpointTrackerErrorMessage?: string;
	private conversationHistoryDeletedRange?: [number, number];
	private isInitialized = false;
	private userMessageContentReady: boolean = false;
	private didCompleteReadingStream: boolean = false;
	private assistantMessageContent: AssistantMessageContent[] = [];
	private userMessageContent: UserContent = [];
	
	private readonly task?: string;
	private readonly images?: string[];
	private readonly historyItem?: HistoryItem;

	static async create(
		provider: ClineProvider,
		apiConfiguration: ApiConfiguration,
		autoApprovalSettings: AutoApprovalSettings,
		customInstructions?: string,
		task?: string,
		images?: string[],
		historyItem?: HistoryItem,
	): Promise<Cline> {
		const instance = new Cline(
			provider,
			apiConfiguration,
			autoApprovalSettings,
			customInstructions,
			task,
			images,
			historyItem
		);
		await instance.initialize();
		return instance;
	}

	private constructor(
		provider: ClineProvider,
		apiConfiguration: ApiConfiguration,
		autoApprovalSettings: AutoApprovalSettings,
		customInstructions?: string,
		task?: string,
		images?: string[],
		historyItem?: HistoryItem,
	) {
		this.providerRef = new WeakRef(provider);
		this.api = buildApiHandler(apiConfiguration);
		this.terminalManager = new TerminalManager();
		this.urlContentFetcher = new UrlContentFetcher(provider.context);
		this.browserSession = new BrowserSession(provider.context);
		this.diffViewProvider = new DiffViewProvider(cwd);
		this.customInstructions = customInstructions;
		this.autoApprovalSettings = autoApprovalSettings;
		this.toolCallOptimizationAgent = new ToolCallOptimizationAgent();
		this.apiRequestService = new ApiRequestService();
		this.messageService = new MessageService({
			conversationStateService: this.conversationStateService,
			clineStateService: this.clineStateService
		});
		this.conversationStateService = new ConversationStateService(historyItem);
		this.clineStateService = new ClineStateService();
		this.abortSubject = new Subject<boolean>();
		this.taskId = historyItem?.id ?? Date.now().toString();
		this.task = task;
		this.images = images;
		this.historyItem = historyItem;
		this.toolExecutionService = new ToolExecutionService(this.toolCallOptimizationAgent);
	}

	private async initialize(): Promise<void> {
		const taskDir = await this.ensureTaskDirectoryExists();
		const initialHistory = this.historyItem ? await this.getSavedApiConversationHistory() : [];
		
		this.conversationHistoryService = new ConversationHistoryService({ 
			taskDir,
			initialHistory
		});

		if (this.historyItem) {
			this.conversationHistoryDeletedRange = this.historyItem.conversationHistoryDeletedRange;
			await this.resumeTaskFromHistory();
		} else if (this.task || this.images) {
			await this.startTask(this.task, this.images);
		}

		// Subscribe to state changes
		this.clineStateService.isStreaming$.subscribe(isStreaming => {
			this.isStreaming = isStreaming;
		});

		this.clineStateService.abort$.subscribe(abort => {
			this._abort = abort;
		});
	}

	// remove refactor
	// Add this new private method
	private async initializeConversationHistoryService(historyItem?: HistoryItem) {
		const taskDir = await this.ensureTaskDirectoryExists();
		const initialHistory = historyItem ? await this.getSavedApiConversationHistory() : [];
		this.conversationHistoryService = new ConversationHistoryService({ taskDir, initialHistory });
	}

	// Storing task to disk for history

	private async ensureTaskDirectoryExists(): Promise<string> {
		const globalStoragePath = this.providerRef.deref()?.context.globalStorageUri.fsPath
		if (!globalStoragePath) {
			throw new Error("Global storage uri is invalid")
		}
		const taskDir = path.join(globalStoragePath, "tasks", this.taskId)
		await fs.mkdir(taskDir, { recursive: true })
		return taskDir
	}
	// remove refactor
	private async getSavedApiConversationHistory(): Promise<Anthropic.MessageParam[]> {
		try {
			const taskDir = await this.ensureTaskDirectoryExists();
			const service = new ConversationHistoryService({ taskDir });
			const loadResult = await firstValueFrom(service.loadFromFile());
			if (!loadResult.success) {
				console.error('Failed to load history from file:', loadResult.error);
				return [];
			}
			const historyResult = service.getCurrentHistory();
			if (!historyResult.success) {
				console.error('Failed to get current history:', historyResult.error);
				return [];
			}
			service.dispose();
			return historyResult.data;
		} catch (error) {
			console.error('Failed to read conversation history:', error);
			return [];
		}
	}
	// remove refactor
	private async addToApiConversationHistory(message: Anthropic.MessageParam): Promise<void> {
		const result = await firstValueFrom(this.conversationHistoryService.addMessage(message));
		if (!result.success) {
			console.error('Failed to add message to history:', result.error);
			throw new Error(result.error.message);
		}
	}
	// remove refactor
	private async overwriteApiConversationHistory(newHistory: Anthropic.MessageParam[]): Promise<void> {
		const taskDir = await this.ensureTaskDirectoryExists();
		this.conversationHistoryService = new ConversationHistoryService({ 
			taskDir, 
			initialHistory: newHistory 
		});
	}

	private async saveApiConversationHistory() {
		try {
			const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.apiConversationHistory)
			await fs.writeFile(filePath, JSON.stringify(this.apiConversationHistory))
		} catch (error) {
			// in the off chance this fails, we don't want to stop the task
			console.error("Failed to save API conversation history:", error)
		}
	}

	private async getSavedClineMessages(): Promise<ClineMessage[]> {
		const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.uiMessages)
		if (await fileExistsAtPath(filePath)) {
			return JSON.parse(await fs.readFile(filePath, "utf8"))
		} else {
			// check old location
			const oldPath = path.join(await this.ensureTaskDirectoryExists(), "claude_messages.json")
			if (await fileExistsAtPath(oldPath)) {
				const data = JSON.parse(await fs.readFile(oldPath, "utf8"))
				await fs.unlink(oldPath) // remove old file
				return data
			}
		}
		return []
	}

	private async addToClineMessages(message: ClineMessage) {
		// these values allow us to reconstruct the conversation history at the time this cline message was created
		// it's important that apiConversationHistory is initialized before we add cline messages
		message.conversationHistoryIndex = this.apiConversationHistory.length - 1 // NOTE: this is the index of the last added message which is the user message, and once the clinemessages have been presented we update the apiconversationhistory with the completed assistant message. This means when reseting to a message, we need to +1 this index to get the correct assistant message that this tool use corresponds to
		message.conversationHistoryDeletedRange = this.conversationHistoryDeletedRange
		this.clineMessages.push(message)
		await this.saveClineMessages()
	}

	private async overwriteClineMessages(newMessages: ClineMessage[]) {
		this.clineMessages = newMessages
		await this.saveClineMessages()
	}

	private async saveClineMessages() {
		try {
			const taskDir = await this.ensureTaskDirectoryExists()
			const filePath = path.join(taskDir, GlobalFileNames.uiMessages)
			await fs.writeFile(filePath, JSON.stringify(this.clineMessages))
			// combined as they are in ChatView
			const apiMetrics = getApiMetrics(combineApiRequests(combineCommandSequences(this.clineMessages.slice(1))))
			const taskMessage = this.clineMessages[0] // first message is always the task say
			const lastRelevantMessage =
				this.clineMessages[
					findLastIndex(this.clineMessages, (m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task"))
				]
			let taskDirSize = 0
			try {
				// getFolderSize.loose silently ignores errors
				// returns # of bytes, size/1000/1000 = MB
				taskDirSize = await getFolderSize.loose(taskDir)
			} catch (error) {
				console.error("Failed to get task directory size:", taskDir, error)
			}
			await this.providerRef.deref()?.updateTaskHistory({
				id: this.taskId,
				ts: lastRelevantMessage.ts,
				task: taskMessage.text ?? "",
				tokensIn: apiMetrics.totalTokensIn,
				tokensOut: apiMetrics.totalTokensOut,
				cacheWrites: apiMetrics.totalCacheWrites,
				cacheReads: apiMetrics.totalCacheReads,
				totalCost: apiMetrics.totalCost,
				size: taskDirSize,
				shadowGitConfigWorkTree: await this.checkpointTracker?.getShadowGitConfigWorkTree(),
				conversationHistoryDeletedRange: this.conversationHistoryDeletedRange,
			})
		} catch (error) {
			console.error("Failed to save cline messages:", error)
		}
	}

	async restoreCheckpoint(messageTs: number, restoreType: ClineCheckpointRestore) {
		const messageIndex = this.clineMessages.findIndex((m) => m.ts === messageTs)
		const message = this.clineMessages[messageIndex]
		if (!message) {
			console.error("Message not found", this.clineMessages)
			return
		}

		let didWorkspaceRestoreFail = false

		switch (restoreType) {
			case "task":
				break
			case "taskAndWorkspace":
			case "workspace":
				if (!this.checkpointTracker) {
					try {
						this.checkpointTracker = await CheckpointTracker.create(this.taskId, this.providerRef.deref())
						this.checkpointTrackerErrorMessage = undefined
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : "Unknown error"
						console.error("Failed to initialize checkpoint tracker:", errorMessage)
						this.checkpointTrackerErrorMessage = errorMessage
						await this.providerRef.deref()?.postStateToWebview()
						vscode.window.showErrorMessage(errorMessage)
						didWorkspaceRestoreFail = true
					}
				}
				if (message.lastCheckpointHash && this.checkpointTracker) {
					try {
						await this.checkpointTracker.resetHead(message.lastCheckpointHash)
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : "Unknown error"
						vscode.window.showErrorMessage("Failed to restore checkpoint: " + errorMessage)
						didWorkspaceRestoreFail = true
					}
				}
				break
		}

		if (!didWorkspaceRestoreFail) {
			switch (restoreType) {
				case "task":
				case "taskAndWorkspace":
					this.conversationHistoryDeletedRange = message.conversationHistoryDeletedRange
					const newConversationHistory = this.apiConversationHistory.slice(
						0,
						(message.conversationHistoryIndex || 0) + 2,
					) // +1 since this index corresponds to the last user message, and another +1 since slice end index is exclusive
					await this.overwriteApiConversationHistory(newConversationHistory)

					// aggregate deleted api reqs info so we don't lose costs/tokens
					const deletedMessages = this.clineMessages.slice(messageIndex + 1)
					const deletedApiReqsMetrics = getApiMetrics(combineApiRequests(combineCommandSequences(deletedMessages)))

					const newClineMessages = this.clineMessages.slice(0, messageIndex + 1)
					await this.overwriteClineMessages(newClineMessages) // calls saveClineMessages which saves historyItem

					await this.say(
						"deleted_api_reqs",
						JSON.stringify({
							tokensIn: deletedApiReqsMetrics.totalTokensIn,
							tokensOut: deletedApiReqsMetrics.totalTokensOut,
							cacheWrites: deletedApiReqsMetrics.totalCacheWrites,
							cacheReads: deletedApiReqsMetrics.totalCacheReads,
							cost: deletedApiReqsMetrics.totalCost,
						} satisfies ClineApiReqInfo),
					)
					break
				case "workspace":
					break
			}

			switch (restoreType) {
				case "task":
					vscode.window.showInformationMessage("Task messages have been restored to the checkpoint")
					break
				case "workspace":
					vscode.window.showInformationMessage("Workspace files have been restored to the checkpoint")
					break
				case "taskAndWorkspace":
					vscode.window.showInformationMessage("Task and workspace have been restored to the checkpoint")
					break
			}

			await this.providerRef.deref()?.postMessageToWebview({ type: "relinquishControl" })

			this.providerRef.deref()?.cancelTask() // the task is already cancelled by the provider beforehand, but we need to re-init to get the updated messages
		} else {
			await this.providerRef.deref()?.postMessageToWebview({ type: "relinquishControl" })
		}
	}

	async presentMultifileDiff(messageTs: number, seeNewChangesSinceLastTaskCompletion: boolean) {
		const relinquishButton = () => {
			this.providerRef.deref()?.postMessageToWebview({ type: "relinquishControl" })
		}

		console.log("presentMultifileDiff", messageTs)
		const messageIndex = this.clineMessages.findIndex((m) => m.ts === messageTs)
		const message = this.clineMessages[messageIndex]
		if (!message) {
			console.error("Message not found")
			relinquishButton()
			return
		}
		const hash = message.lastCheckpointHash
		if (!hash) {
			console.error("No checkpoint hash found")
			relinquishButton()
			return
		}

		// TODO: handle if this is called from outside original workspace, in which case we need to show user error message we cant show diff outside of workspace?
		if (!this.checkpointTracker) {
			try {
				this.checkpointTracker = await CheckpointTracker.create(this.taskId, this.providerRef.deref())
				this.checkpointTrackerErrorMessage = undefined
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error"
				console.error("Failed to initialize checkpoint tracker:", errorMessage)
				this.checkpointTrackerErrorMessage = errorMessage
				await this.providerRef.deref()?.postStateToWebview()
				vscode.window.showErrorMessage(errorMessage)
				relinquishButton()
				return
			}
		}

		let changedFiles:
			| {
					relativePath: string
					absolutePath: string
					before: string
					after: string
			  }[]
			| undefined

		try {
			if (seeNewChangesSinceLastTaskCompletion) {
				// Get last task completed
				const lastTaskCompletedMessage = findLast(
					this.clineMessages.slice(0, messageIndex),
					(m) => m.say === "completion_result",
				) // ask is only used to relinquish control, its the last say we care about
				// if undefined, then we get diff from beginning of git
				// if (!lastTaskCompletedMessage) {
				// 	console.error("No previous task completion message found")
				// 	return
				// }

				// Get changed files between current state and commit
				changedFiles = await this.checkpointTracker?.getDiffSet(
					lastTaskCompletedMessage?.lastCheckpointHash, // if undefined, then we get diff from beginning of git history, AKA when the task was started
					hash,
				)
				if (!changedFiles?.length) {
					vscode.window.showInformationMessage("No changes found")
					relinquishButton()
					return
				}
			} else {
				// Get changed files between current state and commit
				changedFiles = await this.checkpointTracker?.getDiffSet(hash)
				if (!changedFiles?.length) {
					vscode.window.showInformationMessage("No changes found")
					relinquishButton()
					return
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			vscode.window.showErrorMessage("Failed to retrieve diff set: " + errorMessage)
			relinquishButton()
			return
		}

		// Check if multi-diff editor is enabled in VS Code settings
		// const config = vscode.workspace.getConfiguration()
		// const isMultiDiffEnabled = config.get("multiDiffEditor.experimental.enabled")

		// if (!isMultiDiffEnabled) {
		// 	vscode.window.showErrorMessage(
		// 		"Please enable 'multiDiffEditor.experimental.enabled' in your VS Code settings to use this feature.",
		// 	)
		// 	relinquishButton()
		// 	return
		// }
		// Open multi-diff editor
		await vscode.commands.executeCommand(
			"vscode.changes",
			seeNewChangesSinceLastTaskCompletion ? "New changes" : "Changes since snapshot",
			changedFiles.map((file) => [
				vscode.Uri.file(file.absolutePath),
				vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${file.relativePath}`).with({
					query: Buffer.from(file.before ?? "").toString("base64"),
				}),
				vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${file.relativePath}`).with({
					query: Buffer.from(file.after ?? "").toString("base64"),
				}),
			]),
		)
		relinquishButton()
	}

	async doesLatestTaskCompletionHaveNewChanges() {
		const messageIndex = findLastIndex(this.clineMessages, (m) => m.say === "completion_result")
		const message = this.clineMessages[messageIndex]
		if (!message) {
			console.error("Completion message not found")
			return false
		}
		const hash = message.lastCheckpointHash
		if (!hash) {
			console.error("No checkpoint hash found")
			return false
		}

		if (!this.checkpointTracker) {
			try {
				this.checkpointTracker = await CheckpointTracker.create(this.taskId, this.providerRef.deref())
				this.checkpointTrackerErrorMessage = undefined
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error"
				console.error("Failed to initialize checkpoint tracker:", errorMessage)
				return false
			}
		}

		// Get last task completed
		const lastTaskCompletedMessage = findLast(this.clineMessages.slice(0, messageIndex), (m) => m.say === "completion_result")

		try {
			// Get changed files between current state and commit
			const changedFiles = await this.checkpointTracker?.getDiffSet(
				lastTaskCompletedMessage?.lastCheckpointHash, // if undefined, then we get diff from beginning of git history, AKA when the task was started
				hash,
			)
			const changedFilesCount = changedFiles?.length || 0
			if (changedFilesCount > 0) {
				return true
			}
		} catch (error) {
			console.error("Failed to get diff set:", error)
			return false
		}

		return false
	}

	// Communicate with webview

	// partial has three valid states true (partial message), false (completion of partial message), undefined (individual complete message)
	async ask(
		type: ClineAsk,
		text?: string,
		partial?: boolean,
	): Promise<{
		response: ClineAskResponse
		text?: string
		images?: string[]
	}> {
		// If this Cline instance was aborted by the provider, then the only thing keeping us alive is a promise still running in the background, in which case we don't want to send its result to the webview as it is attached to a new instance of Cline now. So we can safely ignore the result of any active promises, and this class will be deallocated. (Although we set Cline = undefined in provider, that simply removes the reference to this instance, but the instance is still alive until this promise resolves or rejects.)
		if (this._abort) {
			throw new Error("Cline instance aborted")
		}

		this.conversationStateService.setProcessing(true);
		
		try {
			const result = await firstValueFrom(this.messageService.ask(type, text, partial).pipe(
				tap(response => {
					if (response.text) {
						this.conversationStateService.updateMessage({
							type: 'ask',
							text: response.text,
							ts: Date.now(),
							partial: partial
						});
					}
				}),
				catchError(error => {
					this.conversationStateService.setError(error.message);
					throw error;
				})
			));

			this.conversationStateService.setProcessing(false);
			return result;
		} catch (error) {
			this.conversationStateService.setProcessing(false);
			throw error;
		}
	}

	async handleWebviewAskResponse(askResponse: ClineAskResponse, text?: string, images?: string[]) {
		this.askResponse = askResponse;
		this.askResponseText = text;
		this.askResponseImages = images;
		
		if (text) {
			this.conversationStateService.setAskResponse(askResponse, text, images);
		}
	}

	async say(type: ClineSay, text?: string, images?: string[], partial?: boolean): Promise<undefined> {
		if (this._abort) {
			throw new Error("Cline instance aborted")
		}

		try {
			await firstValueFrom(this.messageService.say(type, text, images, partial).pipe(
				tap(response => {
					this.conversationStateService.updateMessage({
						type: 'say',
						text: text || '',
						ts: Date.now(),
						partial: partial
					});
				}),
				catchError(error => {
					this.conversationStateService.setError(error.message);
					throw error;
				})
			));
			return undefined;
		} catch (error) {
			throw error;
		}
	}

	async sayAndCreateMissingParamError(toolName: ToolUseName, paramName: string, relPath?: string) {
		await this.say(
			"error",
			`Cline tried to use ${toolName}${
				relPath ? ` for '${relPath.toPosix()}'` : ""
			} without value for required parameter '${paramName}'. Retrying...`,
		)
		return formatResponse.toolError(formatResponse.missingToolParameterError(paramName))
	}

	async removeLastPartialMessageIfExistsWithType(type: "ask" | "say", askOrSay: ClineAsk | ClineSay) {
		const lastMessage = this.clineMessages.at(-1)
		if (lastMessage?.partial && lastMessage.type === type && (lastMessage.ask === askOrSay || lastMessage.say === askOrSay)) {
			this.clineMessages.pop()
			await this.saveClineMessages()
			await this.providerRef.deref()?.postStateToWebview()
		}
	}

	// Task lifecycle

	private async startTask(task?: string, images?: string[]): Promise<void> {
		// Reset conversation state
		this.conversationStateService.setState({
			messages: [],
			isProcessing: false
		});
		
		await this.say("text", task, images);

		this.isInitialized = true;

		let imageBlocks: Anthropic.ImageBlockParam[] = formatResponse.imageBlocks(images);
		await this.initiateTaskLoop(
			[
				{
					type: "text",
					text: `<task>\n${task}\n</task>`,
				},
				...imageBlocks,
			],
			true,
		);
	}

	private async resumeTaskFromHistory() {
		// Initialize conversation state with history
		// TODO: right now we let users init checkpoints for old tasks, assuming they're continuing them from the same workspace (which we never tied to tasks, so no way for us to know if it's opened in the right workspace)
		// const doesShadowGitExist = await CheckpointTracker.doesShadowGitExist(this.taskId, this.providerRef.deref())
		// if (!doesShadowGitExist) {
		// 	this.checkpointTrackerErrorMessage = "Checkpoints are only available for new tasks"
		// }
		const modifiedClineMessages = await this.getSavedClineMessages();
		
		// Remove any resume messages that may have been added before
		const lastRelevantMessageIndex = findLastIndex(
			modifiedClineMessages,
			(m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task"),
		);
		if (lastRelevantMessageIndex !== -1) {
			modifiedClineMessages.splice(lastRelevantMessageIndex + 1);
		}
		this.conversationStateService.setState({
			messages: modifiedClineMessages.map(msg => ({
				type: msg.type,
				text: msg.text || '',
				ts: msg.ts,
				partial: msg.partial
			})),
			isProcessing: false
		});

		await this.overwriteClineMessages(modifiedClineMessages);
		this.clineMessages = await this.getSavedClineMessages();

		// Initialize API conversation history
		this.apiConversationHistory = await this.getSavedApiConversationHistory();

		const lastClineMessage = this.clineMessages
			.slice()
			.reverse()
			.find((m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task"));

		let askType: ClineAsk;
		if (lastClineMessage?.ask === "completion_result") {
			askType = "resume_completed_task";
		} else {
			askType = "resume_task";
		}

		this.isInitialized = true;

		const { response, text, images } = await this.ask(askType);
		let responseText: string | undefined;
		let responseImages: string[] | undefined;
		if (response === "messageResponse") {
			await this.say("user_feedback", text, images);
			responseText = text;
			responseImages = images;
		}

		// ... rest of the existing code ...

		let existingApiConversationHistory: Anthropic.Messages.MessageParam[] = await this.getSavedApiConversationHistory()

		// v2.0 xml tags refactor caveat: since we don't use tools anymore, we need to replace all tool use blocks with a text block since the API disallows conversations with tool uses and no tool schema
		const conversationWithoutToolBlocks = existingApiConversationHistory.map((message) => {
			if (Array.isArray(message.content)) {
				const newContent = message.content.map((block) => {
					if (block.type === "tool_use") {
						// it's important we convert to the new tool schema format so the model doesn't get confused about how to invoke tools
						const inputAsXml = Object.entries(block.input as Record<string, string>)
							.map(([key, value]) => `<${key}>\n${value}\n</${key}>`)
							.join("\n")
						return {
							type: "text",
							text: `<${block.name}>\n${inputAsXml}\n</${block.name}>`,
						} as Anthropic.Messages.TextBlockParam
					} else if (block.type === "tool_result") {
						// Convert block.content to text block array, removing images
						const contentAsTextBlocks = Array.isArray(block.content)
							? block.content.filter((item) => item.type === "text")
							: [{ type: "text", text: block.content }]
						const textContent = contentAsTextBlocks.map((item) => item.text).join("\n\n")
						const toolName = findToolName(block.tool_use_id, existingApiConversationHistory)
						return {
							type: "text",
							text: `[${toolName} Result]\n\n${textContent}`,
						} as Anthropic.Messages.TextBlockParam
					}
					return block
				})
				return { ...message, content: newContent }
			}
			return message
		})
		existingApiConversationHistory = conversationWithoutToolBlocks

		// FIXME: remove tool use blocks altogether

		// if the last message is an assistant message, we need to check if there's tool use since every tool use has to have a tool response
		// if there's no tool use and only a text block, then we can just add a user message
		// (note this isn't relevant anymore since we use custom tool prompts instead of tool use blocks, but this is here for legacy purposes in case users resume old tasks)

		// if the last message is a user message, we need to get the assistant message before it to see if it made tool calls, and if so, fill in the remaining tool responses with 'interrupted'

		let modifiedOldUserContent: UserContent // either the last message if its user message, or the user message before the last (assistant) message
		let modifiedApiConversationHistory: Anthropic.Messages.MessageParam[] // need to remove the last user message to replace with new modified user message
		if (existingApiConversationHistory.length > 0) {
			const lastMessage = existingApiConversationHistory[existingApiConversationHistory.length - 1]

			if (lastMessage.role === "assistant") {
				const content = Array.isArray(lastMessage.content)
					? lastMessage.content
					: [{ type: "text", text: lastMessage.content }]
				const hasToolUse = content.some((block) => block.type === "tool_use")

				if (hasToolUse) {
					const toolUseBlocks = content.filter(
						(block) => block.type === "tool_use",
					) as Anthropic.Messages.ToolUseBlock[]
					const toolResponses: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => ({
						type: "tool_result",
						tool_use_id: block.id,
						content: "Task was interrupted before this tool call could be completed.",
					}))
					modifiedApiConversationHistory = [...existingApiConversationHistory] // no changes
					modifiedOldUserContent = [...toolResponses]
				} else {
					modifiedApiConversationHistory = [...existingApiConversationHistory]
					modifiedOldUserContent = []
				}
			} else if (lastMessage.role === "user") {
				const previousAssistantMessage: Anthropic.Messages.MessageParam | undefined =
					existingApiConversationHistory[existingApiConversationHistory.length - 2]

				const existingUserContent: UserContent = Array.isArray(lastMessage.content)
					? lastMessage.content
					: [{ type: "text", text: lastMessage.content }]
				if (previousAssistantMessage && previousAssistantMessage.role === "assistant") {
					const assistantContent = Array.isArray(previousAssistantMessage.content)
						? previousAssistantMessage.content
						: [
								{
									type: "text",
									text: previousAssistantMessage.content,
								},
							]

					const toolUseBlocks = assistantContent.filter(
						(block) => block.type === "tool_use",
					) as Anthropic.Messages.ToolUseBlock[]

					if (toolUseBlocks.length > 0) {
						const existingToolResults = existingUserContent.filter(
							(block) => block.type === "tool_result",
						) as Anthropic.ToolResultBlockParam[]

						const missingToolResponses: Anthropic.ToolResultBlockParam[] = toolUseBlocks
							.filter((toolUse) => !existingToolResults.some((result) => result.tool_use_id === toolUse.id))
							.map((toolUse) => ({
								type: "tool_result",
								tool_use_id: toolUse.id,
								content: "Task was interrupted before this tool call could be completed.",
							}))

						modifiedApiConversationHistory = existingApiConversationHistory.slice(0, -1) // removes the last user message
						modifiedOldUserContent = [...existingUserContent, ...missingToolResponses]
					} else {
						modifiedApiConversationHistory = existingApiConversationHistory.slice(0, -1)
						modifiedOldUserContent = [...existingUserContent]
					}
				} else {
					modifiedApiConversationHistory = existingApiConversationHistory.slice(0, -1)
					modifiedOldUserContent = [...existingUserContent]
				}
			} else {
				throw new Error("Unexpected: Last message is not a user or assistant message")
			}
		} else {
			throw new Error("Unexpected: No existing API conversation history")
			// console.error("Unexpected: No existing API conversation history")
			// modifiedApiConversationHistory = []
			// modifiedOldUserContent = []
		}

		let newUserContent: UserContent = [...modifiedOldUserContent]

		const agoText = (() => {
			const timestamp = lastClineMessage?.ts ?? Date.now()
			const now = Date.now()
			const diff = now - timestamp
			const minutes = Math.floor(diff / 60000)
			const hours = Math.floor(minutes / 60)
			const days = Math.floor(hours / 24)

			if (days > 0) {
				return `${days} day${days > 1 ? "s" : ""} ago`
			}
			if (hours > 0) {
				return `${hours} hour${hours > 1 ? "s" : ""} ago`
			}
			if (minutes > 0) {
				return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
			}
			return "just now"
		})()

		const wasRecent = lastClineMessage?.ts && Date.now() - lastClineMessage.ts < 30_000

		newUserContent.push({
			type: "text",
			text:
				`[TASK RESUMPTION] This task was interrupted ${agoText}. It may or may not be complete, so please reassess the task context. Be aware that the project state may have changed since then. The current working directory is now '${cwd.toPosix()}'. If the task has not been completed, retry the last step before interruption and proceed with completing the task.\n\nNote: If you previously attempted a tool use that the user did not provide a result for, you should assume the tool use was not successful and assess whether you should retry. If the last tool was a browser_action, the browser has been closed and you must launch a new browser if needed.${
					wasRecent
						? "\n\nIMPORTANT: If the last tool use was a replace_in_file or write_to_file that was interrupted, the file was reverted back to its original state before the interrupted edit, and you do NOT need to re-read the file as you already have its up-to-date contents."
						: ""
				}` +
				(responseText
					? `\n\nNew instructions for task continuation:\n<user_message>\n${responseText}\n</user_message>`
					: ""),
		})

		if (responseImages && responseImages.length > 0) {
			newUserContent.push(...formatResponse.imageBlocks(responseImages))
		}

		await this.overwriteApiConversationHistory(modifiedApiConversationHistory)
		await this.initiateTaskLoop(newUserContent, false)
	}

	private async initiateTaskLoop(userContent: UserContent, isNewTask: boolean): Promise<void> {
		let nextUserContent = userContent
		let includeFileDetails = true
		while (!this._abort) {
			const didEndLoop = await this.recursivelyMakeClineRequests(nextUserContent, includeFileDetails, isNewTask)
			includeFileDetails = false // we only need file details the first time

			//  The way this agentic loop works is that cline will be given a task that he then calls tools to complete. unless there's an attempt_completion call, we keep responding back to him with his tool's responses until he either attempt_completion or does not use anymore tools. If he does not use anymore tools, we ask him to consider if he's completed the task and then call attempt_completion, otherwise proceed with completing the task.
			// There is a MAX_REQUESTS_PER_TASK limit to prevent infinite requests, but Cline is prompted to finish the task as efficiently as he can.

			//const totalCost = this.calculateApiCost(totalInputTokens, totalOutputTokens)
			if (didEndLoop) {
				// For now a task never 'completes'. This will only happen if the user hits max requests and denies resetting the count.
				//this.say("task_completed", `Task completed. Total API usage cost: ${totalCost}`)
				break
			} else {
				// this.say(
				// 	"tool",
				// 	"Cline responded with only text blocks but has not called attempt_completion yet. Forcing him to continue with task..."
				// )
				nextUserContent = [
					{
						type: "text",
						text: formatResponse.noToolsUsed(),
					},
				]
				this.consecutiveMistakeCount++
			}
		}
	}

	async abortTask() {
		this._abort = true // will stop any autonomously running promises
		this.terminalManager.disposeAll()
		this.urlContentFetcher.closeBrowser()
		this.browserSession.closeBrowser()
		await this.diffViewProvider.revertChanges() // need to await for when we want to make sure directories/files are reverted before re-starting the task from a checkpoint
		this.conversationHistoryService.dispose()
	}

	// Checkpoints

	async saveCheckpoint() {
		const commitHash = await this.checkpointTracker?.commit() // silently fails for now
		if (commitHash) {
			// Start from the end and work backwards until we find a tool use or another message with a hash
			for (let i = this.clineMessages.length - 1; i >= 0; i--) {
				const message = this.clineMessages[i]
				if (message.lastCheckpointHash) {
					// Found a message with a hash, so we can stop
					break
				}
				// Update this message with a hash
				message.lastCheckpointHash = commitHash

				// We only care about adding the hash to the last tool use (we don't want to add this hash to every prior message ie for tasks pre-checkpoint)
				const isToolUse =
					message.say === "tool" ||
					message.ask === "tool" ||
					message.say === "command" ||
					message.ask === "command" ||
					message.say === "completion_result" ||
					message.ask === "completion_result" ||
					message.ask === "followup" ||
					message.say === "use_mcp_server" ||
					message.ask === "use_mcp_server" ||
					message.say === "browser_action" ||
					message.say === "browser_action_launch" ||
					message.ask === "browser_action_launch"

				if (isToolUse) {
					break
				}
			}
			// Save the updated messages
			await this.saveClineMessages()
		}
	}

	// Tools

	async executeCommandTool(command: string): Promise<[boolean, ToolResponse]> {
		const terminalInfo = await this.terminalManager.getOrCreateTerminal(cwd)
		terminalInfo.terminal.show() // weird visual bug when creating new terminals (even manually) where there's an empty space at the top.
		const process = this.terminalManager.runCommand(terminalInfo, command)

		let userFeedback: { text?: string; images?: string[] } | undefined
		let didContinue = false
		const sendCommandOutput = async (line: string): Promise<void> => {
			try {
				const { response, text, images } = await this.ask("command_output", line)
				if (response === "yesButtonClicked") {
					// proceed while running
				} else {
					userFeedback = { text, images }
				}
				didContinue = true
				process.continue() // continue past the await
			} catch {
				// This can only happen if this ask promise was ignored, so ignore this error
			}
		}

		let result = ""
		process.on("line", (line) => {
			result += line + "\n"
			if (!didContinue) {
				sendCommandOutput(line)
			} else {
				this.say("command_output", line)
			}
		})

		let completed = false
		process.once("completed", () => {
			completed = true
		})

		process.once("no_shell_integration", async () => {
			await this.say("shell_integration_warning")
		})

		await process

		// Wait for a short delay to ensure all messages are sent to the webview
		// This delay allows time for non-awaited promises to be created and
		// for their associated messages to be sent to the webview, maintaining
		// the correct order of messages (although the webview is smart about
		// grouping command_output messages despite any gaps anyways)
		await delay(50)

		result = result.trim()

		if (userFeedback) {
			await this.say("user_feedback", userFeedback.text, userFeedback.images)
			return [
				true,
				formatResponse.toolResult(
					`Command is still running in the user's terminal.${
						result.length > 0 ? `\nHere's the output so far:\n${result}` : ""
					}\n\nThe user provided the following feedback:\n<feedback>\n${userFeedback.text}\n</feedback>`,
					userFeedback.images,
				),
			]
		}

		if (completed) {
			return [false, `Command executed.${result.length > 0 ? `\nOutput:\n${result}` : ""}`]
		} else {
			return [
				false,
				`Command is still running in the user's terminal.${
					result.length > 0 ? `\nHere's the output so far:\n${result}` : ""
				}\n\nYou will be updated on the terminal status and new output in the future.`,
			]
		}
	}

	shouldAutoApproveTool(toolName: ToolUseName): boolean {
		if (this.autoApprovalSettings.enabled) {
			switch (toolName) {
				case "read_file":
				case "list_files":
				case "list_code_definition_names":
				case "search_files":
					return this.autoApprovalSettings.actions.readFiles
				case "write_to_file":
				case "replace_in_file":
					return this.autoApprovalSettings.actions.editFiles
				case "execute_command":
					return this.autoApprovalSettings.actions.executeCommands
				case "browser_action":
					return this.autoApprovalSettings.actions.useBrowser
				case "access_mcp_resource":
				case "use_mcp_tool":
					return this.autoApprovalSettings.actions.useMcp
			}
		}
		return false
	}

	async *attemptApiRequest(previousApiReqIndex: number): ApiStream {
		// Wait for MCP servers to be connected before generating system prompt
		await pWaitFor(() => this.providerRef.deref()?.mcpHub?.isConnecting !== true, { timeout: 10_000 }).catch(() => {
			console.error("MCP servers failed to connect in time")
		})

		const mcpHub = this.providerRef.deref()?.mcpHub
		if (!mcpHub) {
			throw new Error("MCP hub not available")
		}

		let systemPrompt = await SYSTEM_PROMPT(cwd, this.api.getModel().info.supportsComputerUse ?? false, mcpHub)
		let settingsCustomInstructions = this.customInstructions?.trim()
		const clineRulesFilePath = path.resolve(cwd, GlobalFileNames.clineRules)
		let clineRulesFileInstructions: string | undefined
		if (await fileExistsAtPath(clineRulesFilePath)) {
			try {
				const ruleFileContent = (await fs.readFile(clineRulesFilePath, "utf8")).trim()
				if (ruleFileContent) {
					clineRulesFileInstructions = `# .clinerules\n\nThe following is provided by a root-level .clinerules file where the user has specified instructions for this working directory (${cwd.toPosix()})\n\n${ruleFileContent}`
				}
			} catch {
				console.error(`Failed to read .clinerules file at ${clineRulesFilePath}`)
			}
		}

		if (settingsCustomInstructions || clineRulesFileInstructions) {
			// altering the system prompt mid-task will break the prompt cache, but in the grand scheme this will not change often so it's better to not pollute user messages with it the way we have to with <potentially relevant details>
			systemPrompt += addUserInstructions(settingsCustomInstructions, clineRulesFileInstructions)
		}

		// If the previous API request's total token usage is close to the context window, truncate the conversation history to free up space for the new request
		if (previousApiReqIndex >= 0) {
			const previousRequest = this.clineMessages[previousApiReqIndex]
			if (previousRequest && previousRequest.text) {
				const { tokensIn, tokensOut, cacheWrites, cacheReads }: ClineApiReqInfo = JSON.parse(previousRequest.text)
				const totalTokens = (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0)
				let contextWindow = this.api.getModel().info.contextWindow || 128_000
				// FIXME: hack to get anyone using openai compatible with deepseek to have the proper context window instead of the default 128k. We need a way for the user to specify the context window for models they input through openai compatible
				if (this.api instanceof OpenAiHandler && this.api.getModel().id.toLowerCase().includes("deepseek")) {
					contextWindow = 64_000
				}
				let maxAllowedSize: number
				switch (contextWindow) {
					case 64_000: // deepseek models
						maxAllowedSize = contextWindow - 27_000
						break
					case 128_000: // most models
						maxAllowedSize = contextWindow - 30_000
						break
					case 200_000: // claude models
						maxAllowedSize = contextWindow - 40_000
						break
					default:
						maxAllowedSize = Math.max(contextWindow - 40_000, contextWindow * 0.8) // for deepseek, 80% of 64k meant only ~10k buffer which was too small and resulted in users getting context window errors.
				}

				// This is the most reliable way to know when we're close to hitting the context window.
				if (totalTokens >= maxAllowedSize) {
					// NOTE: it's okay that we overwriteConversationHistory in resume task since we're only ever removing the last user message and not anything in the middle which would affect this range
					this.conversationHistoryDeletedRange = getNextTruncationRange(
						this.apiConversationHistory,
						this.conversationHistoryDeletedRange,
					)
					await this.saveClineMessages() // saves task history item which we use to keep track of conversation history deleted range
					// await this.overwriteApiConversationHistory(truncatedMessages)
				}
			}
		}

		// conversationHistoryDeletedRange is updated only when we're close to hitting the context window, so we don't continuously break the prompt cache
		const truncatedConversationHistory = getTruncatedMessages(
			this.apiConversationHistory,
			this.conversationHistoryDeletedRange,
		)

		// Prepare API request options
		const apiRequestOptions = {
			systemPrompt,
			conversationHistory: this.apiConversationHistory,
			previousApiReqIndex,
			mcpHub,
			abort$: this.abortSubject.asObservable()
		};

		// Use ApiRequestService to perform the request
		const apiStream$ = this.apiRequestService.performApiRequest(this.api, apiRequestOptions);

		// Convert Observable to AsyncGenerator
		try {
		for await (const chunk of apiStream$) {
			yield chunk;
			}
		} catch (error) {
			// Handle first chunk error
			const { response } = await this.ask("api_req_failed", error.message ?? JSON.stringify(serializeError(error), null, 2))
			if (response !== "yesButtonClicked") {
				throw new Error("API request failed")
			}
			await this.say("api_req_retried")
			yield* this.attemptApiRequest(previousApiReqIndex)
		}
	}

	async presentAssistantMessage() {
		try {
			if (this._abort) {
				throw new Error("Cline instance aborted")
			}

			if (this.clineStateService.getCurrentIsStreaming()) {
				this.clineStateService.setIsStreaming(false);
				return
			}
			this.clineStateService.setIsStreaming(true);

			if (this.clineStateService.getCurrentDidCompleteReadingStream()) {
				this.userMessageContentReady = true
			}
			// console.log("no more content blocks to stream! this shouldn't happen?")
			this.clineStateService.setIsStreaming(false);
			return
			//throw new Error("No more content blocks to stream! This shouldn't happen...") // remove and just return after testing
		} catch (error) {
			console.error('Error presenting assistant message:', error);
			// Handle error appropriately
		}
	}

	async recursivelyMakeClineRequests(
		userContent: UserContent,
		includeFileDetails: boolean = false,
		isNewTask: boolean = false,
	): Promise<boolean> {
		if (this._abort) {
			throw new Error("Cline instance aborted")
		}

		if (this.consecutiveMistakeCount >= 3) {
			if (this.autoApprovalSettings.enabled && this.autoApprovalSettings.enableNotifications) {
				showSystemNotification({
					subtitle: "Error",
					message: "Cline is having trouble. Would you like to continue the task?",
				})
			}
			const { response, text, images } = await this.ask(
				"mistake_limit_reached",
				this.api.getModel().id.includes("claude")
					? `This may indicate a failure in his thought process or inability to use a tool properly, which can be mitigated with some user guidance (e.g. "Try breaking down the task into smaller steps").`
					: "Cline uses complex prompts and iterative task execution that may be challenging for less capable models. For best results, it's recommended to use Claude 3.5 Sonnet for its advanced agentic coding capabilities.",
			)
			if (response === "messageResponse") {
				userContent.push(
					...[
						{
							type: "text",
							text: formatResponse.tooManyMistakes(text),
						} as Anthropic.Messages.TextBlockParam,
						...formatResponse.imageBlocks(images),
					],
				)
			}
			this.consecutiveMistakeCount = 0
		}

		if (
			this.autoApprovalSettings.enabled &&
			this.consecutiveAutoApprovedRequestsCount >= this.autoApprovalSettings.maxRequests
		) {
			if (this.autoApprovalSettings.enableNotifications) {
				showSystemNotification({
					subtitle: "Max Requests Reached",
					message: `Cline has auto-approved ${this.autoApprovalSettings.maxRequests.toString()} API requests.`,
				})
			}
			await this.ask(
				"auto_approval_max_req_reached",
				`Cline has auto-approved ${this.autoApprovalSettings.maxRequests.toString()} API requests. Would you like to reset the count and proceed with the task?`,
			)
			// if we get past the promise it means the user approved and did not start a new task
			this.consecutiveAutoApprovedRequestsCount = 0
		}

		// get previous api req's index to check token usage and determine if we need to truncate conversation history
		const previousApiReqIndex = findLastIndex(this.clineMessages, (m) => m.say === "api_req_started")

		// getting verbose details is an expensive operation, it uses globby to top-down build file structure of project which for large projects can take a few seconds
		// for the best UX we show a placeholder api_req_started message with a loading spinner as this happens
		await this.say(
			"api_req_started",
			JSON.stringify({
				request: userContent.map((block) => formatContentBlockToMarkdown(block)).join("\n\n") + "\n\nLoading...",
			}),
		)

		// use this opportunity to initialize the checkpoint tracker (can be expensive to initialize in the constructor)
		// FIXME: right now we're letting users init checkpoints for old tasks, but this could be a problem if opening a task in the wrong workspace
		// isNewTask &&
		if (!this.checkpointTracker) {
			try {
				this.checkpointTracker = await CheckpointTracker.create(this.taskId, this.providerRef.deref())
				this.checkpointTrackerErrorMessage = undefined
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error"
				console.error("Failed to initialize checkpoint tracker:", errorMessage)
				this.checkpointTrackerErrorMessage = errorMessage // will be displayed right away since we saveClineMessages next which posts state to webview
			}
		}

		const [parsedUserContent, environmentDetails] = await this.loadContext(userContent, includeFileDetails)
		userContent = parsedUserContent
		// add environment details as its own text block, separate from tool results
		userContent.push({ type: "text", text: environmentDetails })

		await this.addToApiConversationHistory({
			role: "user",
			content: userContent,
		})

		// since we sent off a placeholder api_req_started message to update the webview while waiting to actually start the API request (to load potential details for example), we need to update the text of that message
		const lastApiReqIndex = findLastIndex(this.clineMessages, (m) => m.say === "api_req_started")
		this.clineMessages[lastApiReqIndex].text = JSON.stringify({
			request: userContent.map((block) => formatContentBlockToMarkdown(block)).join("\n\n"),
		} satisfies ClineApiReqInfo)
		await this.saveClineMessages()
		await this.providerRef.deref()?.postStateToWebview()

		try {
			let cacheWriteTokens = 0
			let cacheReadTokens = 0
			let inputTokens = 0
			let outputTokens = 0
			let totalCost: number | undefined

			// update api_req_started. we can't use api_req_finished anymore since it's a unique case where it could come after a streaming message (ie in the middle of being updated or executed)
			// fortunately api_req_finished was always parsed out for the gui anyways, so it remains solely for legacy purposes to keep track of prices in tasks from history
			// (it's worth removing a few months from now)
			const updateApiReqMsg = (cancelReason?: ClineApiReqCancelReason, streamingFailedMessage?: string) => {
				this.clineMessages[lastApiReqIndex].text = JSON.stringify({
					...JSON.parse(this.clineMessages[lastApiReqIndex].text || "{}"),
					tokensIn: inputTokens,
					tokensOut: outputTokens,
					cacheWrites: cacheWriteTokens,
					cacheReads: cacheReadTokens,
					cost:
						totalCost ??
						calculateApiCost(this.api.getModel().info, inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens),
					cancelReason,
					streamingFailedMessage,
				} satisfies ClineApiReqInfo)
			}

			const abortStream = async (cancelReason: ClineApiReqCancelReason, streamingFailedMessage?: string) => {
				if (this.diffViewProvider.isEditing) {
					await this.diffViewProvider.revertChanges() // closes diff view
				}

				// if last message is a partial we need to update and save it
				const lastMessage = this.clineMessages.at(-1)
				if (lastMessage && lastMessage.partial) {
					// lastMessage.ts = Date.now() DO NOT update ts since it is used as a key for virtuoso list
					lastMessage.partial = false
					// instead of streaming partialMessage events, we do a save and post like normal to persist to disk
					console.log("updating partial message", lastMessage)
					// await this.saveClineMessages()
				}

				// Let assistant know their response was interrupted for when task is resumed
				await this.addToApiConversationHistory({
					role: "assistant",
					content: [
						{
							type: "text",
							text:
								assistantMessage +
								`\n\n[${
									cancelReason === "streaming_failed"
										? "Response interrupted by API Error"
										: "Response interrupted by user"
								}]`,
						},
					],
				})

				// update api_req_started to have cancelled and cost, so that we can display the cost of the partial stream
				updateApiReqMsg(cancelReason, streamingFailedMessage)
				await this.saveClineMessages()

				// signals to provider that it can retrieve the saved messages from disk, as abortTask can not be awaited on in nature
				this.didFinishAbortingStream = true
			}

			// reset streaming state
			this.clineStateService.resetAllStates();
			this.clineStateService.setIsStreaming(true);
			this.clineStateService.setCurrentDidCompleteReadingStream(false);
			this.clineStateService.setCurrentUserMessageContent([]);
			this.clineStateService.setCurrentUserMessageContentReady(false);
			this.clineStateService.setCurrentDidRejectTool(false);
			this.clineStateService.setCurrentDidAlreadyUseTool(false);
			this.clineStateService.setCurrentAssistantMessageContent([]);
			this.clineStateService.setCurrentPresentAssistantMessageLocked(false);
			this.clineStateService.setCurrentPresentAssistantMessageHasPendingUpdates(false);
			await this.diffViewProvider.reset()

			const stream = this.attemptApiRequest(previousApiReqIndex) // yields only if the first chunk is successful, otherwise will allow the user to retry the request (most likely due to rate limit error, which gets thrown on the first chunk)
			let assistantMessage = ""
			try {
				for await (const chunk of stream) {
					switch (chunk.type) {
						case "usage":
							inputTokens += chunk.inputTokens
							outputTokens += chunk.outputTokens
							cacheWriteTokens += chunk.cacheWriteTokens ?? 0
							cacheReadTokens += chunk.cacheReadTokens ?? 0
							totalCost = chunk.totalCost
							break
						case "text":
							assistantMessage += chunk.text
							// parse raw assistant message into content blocks
							const prevLength = this.clineStateService.getCurrentAssistantMessageContent().length
							this.clineStateService.setCurrentAssistantMessageContent(parseAssistantMessage(assistantMessage))
							if (this.clineStateService.getCurrentAssistantMessageContent().length > prevLength) {
								this.clineStateService.setCurrentUserMessageContentReady(false) // new content we need to present, reset to false in case previous content set this to true
							}
							// present content to user
							this.presentAssistantMessage()
							break
					}

					if (this.clineStateService.getCurrentAbort()) {
						console.log("aborting stream...")
						if (!this.abandoned) {
							// only need to gracefully abort if this instance isn't abandoned (sometimes openrouter stream hangs, in which case this would affect future instances of cline)
							await abortStream("user_cancelled")
						}
						break // aborts the stream
					}

					if (this.clineStateService.getCurrentDidRejectTool()) {
					if (this.didRejectTool) {
						// userContent has a tool rejection, so interrupt the assistant's response to present the user's feedback
						assistantMessage += "\n\n[Response interrupted by user feedback]"
						// this.userMessageContentReady = true // instead of setting this premptively, we allow the present iterator to finish and set userMessageContentReady when its ready
						break
					}

					// PREV: we need to let the request finish for openrouter to get generation details
					// UPDATE: it's better UX to interrupt the request at the cost of the api cost not being retrieved
					if (this.didAlreadyUseTool) {
						assistantMessage +=
							"\n\n[Response interrupted by a tool use result. Only one tool may be used at a time and should be placed at the end of the message.]"
						break
					}
				}
			} catch (error) {
				// abandoned happens when extension is no longer waiting for the cline instance to finish aborting (error is thrown here when any function in the for loop throws due to this._abort)
				if (!this.abandoned) {
					this.abortTask() // if the stream failed, there's various states the task could be in (i.e. could have streamed some tools the user may have executed), so we just resort to replicating a cancel task
					await abortStream("streaming_failed", error.message ?? JSON.stringify(serializeError(error), null, 2))
					const history = await this.providerRef.deref()?.getTaskWithId(this.taskId)
					if (history) {
						await this.providerRef.deref()?.initClineWithHistoryItem(history.historyItem)
						// await this.providerRef.deref()?.postStateToWebview()
					}
				}
			} finally {
				this.isStreaming = false
			}

			// need to call here in case the stream was aborted
			if (this._abort) {
				throw new Error("Cline instance aborted")
			}

			this.didCompleteReadingStream = true

			// set any blocks to be complete to allow presentAssistantMessage to finish and set userMessageContentReady to true
			// (could be a text block that had no subsequent tool uses, or a text block at the very end, or an invalid tool use, etc. whatever the case, presentAssistantMessage relies on these blocks either to be completed or the user to reject a block in order to proceed and eventually set userMessageContentReady to true)
			const partialBlocks = this.assistantMessageContent.filter((block) => block.partial)
			partialBlocks.forEach((block) => {
				block.partial = false
			})
			// this.assistantMessageContent.forEach((e) => (e.partial = false)) // cant just do this bc a tool could be in the middle of executing ()
			if (partialBlocks.length > 0) {
				this.presentAssistantMessage() // if there is content to update then it will complete and update this.userMessageContentReady to true, which we pwaitfor before making the next request. all this is really doing is presenting the last partial message that we just set to complete
			}

			updateApiReqMsg()
			await this.saveClineMessages()
			await this.providerRef.deref()?.postStateToWebview()

			// now add to apiconversationhistory
			// need to save assistant responses to file before proceeding to tool use since user can exit at any moment and we wouldn't be able to save the assistant's response
			let didEndLoop = false
			if (assistantMessage.length > 0) {
				await this.addToApiConversationHistory({
					role: "assistant",
					content: [{ type: "text", text: assistantMessage }],
				})

				// NOTE: this comment is here for future reference - this was a workaround for userMessageContent not getting set to true. It was due to it not recursively calling for partial blocks when didRejectTool, so it would get stuck waiting for a partial block to complete before it could continue.
				// in case the content blocks finished
				// it may be the api stream finished after the last parsed content block was executed, so  we are able to detect out of bounds and set userMessageContentReady to true (note you should not call presentAssistantMessage since if the last block is completed it will be presented again)
				// const completeBlocks = this.assistantMessageContent.filter((block) => !block.partial) // if there are any partial blocks after the stream ended we can consider them invalid
				// if (this.currentStreamingContentIndex >= completeBlocks.length) {
				// 	this.userMessageContentReady = true
				// }

				await pWaitFor(() => this.userMessageContentReady)

				// if the model did not tool use, then we need to tell it to either use a tool or attempt_completion
				const didToolUse = this.assistantMessageContent.some((block) => block.type === "tool_use")
				if (!didToolUse) {
					this.userMessageContent.push({
						type: "text",
						text: formatResponse.noToolsUsed(),
					})
					this.consecutiveMistakeCount++
				}

				const recDidEndLoop = await this.recursivelyMakeClineRequests(this.userMessageContent)
				didEndLoop = recDidEndLoop
			} else {
				// if there's no assistant_responses, that means we got no text or tool_use content blocks from API which we should assume is an error
				await this.say(
					"error",
					"Unexpected API Response: The language model did not provide any assistant messages. This may indicate an issue with the API or the model's output.",
				)
				await this.addToApiConversationHistory({
					role: "assistant",
					content: [
						{
							type: "text",
							text: "Failure: I did not provide a response.",
						},
					],
				})
			}

			return didEndLoop // will always be false for now
		} catch (error) {
			// this should never happen since the only thing that can throw an error is the attemptApiRequest, which is wrapped in a try catch that sends an ask where if noButtonClicked, will clear current task and destroy this instance. However to avoid unhandled promise rejection, we will end this loop which will end execution of this instance (see startTask)
			return true // needs to be true so parent loop knows to end task
		}
	}

	async loadContext(userContent: UserContent, includeFileDetails: boolean = false): Promise<[UserContent, string]> {
		return await Promise.all([
			Promise.all(
				userContent.map(async (block) => {
					if (block.type === "text") {
						return {
							...block,
							text: await parseMentions(block.text, cwd, this.urlContentFetcher),
						}
					} else if (block.type === "tool_result") {
						const isUserMessage = (text: string) => text.includes("<feedback>") || text.includes("<answer>")
						if (typeof block.content === "string" && isUserMessage(block.content)) {
							return {
								...block,
								content: await parseMentions(block.content, cwd, this.urlContentFetcher),
							}
						} else if (Array.isArray(block.content)) {
							const parsedContent = await Promise.all(
								block.content.map(async (contentBlock) => {
									if (contentBlock.type === "text" && isUserMessage(contentBlock.text)) {
										return {
											...contentBlock,
											text: await parseMentions(contentBlock.text, cwd, this.urlContentFetcher),
										}
									}
									return contentBlock
								}),
							)
							return {
								...block,
								content: parsedContent,
							}
						}
					}
					return block
				}),
			),
			this.getEnvironmentDetails(includeFileDetails),
		]) as Promise<[UserContent, string]>;
	}

	private async getEnvironmentDetails(includeFileDetails: boolean = false): Promise<string> {
		let details = ""

		// It could be useful for cline to know if the user went from one or no file to another between messages, so we always include this context
		details += "\n\n# VSCode Visible Files"
		const visibleFiles = vscode.window.visibleTextEditors
			?.map((editor) => editor.document?.uri?.fsPath)
			.filter(Boolean)
			.map((absolutePath) => path.relative(cwd, absolutePath).toPosix())
			.join("\n")
		if (visibleFiles) {
			details += `\n${visibleFiles}`
		} else {
			details += "\n(No visible files)"
		}

		details += "\n\n# VSCode Open Tabs"
		const openTabs = vscode.window.tabGroups.all
			.flatMap((group) => group.tabs)
			.map((tab) => (tab.input as vscode.TabInputText)?.uri?.fsPath)
			.filter(Boolean)
			.map((absolutePath) => path.relative(cwd, absolutePath).toPosix())
			.join("\n")
		if (openTabs) {
			details += `\n${openTabs}`
		} else {
			details += "\n(No open tabs)"
		}

		const busyTerminals = this.terminalManager.getTerminals(true)
		const inactiveTerminals = this.terminalManager.getTerminals(false)

		if (busyTerminals.length > 0 && this.didEditFile) {
			await delay(300) // delay after saving file to let terminals catch up
		}

		if (busyTerminals.length > 0) {
			await pWaitFor(() => busyTerminals.every((t) => !this.terminalManager.isProcessHot(t.id)), {
				interval: 100,
				timeout: 15_000,
			}).catch(() => {})
		}

		let terminalDetails = ""
		if (busyTerminals.length > 0) {
			terminalDetails += "\n\n# Actively Running Terminals"
			for (const busyTerminal of busyTerminals) {
				terminalDetails += `\n## Original command: \`${busyTerminal.lastCommand}\``
				const newOutput = this.terminalManager.getUnretrievedOutput(busyTerminal.id)
				if (newOutput) {
					terminalDetails += `\n### New Output\n${newOutput}`
				}
			}
		}

		if (inactiveTerminals.length > 0) {
			const inactiveTerminalOutputs = new Map<number, string>()
			for (const inactiveTerminal of inactiveTerminals) {
				const newOutput = this.terminalManager.getUnretrievedOutput(inactiveTerminal.id)
				if (newOutput) {
					inactiveTerminalOutputs.set(inactiveTerminal.id, newOutput)
				}
			}
			if (inactiveTerminalOutputs.size > 0) {
				terminalDetails += "\n\n# Inactive Terminals"
				for (const [terminalId, newOutput] of inactiveTerminalOutputs) {
					const inactiveTerminal = inactiveTerminals.find((t) => t.id === terminalId)
					if (inactiveTerminal?.lastCommand) {
						terminalDetails += `\n## ${inactiveTerminal.lastCommand}`
						terminalDetails += `\n### New Output\n${newOutput}`
					}
				}
			}
		}

		if (terminalDetails) {
			details += terminalDetails
		}

		if (includeFileDetails) {
			details += `\n\n# Current Working Directory (${cwd.toPosix()}) Files\n`
			const isDesktop = arePathsEqual(cwd, path.join(os.homedir(), "Desktop"))
			if (isDesktop) {
				details += "(Desktop files not shown automatically. Use list_files to explore if needed.)"
			} else {
				const [files, didHitLimit] = await listFiles(cwd, true, 200)
				const result = formatResponse.formatFilesList(cwd, files, didHitLimit)
				details += result
			}
		}

		return `<environment_details>\n${details.trim()}\n</environment_details>`
	}

	private getCurrentHistory(): Anthropic.MessageParam[] {
		const result = this.conversationHistoryService.getCurrentHistory();
		if (!result.success) {
			console.error('Failed to get current history:', result.error);
			return [];
		}
		return result.data;
	}

	async dispose() {
		this.conversationStateService.setProcessing(false);
		this.conversationStateService.clearAskResponse();
		this.conversationStateService.dispose();
		
		// Clean up other resources
		if (this.browserSession) {
			await this.browserSession.closeBrowser();
		}
		if (this.terminalManager) {
			this.terminalManager.disposeAll();
		}
		if (this.diffViewProvider) {
			await this.diffViewProvider.revertChanges();
		}
		if (this.checkpointTracker) {
			await this.checkpointTracker.dispose();
		}
	}

	// Optional: Add methods to interact with ConversationStateService

	getCurrentConversationState() {
		return this.conversationStateService.getCurrentState();
	}

	getConversationMessages() {
		return this.conversationStateService.getMessages();
	}

	private async executeToolWithOptimization<T extends string | ToolResponse>(
		toolName: ToolUseName,
		parameters: Record<string, string>,
		execute: (params: Record<string, string>) => Promise<T>
	): Promise<[boolean, ToolResponse]> {
		try {
			const result = await this.toolCallOptimizationAgent.executeToolCall(
				toolName,
				parameters,
				execute
			);
	
			if (result.error) {
				this.consecutiveMistakeCount++;
				const errorMessage = `Error executing ${toolName}: ${result.error.message}\n\n` +
					`Suggestions:\n${result.error.suggestions.map(s => 
						`- Try with parameters: ${JSON.stringify(s.suggestedParameters)}\n  Reason: ${s.reasoning}`
					).join('\n')}`;
				return [false, formatResponse.toolError(errorMessage)];
			}
	
			this.consecutiveMistakeCount = 0;

			return [false, typeof result.result === 'string' 
				? formatResponse.toolResult(result.result)
				: result.result as ToolResponse];
		} catch (error) {
			this.consecutiveMistakeCount++;
			return [false, formatResponse.toolError(error.message)];
		}
	}

	// Add a method to get tool call analytics
	public getToolCallAnalytics(toolName: ToolUseName): PatternAnalysis {
		return this.toolCallOptimizationAgent.getPatternAnalysis(toolName);
	}

	// Add a method to get error history
	public getToolCallErrorHistory(): ErrorReport[] {
		return this.toolCallOptimizationAgent.getErrorHistory();
	}

	// Add a method to clear tool call history
	public clearToolCallHistory(): void {
		this.toolCallOptimizationAgent.clearHistory();
	}

	// Add method to abort API request
	abortApiRequest() {
		this.abortSubject.next(true);
		this.abortSubject.complete();
		// Reinitialize the subject for future use
		this.abortSubject = new Subject<boolean>();
	}

	// Expose stream progress
	async getApiRequestProgress() {
		return firstValueFrom(
			this.apiRequestService.getStreamController().getProgress()
		);
	}

	setAbort(value: boolean): void {
		this.clineStateService.setAbort(value);
	}

	setDidRejectTool(value: boolean): void {
		this.clineStateService.setDidRejectTool(value);
	}

	setDidAlreadyUseTool(value: boolean): void {
		this.clineStateService.setDidAlreadyUseTool(value);
	}

	get isStreaming(): boolean {
		return this.clineStateService.getCurrentIsStreaming();
	}

	set isStreaming(value: boolean) {
		this.clineStateService.setIsStreaming(value);
	}

	get _abort(): boolean {
		return this.clineStateService.getCurrentAbort();
	}

	set _abort(value: boolean) {
		this.clineStateService.setAbort(value);
	}

	get didRejectTool(): boolean {
		return this.clineStateService.getCurrentDidRejectTool();
	}

	set didRejectTool(value: boolean) {
		this.clineStateService.setDidRejectTool(value);
	}

	get didAlreadyUseTool(): boolean {
		return this.clineStateService.getCurrentDidAlreadyUseTool();
	}

	set didAlreadyUseTool(value: boolean) {
		this.clineStateService.setDidAlreadyUseTool(value);
	}

	get abort(): boolean {
		return this._abort;
	}

	set abort(value: boolean) {
		this._abort = value;
		this.clineStateService.setAbort(value);
	}

	private setUserMessageContent(content: UserContent): void {
		if (isValidUserContent(content)) {
			this.userMessageContent = content;
			this.clineStateService.setCurrentUserMessageContent(
				content.filter(
					(block): block is Anthropic.TextBlockParam | Anthropic.ImageBlockParam => 
						block.type === 'text' || block.type === 'image'
				)
			);
		} else {
			console.warn('Invalid user content provided', content);
		}
	}

	private processUserContent(content: UserContent): void {
		if (isValidUserContent(content)) {
			// Process the content
			this.setUserMessageContent(content);
		} else {
			throw new Error('Invalid user content');
		}
	}

	// Helper method to find tool by name
	private findToolByName(name: string): any {
		// Implement logic to find and return the tool
		// This is a placeholder and should be replaced with actual implementation
		return null;
	}
}
