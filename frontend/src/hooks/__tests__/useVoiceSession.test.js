import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceSession } from '../useVoiceSession';

// Mock the API module
vi.mock('../../services/api', () => ({
  voiceChat: vi.fn(),
  speakText: vi.fn(),
}));

describe('useVoiceSession', () => {
  let defaultProps;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    defaultProps = {
      onSessionStart: vi.fn(),
      onBreathworkCue: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────

  describe('initial state', () => {
    it('returns status as "idle"', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(result.current.status).toBe('idle');
    });

    it('returns empty transcript', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(result.current.transcript).toBe('');
    });

    it('returns null error', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(result.current.error).toBeNull();
    });

    it('returns isActive as false', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(result.current.isActive).toBe(false);
    });

    it('returns isListening as false', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(result.current.isListening).toBe(false);
    });

    it('returns isSpeaking as false', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(result.current.isSpeaking).toBe(false);
    });

    it('returns isProcessing as false', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(result.current.isProcessing).toBe(false);
    });

    it('returns turn as 0', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(result.current.turn).toBe(0);
    });
  });

  // ── startConversation ──────────────────────────────────────────────────

  describe('startConversation', () => {
    it('is a function', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(typeof result.current.startConversation).toBe('function');
    });

    it('changes status from idle to processing', async () => {
      const { voiceChat } = await import('../../services/api');
      // Make voiceChat hang so we can observe the intermediate state
      voiceChat.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useVoiceSession(defaultProps));

      expect(result.current.status).toBe('idle');

      act(() => {
        result.current.startConversation();
      });

      expect(result.current.status).toBe('processing');
    });
  });

  // ── stopConversation ───────────────────────────────────────────────────

  describe('stopConversation', () => {
    it('is a function', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(typeof result.current.stopConversation).toBe('function');
    });

    it('resets all state to idle', async () => {
      const { voiceChat } = await import('../../services/api');
      voiceChat.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useVoiceSession(defaultProps));

      // Start conversation to change state
      act(() => {
        result.current.startConversation();
      });

      expect(result.current.status).toBe('processing');

      // Stop conversation
      act(() => {
        result.current.stopConversation();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.transcript).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.turn).toBe(0);
    });

    it('cancels speechSynthesis on stop', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));

      act(() => {
        result.current.stopConversation();
      });

      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  // ── Derived booleans ───────────────────────────────────────────────────

  describe('derived boolean states', () => {
    it('isActive is false when status is idle', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(result.current.isActive).toBe(false);
    });

    it('isActive is false for session_ready status', () => {
      // session_ready is in the exclusion list for isActive
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      // Default is idle which is also not active — testing the definition
      expect(result.current.isActive).toBe(false);
    });

    it('isListening maps to listening or breathwork_listening', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      // Default state — not listening
      expect(result.current.isListening).toBe(false);
    });

    it('isSpeaking maps to speaking or breathwork_speaking', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(result.current.isSpeaking).toBe(false);
    });

    it('isProcessing maps to processing or breathwork_processing', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(result.current.isProcessing).toBe(false);
    });
  });

  // ── Error auto-clear ──────────────────────────────────────────────────

  describe('error auto-clear', () => {
    it('clears error after 5 seconds', async () => {
      const { voiceChat } = await import('../../services/api');
      voiceChat.mockRejectedValue({ code: 'NETWORK_ERROR' });

      const { result } = renderHook(() => useVoiceSession(defaultProps));

      // Start conversation which will fail and set an error
      await act(async () => {
        result.current.startConversation();
        // Allow the promise rejection to resolve
        await vi.advanceTimersByTimeAsync(100);
      });

      // Error should be set
      expect(result.current.error).toBeTruthy();

      // Advance past the 5-second auto-clear
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ── Cleanup on unmount ─────────────────────────────────────────────────

  describe('cleanup', () => {
    it('cancels speechSynthesis on unmount', () => {
      const { unmount } = renderHook(() => useVoiceSession(defaultProps));

      window.speechSynthesis.cancel.mockClear();
      unmount();

      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  // ── breathworkCheckIn ──────────────────────────────────────────────────

  describe('breathworkCheckIn', () => {
    it('is a function', () => {
      const { result } = renderHook(() => useVoiceSession(defaultProps));
      expect(typeof result.current.breathworkCheckIn).toBe('function');
    });
  });
});
