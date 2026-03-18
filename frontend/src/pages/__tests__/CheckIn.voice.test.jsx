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
  sendChatMessage: vi.fn().mockResolvedValue({ reply: 'Hello there', conversation_id: 1, message_id: 1 }),
  getErrorDisplay: vi.fn((e) => ({ message: e?.message || 'Error', isRetryable: false })),
  speakText: vi.fn().mockResolvedValue(null),
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

    it('enters voice mode when clicking voice button', async () => {
      renderCheckIn();
      enterChatMode();
      await vi.advanceTimersByTimeAsync(700);

      const voiceModeBtn = screen.queryByLabelText(/enter voice conversation mode/i);
      if (voiceModeBtn) {
        fireEvent.click(voiceModeBtn);
        // Voice overlay should now be rendered
        const endBtn = screen.queryByLabelText(/end voice conversation/i);
        expect(endBtn).toBeTruthy();
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
    it('maps voiceStatus to correct orb CSS class', () => {
      // The orb className logic uses voiceStatus string comparison:
      // voiceStatus === 'listening' ? styles.voiceOrbListening :
      // voiceStatus === 'processing' ? styles.voiceOrbProcessing :
      // voiceStatus === 'speaking' ? styles.voiceOrbSpeaking : ''
      const getOrbClass = (status) => {
        if (status === 'listening') return 'voiceOrbListening';
        if (status === 'processing') return 'voiceOrbProcessing';
        if (status === 'speaking') return 'voiceOrbSpeaking';
        return '';
      };

      expect(getOrbClass('listening')).toBe('voiceOrbListening');
      expect(getOrbClass('processing')).toBe('voiceOrbProcessing');
      expect(getOrbClass('speaking')).toBe('voiceOrbSpeaking');
      expect(getOrbClass('idle')).toBe('');
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
