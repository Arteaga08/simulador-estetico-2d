"use client";

import { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import Navbar from "@/components/landing/Navbar";

function VideoPlaceholder() {
  return (
    <div
      className="rounded-2xl w-full overflow-hidden relative"
      style={{
        background: "#0A1628",
        aspectRatio: "16 / 9",
        boxShadow:
          "0 0 0 1px rgba(79,172,254,0.18), 0 0 60px rgba(79,172,254,0.12), 0 40px 100px rgba(10,22,40,0.60)",
      }}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(102,126,234,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(102,126,234,0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Simulated UI in background — blurred */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: 0.12 }}
      >
        <div className="w-4/5 h-3/5 rounded-xl" style={{ background: "rgba(79,172,254,0.3)" }} />
      </div>

      {/* Center — play button */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
        <div
          className="flex items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 cursor-pointer"
          style={{
            width: 72,
            height: 72,
            background: "rgba(79,172,254,0.15)",
            border: "1px solid rgba(79,172,254,0.40)",
            backdropFilter: "blur(8px)",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M6 4l14 8-14 8V4z" fill="rgba(79,172,254,0.95)" />
          </svg>
        </div>
        <div className="text-center">
          <p
            className="text-[14px] font-semibold mb-1"
            style={{ color: "rgba(255,255,255,0.80)" }}
          >
            Ver simulación en acción
          </p>
          <p
            className="text-[12px]"
            style={{ color: "rgba(79,172,254,0.60)" }}
          >
            Rinoplastia · 12 segundos
          </p>
        </div>
      </div>

      {/* Bottom bar — scrubber */}
      <div
        className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-10"
        style={{
          background:
            "linear-gradient(to top, rgba(10,22,40,0.85) 0%, transparent 100%)",
        }}
      >
        {/* Progress bar */}
        <div
          className="w-full h-0.75 rounded-full mb-3"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          <div
            className="h-full rounded-full relative"
            style={{ width: "34%", background: "#4FACFE" }}
          >
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{ background: "#fff", boxShadow: "0 0 6px rgba(79,172,254,0.8)" }}
            />
          </div>
        </div>

        {/* Time + label */}
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-medium tabular-nums"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            0:04 / 0:12
          </span>
          <span
            className="text-[11px] font-semibold tracking-wide uppercase"
            style={{ color: "rgba(79,172,254,0.55)" }}
          >
            Demo · Rinoplastia
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const bgRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.scrollY;

          if (bgRef.current) {
            const rect = bgRef.current.getBoundingClientRect();
            const edgeFromBottom = window.innerHeight - rect.bottom;
            const entryDepth = Math.max(0, edgeFromBottom);
            const curveY = Math.max(120 * (1 - entryDepth / 220), 0);
            bgRef.current.style.borderBottomLeftRadius = `50% ${curveY}px`;
            bgRef.current.style.borderBottomRightRadius = `50% ${curveY}px`;
          }

          if (glowRef.current) {
            const opacity = Math.max(1 - scrolled / 400, 0);
            glowRef.current.style.opacity = opacity.toString();
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="relative overflow-x-clip flex flex-col bg-white">
      {/* Fondo animado — Cortina Cóncava */}
      <div
        ref={bgRef}
        className="absolute inset-x-0 top-0 pointer-events-none overflow-hidden origin-top"
        style={{
          bottom: "0",
          background:
            "linear-gradient(160deg, #5B9CF6 0%, #667EEA 35%, #3730A3 65%, #1E1B4B 85%, #0A1628 100%)",
          borderBottomLeftRadius: "50% 120px",
          borderBottomRightRadius: "50% 120px",
          transition:
            "border-bottom-left-radius 60ms ease-out, border-bottom-right-radius 60ms ease-out",
          zIndex: 0,
        }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: 0.05,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 45% at 50% 38%, rgba(79,172,254,0.28) 0%, rgba(102,126,234,0.18) 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "600px",
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(120,200,255,0.18) 0%, transparent 65%)",
          }}
        />
        <div
          ref={glowRef}
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "350px",
            background:
              "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(102,126,234,0.40) 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="relative flex flex-col" style={{ zIndex: 10 }}>
        <Navbar />

        <div
          className="text-center mx-auto w-full px-6 sm:px-8"
          style={{ maxWidth: "900px", paddingTop: "140px" }}
        >
          <h1
            className="font-serif"
            style={{
              fontSize: "clamp(64px, 12vw, 130px)",
              fontWeight: 400,
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              marginBottom: "28px",
              animation:
                "hero-fade-up 650ms cubic-bezier(0.23,1,0.32,1) backwards",
              animationDelay: "40ms",
            }}
          >
            <span className="text-white">Visualiza.</span>
            <br />
            <span style={{ color: "#BFDBFE" }}>Convence.</span>
          </h1>

          <p
            className="mx-auto"
            style={{
              fontSize: "19px",
              fontWeight: 400,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.60)",
              maxWidth: "500px",
              marginBottom: "48px",
              animation:
                "hero-fade-up 650ms cubic-bezier(0.23,1,0.32,1) backwards",
              animationDelay: "120ms",
            }}
          >
            Simulador 2D de alta precisión que acelera la decisión de tus
            pacientes desde la primera consulta.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            style={{
              animation:
                "hero-fade-up 650ms cubic-bezier(0.23,1,0.32,1) backwards",
              animationDelay: "200ms",
            }}
          >
            <Button
              variant="white"
              size="xl"
              className="font-bold active:scale-[0.97] transition-transform duration-120"
            >
              Comenzar gratis
            </Button>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center h-12 px-6 text-[15px] font-semibold text-white border border-white/25 rounded-xl hover:bg-white/10 hover:border-white/40 active:scale-[0.97] transition-all duration-150"
            >
              Ver cómo funciona
            </a>
          </div>

          <p
            className="mt-5 text-[12px]"
            style={{
              color: "rgba(255,255,255,0.35)",
              animation:
                "hero-fade-up 650ms cubic-bezier(0.23,1,0.32,1) backwards",
              animationDelay: "280ms",
            }}
          >
            Sin tarjeta de crédito · Cancela cuando quieras
          </p>
        </div>

        {/* Video demo container */}
        <div
          className="relative mx-auto w-full px-4 sm:px-6"
          style={{
            maxWidth: "1080px",
            marginTop: "72px",
            paddingBottom: "160px",
          }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              inset: "-80px -120px",
              background:
                "radial-gradient(ellipse 75% 52% at 50% 50%, rgba(79,172,254,0.20) 0%, rgba(102,126,234,0.12) 40%, transparent 70%)",
              zIndex: 0,
            }}
            aria-hidden="true"
          />
          <div
            className="relative"
            style={{
              zIndex: 1,
              animation:
                "hero-demo-in 700ms cubic-bezier(0.23,1,0.32,1) backwards",
              animationDelay: "360ms",
            }}
          >
            <VideoPlaceholder />
          </div>
        </div>
      </div>
    </header>
  );
}
