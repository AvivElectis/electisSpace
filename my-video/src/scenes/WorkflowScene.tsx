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
    </div>
    <Img
      src={staticFile(`screens/${screen}.png`)}
      style={{ width, display: "block" }}
    />
  </div>
);

export const WorkflowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingProgress = spring({ frame, fps, config: { damping: 200 } });

  const confProgress = spring({
    frame,
    fps,
    delay: 8,
    config: { damping: 15, stiffness: 120 },
  });

  const labelsProgress = spring({
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
      <div
        style={{
          opacity: headingProgress,
          transform: `translateY(${interpolate(headingProgress, [0, 1], [20, 0])}px)`,
          fontSize: 46,
          fontWeight: 800,
          color: THEME.primary,
          marginBottom: 28,
        }}
      >
        חדרים, תגיות ועוד
      </div>

      <div style={{ display: "flex", gap: 28, justifyContent: "center" }}>
        {/* Conference Rooms */}
        <div
          style={{
            opacity: confProgress,
            transform: `translateY(${interpolate(confProgress, [0, 1], [30, 0])}px) scale(${interpolate(confProgress, [0, 1], [0.9, 1])})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <BrowserFrame screen="conference" width={860} color={THEME.success} />
          <div style={{ fontSize: 22, fontWeight: 700, color: THEME.textPrimary }}>
            חדרי ישיבות
          </div>
          <div style={{ fontSize: 15, color: THEME.textSecondary, textAlign: "center" }}>
            הזמנת חדרים, מעקב זמינות וניהול לוח זמנים
          </div>
        </div>

        {/* Labels */}
        <div
          style={{
            opacity: labelsProgress,
            transform: `translateY(${interpolate(labelsProgress, [0, 1], [30, 0])}px) scale(${interpolate(labelsProgress, [0, 1], [0.9, 1])})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <BrowserFrame screen="labels" width={860} color={THEME.warning} />
          <div style={{ fontSize: 22, fontWeight: 700, color: THEME.textPrimary }}>
            ניהול תגיות ESL
          </div>
          <div style={{ fontSize: 15, color: THEME.textSecondary, textAlign: "center" }}>
            קישור תגיות, הקצאת תמונות, סנכרון עם SoluM AIMS
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
