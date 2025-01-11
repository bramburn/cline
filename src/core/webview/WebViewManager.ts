import * as vscode from 'vscode';
import { MessageStream } from '../messaging/MessageStream';
import { StateManager } from '../state/StateManager';
import { CommandProcessor } from '../commands/CommandProcessor';
import { WebviewMessage } from '../../shared/WebviewMessage';
import { ExtensionMessage } from '../../shared/ExtensionMessage';
import { getUri } from './getUri';
import { getNonce } from './getNonce';
import { Subscription } from 'rxjs';

export class WebViewManager implements vscode.WebviewViewProvider {
    public static readonly sideBarId = "cline-sidebar";
    public static readonly tabPanelId = "cline-tab";
    private static instance: WebViewManager | null = null;

    private webview?: vscode.Webview;
    private readonly messageStream: MessageStream;
    private readonly stateManager: StateManager;
    private readonly commandProcessor: CommandProcessor;
    private readonly context: vscode.ExtensionContext;
    private readonly outputChannel: vscode.OutputChannel;
    private readonly disposables: Subscription[] = [];

    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        this.stateManager = new StateManager(context);
        this.messageStream = new MessageStream();
        this.commandProcessor = new CommandProcessor(this.stateManager);
        
        this.initializeSubscriptions();
    }

    static getInstance(context?: vscode.ExtensionContext, outputChannel?: vscode.OutputChannel): WebViewManager {
        if (!WebViewManager.instance && context && outputChannel) {
            WebViewManager.instance = new WebViewManager(context, outputChannel);
        }
        return WebViewManager.instance!;
    }

    private initializeSubscriptions() {
        // Subscribe to messages from the message stream
        this.disposables.push(
            this.messageStream.getMessages().subscribe(message => {
                if (this.webview) {
                    this.webview.postMessage({
                        type: 'message',
                        message
                    });
                }
            })
        );

        // Subscribe to state changes
        this.disposables.push(
            this.stateManager.getState().subscribe(state => {
                if (this.webview) {
                    this.webview.postMessage({
                        type: 'state',
                        state
                    });
                }
            })
        );

        // Subscribe to errors
        this.disposables.push(
            this.messageStream.getErrors().subscribe(error => {
                this.outputChannel.appendLine(`Error: ${error.message}`);
                if (this.webview) {
                    this.webview.postMessage({
                        type: 'error',
                        error: error.message
                    });
                }
            })
        );
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView | vscode.WebviewPanel,
        _context: vscode.WebviewViewResolveContext | undefined,
        _token: vscode.CancellationToken | undefined
    ) {
        this.webview = webviewView.webview;
        this.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        this.webview.html = await this.getWebviewContent(this.webview);

        this.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                this.handleWebViewMessage(message);
            },
            undefined,
            this.context.subscriptions
        );
    }

    private handleWebViewMessage(message: WebviewMessage) {
        this.commandProcessor.processWebviewMessage(message).subscribe(
            result => {
                if (this.webview) {
                    this.webview.postMessage(result);
                }
            },
            error => {
                this.outputChannel.appendLine(`Error processing message: ${error.message}`);
            }
        );
    }

    private async getWebviewContent(webview: vscode.Webview): Promise<string> {
        const styleUri = getUri(webview, this.context.extensionUri, ["media", "styles.css"]);
        const scriptUri = getUri(webview, this.context.extensionUri, ["media", "main.js"]);
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                    <link rel="stylesheet" type="text/css" href="${styleUri}">
                    <title>Cline</title>
                </head>
                <body>
                    <div id="root"></div>
                    <script nonce="${nonce}" src="${scriptUri}"></script>
                </body>
            </html>`;
    }

    public async postMessageToWebview(message: ExtensionMessage) {
        if (this.webview) {
            await this.webview.postMessage(message);
        }
    }

    public async clearTask() {
        await this.commandProcessor.execute({ type: 'clearTask', payload: null }).subscribe();
    }

    public getCurrentState() {
        return this.stateManager.getCurrentState();
    }

    public dispose() {
        this.disposables.forEach(subscription => subscription.unsubscribe());
        WebViewManager.instance = null;
    }

    public static getVisibleInstance(): WebViewManager | null {
        return WebViewManager.instance;
    }
} 