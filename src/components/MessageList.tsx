import { useEffect, useRef } from 'react';
import type { ChatbotLabels, ChatMessage, ContactChannel, FAQItem, IconSet } from '../types';
import { getIcon } from './icons';
import { contactHref, formatTime, iconNameForChannel } from '../utils/format';

interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  contactChannels: ContactChannel[];
  labels: ChatbotLabels;
  icons?: IconSet;
  onSelectSuggestion: (item: FAQItem) => void;
  onContactClick: (channel: ContactChannel) => void;
}

export function MessageList({
  messages,
  isTyping,
  contactChannels,
  labels,
  icons,
  onSelectSuggestion,
  onContactClick,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isTyping]);

  return (
    <div className="rfc-log" role="log" aria-live="polite" aria-label={labels.title}>
      {messages.map((message) => {
        if (message.kind === 'suggestions') {
          return (
            <div key={message.id} className="rfc-row rfc-row--start">
              <div className="rfc-bubble rfc-bubble--agent rfc-bubble--card">
                <div className="rfc-suggestions">
                  {message.items.map((item, i) => (
                    <button
                      key={item.id ?? `${message.id}-${i}`}
                      type="button"
                      className="rfc-chip"
                      onClick={() => onSelectSuggestion(item)}
                    >
                      <span className="rfc-chip__icon">{getIcon('search', icons)}</span>
                      <span className="rfc-chip__text">{item.question}</span>
                      {item.category && <span className="rfc-chip__cat">{item.category}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        if (message.kind === 'contact') {
          return (
            <div key={message.id} className="rfc-row rfc-row--start">
              <div className="rfc-bubble rfc-bubble--agent rfc-bubble--card">
                <p className="rfc-contact__prompt">{labels.contactPrompt}</p>
                <div className="rfc-contact">
                  {contactChannels.map((channel, i) => (
                    <a
                      key={`${message.id}-${i}`}
                      className="rfc-contact__link"
                      href={contactHref(channel)}
                      target={
                        channel.type === 'whatsapp' || channel.type === 'link'
                          ? '_blank'
                          : undefined
                      }
                      rel="noopener noreferrer"
                      onClick={() => onContactClick(channel)}
                    >
                      <span className="rfc-contact__icon">
                        {channel.icon ?? getIcon(iconNameForChannel(channel), icons)}
                      </span>
                      {channel.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        // text message
        const isUser = message.role === 'user';
        const isSystem = message.role === 'system';
        return (
          <div key={message.id} className={`rfc-row ${isUser ? 'rfc-row--end' : 'rfc-row--start'}`}>
            <div
              className={`rfc-bubble ${
                isUser ? 'rfc-bubble--user' : isSystem ? 'rfc-bubble--system' : 'rfc-bubble--agent'
              }`}
            >
              <p className="rfc-bubble__text">{message.content}</p>
              <time className="rfc-bubble__time">{formatTime(message.at)}</time>
            </div>
          </div>
        );
      })}

      {isTyping && (
        <div className="rfc-row rfc-row--start">
          <div className="rfc-bubble rfc-bubble--agent rfc-typing" aria-label="Assistant is typing">
            <span className="rfc-dot" />
            <span className="rfc-dot" />
            <span className="rfc-dot" />
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
