import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import TaskHeader from '../TaskHeader'
import { ClineMessage } from '../../../../../src/shared/ExtensionMessage'
import { ExtensionStateProvider } from '../../../context/ExtensionStateContext'

// Mock the vscode API
const mockPostMessage = jest.fn()
jest.mock('../../../utils/vscode', () => ({
    vscode: {
        postMessage: (msg: any) => mockPostMessage(msg)
    }
}))

// Mock window resize
const mockUseWindowSize = jest.fn()
jest.mock('react-use', () => ({
    useWindowSize: () => mockUseWindowSize()
}))

describe('TaskHeader', () => {
    const defaultProps = {
        task: {
            text: 'Test task message',
            images: []
        } as ClineMessage,
        tokensIn: 100,
        tokensOut: 50,
        doesModelSupportPromptCache: true,
        cacheWrites: 10,
        cacheReads: 5,
        totalCost: 0.0123,
        onClose: jest.fn()
    }

    const mockExtensionState = {
        apiConfiguration: {
            apiProvider: 'anthropic'
        },
        currentTaskItem: {
            id: 'test-id',
            size: 1024
        },
        checkpointTrackerErrorMessage: ''
    }

    beforeEach(() => {
        mockPostMessage.mockClear()
        mockUseWindowSize.mockReturnValue({ width: 1024, height: 768 })
    })

    const renderComponent = (props = defaultProps) => {
        return render(
            <ExtensionStateProvider value={mockExtensionState}>
                <TaskHeader {...props} />
            </ExtensionStateProvider>
        )
    }

    it('renders basic task information', () => {
        renderComponent()
        expect(screen.getByText('Task')).toBeInTheDocument()
        expect(screen.getByText('Test task message')).toBeInTheDocument()
    })

    it('toggles task expansion on click', () => {
        renderComponent()
        const expandButton = screen.getByRole('button', { name: /task/i })
        
        fireEvent.click(expandButton)
        expect(screen.queryByText('API Cost:')).not.toBeInTheDocument()
        
        fireEvent.click(expandButton)
        expect(screen.getByText('API Cost:')).toBeInTheDocument()
    })

    it('shows cost information when available', () => {
        renderComponent()
        expect(screen.getByText('$0.0123')).toBeInTheDocument()
    })

    it('shows token usage information', () => {
        renderComponent()
        expect(screen.getByLabelText('Input tokens: 100')).toBeInTheDocument()
        expect(screen.getByLabelText('Output tokens: 50')).toBeInTheDocument()
    })

    it('shows cache information when available', () => {
        renderComponent()
        expect(screen.getByLabelText('Cache writes: 10')).toBeInTheDocument()
        expect(screen.getByLabelText('Cache reads: 5')).toBeInTheDocument()
    })

    it('handles text expansion for long content', () => {
        const longText = 'A'.repeat(1000)
        renderComponent({
            ...defaultProps,
            task: { ...defaultProps.task, text: longText }
        })

        const seeMoreButton = screen.getByText('See more')
        fireEvent.click(seeMoreButton)
        
        const seeLessButton = screen.getByText('See less')
        expect(seeLessButton).toBeInTheDocument()
        
        fireEvent.click(seeLessButton)
        expect(screen.getByText('See more')).toBeInTheDocument()
    })

    it('handles delete task action', () => {
        renderComponent()
        const deleteButton = screen.getByRole('button', { name: /delete/i })
        fireEvent.click(deleteButton)
        
        expect(mockPostMessage).toHaveBeenCalledWith({
            command: 'deleteTask',
            taskId: 'test-id'
        })
    })

    it('handles close action', () => {
        renderComponent()
        const closeButton = screen.getByRole('button', { name: /close task/i })
        fireEvent.click(closeButton)
        
        expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('shows checkpoint tracker error when present', () => {
        const errorMessage = 'Git must be installed to use checkpoints.'
        render(
            <ExtensionStateProvider 
                value={{
                    ...mockExtensionState,
                    checkpointTrackerErrorMessage: errorMessage
                }}>
                <TaskHeader {...defaultProps} />
            </ExtensionStateProvider>
        )

        expect(screen.getByText(errorMessage)).toBeInTheDocument()
        expect(screen.getByText('See here for instructions.')).toBeInTheDocument()
    })

    it('handles keyboard navigation', () => {
        renderComponent()
        const expandButton = screen.getByRole('button', { name: /task/i })
        
        // Test Enter key
        fireEvent.keyPress(expandButton, { key: 'Enter', code: 'Enter' })
        expect(screen.queryByText('API Cost:')).not.toBeInTheDocument()
        
        // Test Space key
        fireEvent.keyPress(expandButton, { key: ' ', code: 'Space' })
        expect(screen.getByText('API Cost:')).toBeInTheDocument()
    })

    it('does not show cost for unsupported providers', () => {
        render(
            <ExtensionStateProvider 
                value={{
                    ...mockExtensionState,
                    apiConfiguration: { apiProvider: 'openai' }
                }}>
                <TaskHeader {...defaultProps} />
            </ExtensionStateProvider>
        )

        expect(screen.queryByText('$0.0123')).not.toBeInTheDocument()
    })
}) 