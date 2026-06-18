import type { ChatbotApi } from '../hooks/useChatbot';
import type { ChatbotLabels, ContactChannel, IconSet, QuickTopic, WhatsAppConfig } from '../types';
import { CONTACT_INTENT } from '../types';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { WhatsAppButton, type WhatsAppButtonPlacement } from './WhatsAppButton';
import { getIcon } from './icons';

interface ChatPanelProps {
  api: ChatbotApi;
  labels: ChatbotLabels;
  quickTopics: QuickTopic[];
  contactChannels: ContactChannel[];
  /** Shown as a CTA above the composer when WhatsApp `panel` placement is active. */
  whatsapp?: WhatsAppConfig;
  icons?: IconSet;
  onClose: () => void;
  onContactClick: (channel: ContactChannel) => void;
  onWhatsApp?: (placement: WhatsAppButtonPlacement) => void;
}

export function ChatPanel({
  api,
  labels,
  quickTopics,
  contactChannels,
  whatsapp,
  icons,
  onClose,
  onContactClick,
  onWhatsApp,
}: ChatPanelProps) {
  const { messages, isTyping, send, showContact, reset } = api;
  // Quick topics help users start — show only on a fresh thread.
  const isFresh = messages.length <= 1;

  const runTopic = (topic: QuickTopic) => {
    if (topic.seed === CONTACT_INTENT) {
      showContact();
    } else {
      send(topic.seed);
    }
  };

  return (
    <div
      className="rfc-panel"
      id="rfc-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="rfc-title"
    >
      <header className="rfc-header">
        <div className="rfc-header__id">
          <span className="rfc-avatar">{getIcon('sparkles', icons)}</span>
          <div>
            <h2 id="rfc-title" className="rfc-title">
              {labels.title}
            </h2>
            <p className="rfc-subtitle">
              <span className="rfc-online-dot" aria-hidden="true" />
              {labels.subtitle}
            </p>
          </div>
        </div>
        <div className="rfc-header__actions">
          <button
            type="button"
            className="rfc-iconbtn"
            aria-label={labels.resetAriaLabel}
            title={labels.resetAriaLabel}
            onClick={reset}
          >
            {getIcon('reset', icons)}
          </button>
          <button
            type="button"
            className="rfc-iconbtn"
            aria-label={labels.closeAriaLabel}
            title={labels.closeAriaLabel}
            onClick={onClose}
          >
            {getIcon('close', icons)}
          </button>
        </div>
      </header>

      <MessageList
        messages={messages}
        isTyping={isTyping}
        contactChannels={contactChannels}
        labels={labels}
        icons={icons}
        onSelectSuggestion={(item) => send(item.question)}
        onContactClick={onContactClick}
      />

      {isFresh && quickTopics.length > 0 && (
        <div className="rfc-topics" role="group" aria-label={labels.quickTopicsHeading}>
          <p className="rfc-topics__heading">{labels.quickTopicsHeading}</p>
          <div className="rfc-topics__grid">
            {quickTopics.map((topic, i) => (
              <button
                key={`${topic.label}-${i}`}
                type="button"
                className="rfc-topic"
                onClick={() => runTopic(topic)}
              >
                {topic.icon && <span className="rfc-topic__icon">{topic.icon}</span>}
                {topic.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {whatsapp && (
        <div className="rfc-wa-cta-wrap">
          <WhatsAppButton config={whatsapp} variant="panel" icons={icons} onActivate={onWhatsApp} />
        </div>
      )}

      <Composer disabled={isTyping} labels={labels} icons={icons} onSend={send} />
    </div>
  );
}
