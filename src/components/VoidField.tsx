"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  phase: number;
}

export default function VoidField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Spawn ~55 particles spread across the lower 55% of screen
    const particles: Particle[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * width,
      y: height * 0.45 + Math.random() * height * 0.55,
      size: Math.random() * 1.4 + 0.3,
      opacity: Math.random() * 0.18 + 0.04,
      speed: Math.random() * 0.00025 + 0.00008,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;

    const draw = () => {
      if (!ctx || !canvas) return;
      t += 1;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        const flicker = Math.sin(t * p.speed * 60 + p.phase) * 0.5 + 0.5;
        const currentOpacity = p.opacity * (0.5 + flicker * 0.5);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(180, 215, 255, ${currentOpacity})`;
        ctx!.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[3]"
      aria-hidden="true"
      style={{ opacity: 0.7 }}
    />
  );
}
