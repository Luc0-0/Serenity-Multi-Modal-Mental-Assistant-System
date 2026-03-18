import '@testing-library/jest-dom';

// Mock SpeechRecognition API
class MockSpeechRecognition {
  constructor() {
    this.lang = '';
    this.interimResults = false;
    this.continuous = false;
    this.maxAlternatives = 1;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
  }
  start() {}
  stop() {}
  abort() {}
}

// Mock SpeechSynthesis API
const mockSpeechSynthesis = {
  cancel: vi.fn(),
  speak: vi.fn(),
  getVoices: vi.fn(() => []),
  onvoiceschanged: null,
};

const mockSpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  rate: 1,
  pitch: 1,
  voice: null,
  onend: null,
  onerror: null,
}));

Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: MockSpeechRecognition,
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: MockSpeechRecognition,
});

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: mockSpeechSynthesis,
});

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  writable: true,
  value: mockSpeechSynthesisUtterance,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor() {
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
  }
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock requestAnimationFrame
window.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0));
window.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));
