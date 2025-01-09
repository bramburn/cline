// @ts-nocheck
import { beforeEach, afterEach } from 'vitest'
import { vi } from "vitest"
import * as vscode from "vscode"
import { Container } from 'inversify'
import { createMockDIContainer, resetMockDIContainer } from './di-mocks'
import { TYPES } from '../src/core/di/types'

let mockDIContainer: Container | null = null

// Create a more robust mock event emitter
const createMockEventEmitter = () => {
  const listeners: Array<(e: any) => void> = [];
  return {
    event: (listener: (e: any) => void) => {
      listeners.push(listener);
      return {
        dispose: () => {
          const index = listeners.indexOf(listener);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        }
      };
    },
    fire: (e: any) => {
      listeners.forEach(listener => listener(e));
    },
    listeners: () => listeners,
    dispose: vi.fn()
  };
};

// Setup before each test
beforeEach(() => {
  try {
    // Ensure a fresh mock container is created for each test
    mockDIContainer = createMockDIContainer();
    
    // Validate that the container is properly initialized
    if (!mockDIContainer) {
      throw new Error('Failed to create mock DI container');
    }

    // Ensure all TYPES are properly bound
    Object.values(TYPES).forEach(type => {
      if (!mockDIContainer.isBound(type)) {
        console.warn(`Type ${type.toString()} not bound. Skipping.`);
      }
    });
  } catch (error) {
    console.error('Error in test setup:', error);
    throw error;
  }
})

// Cleanup after each test
afterEach(() => {
  if (mockDIContainer) {
    try {
      // Reset the mock container after each test
      resetMockDIContainer(mockDIContainer);
      mockDIContainer = null;
    } catch (error) {
      console.error('Error in test teardown:', error);
    }
  }
})

vi.mock("vscode", async (importOriginal) => {
  const actualVscode = await importOriginal<typeof import("vscode")>()

  // Mock Uri
  const mockUri = {
    fsPath: '/mock/path',
    path: '/mock/path',
    scheme: 'file',
    authority: '',
    fragment: '',
    query: '',
  }

  return {
    ...actualVscode,
    Uri: {
      ...actualVscode.Uri,
      file: vi.fn().mockReturnValue(mockUri),
      joinPath: vi.fn().mockImplementation((base, ...pathSegments) => ({
        fsPath: `${base.fsPath}/${pathSegments.join("/")}`,
        scheme: base.scheme,
        authority: base.authority,
        path: `${base.path}/${pathSegments.join("/")}`,
      })),
    },
    ThemeIcon: vi.fn().mockImplementation((iconName: string) => ({
      id: iconName,
    })),
    ViewColumn: {
      ...actualVscode.ViewColumn,
      Two: 2,
    },
    commands: {
      registerCommand: vi.fn().mockImplementation((command, callback, thisArg) => ({
        dispose: vi.fn(),
      })),
      registerTextEditorCommand: vi.fn().mockImplementation((command, callback) => ({
        dispose: vi.fn(),
      })),
      executeCommand: vi
        .fn()
        .mockImplementation(async <T>(command: string, ...rest: any[]): Promise<T | undefined> => undefined),
      getCommands: vi.fn().mockResolvedValue([]),
    },
    EventEmitter: createMockEventEmitter(),
    window: {
      ...actualVscode.window,
      activeTextEditor: undefined,
      visibleTextEditors: [],
      terminals: [] as vscode.Terminal[],
      createOutputChannel: vi.fn().mockImplementation(
        (name: string, languageId?: string): vscode.OutputChannel => ({
          name,
          languageId: languageId ?? "Log",
          append: vi.fn(),
          appendLine: vi.fn(),
          clear: vi.fn(),
          show: vi.fn(),
          hide: vi.fn(),
          dispose: vi.fn(),
        })),
      registerWebviewViewProvider: vi
        .fn()
        .mockImplementation(
          (viewId: string, provider: vscode.WebviewViewProvider, options?: vscode.WebviewViewOptions) => ({
            dispose: vi.fn(),
          })),
      registerUriHandler: vi.fn().mockImplementation((handler: vscode.UriHandler) => ({
        dispose: vi.fn(),
      })),
      createWebviewPanel: vi
        .fn()
        .mockImplementation(
          (
            viewType: string,
            title: string,
            showOptions: vscode.ViewColumn | { viewColumn: vscode.ViewColumn; preserveFocus?: boolean },
            options?: vscode.WebviewPanelOptions,
          ) => ({
            webview: {
              html: "",
              onDidReceiveMessage: vi.fn(),
              postMessage: vi.fn(),
              asWebviewUri: vi.fn(),
            },
            reveal: vi.fn(),
            dispose: vi.fn(),
          })),
      showInformationMessage: vi.fn().mockResolvedValue(undefined),
      createTextEditorDecorationType: vi.fn().mockImplementation(() => ({
        dispose: vi.fn(),
        key: "mock-decoration-type",
      })),
      onDidStartTerminalShellExecution: createMockEventEmitter(),
      onDidCloseTerminal: createMockEventEmitter(),
      onDidChangeTerminalShellIntegration: createMockEventEmitter(),
      terminals: {
        get: vi.fn().mockReturnValue([]),
        length: 0,
      },
      activeTerminal: null as vscode.Terminal | null,
      createTerminal: vi.fn().mockImplementation((options?: vscode.TerminalOptions) => {
        const terminal: vscode.Terminal = {
          name: options?.name || "Mock Terminal",
          processId: Promise.resolve(Math.floor(Math.random() * 10000)),
          state: {
            isInteractedWith: false,
          },
          shellIntegration: {
            cwd: vi.fn().mockReturnValue(mockUri),
            read: vi.fn(),
            onDidChangeShellType: vi.fn(),
            onDidChangeShellPid: vi.fn(),
          },
          sendText: vi.fn(),
          show: vi.fn(),
          hide: vi.fn(),
          dispose: vi.fn(),
          creationOptions: options || {},
          exitStatus: undefined,
        }
        this.terminals.push(terminal)
        return terminal
      }),
    },
    workspace: {
      ...(actualVscode.workspace || {}),
      workspaceFolders: [
        {
          uri: mockUri,
          name: "MockWorkspace",
          index: 0,
        },
      ],
      registerTextDocumentContentProvider: vi
        .fn()
        .mockImplementation((scheme: string, provider: vscode.TextDocumentContentProvider) => ({
          dispose: vi.fn(),
        })),
      onDidOpenTextDocument: createMockEventEmitter().event,
      onDidCloseTextDocument: createMockEventEmitter().event,
      onDidChangeTextDocument: createMockEventEmitter().event,
      onWillSaveTextDocument: createMockEventEmitter().event,
      onDidSaveTextDocument: createMockEventEmitter().event,
      onDidCreateFiles: createMockEventEmitter().event,
      onDidRenameFiles: createMockEventEmitter().event,
      onDidDeleteFiles: createMockEventEmitter().event,
      onDidChangeWorkspaceFolders: createMockEventEmitter().event,
    },
  }
})

// Mock `p-wait-for` using vitest
vi.mock("p-wait-for", () => {
  return {
    default: vi.fn(
      (conditionFn: () => boolean | Promise<boolean>, options?: { timeout?: number; interval?: number }) => {
        const { timeout = 4000, interval = 100 } = options || {}
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const checkCondition = async () => {
            try {
              const result = await conditionFn();
              if (result) {
                resolve(result);
              } else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout'));
              } else {
                setTimeout(checkCondition, interval);
              }
            } catch (error) {
              reject(error);
            }
          };
          checkCondition();
        });
      }
    )
  };
})
