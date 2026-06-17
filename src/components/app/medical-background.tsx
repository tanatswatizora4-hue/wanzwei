import { cn } from "@/lib/cn";

/**
 * Ambient "liquid glass" backdrop for the app.
 *
 * Three layers, stacked:
 *  1. A pastel gradient base (canvas hue variation so glass surfaces refract)
 *  2. Three floating gradient orbs (violet / sky / rose) with heavy blur
 *  3. Faded medical SVG decorations (heartbeat, DNA, capsule, stethoscope,
 *     molecule lattice, medical cross) positioned around the edges
 *
 * The whole thing is `fixed inset-0 -z-10 pointer-events-none` so it never
 * intercepts clicks and renders behind every page surface.
 */
export function MedicalBackground({
  variant = "app",
  className,
}: {
  variant?: "app" | "marketing";
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      {/* Base gradient — extremely subtle hue variation */}
      <div
        className="absolute inset-0"
        style={{
          background:
            variant === "marketing"
              ? "linear-gradient(180deg, #f7f6ff 0%, #f4f7fb 40%, #f8f6ff 100%)"
              : "linear-gradient(135deg, #f5f4ff 0%, #f3f6fb 45%, #f8f4fa 100%)",
        }}
      />

      {/* Floating orbs */}
      <Orb
        size={620}
        color="rgba(139,122,251,0.28)"
        className="top-[-160px] left-[-120px]"
      />
      <Orb
        size={520}
        color="rgba(96,165,250,0.22)"
        className="top-1/3 right-[-160px]"
      />
      <Orb
        size={460}
        color="rgba(244,114,182,0.18)"
        className="bottom-[-180px] left-1/3"
      />
      <Orb
        size={380}
        color="rgba(52,211,153,0.14)"
        className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      />

      {/* Soft grain texture so the glass surfaces have somewhere to refract */}
      <div className="absolute inset-0 opacity-[0.35] mix-blend-overlay grid-bg" />

      {/* Medical decorations */}
      <Decorations />

      {/* Subtle vignette near the edges keeps the centre focused */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, transparent 40%, rgba(15,23,42,0.04) 100%)",
        }}
      />
    </div>
  );
}

function Orb({
  size,
  color,
  className,
}: {
  size: number;
  color: string;
  className?: string;
}) {
  return (
    <div
      className={cn("absolute rounded-full blur-3xl", className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 30%, ${color} 0%, transparent 65%)`,
      }}
    />
  );
}

function Decorations() {
  return (
    <>
      {/* Top-right: ECG heartbeat line */}
      <svg
        viewBox="0 0 600 80"
        className="absolute top-24 right-[-40px] w-[640px] h-[80px] text-[color:var(--color-brand-500)] opacity-[0.07]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M0 40 L120 40 L140 40 L150 20 L160 60 L170 6 L180 74 L195 30 L210 40 L340 40 L360 40 L370 22 L380 56 L390 14 L400 66 L415 32 L430 40 L600 40" />
        <circle cx="430" cy="40" r="3" fill="currentColor" />
      </svg>

      {/* Bottom-left: DNA double helix (vertical) */}
      <svg
        viewBox="0 0 80 320"
        className="absolute bottom-12 left-8 w-[80px] h-[320px] text-[color:var(--color-brand-500)] opacity-[0.08]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        <path d="M20 0 C 60 40, 60 80, 20 120 C -20 160, -20 200, 20 240 C 60 280, 60 320, 20 320" />
        <path d="M60 0 C 20 40, 20 80, 60 120 C 100 160, 100 200, 60 240 C 20 280, 20 320, 60 320" />
        {[20, 60, 100, 140, 180, 220, 260, 300].map((y) => (
          <line key={y} x1="22" y1={y} x2="58" y2={y} />
        ))}
      </svg>

      {/* Top-left: hex molecule lattice */}
      <svg
        viewBox="0 0 200 180"
        className="absolute top-32 left-[-30px] w-[200px] h-[180px] text-violet-500 opacity-[0.08]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" />
        <polygon points="130,10 170,30 170,70 130,90 90,70 90,30" />
        <polygon points="90,90 130,110 130,150 90,170 50,150 50,110" />
        {[
          [50, 10],
          [90, 30],
          [90, 70],
          [50, 90],
          [10, 70],
          [10, 30],
          [130, 10],
          [170, 30],
          [170, 70],
          [130, 90],
          [130, 150],
          [90, 170],
          [50, 150],
          [50, 110],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="currentColor" />
        ))}
      </svg>

      {/* Bottom-right: medical cross + caduceus stripe */}
      <svg
        viewBox="0 0 220 220"
        className="absolute bottom-24 right-12 w-[220px] h-[220px] text-rose-500 opacity-[0.07]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="80" y="40" width="40" height="120" rx="6" />
        <rect x="40" y="80" width="120" height="40" rx="6" />
        <circle cx="100" cy="100" r="92" />
        <path d="M180 30 Q200 60 180 90 Q160 120 180 150 Q200 180 180 210" />
      </svg>

      {/* Mid-right: stethoscope */}
      <svg
        viewBox="0 0 180 220"
        className="absolute top-1/2 right-[-20px] -translate-y-1/2 w-[180px] h-[220px] text-sky-600 opacity-[0.07]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M30 20 V70 Q30 130 80 130 Q130 130 130 70 V20" />
        <circle cx="30" cy="14" r="6" />
        <circle cx="130" cy="14" r="6" />
        <line x1="80" y1="130" x2="80" y2="170" />
        <circle cx="80" cy="186" r="18" />
        <circle cx="80" cy="186" r="9" />
      </svg>

      {/* Centre-left: capsules / pills */}
      <svg
        viewBox="0 0 220 100"
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[220px] h-[100px] text-emerald-600 opacity-[0.06] rotate-[18deg]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <rect x="10" y="20" width="120" height="40" rx="20" />
        <line x1="70" y1="20" x2="70" y2="60" />
        <rect x="140" y="55" width="70" height="24" rx="12" />
        <line x1="175" y1="55" x2="175" y2="79" />
      </svg>

      {/* Far bottom: small ECG echo */}
      <svg
        viewBox="0 0 400 40"
        className="absolute bottom-[-4px] left-1/4 w-[400px] h-[40px] text-[color:var(--color-brand-600)] opacity-[0.06]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M0 20 L120 20 L130 8 L140 32 L150 4 L160 36 L170 20 L290 20 L300 12 L310 28 L320 20 L400 20" />
      </svg>
    </>
  );
}
