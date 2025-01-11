// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import delay from "delay"
import * as vscode from "vscode"
import { WebViewManager } from "./core/webview/WebViewManager"
import { createClineAPI } from "./exports"
import "./utils/path" // necessary to have access to String.prototype.toPosix
import { DIFF_VIEW_URI_SCHEME } from "./integrations/editor/DiffViewProvider"

/*
Built using https://github.com/microsoft/vscode-webview-ui-toolkit

Inspired by
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/default/weather-webview
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/frameworks/hello-world-react-cra

*/

let outputChannel: vscode.OutputChannel

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel("Cline")
	context.subscriptions.push(outputChannel)

	outputChannel.appendLine("Cline extension activated")

	const webViewManager = WebViewManager.getInstance(context, outputChannel)

	// Register WebView Provider
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			WebViewManager.sideBarId,
			{
				resolveWebviewView: (webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken) => {
					return webViewManager.resolveWebviewView(webviewView, context, token)
				}
			},
			{
				webviewOptions: { retainContextWhenHidden: true }
			}
		)
	)

	// Register Commands
	context.subscriptions.push(
		vscode.commands.registerCommand("cline.plusButtonClicked", async () => {
			outputChannel.appendLine("Plus button Clicked")
			await webViewManager.clearTask()
			await webViewManager.postMessageToWebview({
				type: "action",
				action: "chatButtonClicked"
			})
		})
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("cline.mcpButtonClicked", () => {
			webViewManager.postMessageToWebview({
				type: "action",
				action: "mcpButtonClicked"
			})
		})
	)

	const openClineInNewTab = async () => {
		outputChannel.appendLine("Opening Cline in new tab")
		const tabManager = WebViewManager.getInstance(context, outputChannel)
		const lastCol = Math.max(...vscode.window.visibleTextEditors.map((editor) => editor.viewColumn || 0))

		// Check if there are any visible text editors
		const hasVisibleEditors = vscode.window.visibleTextEditors.length > 0
		if (!hasVisibleEditors) {
			await vscode.commands.executeCommand("workbench.action.newGroupRight")
		}
		const targetCol = hasVisibleEditors ? Math.max(lastCol + 1, 1) : vscode.ViewColumn.Two

		const panel = vscode.window.createWebviewPanel(
			WebViewManager.tabPanelId,
			"Cline",
			targetCol,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [context.extensionUri]
			}
		)

		panel.iconPath = {
			light: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "robot_panel_light.png"),
			dark: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "robot_panel_dark.png")
		}

		await tabManager.resolveWebviewView(panel, undefined, undefined)

		// Lock the editor group
		await delay(100)
		await vscode.commands.executeCommand("workbench.action.lockEditorGroup")
	}

	context.subscriptions.push(
		vscode.commands.registerCommand("cline.popoutButtonClicked", openClineInNewTab)
	)
	context.subscriptions.push(
		vscode.commands.registerCommand("cline.openInNewTab", openClineInNewTab)
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("cline.settingsButtonClicked", () => {
			webViewManager.postMessageToWebview({
				type: "action",
				action: "settingsButtonClicked"
			})
		})
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("cline.historyButtonClicked", () => {
			webViewManager.postMessageToWebview({
				type: "action",
				action: "historyButtonClicked"
			})
		})
	)

	// Register content provider for diff view
	const diffContentProvider = new (class implements vscode.TextDocumentContentProvider {
		provideTextDocumentContent(uri: vscode.Uri): string {
			return Buffer.from(uri.query, "base64").toString("utf-8")
		}
	})()
	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider(DIFF_VIEW_URI_SCHEME, diffContentProvider)
	)

	// URI Handler
	const handleUri = async (uri: vscode.Uri) => {
		const path = uri.path
		const query = new URLSearchParams(uri.query.replace(/\+/g, "%2B"))
		const visibleManager = WebViewManager.getVisibleInstance()
		if (!visibleManager) {
			return
		}
		switch (path) {
			case "/openrouter": {
				const code = query.get("code")
				if (code) {
					const currentState = visibleManager.getCurrentState()
					// Handle OpenRouter callback by updating API configuration
					await visibleManager.postMessageToWebview({
						type: "state",
						state: {
							...currentState,
							apiConfiguration: {
								...currentState.apiConfiguration,
								openRouterApiKey: code
							}
						}
					})
				}
				break
			}
			default:
				break
		}
	}
	context.subscriptions.push(vscode.window.registerUriHandler({ handleUri }))

	// Return API with type assertion
	return createClineAPI(outputChannel, webViewManager as any)
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (outputChannel) {
		outputChannel.appendLine("Cline extension deactivated")
	}
	const webViewManager = WebViewManager.getVisibleInstance()
	if (webViewManager) {
		webViewManager.dispose()
	}
}
