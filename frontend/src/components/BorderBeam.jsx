export function BorderBeam({
  size = 120,
  duration = 12,
  colorFrom = "rgba(197, 168, 124, 0)",
  colorTo = "rgba(197, 168, 124, 0.6)",
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "-1px",
          borderRadius: "inherit",
          background: `conic-gradient(from var(--beam-angle, 0deg), ${colorFrom}, ${colorTo}, ${colorFrom})`,
          animation: `beamRotate ${duration}s linear infinite`,
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "1px",
          borderRadius: "inherit",
          background: "inherit",
          zIndex: 1,
        }}
      />
    </div>
  );
}
