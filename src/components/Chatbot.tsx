import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type {
  ChatbotEvent,
  ChatbotLabels,
  ChatbotProps,
  ChatbotTheme,
  ContactChannel,
  WhatsAppPlacement,
} from '../types';
import { DEFAULT_SYNONYMS } from '../search/faqSearch';
import { getPortalPreset } from '../presets';
import { useChatbot } from '../hooks/useChatbot';
import { ChatLauncher } from './ChatLauncher';
import { ChatPanel } from './ChatPanel';
import { WhatsAppButton } from './WhatsAppButton';

const DEFAULT_LABELS: ChatbotLabels = {
  title: 'Support',
  subtitle: 'Typically replies instantly',
  greeting: 'Hi! 👋 How can I help you today?',
  placeholder: 'Type your message…',
  suggestionsPrompt: 'Here are a few things that might help — did you mean one of these?',
  noMatch: "I couldn't find an answer to that. Would you like to reach our team?",
  contactPrompt: 'Get in touch with us directly:',
  quickTopicsHeading: 'Popular topics',
  launcherAriaLabel: 'Open support chat',
  closeAriaLabel: 'Close',
  resetAriaLabel: 'Reset conversation',
  sendAriaLabel: 'Send message',
  online: 'Online',
};

const DEFAULT_STORAGE_KEY = 'rfc.chat.v1';

// camelCase token -> `--rfc-kebab-case` CSS variable.
function themeToStyle(theme?: ChatbotTheme): CSSProperties {
  if (!theme) return {};
  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme)) {
    if (value == null) continue;
    const kebab = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    style[`--rfc-${kebab}`] = value;
  }
  return style as CSSProperties;
}

export function Chatbot(props: ChatbotProps) {
  const {
    faqs,
    preset: presetType,
    synonyms: userSynonyms,
    aiAdapter,
    quickTopics: quickTopicsProp,
    contactChannels = [],
    whatsapp,
    labels: labelOverrides,
    theme,
    position = 'bottom-right',
    persistence = 'session',
    storageKey = DEFAULT_STORAGE_KEY,
    defaultOpen = false,
    showLauncher = true,
    open: controlledOpen,
    onOpenChange,
    typingDelayMs = 600,
    nudge,
    confidence,
    onEvent,
    icons,
    className,
  } = props;

  // Portal preset contributes defaults; explicit props always win over them.
  const preset = useMemo(() => getPortalPreset(presetType), [presetType]);

  const labels = useMemo<ChatbotLabels>(
    () => ({ ...DEFAULT_LABELS, ...preset?.labels, ...labelOverrides }),
    [preset, labelOverrides]
  );

  // Theme: preset accent under explicit per-token overrides.
  const mergedTheme = useMemo<ChatbotTheme | undefined>(
    () => (preset?.theme || theme ? { ...preset?.theme, ...theme } : undefined),
    [preset, theme]
  );

  // Quick topics: explicit prop wins; otherwise fall back to the preset's.
  const quickTopics = quickTopicsProp ?? preset?.quickTopics ?? [];

  // Normalise WhatsApp placements (default: panel CTA only).
  const waPlacements = useMemo<Set<WhatsAppPlacement>>(() => {
    if (!whatsapp) return new Set();
    const p = whatsapp.placement ?? 'panel';
    return new Set(Array.isArray(p) ? p : [p]);
  }, [whatsapp]);

  // When WhatsApp is offered as a handoff channel, add it to the contact card
  // (unless the app already supplies its own WhatsApp channel).
  const resolvedContactChannels = useMemo<ContactChannel[]>(() => {
    if (!whatsapp || !waPlacements.has('contact')) return contactChannels;
    if (contactChannels.some((c) => c.type === 'whatsapp')) return contactChannels;
    return [
      ...contactChannels,
      {
        type: 'whatsapp',
        label: whatsapp.label ?? 'Chat on WhatsApp',
        value: whatsapp.phone,
        prefill: whatsapp.message,
      },
    ];
  }, [contactChannels, whatsapp, waPlacements]);

  const synonyms = useMemo(
    () => (userSynonyms ? { ...DEFAULT_SYNONYMS, ...userSynonyms } : DEFAULT_SYNONYMS),
    [userSynonyms]
  );

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const emit = useCallback((e: ChatbotEvent) => onEventRef.current?.(e), []);

  // Open state: controlled if `open` prop is provided, else internal.
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
      emit({ type: next ? 'open' : 'close' });
    },
    [isControlled, onOpenChange, emit]
  );

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  const api = useChatbot({
    faqs,
    synonyms,
    aiAdapter,
    greeting: labels.greeting,
    suggestionsPrompt: labels.suggestionsPrompt,
    noMatch: labels.noMatch,
    contactPrompt: labels.contactPrompt,
    persistence,
    storageKey,
    typingDelayMs,
    confidence,
    onEvent,
  });

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const handleContactClick = useCallback(
    (channel: ContactChannel) => emit({ type: 'contact_clicked', channel }),
    [emit]
  );

  const handleWhatsApp = useCallback(
    (placement: WhatsAppPlacement) => emit({ type: 'whatsapp_clicked', placement }),
    [emit]
  );

  const rootStyle = themeToStyle(mergedTheme);

  return (
    <div
      className={`rfc-root rfc-${position}${className ? ` ${className}` : ''}`}
      style={rootStyle}
      data-rfc-open={open ? 'true' : 'false'}
    >
      {open && (
        <ChatPanel
          api={api}
          labels={labels}
          quickTopics={quickTopics}
          contactChannels={resolvedContactChannels}
          whatsapp={whatsapp && waPlacements.has('panel') ? whatsapp : undefined}
          icons={icons}
          onClose={() => setOpen(false)}
          onContactClick={handleContactClick}
          onWhatsApp={handleWhatsApp}
        />
      )}

      {whatsapp && waPlacements.has('launcher') && !open && (
        <WhatsAppButton
          config={whatsapp}
          variant="launcher"
          icons={icons}
          onActivate={handleWhatsApp}
        />
      )}

      {showLauncher && (
        <ChatLauncher
          open={open}
          labels={labels}
          icons={icons}
          nudge={nudge}
          nudgeStorageKey={`${storageKey}.nudge`}
          onToggle={toggle}
        />
      )}
    </div>
  );
}

export default Chatbot;
