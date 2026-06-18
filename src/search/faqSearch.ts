// ---------------------------------------------------------------------------
// Dependency-free FAQ relevance engine
// ---------------------------------------------------------------------------
// Token-based scoring that tolerates word order, plurals and domain jargon —
// far more forgiving than exact / substring matching. Scoring blends:
//   • weighted token overlap (question tokens count more than answer tokens)
//   • whole-phrase / substring bonus
//   • optional domain synonym expansion ("moq" ⇄ "minimum order quantity")
// Results carry a 0–1 coverage so the UI can answer directly, offer choices, or
// escalate to a human / AI fallback.
// ---------------------------------------------------------------------------

import type { FAQItem, FAQResolution, ResolveOptions, ScoredFAQ, SynonymMap } from '../types';

// Very common words carry no signal — drop them so they don't inflate scores.
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'am',
  'be',
  'been',
  'was',
  'were',
  'to',
  'of',
  'for',
  'and',
  'or',
  'in',
  'on',
  'at',
  'by',
  'with',
  'from',
  'as',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'do',
  'does',
  'did',
  'can',
  'could',
  'would',
  'should',
  'will',
  'shall',
  'what',
  'whats',
  'which',
  'who',
  'whom',
  'how',
  'when',
  'where',
  'why',
  'your',
  'you',
  'we',
  'our',
  'us',
  'i',
  'me',
  'my',
  'have',
  'has',
  'had',
  'if',
  'about',
  'into',
  'out',
  'up',
  'down',
  'any',
  'some',
  'there',
  'here',
  'their',
  'they',
  'them',
  'please',
  'thanks',
  'thank',
  'hi',
  'hello',
  'hey',
  'tell',
  'give',
  'want',
  'need',
  'know',
  'get',
  'got',
]);

/**
 * A small, domain-neutral synonym seed. Apps should pass their own
 * `synonyms` (merged over these) for vocabulary specific to their product.
 */
export const DEFAULT_SYNONYMS: SynonymMap = {
  price: ['pricing', 'cost', 'rate', 'quote', 'fee', 'fees'],
  pricing: ['price', 'cost', 'rate', 'quote'],
  cost: ['price', 'pricing', 'rate', 'fee'],
  buy: ['purchase', 'order', 'checkout'],
  cancel: ['cancellation', 'stop', 'end', 'terminate'],
  refund: ['refunds', 'return', 'money', 'back'],
  account: ['profile', 'login', 'signin', 'signup', 'register'],
  password: ['passcode', 'login', 'reset', 'forgot'],
  contact: ['email', 'phone', 'call', 'support', 'reach', 'help'],
  ship: ['shipping', 'delivery', 'deliver', 'dispatch'],
  delivery: ['shipping', 'deliver', 'dispatch', 'time'],
};

const normalise = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Light stemming: collapse trivial plurals ("plates"≈"plate", "duties"≈"duty").
// Applied to both query and index, so variants just need to map to one root.
const stem = (w: string): string => {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
};

const tokenize = (text: string): string[] =>
  normalise(text)
    .split(' ')
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem);

const variantsOf = (token: string, synonyms: SynonymMap): string[] => {
  const syns = synonyms[token];
  return syns ? [token, ...syns.map(stem)] : [token];
};

const expand = (tokens: string[], synonyms: SynonymMap): Set<string> => {
  const out = new Set(tokens);
  for (const t of tokens) for (const v of variantsOf(t, synonyms)) out.add(v);
  return out;
};

// Per-item token index, memoised per (item, synonym-map) so repeated searches
// are cheap. Keyed by the synonym object identity to stay correct if it changes.
const indexCache = new WeakMap<SynonymMap, WeakMap<FAQItem, { q: Set<string>; a: Set<string> }>>();

const indexOf = (item: FAQItem, synonyms: SynonymMap) => {
  let perMap = indexCache.get(synonyms);
  if (!perMap) {
    perMap = new WeakMap();
    indexCache.set(synonyms, perMap);
  }
  let idx = perMap.get(item);
  if (!idx) {
    // Keywords are author-curated aliases — index them at question weight so a
    // match counts as strongly as the question text itself.
    const keywordTokens = item.keywords?.length ? tokenize(item.keywords.join(' ')) : [];
    idx = {
      q: expand([...tokenize(item.question), ...keywordTokens], synonyms),
      a: new Set(tokenize(item.answer)),
    };
    perMap.set(item, idx);
  }
  return idx;
};

/**
 * Rank FAQs against a free-text query.
 * @returns matches sorted by descending relevance, capped at `limit`.
 */
export function searchFAQs(
  query: string,
  faqs: FAQItem[],
  options: { limit?: number; synonyms?: SynonymMap } = {}
): ScoredFAQ[] {
  const { limit = 4, synonyms = DEFAULT_SYNONYMS } = options;
  const rawTokens = tokenize(query);
  if (rawTokens.length === 0) return [];
  const normQuery = normalise(query);

  const scored: ScoredFAQ[] = [];

  for (const item of faqs) {
    const { q, a } = indexOf(item, synonyms);
    let satisfied = 0;
    let weighted = 0;

    // Score per *raw* intent word — synonyms widen where we look but never
    // inflate the denominator, so coverage reflects real user intent.
    for (const raw of rawTokens) {
      let best = 0; // 3 = matched in question, 1 = in answer body, 0 = miss
      for (const v of variantsOf(raw, synonyms)) {
        if (q.has(v)) {
          best = 3;
          break;
        }
        if (a.has(v)) best = 1;
      }
      if (best > 0) {
        satisfied++;
        weighted += best;
      }
    }

    if (satisfied === 0) continue;

    const coverage = satisfied / rawTokens.length;
    const phraseBonus = normalise(item.question).includes(normQuery) ? 4 : 0;
    const score = weighted * 0.6 + coverage * 5 + phraseBonus;
    scored.push({ item, score, coverage });
  }

  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, limit);
}

/**
 * Decide whether the top hit is trustworthy enough to answer directly versus
 * offering a "did you mean" shortlist. Confident when the best match explains
 * most of the query AND clearly out-scores the runner-up.
 */
export function isConfidentMatch(results: ScoredFAQ[], minCoverage = 0.6): boolean {
  const [top, second] = results;
  if (!top) return false;
  const dominant = !second || top.score >= second.score * 1.4;
  return top.coverage >= minCoverage && dominant;
}

/**
 * High-level resolver used by the widget: returns a direct answer, a shortlist
 * of suggestions, or `none` (so the caller can fall back to AI / a human).
 */
export function resolveFaqQuery(
  query: string,
  faqs: FAQItem[],
  options: ResolveOptions = {}
): FAQResolution {
  const {
    limit = 4,
    answerCoverage = 0.6,
    suggestCount = 3,
    synonyms = DEFAULT_SYNONYMS,
  } = options;

  const results = searchFAQs(query, faqs, { limit, synonyms });
  const top = results[0];
  if (!top) return { type: 'none' };

  if (isConfidentMatch(results, answerCoverage)) {
    return { type: 'answer', item: top.item };
  }
  return {
    type: 'suggestions',
    items: results.slice(0, suggestCount).map((r) => r.item),
  };
}
