/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../OnboardingFlow.module.css';

const getSvgIcon = (iconType, size = 20) => {
  const iconMap = {
    microphone: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="8" y1="22" x2="16" y2="22"/>
      </svg>
    ),
    sparkles: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
        <path d="M20 3v4"/>
        <path d="M22 5h-4"/>
        <path d="M4 17v2"/>
        <path d="M5 18H3"/>
      </svg>
    )
  };
  return iconMap[iconType] || iconMap.sparkles;
};

export default function AIQuestionsStep({ formData, updateFormData, nextStep, prevStep }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const [questions, setQuestions] = useState([]);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    // Check for Web Speech API support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setHasVoiceSupport(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          const currentAnswer = answers[currentQuestionIndex] || '';
          setAnswers({
            ...answers,
            [currentQuestionIndex]: currentAnswer + ' ' + finalTranscript.trim()
          });
        }
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    // Generate personalized questions
    generateQuestions();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const generateQuestions = async () => {
    setIsGenerating(true);

    try {
      // TODO: Call backend API to generate questions
      // For now, using mock questions
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockQuestions = [
        {
          category: 'Lifestyle',
          question: "What does your typical daily routine look like right now?",
          placeholder: "Describe your current morning routine, work schedule, evening activities..."
        },
        {
          category: 'Energy & Focus',
          question: "When do you feel most energized and focused during the day?",
          placeholder: "e.g., Early morning, late night, after exercise..."
        },
        {
          category: 'Challenges',
          question: "What obstacles have prevented you from achieving similar goals in the past?",
          placeholder: "Be honest about what held you back before..."
        },
        {
          category: 'Support System',
          question: "What resources, people, or tools do you have available to support this journey?",
          placeholder: "e.g., Gym membership, supportive friends, flexible schedule..."
        }
      ];

      setQuestions(mockQuestions);
    } catch (error) {
      console.error('Failed to generate questions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const startVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  };

  const handleAnswerChange = (value) => {
    setAnswers({
      ...answers,
      [currentQuestionIndex]: value
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered, save and proceed
      updateFormData({
        aiQuestions: {
          questions: questions,
          answers: answers
        }
      });
      nextStep();
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      prevStep();
    }
  };

  const currentAnswer = answers[currentQuestionIndex] || '';
  const canProceed = currentAnswer.trim().length > 10;
  const currentQuestion = questions[currentQuestionIndex];

  if (isGenerating) {
    return (
      <div className={styles.stepContent}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center' }}
        >
          {/* AI generation animation */}
          <motion.div
            style={{
              display: 'inline-flex',
              marginBottom: 32,
              color: '#C8A96E',
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {getSvgIcon('sparkles', 48)}
          </motion.div>

          <motion.div
            className={styles.stepTitle}
            style={{ fontSize: 'clamp(28px, 5vw, 42px)', marginBottom: 20 }}
          >
            Crafting Your Personalized Questions
          </motion.div>

          <motion.div
            className={styles.stepSubtitle}
            style={{ fontSize: 16, marginBottom: 0 }}
          >
            AI is analyzing your goal to ask the right questions
            for a truly personalized experience...
          </motion.div>

          {/* Animated dots */}
          <motion.div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              marginTop: 40,
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'rgba(200, 169, 110, 0.4)',
                }}
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.stepContent}>
      {/* Background orbs */}
      <motion.div
        style={{
          position: 'absolute',
          top: '15%',
          left: '5%',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200, 169, 110, 0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
          zIndex: -1,
        }}
        animate={{
          x: [0, 20, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -50, scale: 0.95 }}
          transition={{
            duration: 0.5,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          {/* Category badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              background: 'rgba(200, 169, 110, 0.1)',
              border: '1px solid rgba(200, 169, 110, 0.2)',
              borderRadius: 20,
              marginBottom: 28,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: 'rgba(200, 169, 110, 0.9)',
            }}
          >
            <span style={{ display: 'flex', color: 'inherit' }}>
              {getSvgIcon('sparkles', 14)}
            </span>
            {currentQuestion?.category} • {currentQuestionIndex + 1}/{questions.length}
          </motion.div>

          {/* Question */}
          <motion.div
            className={styles.stepTitle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: 'clamp(24px, 5vw, 38px)',
              textAlign: 'left',
              marginBottom: 48,
            }}
          >
            {currentQuestion?.question}
          </motion.div>

          {/* Answer card */}
          <motion.div
            className={styles.glassCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ textAlign: 'left' }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <label style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(245, 240, 232, 0.8)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>
                Your Answer
              </label>

              {hasVoiceSupport && (
                <motion.button
                  type="button"
                  onClick={isListening ? stopVoiceInput : startVoiceInput}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    background: isListening
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(200, 169, 110, 0.15)',
                    border: `1px solid ${isListening
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(200, 169, 110, 0.3)'}`,
                    borderRadius: 10,
                    color: isListening ? '#EF4444' : '#C8A96E',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isListening ? (
                    <>
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        style={{ display: 'flex', color: 'inherit' }}
                      >
                        {getSvgIcon('microphone', 14)}
                      </motion.span>
                      Listening...
                    </>
                  ) : (
                    <>
                      <span style={{ display: 'flex', color: 'inherit' }}>
                        {getSvgIcon('microphone', 14)}
                      </span>
                      Voice Input
                    </>
                  )}
                </motion.button>
              )}
            </div>

            <textarea
              ref={textareaRef}
              placeholder={currentQuestion?.placeholder}
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              rows={5}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                color: '#F5F0E8',
                fontSize: 15,
                fontFamily: 'inherit',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
                transition: 'all 0.3s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(200, 169, 110, 0.4)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.boxShadow = '0 0 0 3px rgba(200, 169, 110, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                e.target.style.boxShadow = 'none';
              }}
            />

            {/* Character count hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: currentAnswer.length > 0 ? 1 : 0 }}
              style={{
                marginTop: 12,
                fontSize: 12,
                color: currentAnswer.length > 10
                  ? 'rgba(110, 231, 183, 0.7)'
                  : 'rgba(245, 240, 232, 0.4)',
                textAlign: 'right',
              }}
            >
              {currentAnswer.length} characters
              {currentAnswer.length < 10 && ' (minimum 10)'}
            </motion.div>
          </motion.div>

          {/* Navigation */}
          <motion.div
            className={styles.buttonContainer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={handleBack}
            >
              ← Back
            </button>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={handleNext}
              disabled={!canProceed}
              style={{
                opacity: canProceed ? 1 : 0.4,
                cursor: canProceed ? 'pointer' : 'not-allowed',
              }}
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete'} →
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <motion.div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          marginTop: 48,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {questions.map((_, index) => (
          <motion.div
            key={index}
            style={{
              width: index === currentQuestionIndex ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background:
                index < currentQuestionIndex
                  ? 'rgba(110, 231, 183, 0.6)'
                  : index === currentQuestionIndex
                  ? 'rgba(200, 169, 110, 0.8)'
                  : 'rgba(200, 169, 110, 0.2)',
              transition: 'all 0.3s ease',
            }}
            animate={
              index === currentQuestionIndex
                ? {
                    boxShadow: [
                      '0 0 0 rgba(200, 169, 110, 0.5)',
                      '0 0 12px rgba(200, 169, 110, 0.5)',
                      '0 0 0 rgba(200, 169, 110, 0.5)',
                    ],
                  }
                : {}
            }
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
