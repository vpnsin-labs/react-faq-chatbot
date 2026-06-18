// Portal presets + WhatsApp chat.
//
// One `preset` adapts the widget's copy, accent colour and starter topics to a
// portal type; everything stays overridable. The `whatsapp` prop adds a WhatsApp
// deep link as a panel CTA, a standalone launcher and/or a handoff channel.
//
// (Next.js: render from a Client Component — add "use client" at the top.)

import { Chatbot, type FAQItem } from '@vpnsin-labs/react-faq-chatbot';
import '@vpnsin-labs/react-faq-chatbot/styles.css';

// `category` tags the suggestion; `keywords` add search aliases beyond the question.
const faqs: FAQItem[] = [
  {
    id: 'track',
    question: 'How do I track my order?',
    answer: 'Open “My Orders” and tap the shipment to see live tracking.',
    category: 'Orders',
    keywords: ['where is my package', 'shipment status', 'delivery'],
  },
  {
    id: 'returns',
    question: 'What is your return policy?',
    answer: 'Returns are free within 30 days of delivery.',
    category: 'Returns',
    keywords: ['refund', 'exchange', 'send back'],
  },
];

export default function StoreSupport() {
  return (
    <Chatbot
      faqs={faqs}
      // Seeds "Store Help", an orange accent and e-commerce quick topics.
      preset="ecommerce"
      // Override just the bits you want; the preset fills in the rest.
      labels={{ title: 'Acme Store' }}
      whatsapp={{
        phone: '+1 555 010 2030',
        message: 'Hi Acme! I have a question about my order.',
        placement: ['panel', 'launcher'],
      }}
      onEvent={(e) => {
        if (e.type === 'whatsapp_clicked') console.info('WhatsApp opened from', e.placement);
      }}
    />
  );
}
