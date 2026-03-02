import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChatSidebar from './ChatSidebar';

describe('ChatSidebar', () => {
    afterEach(() => cleanup());

    it('shows the idle prompt copy when chat is closed', () => {
        render(
            <ChatSidebar
                messages={[]}
                chatOpen={false}
                chatText=""
                onChatTextChange={vi.fn()}
                onSendMessage={vi.fn()}
                onCloseChat={vi.fn()}
            />,
        );

        expect(screen.getByText('<enter> to chat')).toBeInTheDocument();
    });

    it('closes chat when the input blurs', () => {
        const onCloseChat = vi.fn();

        render(
            <ChatSidebar
                messages={[]}
                chatOpen
                chatText="hello"
                onChatTextChange={vi.fn()}
                onSendMessage={vi.fn()}
                onCloseChat={onCloseChat}
            />,
        );

        fireEvent.blur(screen.getByDisplayValue('hello'));

        expect(onCloseChat).toHaveBeenCalledTimes(1);
    });

    it('closes chat when escape is pressed in the input', () => {
        const onCloseChat = vi.fn();

        render(
            <ChatSidebar
                messages={[]}
                chatOpen
                chatText="hello"
                onChatTextChange={vi.fn()}
                onSendMessage={vi.fn()}
                onCloseChat={onCloseChat}
            />,
        );

        fireEvent.keyDown(screen.getByDisplayValue('hello'), {
            key: 'Escape',
        });

        expect(onCloseChat).toHaveBeenCalledTimes(1);
    });
});
