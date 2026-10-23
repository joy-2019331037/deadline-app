import { useState, type FormEvent } from 'react';
import type { MessageDto } from '../../api/types.ts';
import { formatGameMoment } from '../../lib/format.ts';
import { ACTION_COSTS } from '../../lib/negotiation.ts';
import styles from './Negotiation.module.css';

const MAX_MESSAGE_LENGTH = 500;

interface ConversationProps {
  messages: MessageDto[];
  agentName: string;
}

export function Conversation({ messages, agentName }: ConversationProps) {
  const speakerName = (message: MessageDto) =>
    message.speaker === 'USER' ? 'You' : message.speaker === 'AGENT' ? agentName : 'Update';

  if (messages.length === 0) {
    return <p className={styles.muted}>No conversation yet.</p>;
  }

  return (
    <ol className={styles.messages} aria-label="Conversation" aria-live="polite">
      {messages.map((message) => (
        <li key={message.id} className={styles.message} data-speaker={message.speaker}>
          <p className={styles.messageMeta}>
            <span className={styles.speaker}>{speakerName(message)}</span>
            <span>{formatGameMoment(message.createdAtGameHour)}</span>
          </p>
          <p className={styles.messageText}>{message.content}</p>
        </li>
      ))}
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed) return;
    onSend(trimmed).then(
      () => setContent(''),
      () => undefined,
    );
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <label htmlFor="message" className={styles.label}>
        Message to {agentName}
      </label>
      <textarea
        id="message"
        className={styles.textarea}
        value={content}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={3}
        placeholder="Ask about his ambitions, minutes, or what it would take."
        aria-describedby="message-help"
        onChange={(event) => setContent(event.target.value)}
      />
      <div className={styles.composerFooter}>
        <span id="message-help" className={styles.muted}>
          {content.length}/{MAX_MESSAGE_LENGTH}
        </span>
        <button type="submit" className={styles.secondary} disabled={pending || !trimmed}>
          Send · {ACTION_COSTS.message} hour
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
