import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Assistant";
import { THEME } from "../theme";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin", "hebrew"],
});

const painPoints = [
  { icon: "✍️", text: "כתיבה ידנית של שלטים או הדפסות יקרות לחדרי ישיבות, מרפאות ומשרדים" },
  { icon: "📊", text: "עדכון קבצי אקסל מיושנים עם שמות עובדים, חללים ומיקומים" },
  { icon: "💸", text: "בזבוז כסף על אפליקציות ניהול חללים מסובכות ויקרות" },
  { icon: "🔄", text: "שינויים תכופים בהושבה שדורשים הדפסה מחדש בכל פעם" },
  { icon: "😤", text: "אין תמונה אחידה של מי יושב איפה — כל מחלקה מנהלת לבד" },
];

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingProgress = spring({
    frame,
    fps,
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
        padding: 80,
        direction: "rtl",
      }}
    >
      {/* Subtle danger gradient */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, transparent 0%, ${THEME.error}40 50%, transparent 100%)`,
          opacity: headingProgress,
        }}
      />

      <div
        style={{
          opacity: headingProgress,
          transform: `translateY(${interpolate(headingProgress, [0, 1], [30, 0])}px)`,
          fontSize: 46,
          fontWeight: 700,
          color: THEME.error,
          marginBottom: 44,
          textAlign: "center",
        }}
      >
        מספיק לבזבז כסף וזמן על ניהול חללים
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          width: "100%",
          maxWidth: 900,
        }}
      >
        {painPoints.map((point, i) => {
          const delay = 12 + i * 10;
          const itemProgress = spring({
            frame,
            fps,
            delay,
            config: { damping: 200 },
          });
          const xOffset = interpolate(itemProgress, [0, 1], [50, 0]);

          return (
            <div
              key={i}
              style={{
                opacity: itemProgress,
                transform: `translateX(${xOffset}px)`,
                display: "flex",
                alignItems: "center",
                gap: 20,
                background: THEME.bgPaper,
                border: `1px solid ${THEME.error}15`,
                borderRadius: 16,
                padding: "18px 28px",
                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.04)",
              }}
            >
              <span style={{ fontSize: 32 }}>{point.icon}</span>
              <span
                style={{
                  fontSize: 22,
                  color: THEME.textPrimary,
                  fontWeight: 400,
                }}
              >
                {point.text}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
