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

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProgress = spring({ frame, fps, config: { damping: 12 } });
  const ctaProgress = spring({
    frame,
    fps,
    delay: 15,
    config: { damping: 200 },
  });
  const subtextProgress = spring({
    frame,
    fps,
    delay: 30,
    config: { damping: 200 },
  });
  const partnerProgress = spring({
    frame,
    fps,
    delay: 45,
    config: { damping: 200 },
  });

  // Subtle pulse on CTA
  const pulse = Math.sin(frame * 0.08) * 0.02 + 1;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${THEME.bgDefault} 0%, #e8eaf6 100%)`,
        fontFamily,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        direction: "rtl",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${THEME.primary}0a 0%, transparent 60%)`,
        }}
      />

      {/* App Icon - bigger */}
      <div style={{ transform: `scale(${logoProgress})`, marginBottom: 28 }}>
        <Img
          src={staticFile("logos/AppIcon.png")}
          style={{
            width: 160,
            height: 160,
            borderRadius: 38,
            boxShadow: `0 20px 60px ${THEME.primary}30`,
          }}
        />
      </div>

      {/* Logo - bigger with rounded corners */}
      <div style={{ opacity: logoProgress, marginBottom: 16 }}>
        <Img
          src={staticFile("logos/logo_fixed_02.png")}
          style={{ height: 90, borderRadius: 12 }}
        />
      </div>

      {/* CTA */}
      <div
        style={{
          opacity: ctaProgress,
          transform: `translateY(${interpolate(ctaProgress, [0, 1], [20, 0])}px) scale(${pulse})`,
          marginTop: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            background: THEME.gradient,
            borderRadius: 14,
            padding: "18px 56px",
            fontSize: 26,
            fontWeight: 700,
            color: "white",
            boxShadow: `0 12px 32px ${THEME.primary}35`,
          }}
        >
          התחילו עוד היום
        </div>
      </div>

      {/* Platform note */}
      <div
        style={{
          opacity: subtextProgress,
          fontSize: 19,
          color: THEME.textSecondary,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        אפליקציית WEB - מובייל, טאבלט ודסקטופ
      </div>

      {/* Partner section */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          opacity: partnerProgress,
          display: "flex",
          alignItems: "center",
          gap: 20,
          direction: "rtl",
        }}
      >
        <Img
          src={staticFile("logos/AppIcon.png")}
          style={{ height: 40, borderRadius: 10 }}
        />
        <div
          style={{
            fontSize: 16,
            color: THEME.textSecondary,
            fontWeight: 600,
          }}
        >
          אלקטיס 1 2007 בע"מ — השותפה הישראלית של
        </div>
        <Img
          src={staticFile("logos/CI_SOLUMLogo_WithClaim-Blue.png")}
          style={{ height: 44 }}
        />
      </div>
    </AbsoluteFill>
  );
};
