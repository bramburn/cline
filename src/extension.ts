// The module 'vscode' contains the VS Code extensibility API
import delay from "delay"
import * as vscode from "vscode"
import { injectable, inject } from "inversify"
import { DIContainer } from "./core/di/container"
import { TYPES } from "./core/di/types"
import { ClineProvider } from "./core/webview/ClineProvider"
import { createClineAPI } from "./exports"
import "./utils/path" // necessary to have access to String.prototype.toPosix
import { DIFF_VIEW_URI_SCHEME } from "./integrations/editor/DiffViewProvider"

@injectable()
export class ExtensionActivator {
  private outputChannel: vscode.OutputChannel;
  private context: vscode.ExtensionContext;
  private sidebarProvider: ClineProvider;

  constructor(
    @inject(TYPES.ExtensionContext) context: vscode.ExtensionContext,
    @inject(TYPES.OutputChannel) outputChannel: vscode.OutputChannel
  ) {
    this.context = context;
    this.outputChannel = outputChannel;
    
    // Create ClineProvider with DI
    this.sidebarProvider = new ClineProvider();
    DIContainer.bind(TYPES.ClineProvider, () => this.sidebarProvider);
  }

  activate() {
    this.outputChannel.appendLine("Cline extension activated")

    // Register webview provider
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(ClineProvider.sideBarId, this.sidebarProvider, {
        webviewOptions: { retainContextWhenHidden: true },
      })
    );

    // Register commands
    this.registerCommands();

    // Register diff content provider
    this.registerDiffContentProvider();

    // Register URI handler
    this.registerUriHandler();

    // Create and return Cline API
    return createClineAPI(this.outputChannel, this.sidebarProvider);
  }

  private registerCommands() {
    // Plus button command
    this.context.subscriptions.push(
      vscode.commands.registerCommand("cline.plusButtonClicked", async () => {
        this.outputChannel.appendLine("Plus button Clicked")
        await this.sidebarProvider.clearTask()
        await this.sidebarProvider.postStateToWebview()
        await this.sidebarProvider.postMessageToWebview({
          type: "action",
          action: "chatButtonClicked",
        })
      })
    );

    // MCP button command
    this.context.subscriptions.push(
      vscode.commands.registerCommand("cline.mcpButtonClicked", () => {
        this.sidebarProvider.postMessageToWebview({
          type: "action",
          action: "mcpButtonClicked",
        })
      })
    );

    // Open Cline in new tab function
    const openClineInNewTab = async () => {
      this.outputChannel.appendLine("Opening Cline in new tab")
      const tabProvider = new ClineProvider();
      
      const lastCol = Math.max(...vscode.window.visibleTextEditors.map((editor) => editor.viewColumn || 0))

      const hasVisibleEditors = vscode.window.visibleTextEditors.length > 0
      if (!hasVisibleEditors) {
        await vscode.commands.executeCommand("workbench.action.newGroupRight")
      }
      const targetCol = hasVisibleEditors ? Math.max(lastCol + 1, 1) : vscode.ViewColumn.Two

      const panel = vscode.window.createWebviewPanel(ClineProvider.tabPanelId, "Cline", targetCol, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      })

      panel.iconPath = {
        light: vscode.Uri.joinPath(this.context.extensionUri, "assets", "icons", "robot_panel_light.png"),
        dark: vscode.Uri.joinPath(this.context.extensionUri, "assets", "icons", "robot_panel_dark.png"),
      }
      tabProvider.resolveWebviewView(panel)

      // Lock the editor group so clicking on files doesn't open them over the panel
      await delay(100)
      await vscode.commands.executeCommand("workbench.action.lockEditorGroup")
    }

    // Popout and open in new tab commands
    this.context.subscriptions.push(
      vscode.commands.registerCommand("cline.popoutButtonClicked", openClineInNewTab)
    );
    this.context.subscriptions.push(
      vscode.commands.registerCommand("cline.openInNewTab", openClineInNewTab)
    );

    // Settings button command
    this.context.subscriptions.push(
      vscode.commands.registerCommand("cline.settingsButtonClicked", () => {
        this.sidebarProvider.postMessageToWebview({
          type: "action",
          action: "settingsButtonClicked",
        })
      })
    );

    // History button command
    this.context.subscriptions.push(
      vscode.commands.registerCommand("cline.historyButtonClicked", () => {
        this.sidebarProvider.postMessageToWebview({
          type: "action",
          action: "historyButtonClicked",
        })
      })
    );
  }

  private registerDiffContentProvider() {
    const diffContentProvider = new (class implements vscode.TextDocumentContentProvider {
      provideTextDocumentContent(uri: vscode.Uri): string {
        return Buffer.from(uri.query, "base64").toString("utf-8")
      }
    })()
    this.context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(DIFF_VIEW_URI_SCHEME, diffContentProvider)
    );
  }

  private registerUriHandler() {
    const handleUri = async (uri: vscode.Uri) => {
      const path = uri.path
      const query = new URLSearchParams(uri.query.replace(/\+/g, "%2B"))
      const visibleProvider = ClineProvider.getVisibleInstance()
      if (!visibleProvider) {
        return
      }
      switch (path) {
        case "/openrouter": {
          const code = query.get("code")
          if (code) {
            await visibleProvider.handleOpenRouterCallback(code)
          }
          break
        }
        default:
          break
      }
    }
    this.context.subscriptions.push(
      vscode.window.registerUriHandler({ handleUri })
    );
  }

  deactivate() {
    this.outputChannel.appendLine("Cline extension deactivated")
  }
}

// Extension entry point
export function activate(context: vscode.ExtensionContext) {
  // Create output channel
  const outputChannel = vscode.window.createOutputChannel("Cline");
  context.subscriptions.push(outputChannel);

  // Bind context and output channel to DI container
  DIContainer.bind(TYPES.ExtensionContext, () => context);
  DIContainer.bind(TYPES.OutputChannel, () => outputChannel);

  // Create and activate extension
  const activator = new ExtensionActivator(context, outputChannel);
  return activator.activate();
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Optional global deactivation logic
  const outputChannel = DIContainer.resolve(TYPES.OutputChannel);
  if (outputChannel) {
    outputChannel.appendLine("Cline extension deactivated")
  }
}
