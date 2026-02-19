import React, { useState } from "react";
import "./MiniEmotionGraph.css";
import {
  formatEmotionLabel,
  getEmotionColor,
  determineStability,
} from "../services/emotionService";
import { ArrowRightIcon } from "./Icons";

/**
 * MINI EMOTION GRAPH.
 * Compact visualization.
 */
export function MiniEmotionGraph({
  emotionData,
  isExpanded,
  onToggle,
  onViewFull,
  isLoading,
}) {
  const [isVisible, setIsVisible] = useState(true);

  const emotionFrequency = emotionData?.emotion_frequency;
  const hasEmotions =
    emotionFrequency && Object.keys(emotionFrequency).length > 0;

  let topEmotions = [];
  if (hasEmotions) {
    const total = Object.values(emotionFrequency).reduce((a, b) => a + b, 0);
    topEmotions = Object.entries(emotionFrequency)
      .map(([emotion, count]) => ({
        emotion,
        score: total > 0 ? count / total : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ emotion, score }) => ({
        emotion,
        score,
        label: formatEmotionLabel(emotion),
        color: getEmotionColor(emotion, score),
      }));
  }

  const stability = emotionData?.trend
    ? emotionData.trend
    : emotionData?.volatility != null
      ? determineStability(emotionData.volatility)
      : null;

  if (!isVisible) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="miniGraphContainer">
        <div className="graphHeader">
          <div className="graphHeaderLeft">
            <h3 className="graphTitle">Emotion Insights</h3>
          </div>
          <button
            className="closeButton"
            onClick={() => setIsVisible(false)}
            aria-label="Close emotion insights"
            title="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="graphContent loading">
          <div className="loadingBar" />
          <div className="loadingBar" style={{ width: "70%" }} />
          <div className="loadingBar" style={{ width: "80%" }} />
        </div>
      </div>
    );
  }

  if (!emotionData || !hasEmotions) {
    return (
      <div className="miniGraphContainer">
        <div className="graphHeader">
          <div className="graphHeaderLeft">
            <h3 className="graphTitle">Emotion Insights</h3>
          </div>
          <button
            className="closeButton"
            onClick={() => setIsVisible(false)}
            aria-label="Close emotion insights"
            title="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="emptyState">
          <p>Share more to see emotion insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="miniGraphContainer">
      <div className="graphHeader">
        <div className="graphHeaderLeft">
          <h3 className="graphTitle">Emotion Insights</h3>
          <button
            className={`toggleButton ${isExpanded ? "expanded" : "collapsed"}`}
            onClick={onToggle}
            aria-label={
              isExpanded
                ? "Collapse emotion insights"
                : "Expand emotion insights"
            }
            aria-expanded={isExpanded}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 2L12 8L6 14"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <button
          className="closeButton"
          onClick={() => setIsVisible(false)}
          aria-label="Close emotion insights"
          title="Close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="graphContent">
          <div className="emotionBars">
            {topEmotions.map(({ emotion, score, label, color }) => (
              <div key={emotion} className="emotionBar">
                <div className="barLabel">
                  <span className="emotionName">{label}</span>
                  <span className="emotionScore">
                    {Math.round(score * 100)}%
                  </span>
                </div>
                <div className="barContainer">
                  <div
                    className="barFill"
                    style={{
                      width: `${score * 100}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {stability && (
            <div className="stabilityIndicator">
              <span className="label">Stability:</span>
              <span className={`status ${stability.toLowerCase()}`}>
                {stability}
              </span>
            </div>
          )}

          <button className="viewFullBtn" onClick={onViewFull}>
            <span>Full Analysis</span>
            <ArrowRightIcon size={14} />
          </button>
        </div>
      )}

      {!isExpanded && emotionData && (
        <div className="collapsedPreview">
          <div className="previewBar">
            {topEmotions.slice(0, 1).map(({ emotion, score, color }) => (
              <div
                key={emotion}
                className="miniBar"
                style={{
                  flex: score,
                  backgroundColor: color,
                }}
                title={`${formatEmotionLabel(emotion)}: ${Math.round(score * 100)}%`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MiniEmotionGraph;
