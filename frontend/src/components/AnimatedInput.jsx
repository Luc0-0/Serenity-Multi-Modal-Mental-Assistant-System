import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

export function AnimatedInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  disabled = false,
  style = {},
  inputStyle = {},
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isFloating = !!value || isFocused;
  const shouldReduceMotion = useReducedMotion();
  const id = `input-${label.toLowerCase().replace(/\s/g, "-")}`;

  return (
    <div style={{ position: "relative", width: "100%", ...style }}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={isFloating ? placeholder : ""}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          width: "100%",
          padding: "0.9rem 1rem 0.5rem",
          background: "rgba(255, 255, 255, 0.04)",
          border: `1px solid ${isFocused ? "rgba(197, 168, 124, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
          borderRadius: "8px",
          color: "rgba(240, 235, 225, 0.9)",
          fontSize: "0.95rem",
          outline: "none",
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
          boxShadow: isFocused ? "0 0 0 3px rgba(197, 168, 124, 0.08), inset 0 1px 3px rgba(0,0,0,0.2)" : "inset 0 1px 3px rgba(0,0,0,0.2)",
          backdropFilter: "blur(8px)",
          fontFamily: "inherit",
          boxSizing: "border-box",
          ...inputStyle,
        }}
      />
      <motion.label
        htmlFor={id}
        animate={shouldReduceMotion ? {} : {
          y: isFloating ? -22 : 0,
          scale: isFloating ? 0.78 : 1,
          color: isFloating
            ? "rgba(197, 168, 124, 0.9)"
            : "rgba(240, 235, 225, 0.4)",
        }}
        initial={false}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: "absolute",
          left: "1rem",
          top: "50%",
          transform: "translateY(-50%)",
          transformOrigin: "left center",
          pointerEvents: "none",
          fontSize: "0.9rem",
          letterSpacing: "0.03em",
          fontFamily: "inherit",
          zIndex: 2,
          background: isFloating ? "transparent" : "transparent",
          padding: "0 0.2rem",
        }}
      >
        {label}
      </motion.label>
    </div>
  );
}
