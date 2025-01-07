import React from 'react';
import { observer } from 'mobx-react-lite';
import styled from 'styled-components';
import { useStore } from '../../store';
import { Notification } from '../../../../src/services/NotificationService';

const NotificationContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 400px;
  pointer-events: none;
`;

const NotificationItem = styled.div<{ $type: Notification['type'] }>`
  padding: 12px 16px;
  border-radius: 4px;
  background-color: ${props => {
    switch (props.$type) {
      case 'error':
        return 'var(--vscode-errorForeground)';
      case 'success':
        return 'var(--vscode-testing-iconPassed)';
      case 'warning':
        return 'var(--vscode-warningForeground)';
      default:
        return 'var(--vscode-notificationCenterHeader-background)';
    }
  }};
  color: var(--vscode-foreground);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: auto;
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const Message = styled.span`
  flex-grow: 1;
  margin-right: 12px;
`;

const ActionButton = styled.button`
  background: none;
  border: 1px solid var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  padding: 4px 8px;
  border-radius: 2px;
  cursor: pointer;
  font-size: 12px;
  margin-right: 8px;

  &:hover {
    background: var(--vscode-button-hoverBackground);
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--vscode-foreground);
  cursor: pointer;
  padding: 4px;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`;

const NotificationCenter: React.FC = observer(() => {
  const { notificationService } = useStore();
  const notifications = notificationService.getNotifications();

  return (
    <NotificationContainer>
      {notifications.map((notification: Notification) => (
        <NotificationItem key={notification.id} $type={notification.type}>
          <Message>{notification.message}</Message>
          {notification.actionLabel && notification.onAction && (
            <ActionButton onClick={notification.onAction}>
              {notification.actionLabel}
            </ActionButton>
          )}
          {notification.dismissible && (
            <CloseButton
              onClick={() => notificationService.removeNotification(notification.id)}
              aria-label="Close notification"
            >
              ✕
            </CloseButton>
          )}
        </NotificationItem>
      ))}
    </NotificationContainer>
  );
});

export default NotificationCenter; 