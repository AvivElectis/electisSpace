import { useRef, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';

interface SphereLoaderProps {
    width?: number;
    height?: number;
}

const SPHERE_IMG = '/Sphere.png';

/**
 * Canvas-based bouncing sphere loading animation.
 * Renders the Sphere.png image bouncing horizontally with
 * wall squish, floor shadow, rotation, and animated "LOADING" text.
 */
export const SphereLoader = memo(function SphereLoader({
    width = 440,
    height = 280,
}: SphereLoaderProps) {
    const { t, i18n } = useTranslation();
    const loadingText = t('common.loading', 'Loading...').replace(/\.{1,3}$/, '').toUpperCase();
    const isRtl = i18n.dir?.() === 'rtl';
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const stateRef = useRef({
        x: 0,
        vx: 0,
        rotation: 0,
        squishX: 1,
        squishY: 1,
        squishVel: 0,
        loaded: false,
    });

    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            stateRef.current.loaded = true;
        };
        img.src = SPHERE_IMG;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let raf: number;

        const BASE_W = 440;
        const BASE_H = 280;
        const scaleX = width / BASE_W;
        const scaleY = height / BASE_H;
        const scale = Math.min(scaleX, scaleY);

        const BALL_RADIUS = 45 * scale;
        const FLOOR_Y = BASE_H * 0.62 * scaleY;
        const LEFT_WALL = BALL_RADIUS + 20 * scale;
        const RIGHT_WALL = width - BALL_RADIUS - 20 * scale;
        const BASE_SPEED = 3.8 * scale;
        const SQUISH_RECOVERY = 0.15;
        const SQUISH_DAMPING = 0.75;
        const BOUNCE_DAMPING = 0.92;

        const s = stateRef.current;
        s.x = width / 2;
        s.vx = BASE_SPEED;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        function drawFloor() {
            const floorY = FLOOR_Y + BALL_RADIUS;
            const grad = ctx!.createLinearGradient(0, floorY, 0, floorY + 18 * scale);
            grad.addColorStop(0, 'rgba(0,180,255,0.06)');
            grad.addColorStop(1, 'transparent');
            ctx!.fillStyle = grad;
            ctx!.fillRect(0, floorY, width, 18 * scale);

            ctx!.strokeStyle = 'rgba(0,180,255,0.1)';
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(LEFT_WALL - BALL_RADIUS, floorY);
            ctx!.lineTo(RIGHT_WALL + BALL_RADIUS, floorY);
            ctx!.stroke();
        }

        function drawShadow() {
            const shadowY = FLOOR_Y + BALL_RADIUS + 2 * scale;
            const shadowW = BALL_RADIUS * 1.1 * (1 / s.squishX);
            const shadowH = 7 * scale;
            const grad = ctx!.createRadialGradient(s.x, shadowY, 0, s.x, shadowY, shadowW);
            grad.addColorStop(0, 'rgba(0,160,255,0.28)');
            grad.addColorStop(0.5, 'rgba(0,140,255,0.1)');
            grad.addColorStop(1, 'transparent');
            ctx!.fillStyle = grad;
            ctx!.beginPath();
            ctx!.ellipse(s.x, shadowY, shadowW, shadowH, 0, 0, Math.PI * 2);
            ctx!.fill();

            ctx!.shadowColor = 'transparent';
            ctx!.shadowBlur = 0;
            ctx!.shadowOffsetX = 0;
            ctx!.shadowOffsetY = 0;
        }

        function drawSphere() {
            if (!s.loaded || !imgRef.current) return;

            ctx!.save();
            ctx!.translate(s.x, FLOOR_Y);
            ctx!.scale(s.squishX, s.squishY);

            ctx!.shadowColor = 'rgba(0,200,255,0.25)';
            ctx!.shadowBlur = 15 * scale;

            ctx!.beginPath();
            ctx!.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
            ctx!.closePath();
            ctx!.clip();

            ctx!.rotate((s.rotation * Math.PI) / 180);
            ctx!.drawImage(
                imgRef.current,
                -BALL_RADIUS,
                -BALL_RADIUS,
                BALL_RADIUS * 2,
                BALL_RADIUS * 2,
            );

            ctx!.restore();
        }

        function drawLoadingText(time: number) {
            const textY = FLOOR_Y + BALL_RADIUS + 42 * scale;
            const fontSize = Math.round(16 * scale);

            const letters = loadingText;
            const spacing = fontSize * 1.1;
            const totalWidth = letters.length * spacing;
            const startX = (width - totalWidth) / 2 + spacing / 2;

            for (let i = 0; i < letters.length; i++) {
                const wave = Math.sin(time * 3 - i * 0.45);
                const alpha = 0.3 + wave * 0.15 + 0.2;
                const yOff = wave * 2 * scale;

                // RTL: first letter on the right, last on the left
                const posIndex = isRtl ? letters.length - 1 - i : i;

                ctx!.fillStyle = 'rgba(0,200,255,' + alpha.toFixed(3) + ')';
                ctx!.font = '800 ' + fontSize + 'px "Assistant", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
                ctx!.shadowColor = 'rgba(0,0,0,0.3)';
                ctx!.shadowBlur = 4 * scale;
                ctx!.shadowOffsetX = 0;
                ctx!.shadowOffsetY = 1 * scale;
                ctx!.textAlign = 'center';
                ctx!.textBaseline = 'middle';
                ctx!.fillText(letters[i], startX + posIndex * spacing, textY + yOff);
            }

            // Dots: after text (right for LTR, left for RTL)
            const dotsDir = isRtl ? -1 : 1;
            const dotsX = isRtl
                ? startX - spacing * 0.8
                : startX + letters.length * spacing + spacing * 0.3;
            for (let d = 0; d < 3; d++) {
                const dotPhase = (time * 2 - d * 0.4) % 1;
                const dotAlpha = dotPhase > 0 ? 0.25 + 0.4 * Math.max(0, Math.sin(dotPhase * Math.PI)) : 0;
                const dotY = textY - Math.sin(dotPhase * Math.PI) * 3 * scale;

                ctx!.fillStyle = 'rgba(0,200,255,' + dotAlpha.toFixed(3) + ')';
                ctx!.beginPath();
                ctx!.arc(dotsX + d * fontSize * 0.6 * dotsDir, dotY, 2.2 * scale, 0, Math.PI * 2);
                ctx!.fill();
            }
            ctx!.shadowColor = 'transparent';
            ctx!.shadowBlur = 0;
            ctx!.shadowOffsetX = 0;
            ctx!.shadowOffsetY = 0;
        }

        function frame() {
            ctx!.clearRect(0, 0, width, height);
            const time = Date.now() / 1000;

            s.x += s.vx;

            const circumference = Math.PI * BALL_RADIUS * 2;
            s.rotation += (s.vx / circumference) * 360;

            if (s.x >= RIGHT_WALL) {
                s.x = RIGHT_WALL;
                s.vx = -Math.abs(s.vx) * BOUNCE_DAMPING;
                s.squishVel = -0.25;
            } else if (s.x <= LEFT_WALL) {
                s.x = LEFT_WALL;
                s.vx = Math.abs(s.vx) * BOUNCE_DAMPING;
                s.squishVel = -0.25;
            }

            const currentSpeed = Math.abs(s.vx);
            if (currentSpeed < BASE_SPEED && s.x > LEFT_WALL + 5 * scale && s.x < RIGHT_WALL - 5 * scale) {
                s.vx += (s.vx > 0 ? 1 : -1) * 0.04 * scale;
            }

            const squishDiff = 1 - s.squishX;
            s.squishVel += squishDiff * SQUISH_RECOVERY;
            s.squishVel *= SQUISH_DAMPING;
            s.squishX += s.squishVel;
            s.squishY = 1 + (1 - s.squishX) * 0.7;

            drawFloor();
            drawShadow();
            drawSphere();
            drawLoadingText(time);

            raf = requestAnimationFrame(frame);
        }

        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [width, height, loadingText, isRtl]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                display: 'block',
                width: width,
                height: height,
            }}
            aria-label="Loading"
            role="img"
        />
    );
});
