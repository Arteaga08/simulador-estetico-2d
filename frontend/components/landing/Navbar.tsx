"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";

const NAV_LINKS = [
  { label: "Características", href: "#características" },
  { label: "Precios", href: "#precios" },
  { label: "Testimonios", href: "#testimonios" },
];

// Curvas separadas — Emil: ease-out al entrar, ease-in al salir
const EASE_OUT = "cubic-bezier(0.23,1,0.32,1)";
const EASE_IN = "cubic-bezier(0.55,0,1,0.45)";

function Logo({ light }: { light: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-linear-to-br from-blue to-indigo"
        aria-hidden="true"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <ellipse
            cx="7"
            cy="6"
            rx="4"
            ry="5"
            stroke="white"
            strokeWidth="1.4"
            strokeOpacity="0.9"
          />
          <path
            d="M5 5.5 Q7 4 9 5.5"
            stroke="white"
            strokeWidth="1"
            strokeOpacity="0.7"
            strokeLinecap="round"
          />
          <path
            d="M5 8 Q7 9.5 9 8"
            stroke="white"
            strokeWidth="1"
            strokeOpacity="0.7"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span
        className="text-[16px] font-bold tracking-tight font-display"
        style={{
          color: light ? "#1E1B4B" : "white",
          transition: "color 250ms ease",
        }}
      >
        LuminaMD
      </span>
    </div>
  );
}

function MobileMenu({
  open,
  onClose,
  light,
}: {
  open: boolean;
  onClose: () => void;
  light: boolean;
}) {
  return (
    <div
      className="md:hidden absolute top-full left-0 right-0 mt-3 p-4 rounded-3xl border shadow-2xl"
      style={{
        background: light ? "rgba(255,255,255,0.98)" : "rgba(14,10,50,0.97)",
        borderColor: light ? "rgba(233,213,255,0.8)" : "rgba(255,255,255,0.10)",
        transformOrigin: "top center",
        transition: open
          ? `opacity 180ms ${EASE_OUT}, transform 200ms ${EASE_OUT}`
          : `opacity 140ms ${EASE_IN}, transform 140ms ${EASE_IN}`,
        opacity: open ? 1 : 0,
        transform: open ? "scale(1)" : "scale(0.97)",
        pointerEvents: open ? "auto" : "none",
      }}
      aria-hidden={!open}
    >
      <div className="flex flex-col gap-1">
        {NAV_LINKS.map(({ label, href }) => (
          <a
            key={label}
            href={href}
            onClick={onClose}
            className="text-[15px] font-medium py-3 px-4 rounded-xl transition-colors duration-150"
            style={{
              color: light ? "#374151" : "rgba(255,255,255,0.70)",
            }}
          >
            {label}
          </a>
        ))}
        <div className="pt-4 px-4">
          <Button
            variant={light ? "primary" : "white"}
            size="lg"
            className="w-full font-semibold active:scale-[0.97] transition-transform duration-120"
          >
            Solicitar demo
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [light, setLight] = useState(false);
  const prevScrollRef = useRef(0);

  useEffect(() => {
    const check = () => {
      const y = window.scrollY;
      const threshold = window.innerHeight * 0.65;

      // Visibilidad — ocultar al bajar, mostrar al subir
      if (y < 50) {
        setVisible(true);
      } else {
        setVisible(prevScrollRef.current > y);
      }
      prevScrollRef.current = y;

      // Tema — claro al pasar el hero
      setLight(y > threshold);
    };

    check(); // aplicar estado inicial sin esperar scroll
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  // Estilos del pill que transicionan suavemente
  const navStyle: React.CSSProperties = {
    background: light ? "rgba(255,255,255,0.96)" : "rgba(10,14,48,0.50)",
    borderColor: light ? "rgba(233,213,255,0.85)" : "rgba(255,255,255,0.10)",
    boxShadow: light
      ? "0 4px 24px rgba(30,27,75,0.10), 0 1px 3px rgba(30,27,75,0.06)"
      : "0 4px 24px rgba(0,0,0,0.30)",
    transition:
      "background 280ms ease, border-color 280ms ease, box-shadow 280ms ease",
  };

  const linkColor = light ? "#374151" : "rgba(255,255,255,0.65)";
  const linkHoverColor = light ? "#1E1B4B" : "white";

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-5"
      style={{
        transition: visible
          ? `transform 300ms ${EASE_OUT}`
          : `transform 200ms ${EASE_IN}`,
        transform: visible ? "translateY(0)" : "translateY(-100%)",
      }}
    >
      <nav
        className="relative w-full max-w-7xl border rounded-full px-8 md:px-10 py-3.5"
        style={navStyle}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Logo light={light} />

          {/* Links desktop */}
          <div className="hidden md:flex items-center gap-8 lg:gap-10">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="relative text-[14px] lg:text-[15px] font-medium after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-current after:transition-[width] after:duration-200 hover:after:w-full"
                style={{
                  color: linkColor,
                  transition: "color 280ms ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = linkHoverColor)
                }
                onMouseLeave={(e) => (e.currentTarget.style.color = linkColor)}
              >
                {label}
              </a>
            ))}
          </div>

          {/* CTA desktop */}
          <div className="hidden md:block">
            <Button
              variant={light ? "primary" : "white"}
              size="md"
              className="font-semibold rounded-full active:scale-[0.97] transition-transform duration-120"
            >
              Solicitar demo
            </Button>
          </div>

          {/* Hamburger mobile */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2 focus-visible:outline-none"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
          >
            {[
              mobileOpen ? "translateY(8px) rotate(45deg)" : "none",
              null,
              mobileOpen ? "translateY(-8px) rotate(-45deg)" : "none",
            ].map((transform, i) =>
              transform !== null ? (
                <span
                  key={i}
                  className="block w-5 h-0.5 origin-center"
                  style={{
                    background: light ? "#1E1B4B" : "white",
                    transition: `transform 200ms ${EASE_OUT}, background 280ms ease`,
                    transform,
                  }}
                />
              ) : (
                <span
                  key={i}
                  className="block w-5 h-0.5"
                  style={{
                    background: light ? "#1E1B4B" : "white",
                    transition: `opacity 150ms ${EASE_OUT}, background 280ms ease`,
                    opacity: mobileOpen ? 0 : 1,
                  }}
                />
              ),
            )}
          </button>
        </div>

        <MobileMenu
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          light={light}
        />
      </nav>
    </div>
  );
}
