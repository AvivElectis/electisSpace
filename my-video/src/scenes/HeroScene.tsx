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

export const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12 } });
  const logoRotate = interpolate(logoScale, [0, 1], [-10, 0]);

  const titleOpacity = spring({
    frame,
    fps,
    delay: 8,
    config: { damping: 200 },
  });
  const titleY = interpolate(titleOpacity, [0, 1], [40, 0]);

  const taglineOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [25, 45], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const partnerOpacity = spring({
    frame,
    fps,
    delay: 40,
    config: { damping: 200 },
  });

  // Floating particles
  const float1 = Math.sin(frame * 0.04) * 12;
  const float2 = Math.cos(frame * 0.03) * 8;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${THEME.bgDefault} 0%, #e8eaf6 50%, ${THEME.bgDefault} 100%)`,
        fontFamily,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        direction: "rtl",
      }}
    >
      {/* Decorative grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, ${THEME.primary}08 1px, transparent 0)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Floating accent circles */}
      <div
        style={{
          position: "absolute",
          top: 120 + float1,
          right: 200 + float2,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: `${THEME.primary}08`,
          border: `1px solid ${THEME.primary}12`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 160 + float2,
          left: 280 - float1,
          width: 50,
          height: 50,
          borderRadius: "50%",
          background: `${THEME.secondary}08`,
          border: `1px solid ${THEME.secondary}12`,
        }}
      />

      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${THEME.primary}10 0%, transparent 70%)`,
        }}
      />

      {/* App Icon - big with rounded corners */}
      <div
        style={{
          transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
          marginBottom: 36,
        }}
      >
        <Img
          src={staticFile("logos/AppIcon.png")}
          style={{
            width: 200,
            height: 200,
            borderRadius: 48,
            boxShadow: `0 24px 80px ${THEME.primary}35`,
          }}
        />
      </div>

      {/* Logo text - bigger */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <Img
          src={staticFile("logos/LogoElectis.png")}
          style={{ height: 160, borderRadius: 16 }}
        />
      </div>

      {/* Hebrew tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          fontSize: 32,
          color: THEME.textSecondary,
          fontWeight: 700,
          marginTop: 28,
          letterSpacing: 0.5,
        }}
      >
        מערכת ניהול חללים ותגיות אלקטרוניות
      </div>

      {/* SoluM partner - large */}
      <div
        style={{
          opacity: partnerOpacity,
          marginTop: 44,
          display: "flex",
          alignItems: "center",
          gap: 24,
          direction: "rtl",
        }}
      >
        <div
          style={{
            background: THEME.bgPaper,
            borderRadius: 16,
            padding: "16px 32px",
            border: `1px solid ${THEME.primary}15`,
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          <Img
            src={staticFile("logos/CI_SOLUMLogo_WithClaim-Blue.png")}
            style={{ height: 56 }}
          />
        </div>
        <div
          style={{
            fontSize: 22,
            color: THEME.textPrimary,
            fontWeight: 700,
            direction: "ltr",
          }}
        >
          #1 ESL Company in USA
        </div>
      </div>
    </AbsoluteFill>
  );
};
