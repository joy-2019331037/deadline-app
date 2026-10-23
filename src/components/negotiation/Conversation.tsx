import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { MessageDto } from '../../api/types.ts';
import { formatGameMoment } from '../../lib/format.ts';
import { ACTION_COSTS } from '../../lib/negotiation.ts';
import { Monogram } from '../ui/primitives.tsx';
import styles from './Negotiation.module.css';

const MAX_MESSAGE_LENGTH = 500;

interface ConversationProps {
  messages: MessageDto[];
  agentName: string;
  /** The agent is reading or typing a reply. */
  typing?: boolean;
  /** Your message on its way to the agent, shown before the server confirms it. */
  outgoing?: string | null;
}

export function Conversation({ messages, agentName, typing = false, outgoing = null }: ConversationProps) {
  const list = useRef<HTMLOListElement>(null);
  const speakerName = (message: MessageDto) =>
    message.speaker === 'USER' ? 'You' : message.speaker === 'AGENT' ? agentName : 'Update';

  useEffect(() => {
    const element = list.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, typing, outgoing]);

  if (messages.length === 0 && !outgoing && !typing) {
    return <p className={styles.empty}>No conversation yet.</p>;
  }

  return (
    <ol ref={list} className={styles.messages} aria-label="Conversation" aria-live="polite">
      {messages.map((message) => (
        <li key={message.id} className={styles.message} data-speaker={message.speaker}>
          {message.speaker === 'AGENT' && <Monogram name={agentName} />}
          <div className={styles.bubble}>
            <p className={styles.messageMeta}>
              <span className={styles.speaker}>{speakerName(message)}</span>
              <span className={styles.stamp}>{formatGameMoment(message.createdAtGameHour)}</span>
            </p>
            <p className={styles.messageText}>{message.content}</p>
          </div>
        </li>
      ))}
      {outgoing && (
        <li className={styles.message} data-speaker="USER" data-state="sending">
          <div className={styles.bubble}>
            <p className={styles.messageMeta}>
              <span className={styles.speaker}>You</span>
              <span className={styles.stamp}>Sending…</span>
            </p>
            <p className={styles.messageText}>{outgoing}</p>
          </div>
        </li>
      )}
      {typing && (
        <li className={styles.message} data-speaker="AGENT" data-state="typing">
          <Monogram name={agentName} />
          <div className={styles.bubble} role="status" aria-label={`${agentName} is typing`}>
            <span className={styles.dots} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>
        </li>
      )}
    </ol>
  );
}

interface MessageComposerProps {
  agentName: string;
  pending: boolean;
  error: string | null;
  onSend: (content: string) => Promise<unknown>;
}

export function MessageComposer({ agentName, pending, error, onSend }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const trimmed = content.trim();

  const send = () => {
    if (!trimmed || pending) return;
    // Clear straight away so the message reads as sent; put it back if the server rejects it.
    setContent('');
    onSend(trimmed).catch(() => setContent((current) => current || trimmed));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <label htmlFor="message" className={styles.label}>
        Message to {agentName}
      </label>
      <div className={styles.composerBox}>
        <textarea
          id="message"
          className={styles.textarea}
          value={content}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={2}
          placeholder="Ask about his ambitions, minutes, or what it would take."
          aria-describedby="message-help"
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className={styles.send} disabled={pending || !trimmed}>
          Send · {ACTION_COSTS.message} hour
        </button>
      </div>
      <span id="message-help" className={styles.composerHelp}>
        <span>
          {content.length}/{MAX_MESSAGE_LENGTH}
        </span>
        <span aria-hidden="true">Enter to send · Shift+Enter for a new line</span>
      </span>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
