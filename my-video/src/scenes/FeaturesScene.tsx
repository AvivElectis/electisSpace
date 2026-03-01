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

const BrowserFrame: React.FC<{
  screen: string;
  width: number;
  color: string;
}> = ({ screen, width, color }) => (
  <div
    style={{
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: `0 16px 56px ${color}25, 0 4px 16px rgba(0,0,0,0.1)`,
      border: `2px solid ${color}30`,
    }}
  >
    <div
      style={{
        background: THEME.bgDefault,
        padding: "8px 16px",
        display: "flex",
        gap: 6,
        alignItems: "center",
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
      <div
        style={{
          marginLeft: 12,
          flex: 1,
          height: 22,
          borderRadius: 6,
          background: "rgba(0,0,0,0.04)",
          fontSize: 11,
          color: THEME.textSecondary,
          display: "flex",
          alignItems: "center",
          paddingLeft: 8,
        }}
      >
        electisspace.com
      </div>
    </div>
    <Img
      src={staticFile(`screens/${screen}.png`)}
      style={{ width, display: "block" }}
    />
  </div>
);

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingProgress = spring({ frame, fps, config: { damping: 200 } });

  const screen1 = spring({
    frame,
    fps,
    delay: 8,
    config: { damping: 15, stiffness: 120 },
  });
  const screen2 = spring({
    frame,
    fps,
    delay: 18,
    config: { damping: 15, stiffness: 120 },
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
        padding: 30,
        direction: "rtl",
      }}
    >
      {/* Accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: THEME.gradient,
          opacity: headingProgress,
        }}
      />

      <div
        style={{
          opacity: headingProgress,
          transform: `translateY(${interpolate(headingProgress, [0, 1], [20, 0])}px)`,
          fontSize: 46,
          fontWeight: 800,
          color: THEME.primary,
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        הכל במקום אחד
      </div>
      <div
        style={{
          opacity: headingProgress,
          fontSize: 22,
          color: THEME.textSecondary,
          marginBottom: 28,
          textAlign: "center",
        }}
      >
        אפליקציית WEB מתקדמת לניהול מלא של החללים
      </div>

      <div style={{ display: "flex", gap: 28, justifyContent: "center" }}>
        {/* Dashboard */}
        <div
          style={{
            opacity: screen1,
            transform: `translateY(${interpolate(screen1, [0, 1], [30, 0])}px) scale(${interpolate(screen1, [0, 1], [0.9, 1])})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <BrowserFrame screen="dashboard" width={860} color={THEME.primary} />
          <div style={{ fontSize: 22, fontWeight: 700, color: THEME.textPrimary }}>
            לוח בקרה ראשי
          </div>
          <div style={{ fontSize: 15, color: THEME.textSecondary, textAlign: "center" }}>
            אנשים, חדרי ישיבות וסטטוס AIMS במבט אחד
          </div>
        </div>

        {/* People */}
        <div
          style={{
            opacity: screen2,
            transform: `translateY(${interpolate(screen2, [0, 1], [30, 0])}px) scale(${interpolate(screen2, [0, 1], [0.9, 1])})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <BrowserFrame screen="people" width={860} color={THEME.secondary} />
          <div style={{ fontSize: 22, fontWeight: 700, color: THEME.textPrimary }}>
            ניהול אנשים
          </div>
          <div style={{ fontSize: 15, color: THEME.textSecondary, textAlign: "center" }}>
            שיוך עובדים לחללים, ייבוא CSV, סינון לפי סטטוס
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
