import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ExtensionStateProvider } from './context/ExtensionStateContext';
import App from './App';

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders WelcomeView initially', async () => {
    const { container } = render(
      <ExtensionStateProvider>
        <App />
      </ExtensionStateProvider>
    );
    await waitFor(() => {
      expect(container).toHaveTextContent(/Welcome/i);
    });
  });

  it('renders SettingsView when settingsButtonClicked message is received', async () => {
    const { container } = render(
      <ExtensionStateProvider>
        <App />
      </ExtensionStateProvider>
    );

    const messageEvent = new MessageEvent('message', {
      data: { type: 'action', action: 'settingsButtonClicked' }
    });

    window.dispatchEvent(messageEvent);

    await waitFor(() => {
      expect(container).toHaveTextContent(/Settings/i);
    });
    expect(container).not.toHaveTextContent(/Welcome/i);
  });

  it('renders HistoryView when historyButtonClicked message is received', async () => {
    const { container } = render(
      <ExtensionStateProvider>
        <App />
      </ExtensionStateProvider>
    );

    const messageEvent = new MessageEvent('message', {
      data: { type: 'action', action: 'historyButtonClicked' }
    });

    window.dispatchEvent(messageEvent);

    await waitFor(() => {
      expect(container).toHaveTextContent(/History/i);
    });
    expect(container).not.toHaveTextContent(/Welcome/i);
  });

  it('renders McpView when mcpButtonClicked message is received', async () => {
    const { container } = render(
      <ExtensionStateProvider>
        <App />
      </ExtensionStateProvider>
    );

    const messageEvent = new MessageEvent('message', {
      data: { type: 'action', action: 'mcpButtonClicked' }
    });

    window.dispatchEvent(messageEvent);

    await waitFor(() => {
      expect(container).toHaveTextContent(/MCP/i);
    });
    expect(container).not.toHaveTextContent(/Welcome/i);
  });

  it('renders ChatView initially', async () => {
    const { container } = render(
      <ExtensionStateProvider>
        <App />
      </ExtensionStateProvider>
    );
    await waitFor(() => {
      expect(container).toHaveTextContent(/Chat/i);
    });
  });

  it('toggles Announcement visibility', async () => {
    const { container } = render(
      <ExtensionStateProvider>
        <App />
      </ExtensionStateProvider>
    );

    const messageEvent = new MessageEvent('message', {
      data: { type: 'action', action: 'historyButtonClicked' }
    });

    window.dispatchEvent(messageEvent);

    await waitFor(() => {
      expect(container).toHaveTextContent(/History/i);
    });
    expect(container).not.toHaveTextContent(/Welcome/i);
  });
});
