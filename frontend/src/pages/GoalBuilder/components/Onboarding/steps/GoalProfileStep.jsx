/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 * Licensed under the AGPLv3. See LICENSE file in the project root for details.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../../../../services/apiClient';
import styles from '../OnboardingFlow.module.css';

const PRIORITY_CYCLE = ['high', 'medium', 'low'];
const PRIORITY_LABELS = { high: 'H', medium: 'M', low: 'L' };
const PRIORITY_COLORS = { high: '#C9A84C', medium: '#5A9CF5', low: '#6B7280' };

export default function GoalProfileStep({ formData, updateFormData, nextStep, prevStep }) {
  const [domains, setDomains] = useState(
    formData.goalProfile?.domains || []
  );
  const [priorities, setPriorities] = useState(
    formData.goalProfile?.domain_priorities || {}
  );
  const [motivation, setMotivation] = useState(
    formData.goalProfile?.motivation || ''
  );
  const [newDomain, setNewDomain] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const hasClassified = useRef(false);

  useEffect(() => {
    if (domains.length === 0 && !hasClassified.current) {
      hasClassified.current = true;
      classifyGoal();
    }
  }, []);

  const classifyGoal = async () => {
    if (!formData.goal?.title) return;
    setIsClassifying(true);
    try {
      const result = await apiClient.post('/api/goals/classify-goal', {
        title: formData.goal.title,
        description: formData.goal.description || '',
      });
      const suggestedDomains = result.suggested_domains || [];
      setDomains(suggestedDomains);
      const defaultPriorities = {};
      suggestedDomains.forEach(d => { defaultPriorities[d] = 'medium'; });
      setPriorities(defaultPriorities);
      updateFormData({
        goalProfile: {
          ...formData.goalProfile,
          goal_type: result.goal_type,
          domains: suggestedDomains,
          domain_priorities: defaultPriorities,
        }
      });
    } catch (e) {
      console.warn('Classification failed, using defaults');
    } finally {
      setIsClassifying(false);
    }
  };

  const cyclePriority = (domain) => {
    const current = priorities[domain] || 'medium';
    const idx = PRIORITY_CYCLE.indexOf(current);
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
    const updated = { ...priorities, [domain]: next };
    setPriorities(updated);
    saveProfile(domains, updated, motivation);
  };

  const removeDomain = (domain) => {
    const updated = domains.filter(d => d !== domain);
    const updatedP = { ...priorities };
    delete updatedP[domain];
    setDomains(updated);
    setPriorities(updatedP);
    saveProfile(updated, updatedP, motivation);
  };

  const addDomain = () => {
    const trimmed = newDomain.trim();
    if (!trimmed || domains.includes(trimmed) || domains.length >= 6) return;
    const updated = [...domains, trimmed];
    const updatedP = { ...priorities, [trimmed]: 'medium' };
    setDomains(updated);
    setPriorities(updatedP);
    setNewDomain('');
    saveProfile(updated, updatedP, motivation);
  };

  const saveProfile = (d, p, m) => {
    updateFormData({
      goalProfile: {
        ...formData.goalProfile,
        domains: d,
        domain_priorities: p,
        motivation: m,
      }
    });
  };

  const highCount = Object.values(priorities).filter(p => p === 'high').length;
  const canProceed = domains.length >= 2;

  return (
    <div className={styles.stepContent}>
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className={styles.stepTitle}>Map your domains</div>
        <div className={styles.stepSubtitle}>
          These are the areas your journey will develop. Set priority to shape how deeply we profile each one.
        </div>

        <div className={styles.glassCard}>

          {/* Focus Domains */}
          <div style={{ marginBottom: 28 }}>
            <div style={labelStyle}>Focus Domains</div>

            {isClassifying ? (
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
                style={{
                  color: 'rgba(237,229,212,0.45)',
                  fontSize: '0.85rem',
                  marginTop: '0.75rem',
                  fontFamily: 'Raleway, sans-serif',
                  letterSpacing: '0.05em',
                }}
              >
                Analysing your goal...
              </motion.div>
            ) : (
              <AnimatePresence>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.75rem' }}>
                  {domains.map((domain, i) => (
                    <motion.div
                      key={domain}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '6px 10px 6px 12px',
                        background: 'rgba(237,229,212,0.04)',
                        border: '1px solid rgba(237,229,212,0.1)',
                        borderRadius: 8,
                        fontFamily: 'Raleway, sans-serif',
                        fontSize: 13,
                        color: '#EDE5D4',
                        fontWeight: 500,
                      }}
                    >
                      <span>{domain}</span>
                      {/* Priority badge — cycles H→M→L */}
                      <button
                        onClick={() => cyclePriority(domain)}
                        title="Click to change priority"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          border: `1px solid ${PRIORITY_COLORS[priorities[domain] || 'medium']}55`,
                          background: `${PRIORITY_COLORS[priorities[domain] || 'medium']}18`,
                          color: PRIORITY_COLORS[priorities[domain] || 'medium'],
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: 'Raleway, sans-serif',
                          letterSpacing: '0.05em',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.18s ease',
                          flexShrink: 0,
                        }}
                      >
                        {PRIORITY_LABELS[priorities[domain] || 'medium']}
                      </button>
                      {/* Remove button */}
                      <button
                        onClick={() => removeDomain(domain)}
                        aria-label="Remove domain"
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: 'none',
                          background: 'transparent',
                          color: 'rgba(237,229,212,0.3)',
                          fontSize: 14,
                          lineHeight: 1,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.15s',
                          flexShrink: 0,
                          padding: 0,
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'rgba(237,229,212,0.75)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(237,229,212,0.3)'}
                      >
                        ×
                      </button>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}

            {domains.length < 6 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <input
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: 'rgba(237,229,212,0.02)',
                    border: '1px solid rgba(237,229,212,0.1)',
                    borderRadius: 8,
                    color: '#EDE5D4',
                    fontSize: 13,
                    fontFamily: 'Raleway, sans-serif',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.35)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(237,229,212,0.1)'}
                  placeholder="Add a domain..."
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDomain()}
                />
                <button
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  onClick={addDomain}
                  style={{ padding: '10px 18px', minWidth: 'auto' }}
                >
                  Add
                </button>
              </div>
            )}

            <div style={{
              marginTop: '0.5rem',
              fontSize: 10,
              color: 'rgba(237,229,212,0.28)',
              fontFamily: 'Raleway, sans-serif',
              letterSpacing: '0.06em',
            }}>
              H = High (5 deep questions) · M = Medium (3) · L = Low (2 quick)
            </div>
          </div>

          {/* Feasibility warning */}
          <AnimatePresence>
            {highCount >= 4 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  overflow: 'hidden',
                  marginBottom: 24,
                }}
              >
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(201,168,76,0.06)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'Raleway, sans-serif',
                  color: 'rgba(237,229,212,0.65)',
                  lineHeight: 1.6,
                }}>
                  <span style={{ color: '#C9A84C' }}>⚠</span>{' '}
                  {highCount} high-priority domains is ambitious.
                  Consider setting some to Medium for a more achievable plan.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Motivation textarea */}
          <div>
            <div style={labelStyle}>What's driving you?</div>
            <textarea
              style={{
                width: '100%',
                padding: '13px 14px',
                background: 'rgba(237,229,212,0.02)',
                border: '1px solid rgba(237,229,212,0.1)',
                borderRadius: 8,
                color: '#EDE5D4',
                fontSize: 14,
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 400,
                lineHeight: 1.7,
                outline: 'none',
                resize: 'vertical',
                minHeight: 90,
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.35)'}
              onBlur={e => e.target.style.borderColor = 'rgba(237,229,212,0.1)'}
              placeholder="What does achieving this mean to you? Why now?"
              value={motivation}
              rows={3}
              onChange={e => {
                setMotivation(e.target.value);
                saveProfile(domains, priorities, e.target.value);
              }}
            />
          </div>

        </div>

        {/* Navigation */}
        <div className={styles.buttonContainer}>
          <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={prevStep}>
            Back
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={nextStep}
            disabled={!canProceed}
            style={{ opacity: canProceed ? 1 : 0.45, cursor: canProceed ? 'pointer' : 'not-allowed' }}
          >
            Start Profiling
          </button>
        </div>

      </motion.div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  fontFamily: 'Raleway, sans-serif',
  color: 'rgba(237,229,212,0.5)',
  marginBottom: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
};
