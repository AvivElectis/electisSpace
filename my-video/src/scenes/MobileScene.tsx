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

const PhoneFrame: React.FC<{
  screen: string;
  delay: number;
  elevated?: boolean;
}> = ({ screen, delay, elevated }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    delay,
    config: { damping: 12, stiffness: 100 },
  });
  const y = interpolate(progress, [0, 1], [80, elevated ? -20 : 0]);
  const rotate = interpolate(progress, [0, 1], [5, 0]);

  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${y}px) rotate(${rotate}deg)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Phone frame */}
      <div
        style={{
          background: "#1a1a1a",
          borderRadius: 36,
          padding: "14px 8px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        {/* Notch */}
        <div
          style={{
            width: 90,
            height: 6,
            borderRadius: 3,
            background: "#333",
            margin: "0 auto 8px",
          }}
        />
        {/* Screen */}
        <div style={{ borderRadius: 24, overflow: "hidden" }}>
          <Img
            src={staticFile(`screens/${screen}.png`)}
            style={{ width: 240, display: "block" }}
          />
        </div>
        {/* Home indicator */}
        <div
          style={{
            width: 65,
            height: 4,
            borderRadius: 2,
            background: "#555",
            margin: "10px auto 0",
          }}
        />
      </div>
    </div>
  );
};

export const MobileScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingProgress = spring({ frame, fps, config: { damping: 200 } });
  const subtitleProgress = spring({
    frame,
    fps,
    delay: 10,
    config: { damping: 200 },
  });
  const badgeProgress = spring({
    frame,
    fps,
    delay: 45,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${THEME.bgDefault} 0%, #e8eaf6 100%)`,
        fontFamily,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        direction: "rtl",
      }}
    >
      {/* Heading */}
      <div
        style={{
          opacity: headingProgress,
          transform: `translateY(${interpolate(headingProgress, [0, 1], [20, 0])}px)`,
          fontSize: 46,
          fontWeight: 800,
          color: THEME.primary,
          marginBottom: 8,
        }}
      >
        מותאם לכל מסך
      </div>
      <div
        style={{
          opacity: subtitleProgress,
          fontSize: 22,
          color: THEME.textSecondary,
          marginBottom: 44,
        }}
      >
        ממשק רספונסיבי מלא - מובייל, טאבלט ודסקטופ
      </div>

      {/* Phone screens row */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <PhoneFrame screen="mobile-dashboard" delay={5} />
          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.textSecondary }}>
            לוח בקרה
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <PhoneFrame screen="mobile-menu" delay={12} elevated />
          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.textSecondary }}>
            תפריט ניווט
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <PhoneFrame screen="mobile-people" delay={19} />
          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.textSecondary }}>
            ניהול אנשים
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <PhoneFrame screen="mobile-conference" delay={26} elevated />
          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.textSecondary }}>
            חדרי ישיבות
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <PhoneFrame screen="mobile-labels" delay={33} />
          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.textSecondary }}>
            תגיות ESL
          </div>
        </div>
      </div>

      {/* Responsive badge */}
      <div
        style={{
          opacity: badgeProgress,
          marginTop: 36,
          display: "flex",
          gap: 16,
          alignItems: "center",
          direction: "ltr",
        }}
      >
        {["Mobile", "Tablet", "Desktop"].map((device, i) => (
          <div
            key={i}
            style={{
              background: THEME.bgPaper,
              border: `1px solid ${THEME.primary}20`,
              borderRadius: 8,
              padding: "6px 16px",
              fontSize: 14,
              fontWeight: 600,
              color: THEME.primary,
            }}
          >
            {device}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
