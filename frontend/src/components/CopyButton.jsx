import { Check, Copy, LoaderCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useState } from "react";

export function CopyButton({ text }) {
  const [state, setState] = useState("idle");
  const shouldReduceMotion = useReducedMotion();

  const handleCopy = useCallback(async () => {
    setState("loading");
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error("Copy failed", e);
    }
    setTimeout(() => setState("success"), 600);
    setTimeout(() => setState("idle"), 2600);
  }, [text]);

  const icons = {
    idle: <Copy size={13} />,
    loading: <LoaderCircle size={13} style={{ animation: "spin 1s linear infinite" }} />,
    success: <Check size={13} />,
  };

  const labels = { idle: "Copy", loading: "Copying...", success: "Copied!" };

  return (
    <button
      onClick={handleCopy}
      disabled={state !== "idle"}
      aria-label={labels[state]}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.25rem 0.5rem",
        background: state === "success"
          ? "rgba(35, 28, 22, 0.08)"
          : "rgba(35, 28, 22, 0.05)",
        border: `1px solid ${state === "success" ? "rgba(35, 28, 22, 0.2)" : "rgba(35, 28, 22, 0.1)"}`,
        borderRadius: "5px",
        cursor: state === "idle" ? "pointer" : "default",
        color: state === "success" ? "rgba(35, 28, 22, 0.7)" : "rgba(35, 28, 22, 0.45)",
        fontSize: "0.65rem",
        letterSpacing: "0.04em",
        transition: "all 0.25s ease",
        backdropFilter: "blur(4px)",
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={state}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
        >
          {icons[state]}
          {labels[state]}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
