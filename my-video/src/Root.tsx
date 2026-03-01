import "./index.css";
import { Composition } from "remotion";
import { IntroVideo } from "./Composition";

// 7 scenes: 150 + 150 + 180 + 180 + 180 + 150 + 150 = 1140
// 6 transitions: 6 × 15 = 90
// Total: 1140 - 90 = 1050 frames @ 30fps = 35 seconds
const TOTAL_DURATION = 1050;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ElectisSpaceIntro"
      component={IntroVideo}
      durationInFrames={TOTAL_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
