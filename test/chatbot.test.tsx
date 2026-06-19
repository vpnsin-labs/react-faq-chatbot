import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MouseEvent } from 'react';
import { Chatbot, CONTACT_INTENT } from '../src/index';
import type { FAQItem } from '../src/types';

const faqs: FAQItem[] = [
  {
    id: 'track',
    question: 'How do I track my order?',
    answer: 'Open My Orders to see live tracking.',
    category: 'Orders',
    keywords: ['where is my package'],
  },
  {
    id: 'returns',
    question: 'What is your return policy?',
    answer: 'Returns are free in 30 days.',
  },
];

describe('<Chatbot>', () => {
  it('applies the portal preset labels', () => {
    render(
      <Chatbot faqs={faqs} preset="ecommerce" persistence="none" defaultOpen typingDelayMs={0} />
    );
    expect(screen.getByText('Store Help')).toBeInTheDocument();
  });

  it('renders a WhatsApp panel CTA with a wa.me deep link', () => {
    render(
      <Chatbot
        faqs={faqs}
        persistence="none"
        defaultOpen
        whatsapp={{ phone: '+1 (555) 010-2030', message: 'Hi' }}
      />
    );
    const cta = screen.getByRole('link', { name: /chat on whatsapp/i });
    expect(cta).toHaveAttribute('href', 'https://wa.me/15550102030?text=Hi');
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders a standalone WhatsApp launcher FAB announcing the new tab', () => {
    render(
      <Chatbot
        faqs={faqs}
        persistence="none"
        whatsapp={{ phone: '15550102030', placement: 'launcher' }}
      />
    );
    const fab = screen.getByRole('link', { name: /chat on whatsapp \(opens in a new tab\)/i });
    expect(fab).toHaveAttribute('href', 'https://wa.me/15550102030');
  });

  it('answers a question matched only by its keywords', async () => {
    const user = userEvent.setup();
    render(<Chatbot faqs={faqs} persistence="none" defaultOpen typingDelayMs={0} />);
    await user.type(screen.getByRole('textbox'), 'where is my package');
    await user.click(screen.getByRole('button', { name: /send message/i }));
    expect(await screen.findByText(/open my orders to see live tracking/i)).toBeInTheDocument();
  });

  it('opens a link contact channel in the same tab and fires onContactNavigate', async () => {
    const user = userEvent.setup();
    const onContactNavigate = vi.fn((_channel, event: MouseEvent<HTMLAnchorElement>) =>
      event.preventDefault()
    );
    render(
      <Chatbot
        faqs={faqs}
        persistence="none"
        defaultOpen
        typingDelayMs={0}
        quickTopics={[{ label: 'Talk to a human', seed: CONTACT_INTENT }]}
        contactChannels={[
          { type: 'link', label: 'Contact support', value: '/support', target: '_self' },
        ]}
        onContactNavigate={onContactNavigate}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Talk to a human' }));
    // target:'_self' => same-tab, so no "(opens in a new tab)" suffix in the name.
    const link = await screen.findByRole('link', { name: 'Contact support' });
    expect(link).toHaveAttribute('href', '/support');
    expect(link).toHaveAttribute('target', '_self');
    await user.click(link);
    expect(onContactNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ value: '/support' }),
      expect.anything()
    );
  });
});
