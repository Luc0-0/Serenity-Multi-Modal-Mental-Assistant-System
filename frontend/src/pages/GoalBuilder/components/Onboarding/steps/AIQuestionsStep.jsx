/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../OnboardingFlow.module.css";

const getSvgIcon = (iconType, size = 20) => {
  const iconMap = {
    sparkles: (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
    ),
    star: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    chevronDown: (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
    check: (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  };
  return iconMap[iconType] || iconMap.sparkles;
};

const CATEGORY_COLORS = {
  physical: "#E53E3E",
  mental: "#3182CE",
  lifestyle: "#38A169",
  preferences: "#9F7AEA",
};

export default function AIQuestionsStep({
  formData,
  updateFormData,
  nextStep,
  prevStep,
}) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [categories, setCategories] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showTooltip, setShowTooltip] = useState(null);

  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/goals/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          title: formData.goal.title,
          description: formData.goal.description,
          theme: formData.theme,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate questions");
      }

      const data = await response.json();
      setCategories(data.categories);
      setExpandedCategory(data.categories[0]?.id || "physical");
    } catch (error) {
      console.error("Failed to generate questions:", error);

      // Fallback to mock data
      const mockCategories = [
        {
          id: "physical",
          name: "Physical & Energy",
          icon: "💪",
          color: CATEGORY_COLORS.physical,
          description: "Optimize your physical routines and energy levels",
          questions: [
            {
              id: "wake_time",
              type: "radio",
              question: "What time can you realistically wake up every day?",
              options: [
                {
                  value: "05:00",
                  label: "5:00 AM - Early Bird",
                  recommended: false,
                },
                {
                  value: "06:30",
                  label: "6:30 AM - Balanced",
                  recommended: true,
                  reason: "Most sustainable for your goal type",
                },
                {
                  value: "08:00",
                  label: "8:00 AM - Flexible",
                  recommended: false,
                },
                {
                  value: "09:00",
                  label: "9:00 AM - Late Start",
                  recommended: false,
                },
              ],
            },
            {
              id: "exercise_frequency",
              type: "radio",
              question: "How many days per week can you commit to exercise?",
              options: [
                {
                  value: "3",
                  label: "3 days/week - Light",
                  recommended: false,
                },
                {
                  value: "5",
                  label: "5 days/week - Moderate",
                  recommended: true,
                  reason: "Optimal for building consistent habits",
                },
                {
                  value: "6",
                  label: "6 days/week - Intense",
                  recommended: false,
                },
                {
                  value: "7",
                  label: "7 days/week - Daily",
                  recommended: false,
                },
              ],
            },
            {
              id: "meal_prep",
              type: "checkbox",
              question: "Which meal prep strategies can you implement?",
              options: [
                {
                  value: "sunday_batch",
                  label: "Sunday batch cooking",
                  recommended: true,
                  reason: "Saves time during weekdays",
                },
                {
                  value: "meal_service",
                  label: "Meal delivery service",
                  recommended: false,
                },
                {
                  value: "daily_cooking",
                  label: "Daily fresh cooking",
                  recommended: false,
                },
                {
                  value: "intermittent_fasting",
                  label: "Intermittent fasting schedule",
                  recommended: false,
                },
              ],
            },
          ],
        },
        {
          id: "mental",
          name: "Mental & Focus",
          icon: "🧠",
          color: CATEGORY_COLORS.mental,
          description: "Understand your focus patterns and cognitive peaks",
          questions: [
            {
              id: "focus_time",
              type: "radio",
              question: "When do you experience peak mental clarity?",
              options: [
                {
                  value: "morning",
                  label: "Morning (6AM-12PM)",
                  recommended: true,
                  reason: "Aligns with your early wake time",
                },
                {
                  value: "afternoon",
                  label: "Afternoon (12PM-6PM)",
                  recommended: false,
                },
                {
                  value: "evening",
                  label: "Evening (6PM-12AM)",
                  recommended: false,
                },
                {
                  value: "night",
                  label: "Late Night (12AM+)",
                  recommended: false,
                },
              ],
            },
            {
              id: "deep_work_duration",
              type: "slider",
              question: "Maximum focused work duration (without break)?",
              min: 30,
              max: 180,
              step: 15,
              unit: "minutes",
              defaultValue: 90,
              recommended: 90,
              reason: "Research shows 90min optimal for deep work",
            },
            {
              id: "distractions",
              type: "checkbox",
              question: "Which distractions do you struggle with most?",
              options: [
                {
                  value: "social_media",
                  label: "Social media scrolling",
                  recommended: false,
                },
                {
                  value: "notifications",
                  label: "Phone notifications",
                  recommended: false,
                },
                {
                  value: "multitasking",
                  label: "Switching between tasks",
                  recommended: false,
                },
                {
                  value: "environment",
                  label: "Noisy environment",
                  recommended: false,
                },
              ],
            },
          ],
        },
        {
          id: "lifestyle",
          name: "Lifestyle & Constraints",
          icon: "🏡",
          color: CATEGORY_COLORS.lifestyle,
          description: "Map your obligations and available resources",
          questions: [
            {
              id: "work_schedule",
              type: "radio",
              question: "What's your primary work/study schedule?",
              options: [
                {
                  value: "full_time_9to5",
                  label: "9-5 Full-time job",
                  recommended: false,
                },
                {
                  value: "flexible",
                  label: "Flexible hours",
                  recommended: true,
                  reason: "Allows schedule optimization",
                },
                {
                  value: "student",
                  label: "Student schedule",
                  recommended: false,
                },
                {
                  value: "shift_work",
                  label: "Shift work/irregular",
                  recommended: false,
                },
              ],
            },
            {
              id: "available_resources",
              type: "checkbox",
              question: "What resources do you have access to?",
              options: [
                { value: "gym", label: "Gym membership", recommended: false },
                {
                  value: "home_equipment",
                  label: "Home workout equipment",
                  recommended: false,
                },
                {
                  value: "quiet_space",
                  label: "Quiet workspace",
                  recommended: true,
                  reason: "Essential for focus work",
                },
                {
                  value: "accountability_partner",
                  label: "Accountability partner",
                  recommended: false,
                },
              ],
            },
            {
              id: "sleep_target",
              type: "time",
              question: "What time do you need to sleep to get 7-8 hours?",
              defaultValue: "22:30",
              recommended: "22:30",
              reason: "Ensures quality rest for 6:30 AM wake time",
            },
          ],
        },
        {
          id: "preferences",
          name: "Preferences & Approach",
          icon: "⚡",
          color: CATEGORY_COLORS.preferences,
          description: "Customize your journey style and tracking",
          questions: [
            {
              id: "intensity",
              type: "slider",
              question:
                "How intense should your schedule be? (1=gentle, 10=extreme)",
              min: 1,
              max: 10,
              step: 1,
              unit: "intensity",
              defaultValue: 6,
              recommended: 6,
              reason: "Sustainable intensity for long-term consistency",
            },
            {
              id: "tracking_style",
              type: "radio",
              question: "How detailed should your daily tracking be?",
              options: [
                {
                  value: "minimal",
                  label: "Minimal - Just completion checkboxes",
                  recommended: false,
                },
                {
                  value: "moderate",
                  label: "Moderate - Time + completion",
                  recommended: true,
                  reason: "Balance between detail and effort",
                },
                {
                  value: "detailed",
                  label: "Detailed - Full journaling + metrics",
                  recommended: false,
                },
              ],
            },
            {
              id: "gamification",
              type: "checkbox",
              question: "Which motivational features appeal to you?",
              options: [
                {
                  value: "streaks",
                  label: "Streak tracking",
                  recommended: true,
                  reason: "Proven to boost consistency",
                },
                {
                  value: "badges",
                  label: "Achievement badges",
                  recommended: false,
                },
                {
                  value: "leaderboard",
                  label: "Competitive leaderboard",
                  recommended: false,
                },
                {
                  value: "rewards",
                  label: "Milestone rewards",
                  recommended: false,
                },
              ],
            },
          ],
        },
      ];

      setCategories(mockCategories);
      setExpandedCategory("physical");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerChange = (
    categoryId,
    questionId,
    value,
    multiSelect = false,
  ) => {
    setAnswers((prev) => {
      const categoryAnswers = prev[categoryId] || {};

      if (multiSelect) {
        const currentValues = categoryAnswers[questionId] || [];
        const newValues = currentValues.includes(value)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value];

        return {
          ...prev,
          [categoryId]: { ...categoryAnswers, [questionId]: newValues },
        };
      }

      return {
        ...prev,
        [categoryId]: { ...categoryAnswers, [questionId]: value },
      };
    });
  };

  const getTotalQuestions = () => {
    return categories.reduce((sum, cat) => sum + cat.questions.length, 0);
  };

  const getAnsweredQuestions = () => {
    return Object.values(answers).reduce((sum, catAnswers) => {
      return (
        sum +
        Object.keys(catAnswers).filter((k) => {
          const val = catAnswers[k];
          return Array.isArray(val)
            ? val.length > 0
            : val !== undefined && val !== "";
        }).length
      );
    }, 0);
  };

  const canProceed = () => {
    const total = getTotalQuestions();
    const answered = getAnsweredQuestions();
    return answered >= total * 0.75; // Require 75% completion
  };

  const handleComplete = () => {
    updateFormData({
      aiQuestions: {
        categories: categories,
        answers: answers,
      },
    });
    nextStep();
  };

  if (isGenerating) {
    return (
      <div className={styles.stepContent}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center" }}
        >
          <motion.div
            style={{
              display: "inline-flex",
              marginBottom: 32,
              color: "#C8A96E",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            {getSvgIcon("sparkles", 56)}
          </motion.div>

          <motion.div
            className={styles.stepTitle}
            style={{ fontSize: "clamp(28px, 5vw, 44px)", marginBottom: 20 }}
          >
            Crafting Your Path
          </motion.div>

          <motion.div
            className={styles.stepSubtitle}
            style={{ fontSize: 16, marginBottom: 0 }}
          >
            AI is analyzing your goal to create personalized questions for your
            transformation journey...
          </motion.div>

          <motion.div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginTop: 48,
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "rgba(200, 169, 110, 0.4)",
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const totalQuestions = getTotalQuestions();
  const answeredQuestions = getAnsweredQuestions();
  const progress = (answeredQuestions / totalQuestions) * 100;

  return (
    <div className={styles.stepContent} style={{ maxWidth: 800 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: 32 }}
      >
        <div
          className={styles.stepTitle}
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            textAlign: "left",
            marginBottom: 12,
          }}
        >
          Personalize Your Journey
        </div>
        <div
          className={styles.stepSubtitle}
          style={{ textAlign: "left", marginBottom: 24 }}
        >
          Answer these questions so AI can craft your perfect schedule
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(245, 240, 232, 0.7)" }}>
              Progress
            </span>
            <span style={{ fontSize: 12, color: "#C8A96E", fontWeight: 600 }}>
              {answeredQuestions}/{totalQuestions} questions
            </span>
          </div>
          <div
            style={{
              height: 4,
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <motion.div
              style={{
                height: "100%",
                background:
                  "linear-gradient(90deg, rgba(200, 169, 110, 0.9), rgba(200, 169, 110, 1))",
                borderRadius: 2,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Category Cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {categories.map((category, catIndex) => {
          const isExpanded = expandedCategory === category.id;
          const catAnswers = answers[category.id] || {};
          const catAnswered = Object.keys(catAnswers).filter((k) => {
            const val = catAnswers[k];
            return Array.isArray(val)
              ? val.length > 0
              : val !== undefined && val !== "";
          }).length;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * catIndex, duration: 0.4 }}
              style={{
                background: "rgba(15, 15, 20, 0.4)",
                border: `1px solid ${isExpanded ? category.color + "40" : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: 20,
                overflow: "hidden",
                transition: "all 0.3s ease",
              }}
            >
              {/* Category Header */}
              <button
                onClick={() =>
                  setExpandedCategory(isExpanded ? null : category.id)
                }
                style={{
                  width: "100%",
                  padding: "20px 24px",
                  background: "none",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: category.color + "15",
                      border: `1px solid ${category.color}40`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                    }}
                  >
                    {category.icon}
                  </div>
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#F5F0E8",
                        marginBottom: 4,
                      }}
                    >
                      {category.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(245, 240, 232, 0.6)",
                      }}
                    >
                      {category.description}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: category.color,
                      }}
                    >
                      {catAnswered}/{category.questions.length}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(245, 240, 232, 0.5)",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      answered
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ color: "rgba(245, 240, 232, 0.5)" }}
                  >
                    {getSvgIcon("chevronDown", 20)}
                  </motion.div>
                </div>
              </button>

              {/* Questions */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      borderTop: `1px solid ${category.color}20`,
                      padding: "0 24px",
                    }}
                  >
                    {category.questions.map((question, qIndex) => (
                      <QuestionRenderer
                        key={question.id}
                        question={question}
                        categoryId={category.id}
                        categoryColor={category.color}
                        value={catAnswers[question.id]}
                        onChange={(value, multiSelect) =>
                          handleAnswerChange(
                            category.id,
                            question.id,
                            value,
                            multiSelect,
                          )
                        }
                        showTooltip={showTooltip}
                        setShowTooltip={setShowTooltip}
                        isLast={qIndex === category.questions.length - 1}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Navigation */}
      <motion.div
        className={styles.buttonContainer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={prevStep}
        >
          ← Back
        </button>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleComplete}
          disabled={!canProceed()}
          style={{
            opacity: canProceed() ? 1 : 0.4,
            cursor: canProceed() ? "pointer" : "not-allowed",
          }}
        >
          Generate My Plan →
        </button>
      </motion.div>
    </div>
  );
}

// Question Renderer Component
function QuestionRenderer({
  question,
  categoryId,
  categoryColor,
  value,
  onChange,
  showTooltip,
  setShowTooltip,
  isLast,
}) {
  const renderOptions = () => {
    switch (question.type) {
      case "radio":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {question.options.map((option) => {
              const isSelected = value === option.value;
              return (
                <motion.button
                  key={option.value}
                  onClick={() => onChange(option.value)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  style={{
                    padding: "14px 18px",
                    background: isSelected
                      ? `${categoryColor}15`
                      : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${isSelected ? categoryColor + "60" : "rgba(255, 255, 255, 0.08)"}`,
                    borderRadius: 12,
                    color: "#F5F0E8",
                    fontSize: 14,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.2s ease",
                    textAlign: "left",
                  }}
                >
                  <span>{option.label}</span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {option.recommended && (
                      <div
                        style={{ position: "relative" }}
                        onMouseEnter={() =>
                          setShowTooltip(
                            `${categoryId}-${question.id}-${option.value}`,
                          )
                        }
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        <div style={{ color: "#FCD34D", display: "flex" }}>
                          {getSvgIcon("star", 16)}
                        </div>
                        {showTooltip ===
                          `${categoryId}-${question.id}-${option.value}` && (
                          <div
                            style={{
                              position: "absolute",
                              right: 0,
                              bottom: "100%",
                              marginBottom: 8,
                              padding: "8px 12px",
                              background: "rgba(10, 10, 15, 0.95)",
                              border: "1px solid rgba(252, 211, 77, 0.3)",
                              borderRadius: 8,
                              fontSize: 12,
                              color: "#FCD34D",
                              whiteSpace: "nowrap",
                              zIndex: 100,
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                            }}
                          >
                            AI Pick: {option.reason}
                          </div>
                        )}
                      </div>
                    )}
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: `2px solid ${isSelected ? categoryColor : "rgba(255, 255, 255, 0.2)"}`,
                        background: isSelected ? categoryColor : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {isSelected && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#0A0A0F",
                          }}
                        />
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        );

      case "checkbox":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {question.options.map((option) => {
              const selectedValues = value || [];
              const isSelected = selectedValues.includes(option.value);

              return (
                <motion.button
                  key={option.value}
                  onClick={() => onChange(option.value, true)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  style={{
                    padding: "14px 18px",
                    background: isSelected
                      ? `${categoryColor}15`
                      : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${isSelected ? categoryColor + "60" : "rgba(255, 255, 255, 0.08)"}`,
                    borderRadius: 12,
                    color: "#F5F0E8",
                    fontSize: 14,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.2s ease",
                    textAlign: "left",
                  }}
                >
                  <span>{option.label}</span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {option.recommended && (
                      <div
                        style={{ position: "relative" }}
                        onMouseEnter={() =>
                          setShowTooltip(
                            `${categoryId}-${question.id}-${option.value}`,
                          )
                        }
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        <div style={{ color: "#FCD34D", display: "flex" }}>
                          {getSvgIcon("star", 16)}
                        </div>
                        {showTooltip ===
                          `${categoryId}-${question.id}-${option.value}` && (
                          <div
                            style={{
                              position: "absolute",
                              right: 0,
                              bottom: "100%",
                              marginBottom: 8,
                              padding: "8px 12px",
                              background: "rgba(10, 10, 15, 0.95)",
                              border: "1px solid rgba(252, 211, 77, 0.3)",
                              borderRadius: 8,
                              fontSize: 12,
                              color: "#FCD34D",
                              whiteSpace: "nowrap",
                              zIndex: 100,
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                            }}
                          >
                            AI Pick: {option.reason}
                          </div>
                        )}
                      </div>
                    )}
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        border: `2px solid ${isSelected ? categoryColor : "rgba(255, 255, 255, 0.2)"}`,
                        background: isSelected ? categoryColor : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#0A0A0F",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {isSelected && getSvgIcon("check", 14)}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        );

      case "slider":
        const sliderValue = value !== undefined ? value : question.defaultValue;
        return (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 14, color: "rgba(245, 240, 232, 0.7)" }}>
                {question.min} {question.unit}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: categoryColor,
                  }}
                >
                  {sliderValue} {question.unit}
                </span>
                {question.recommended === sliderValue && (
                  <div
                    style={{ position: "relative" }}
                    onMouseEnter={() =>
                      setShowTooltip(`${categoryId}-${question.id}-slider`)
                    }
                    onMouseLeave={() => setShowTooltip(null)}
                  >
                    <div style={{ color: "#FCD34D", display: "flex" }}>
                      {getSvgIcon("star", 16)}
                    </div>
                    {showTooltip === `${categoryId}-${question.id}-slider` && (
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          bottom: "100%",
                          marginBottom: 8,
                          padding: "8px 12px",
                          background: "rgba(10, 10, 15, 0.95)",
                          border: "1px solid rgba(252, 211, 77, 0.3)",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "#FCD34D",
                          whiteSpace: "nowrap",
                          zIndex: 100,
                        }}
                      >
                        AI Pick: {question.reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 14, color: "rgba(245, 240, 232, 0.7)" }}>
                {question.max} {question.unit}
              </span>
            </div>
            <input
              type="range"
              min={question.min}
              max={question.max}
              step={question.step}
              value={sliderValue}
              onChange={(e) => onChange(parseInt(e.target.value))}
              style={{
                width: "100%",
                height: 6,
                borderRadius: 3,
                background: `linear-gradient(to right, ${categoryColor} 0%, ${categoryColor} ${((sliderValue - question.min) / (question.max - question.min)) * 100}%, rgba(255, 255, 255, 0.1) ${((sliderValue - question.min) / (question.max - question.min)) * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                outline: "none",
                appearance: "none",
                WebkitAppearance: "none",
                cursor: "pointer",
              }}
            />
          </div>
        );

      case "time":
        const timeValue = value || question.defaultValue;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => onChange(e.target.value)}
              style={{
                flex: 1,
                padding: "14px 18px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                color: "#F5F0E8",
                fontSize: 16,
                fontFamily: "inherit",
                outline: "none",
                cursor: "pointer",
              }}
            />
            {question.recommended === timeValue && (
              <div
                style={{ position: "relative" }}
                onMouseEnter={() =>
                  setShowTooltip(`${categoryId}-${question.id}-time`)
                }
                onMouseLeave={() => setShowTooltip(null)}
              >
                <div style={{ color: "#FCD34D", display: "flex" }}>
                  {getSvgIcon("star", 20)}
                </div>
                {showTooltip === `${categoryId}-${question.id}-time` && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      bottom: "100%",
                      marginBottom: 8,
                      padding: "8px 12px",
                      background: "rgba(10, 10, 15, 0.95)",
                      border: "1px solid rgba(252, 211, 77, 0.3)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#FCD34D",
                      whiteSpace: "nowrap",
                      zIndex: 100,
                    }}
                  >
                    AI Pick: {question.reason}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        padding: "24px 0",
        borderBottom: isLast ? "none" : "1px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#F5F0E8",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        {question.question}
      </div>
      {renderOptions()}
    </div>
  );
}
