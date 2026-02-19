import { useEffect, useRef } from "react";

/**
 * WaterRipple Component.
 * Interactive canvas background.
 */
export function WaterRipple() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    const ripples = [];

    // Ripple class
    class Ripple {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 400;
        this.growthRate = 3;
        this.alpha = 0.8;
      }

      update() {
        this.radius += this.growthRate;
        this.alpha = Math.max(0, 0.8 * (1 - this.radius / this.maxRadius));
        return this.alpha > 0.01;
      }

      draw(ctx) {
        ctx.strokeStyle = `rgba(212, 175, 55, ${this.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Initialize canvas
    function init() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    // Animation loop
    function animate() {
      // Clear canvas with fade effect
      ctx.fillStyle = "rgba(5, 5, 5, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (ripples[i].update()) {
          ripples[i].draw(ctx);
        } else {
          ripples.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    }

    // Create ripple on mouse move
    function handleMouseMove(e) {
      ripples.push(new Ripple(e.clientX, e.clientY));
    }

    // Handle window resize
    function handleResize() {
      init();
    }

    init();
    animate();

    canvas.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}

export default WaterRipple;
