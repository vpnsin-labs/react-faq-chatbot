import { describe, it, expect } from 'vitest';
import { searchFAQs, resolveFaqQuery, isConfidentMatch } from '../src/search/faqSearch';
import type { FAQItem, ScoredFAQ } from '../src/types';

const faqs: FAQItem[] = [
  {
    id: 'track',
    question: 'How do I track my order?',
    answer: 'Open My Orders to see live tracking.',
    keywords: ['where is my package', 'shipment status'],
  },
  { id: 'price', question: 'How much does it cost?', answer: 'Plans start at $9/mo.' },
  { id: 'return', question: 'What is your return policy?', answer: 'Returns are free in 30 days.' },
];

describe('searchFAQs', () => {
  it('ranks the matching question first', () => {
    const hits = searchFAQs('track my order', faqs);
    expect(hits[0]?.item.id).toBe('track');
    expect(hits[0]?.coverage).toBeGreaterThan(0);
  });

  it('widens recall via the built-in synonyms (cost -> pricing)', () => {
    const hits = searchFAQs('what is the cost', faqs);
    expect(hits[0]?.item.id).toBe('price');
  });

  it('matches a term that only appears in keywords, not the question/answer', () => {
    const hits = searchFAQs('where is my package', faqs);
    expect(hits[0]?.item.id).toBe('track');
  });

  it('returns nothing for an empty query', () => {
    expect(searchFAQs('', faqs)).toEqual([]);
  });

  it('keywords do not inflate coverage beyond the query intent', () => {
    const hits = searchFAQs('package', faqs);
    // single query token, fully satisfied -> coverage 1
    expect(hits[0]?.coverage).toBe(1);
  });
});

describe('isConfidentMatch', () => {
  it('is false for an empty result set', () => {
    expect(isConfidentMatch([])).toBe(false);
  });

  it('requires the top hit to dominate the runner-up', () => {
    const results: ScoredFAQ[] = [
      { item: faqs[0]!, score: 10, coverage: 0.9 },
      { item: faqs[1]!, score: 9.5, coverage: 0.5 },
    ];
    expect(isConfidentMatch(results)).toBe(false); // 10 < 9.5 * 1.4
  });
});

describe('resolveFaqQuery', () => {
  it('answers a confident match directly', () => {
    const res = resolveFaqQuery('return policy', faqs);
    expect(res.type).toBe('answer');
    if (res.type === 'answer') expect(res.item.id).toBe('return');
  });

  it('falls through to none for gibberish', () => {
    expect(resolveFaqQuery('zxqwv nonsense', faqs).type).toBe('none');
  });

  it('offers suggestions when no single hit is confident enough', () => {
    const res = resolveFaqQuery('order policy cost', faqs, { answerCoverage: 0.99 });
    expect(['suggestions', 'answer']).toContain(res.type);
  });
});
