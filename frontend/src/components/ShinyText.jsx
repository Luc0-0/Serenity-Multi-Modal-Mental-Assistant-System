export function ShinyText({ children, style = {} }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: `linear-gradient(
          120deg,
          rgba(240, 235, 225, 0.7) 0%,
          rgba(240, 235, 225, 0.7) 35%,
          rgba(197, 168, 124, 1) 47%,
          rgba(220, 200, 160, 1) 50%,
          rgba(197, 168, 124, 1) 53%,
          rgba(240, 235, 225, 0.7) 65%,
          rgba(240, 235, 225, 0.7) 100%
        )`,
        backgroundSize: "300% auto",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
        animation: "shineMove 4s ease-in-out infinite",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
