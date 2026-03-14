/**
 * OrbLayout.jsx
 * SVG-based layout system for orb + surrounding buttons with clipping
 * Invisible circle (360-380px) cuts buttons at cardinal positions
 * Orb glow bleeds into button edges
 */

import styles from "./OrbLayout.module.css";

const ORB_RADIUS = 160; // Center orb radius (320px diameter = 160px radius)
const CLIP_CIRCLE_RADIUS = 190; // Invisible clipping circle (slightly larger)
const CONTAINER_SIZE = 500; // SVG viewBox size (center at 250,250)
const CENTER = 250; // SVG center point

// Button positions (in SVG coordinates, relative to center)
const BUTTON_POSITIONS = {
  left: {
    x: CENTER - 300, // Far left
    y: CENTER,
    width: 80,
    height: 44,
    clipId: "leftButtonClip",
  },
  rightTop: {
    x: CENTER + 220, // Far right, upper
    y: CENTER - 80,
    width: 44,
    height: 44,
    clipId: "rightTopButtonClip",
  },
  rightTopBottom: {
    x: CENTER + 220, // Far right, directly below top button
    y: CENTER - 20,
    width: 44,
    height: 44,
    clipId: "rightTopBottomClip",
  },
  rightBottom: {
    x: CENTER + 220, // Far right, lower
    y: CENTER + 40,
    width: 80,
    height: 44,
    clipId: "rightBottomClip",
  },
};

export function OrbLayout({ children, width = "100%", height = "100%", viewBox = "0 0 500 500" }) {
  return (
    <div className={styles.orbLayoutWrapper}>
      {/* SVG for clipping and glow effects */}
      <svg
        className={styles.orbLayoutSvg}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ width, height }}
      >
        <defs>
          {/* Main glow filter */}
          <filter id="orbGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Invisible clipping circle (defines button cut boundaries) */}
          <circle id="clipCircle" cx={CENTER} cy={CENTER} r={CLIP_CIRCLE_RADIUS} />

          {/* Left button clip-path */}
          <clipPath id="leftButtonClip">
            <rect x={BUTTON_POSITIONS.left.x} y={BUTTON_POSITIONS.left.y - BUTTON_POSITIONS.left.height / 2} 
                  width={BUTTON_POSITIONS.left.width} height={BUTTON_POSITIONS.left.height} />
            <circle cx={CENTER} cy={CENTER} r={CLIP_CIRCLE_RADIUS} />
          </clipPath>

          {/* Right top button clip-path */}
          <clipPath id="rightTopButtonClip">
            <rect x={BUTTON_POSITIONS.rightTop.x} y={BUTTON_POSITIONS.rightTop.y} 
                  width={BUTTON_POSITIONS.rightTop.width} height={BUTTON_POSITIONS.rightTop.height} />
            <circle cx={CENTER} cy={CENTER} r={CLIP_CIRCLE_RADIUS} />
          </clipPath>

          {/* Right top-bottom button clip-path */}
          <clipPath id="rightTopBottomClip">
            <rect x={BUTTON_POSITIONS.rightTopBottom.x} y={BUTTON_POSITIONS.rightTopBottom.y} 
                  width={BUTTON_POSITIONS.rightTopBottom.width} height={BUTTON_POSITIONS.rightTopBottom.height} />
            <circle cx={CENTER} cy={CENTER} r={CLIP_CIRCLE_RADIUS} />
          </clipPath>

          {/* Right bottom buttons clip-path */}
          <clipPath id="rightBottomClip">
            <rect x={BUTTON_POSITIONS.rightBottom.x} y={BUTTON_POSITIONS.rightBottom.y} 
                  width={BUTTON_POSITIONS.rightBottom.width} height={BUTTON_POSITIONS.rightBottom.height} />
            <circle cx={CENTER} cy={CENTER} r={CLIP_CIRCLE_RADIUS} />
          </clipPath>

          {/* Soft vignette mask for button edges */}
          <radialGradient id="vignette" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.3" />
          </radialGradient>
        </defs>

        {/* Background glow circle (shows orb aura to edges) */}
        <circle cx={CENTER} cy={CENTER} r={CLIP_CIRCLE_RADIUS + 20} 
                fill="url(#vignette)" opacity="0.4" pointerEvents="none" />

        {/* Decorative ring showing clip boundary */}
        <circle cx={CENTER} cy={CENTER} r={CLIP_CIRCLE_RADIUS} 
                fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" pointerEvents="none" />
      </svg>

      {/* Absolute positioned button containers (rendered on top, clipped by CSS) */}
      {children}
    </div>
  );
}

export function OrbButton({ 
  position = "left", 
  children, 
  className = "", 
  onClick,
  ...props 
}) {
  const pos = BUTTON_POSITIONS[position];
  if (!pos) return null;

  return (
    <div
      className={`${styles.orbButton} ${styles[position]} ${className}`}
      style={{
        "--button-x": `${pos.x}px`,
        "--button-y": `${pos.y}px`,
        "--button-width": `${pos.width}px`,
        "--button-height": `${pos.height}px`,
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

// Export position constants for reference
export const OrbButtonPositions = BUTTON_POSITIONS;
export const OrbDimensions = {
  orbRadius: ORB_RADIUS,
  clipCircleRadius: CLIP_CIRCLE_RADIUS,
  containerSize: CONTAINER_SIZE,
  center: CENTER,
};
