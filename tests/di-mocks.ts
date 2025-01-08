import { Container } from 'inversify';
import { TYPES } from '../src/core/di/types';
import * as vscode from 'vscode';
import { vi } from 'vitest';

/**
 * Create a mock Dependency Injection container for testing
 */
export function createMockDIContainer(): Container {
  const mockContainer = new Container();

  // Mock Extension Context
  const mockExtensionContext: Partial<vscode.ExtensionContext> = {
    subscriptions: [],
    workspaceState: {
      get: vi.fn(),
      update: vi.fn(),
    },
    globalState: {
      get: vi.fn(),
      update: vi.fn(),
    },
    extensionUri: {
      scheme: 'file',
      authority: '',
      path: '/mock/extension/path',
      query: '',
      fragment: '',
      fsPath: '/mock/extension/path',
      with: vi.fn(),
      toString: vi.fn().mockReturnValue('/mock/extension/path'),
    },
  };
  mockContainer.bind(TYPES.ExtensionContext).toConstantValue(mockExtensionContext);

  // Mock Output Channel
  const mockOutputChannel: Partial<vscode.OutputChannel> = {
    name: 'MockOutputChannel',
    appendLine: vi.fn(),
    append: vi.fn(),
    clear: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  };
  mockContainer.bind(TYPES.OutputChannel).toConstantValue(mockOutputChannel);

  // Mock Workspace Tracker
  const mockWorkspaceTracker = {
    // Add mock methods as needed
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
  mockContainer.bind(TYPES.WorkspaceTracker).toConstantValue(mockWorkspaceTracker);

  // Mock MCP Hub
  const mockMcpHub = {
    // Add mock methods as needed
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
  mockContainer.bind(TYPES.McpHub).toConstantValue(mockMcpHub);

  // Add more mock services as needed
  const mockServices = {
    // Add more mock services with basic event emitter methods
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  // Bind additional mock services to prevent undefined errors
  Object.values(TYPES).forEach(type => {
    if (!mockContainer.isBound(type)) {
      mockContainer.bind(type).toConstantValue(mockServices);
    }
  });

  return mockContainer;
}

/**
 * Reset the mock DI container
 */
export function resetMockDIContainer(container: Container) {
  // Clear all bindings
  container.unbindAll();
}

/**
 * Utility to create a spy on a specific DI-bound service
 * @param container The DI container
 * @param type The service type symbol
 * @param methodName The method to spy on
 */
export function spyOnDIService(
  container: Container, 
  type: symbol, 
  methodName: string
) {
  const service = container.get(type);
  if (service) {
    return vi.spyOn(service, methodName as any);
  } else {
    throw new Error(`Service not found for type ${type.toString()}`);
  }
}
