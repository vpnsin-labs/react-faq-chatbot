import React from 'react';
import { createRoot } from 'react-dom/client';
import { Chatbot } from '@vpnsin-labs/react-faq-chatbot';
import '@vpnsin-labs/react-faq-chatbot/styles.css';

const h = React.createElement;

// Knowledge base exercising the `category` + `keywords` fields.
const faqs = [
  {
    id: 'track',
    question: 'How do I track my order?',
    answer: 'Open "My Orders" and tap the shipment to see live tracking.',
    category: 'Orders',
    keywords: ['where is my package', 'shipment status', 'delivery update'],
  },
  {
    id: 'returns',
    question: 'What is your return policy?',
    answer: 'Returns are free within 30 days of delivery.',
    category: 'Returns',
    keywords: ['refund', 'exchange', 'send back'],
  },
  {
    id: 'ship',
    question: 'How long does shipping take?',
    answer: 'Standard shipping is 3-5 business days.',
    category: 'Shipping',
    keywords: ['delivery time', 'how fast'],
  },
  {
    id: 'pay',
    question: 'What payment methods do you accept?',
    answer: 'All major cards, PayPal and Apple Pay.',
    category: 'Payment',
  },
];

function App() {
  return h(
    'div',
    null,
    h('h1', null, 'react-faq-chatbot playground'),
    h(
      'p',
      null,
      h('code', null, 'preset="ecommerce"'),
      ' + WhatsApp (panel CTA + launcher). Click the bubble bottom-right.'
    ),
    h(Chatbot, {
      faqs,
      preset: 'ecommerce',
      whatsapp: {
        phone: '+1 (555) 010-2030',
        message: 'Hi! I have a question about my order.',
        placement: ['panel', 'launcher'],
      },
      nudge: false,
      onEvent: (e) => {
        window.__rfcEvents = window.__rfcEvents || [];
        window.__rfcEvents.push(e);
      },
    })
  );
}

createRoot(document.getElementById('root')).render(h(App));
