import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollIntoView, which MessageList calls to autoscroll.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
