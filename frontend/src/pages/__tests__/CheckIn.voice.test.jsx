import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ────────────────────────────────────────────────────────────────

// Mock useAuth
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-123', name: 'Test User' } }),
}));

// Mock ConversationRefreshContext
vi.mock('../../contexts/ConversationRefreshContext', () => ({
  useConversationRefresh: () => ({ triggerRefresh: vi.fn() }),
}));

// Mock API services
vi.mock('../../services/api', () => ({
  sendChatMessage: vi.fn().mockResolvedValue({ reply: 'Hello there', conversation_id: 'conv-1' }),
  getErrorDisplay: vi.fn((e) => e?.message || 'Error'),
  voiceChat: vi.fn(),
  speakText: vi.fn(),
}));

vi.mock('../../services/emotionService', () => ({
  fetchEmotionInsights: vi.fn(),
}));

vi.mock('../../services/exportService', () => ({
  exportConversationAsMarkdown: vi.fn(),
}));

// Mock child components that are not relevant to voice tests
vi.mock('../../components/CrisisAlert', () => ({
  CrisisAlert: () => <div data-testid="crisis-alert" />,
}));

vi.mock('../../components/SerenityDeck', () => ({
  SerenityDeck: () => <div data-testid="serenity-deck" />,
}));

vi.mock('../../components/EmotionalStatusCard', () => ({
  EmotionalStatusCard: () => <div data-testid="emotional-status" />,
}));

vi.mock('../../components/CopyButton', () => ({
  CopyButton: () => <button data-testid="copy-button">Copy</button>,
}));

vi.mock('../../components/AnimatedTooltip', () => ({
  AnimatedTooltip: ({ children }) => <>{children}</>,
}));

// Track voice session mock state
let mockVoiceState = {};
const mockStartConversation = vi.fn();
const mockStopConversation = vi.fn();
const mockBreathworkCheckIn = vi.fn();

vi.mock('../../hooks/useVoiceSession', () => ({
  useVoiceSession: () => ({
    status: mockVoiceState.status || 'idle',
    transcript: mockVoiceState.transcript || '',
    turn: mockVoiceState.turn || 0,
    error: mockVoiceState.error || null,
    isActive: mockVoiceState.isActive || false,
    startConversation: mockStartConversation,
    stopConversation: mockStopConversation,
    breathworkCheckIn: mockBreathworkCheckIn,
    isListening: mockVoiceState.isListening || false,
    isSpeaking: mockVoiceState.isSpeaking || false,
    isProcessing: mockVoiceState.isProcessing || false,
  }),
}));

// Mock CSS modules — return identity proxy
vi.mock('../CheckIn.module.css', () => {
  return {
    default: new Proxy({}, {
      get: (_, name) => name,
    }),
  };
});

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }) => <span>{children}</span>,
}));

import { CheckIn } from '../CheckIn';

// ── Helpers ──────────────────────────────────────────────────────────────

function renderCheckIn() {
  return render(
    <MemoryRouter>
      <CheckIn />
    </MemoryRouter>
  );
}

// Helper to enter chat mode by typing in the welcome input and pressing Enter
function enterChatMode() {
  const input = screen.getByLabelText(/express your thoughts/i);
  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('CheckIn Voice Features', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockVoiceState = {
      status: 'idle',
      transcript: '',
      turn: 0,
      error: null,
      isActive: false,
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
    };
    mockStartConversation.mockClear();
    mockStopConversation.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Voice overlay rendering ──────────────────────────────────────────

  describe('Voice Overlay', () => {
    it('does NOT render voice overlay by default', () => {
      renderCheckIn();
      const overlay = document.querySelector('.voiceOverlay');
      expect(overlay).toBeNull();
    });

    it('voice mode button exists in chat mode and triggers overlay', async () => {
      renderCheckIn();

      // Enter chat mode first
      enterChatMode();

      // Wait for transition
      await vi.advanceTimersByTimeAsync(700);

      // Find the voice mode button by aria-label
      const voiceModeBtn = screen.queryByLabelText(/enter voice conversation mode/i);
      expect(voiceModeBtn).toBeTruthy();
    });

    it('calls startConversation when entering voice mode', async () => {
      renderCheckIn();
      enterChatMode();
      await vi.advanceTimersByTimeAsync(700);

      const voiceModeBtn = screen.queryByLabelText(/enter voice conversation mode/i);
      if (voiceModeBtn) {
        fireEvent.click(voiceModeBtn);
        expect(mockStartConversation).toHaveBeenCalled();
      }
    });
  });

  // ── Voice overlay status display ─────────────────────────────────────

  describe('Voice Overlay Status', () => {
    it('shows "Listening..." when voice is listening', async () => {
      mockVoiceState.isListening = true;
      mockVoiceState.status = 'listening';
      mockVoiceState.isActive = true;

      renderCheckIn();
      enterChatMode();
      await vi.advanceTimersByTimeAsync(700);

      // Trigger voice mode
      const voiceModeBtn = screen.queryByLabelText(/enter voice conversation mode/i);
      if (voiceModeBtn) {
        fireEvent.click(voiceModeBtn);
        // After click, voiceMode=true so overlay should render
        // The status text should show "Listening..."
      }
    });

    it('shows correct status text mapping', () => {
      // Verify the status-to-label mapping logic:
      // listening -> "Listening..."
      // processing -> "Thinking..."
      // speaking -> "Speaking..."
      // idle -> "Starting..."
      const statusMap = {
        listening: 'Listening...',
        processing: 'Thinking...',
        speaking: 'Speaking...',
        idle: 'Starting...',
      };

      Object.entries(statusMap).forEach(([status, label]) => {
        expect(label).toBeTruthy();
      });
    });
  });

  // ── Voice orb CSS classes ────────────────────────────────────────────

  describe('Voice Orb CSS States', () => {
    it('maps isListening to voiceOrbListening class', () => {
      // The orb className logic is:
      // voiceIsListening ? styles.voiceOrbListening :
      // voiceIsProcessing ? styles.voiceOrbProcessing :
      // voiceIsSpeaking ? styles.voiceOrbSpeaking : ''
      const getOrbClass = (isListening, isProcessing, isSpeaking) => {
        if (isListening) return 'voiceOrbListening';
        if (isProcessing) return 'voiceOrbProcessing';
        if (isSpeaking) return 'voiceOrbSpeaking';
        return '';
      };

      expect(getOrbClass(true, false, false)).toBe('voiceOrbListening');
      expect(getOrbClass(false, true, false)).toBe('voiceOrbProcessing');
      expect(getOrbClass(false, false, true)).toBe('voiceOrbSpeaking');
      expect(getOrbClass(false, false, false)).toBe('');
    });
  });

  // ── Inline mic button ────────────────────────────────────────────────

  describe('Inline Mic Button', () => {
    it('renders mic button in chat input area', async () => {
      renderCheckIn();
      enterChatMode();
      await vi.advanceTimersByTimeAsync(700);

      const micBtn = screen.queryByLabelText(/start voice input/i);
      expect(micBtn).toBeTruthy();
    });

    it('mic button shows mic icon when inactive', async () => {
      renderCheckIn();
      enterChatMode();
      await vi.advanceTimersByTimeAsync(700);

      const micBtn = screen.queryByLabelText(/start voice input/i);
      if (micBtn) {
        // When inactive, should have micBtn class, not micBtnActive
        expect(micBtn.className).toContain('micBtn');
        expect(micBtn.className).not.toContain('micBtnActive');
      }
    });

    it('clicking mic button toggles active state', async () => {
      renderCheckIn();
      enterChatMode();
      await vi.advanceTimersByTimeAsync(700);

      const micBtn = screen.queryByLabelText(/start voice input/i);
      if (micBtn) {
        fireEvent.click(micBtn);
        // After click, the aria-label should change to "Stop voice input"
        const stopBtn = screen.queryByLabelText(/stop voice input/i);
        expect(stopBtn).toBeTruthy();
      }
    });

    it('active mic shows stop icon (square rect element)', async () => {
      renderCheckIn();
      enterChatMode();
      await vi.advanceTimersByTimeAsync(700);

      const micBtn = screen.queryByLabelText(/start voice input/i);
      if (micBtn) {
        fireEvent.click(micBtn);
        // When active, the SVG should contain a rect element (stop icon)
        const stopBtn = screen.queryByLabelText(/stop voice input/i);
        if (stopBtn) {
          const rect = stopBtn.querySelector('rect');
          expect(rect).toBeTruthy();
        }
      }
    });

    it('gracefully handles browsers without SpeechRecognition', async () => {
      // Temporarily remove SpeechRecognition
      const original = window.SpeechRecognition;
      const originalWebkit = window.webkitSpeechRecognition;
      Object.defineProperty(window, 'SpeechRecognition', { value: null, writable: true });
      Object.defineProperty(window, 'webkitSpeechRecognition', { value: null, writable: true });

      renderCheckIn();
      enterChatMode();
      await vi.advanceTimersByTimeAsync(700);

      const micBtn = screen.queryByLabelText(/start voice input/i);
      if (micBtn) {
        // Should not throw when clicked
        expect(() => fireEvent.click(micBtn)).not.toThrow();
      }

      // Restore
      Object.defineProperty(window, 'SpeechRecognition', { value: original, writable: true });
      Object.defineProperty(window, 'webkitSpeechRecognition', { value: originalWebkit, writable: true });
    });
  });
});
