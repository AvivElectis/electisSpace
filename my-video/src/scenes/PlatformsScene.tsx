import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Assistant";
import { THEME } from "../theme";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin", "hebrew"],
});

export const PlatformsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingProgress = spring({ frame, fps, config: { damping: 200 } });

  const webProgress = spring({
    frame,
    fps,
    delay: 10,
    config: { damping: 12, stiffness: 100 },
  });

  const devicesProgress = spring({
    frame,
    fps,
    delay: 25,
    config: { damping: 200 },
  });

  const techProgress = spring({
    frame,
    fps,
    delay: 40,
    config: { damping: 200 },
  });

  const partnerProgress = spring({
    frame,
    fps,
    delay: 55,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        background: THEME.bgDefault,
        fontFamily,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        direction: "rtl",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${THEME.primary}06 0%, transparent 70%)`,
        }}
      />

      <div
        style={{
          opacity: headingProgress,
          transform: `translateY(${interpolate(headingProgress, [0, 1], [20, 0])}px)`,
          fontSize: 46,
          fontWeight: 800,
          color: THEME.primary,
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        אפליקציית WEB מתקדמת
      </div>
      <div
        style={{
          opacity: headingProgress,
          fontSize: 22,
          color: THEME.textSecondary,
          marginBottom: 44,
        }}
      >
        קוד אחד — כל המסכים
      </div>

      {/* Web App Card */}
      <div
        style={{
          opacity: webProgress,
          transform: `scale(${interpolate(webProgress, [0, 1], [0.8, 1])})`,
          background: THEME.bgPaper,
          borderRadius: 24,
          padding: "36px 60px",
          border: `2px solid ${THEME.primary}20`,
          boxShadow: `0 16px 48px ${THEME.primary}15`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          marginBottom: 36,
        }}
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={THEME.primary} strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
        </svg>
        <div style={{ fontSize: 28, fontWeight: 700, color: THEME.textPrimary }}>
          אפליקציית WEB
        </div>
        <div style={{ fontSize: 17, color: THEME.textSecondary, textAlign: "center" }}>
          נגישה מכל דפדפן מודרני, ללא צורך בהתקנה
        </div>

        {/* Device badges */}
        <div
          style={{
            opacity: devicesProgress,
            display: "flex",
            gap: 16,
            marginTop: 8,
            direction: "ltr",
          }}
        >
          {[
            { label: "Mobile", icon: "📱" },
            { label: "Tablet", icon: "📱" },
            { label: "Desktop", icon: "🖥️" },
          ].map((d, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: `${THEME.primary}08`,
                borderRadius: 10,
                padding: "8px 18px",
                border: `1px solid ${THEME.primary}15`,
              }}
            >
              <span style={{ fontSize: 20 }}>{d.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: THEME.primary }}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div
        style={{
          display: "flex",
          gap: 12,
          opacity: techProgress,
          direction: "ltr",
          marginBottom: 36,
        }}
      >
        {["React 19", "Vite", "MUI 7", "Zustand", "Prisma", "PostgreSQL"].map(
          (tech, i) => (
            <div
              key={i}
              style={{
                background: THEME.bgPaper,
                border: `1px solid ${THEME.primary}15`,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                color: THEME.primary,
              }}
            >
              {tech}
            </div>
          )
        )}
      </div>

      {/* Partnership - larger */}
      <div
        style={{
          opacity: partnerProgress,
          display: "flex",
          alignItems: "center",
          gap: 28,
          direction: "rtl",
          background: THEME.bgPaper,
          borderRadius: 16,
          padding: "20px 36px",
          border: `1px solid ${THEME.primary}12`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
      >
        <Img
          src={staticFile("logos/AppIcon.png")}
          style={{ height: 52, borderRadius: 12 }}
        />
        <div
          style={{
            fontSize: 18,
            color: THEME.textSecondary,
            fontWeight: 600,
          }}
        >
          אלקטיס 1 2007 בע"מ — השותפה הישראלית של
        </div>
        <Img
          src={staticFile("logos/CI_SOLUMLogo_WithClaim-Blue.png")}
          style={{ height: 56 }}
        />
        <div
          style={{
            fontSize: 20,
            color: THEME.primary,
            fontWeight: 700,
            direction: "ltr",
          }}
        >
          #1 ESL in USA
        </div>
      </div>
    </AbsoluteFill>
  );
};
