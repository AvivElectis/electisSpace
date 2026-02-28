import { useRef, useEffect, memo } from 'react';
import { useTheme } from '@mui/material/styles';

interface SphereLoaderProps {
    width?: number;
    height?: number;
    message?: string;
}

/**
 * Canvas-based bouncing sphere loading animation.
 * Renders a 3D-looking sphere that bounces with wall squish,
 * floor shadow, and animated "LOADING" text.
 */
export const SphereLoader = memo(function SphereLoader({
    width = 280,
    height = 220,
    message,
}: SphereLoaderProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const theme = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const radius = 28;
        const floorY = height - 36;
        const leftWall = radius + 8;
        const rightWall = width - radius - 8;

        let x = width / 2;
        let y = floorY - radius;
        let vx = 2.2;
        let vy = -5;
        const gravity = 0.22;
        const bounce = -0.75;
        const friction = 0.995;
        let rotation = 0;
        let frame = 0;

        const primaryColor = theme.palette.primary.main;
        const textColor = theme.palette.text.secondary;

        function drawSphere(
            ctx: CanvasRenderingContext2D,
            sx: number,
            sy: number,
            r: number,
            rot: number,
            squishX: number,
            squishY: number,
        ) {
            ctx.save();
            ctx.translate(sx, sy);
            ctx.scale(squishX, squishY);

            // Shadow
            const shadowScale = 1 - Math.max(0, (floorY - sy - r) / (floorY - 60)) * 0.5;
            ctx.save();
            ctx.translate(0, floorY - sy + r / squishY);
            ctx.scale(shadowScale, 0.15);
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fill();
            ctx.restore();

            // Sphere body with radial gradient
            const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.35, primaryColor);
            grad.addColorStop(1, darkenColor(primaryColor, 0.4));
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Equator line (rotates)
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(0, 0, r, r * 0.12, rot, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            // Specular highlight
            const specGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.35, 0, -r * 0.25, -r * 0.35, r * 0.45);
            specGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
            specGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = specGrad;
            ctx.fill();

            ctx.restore();
        }

        function drawLoadingText(ctx: CanvasRenderingContext2D, f: number) {
            const text = message || 'LOADING';
            const dotCount = (Math.floor(f / 20) % 4);
            const dots = '.'.repeat(dotCount);

            ctx.font = '600 13px "Inter", "Roboto", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = textColor;
            ctx.letterSpacing = '3px';
            ctx.fillText(text + dots, width / 2, height - 8);
            ctx.letterSpacing = '0px';
        }

        let animId: number;

        function animate() {
            ctx!.clearRect(0, 0, width, height);

            // Physics
            vy += gravity;
            x += vx;
            y += vy;
            vx *= friction;
            rotation += vx * 0.04;

            let squishX = 1;
            let squishY = 1;

            // Floor bounce
            if (y + radius > floorY) {
                y = floorY - radius;
                vy *= bounce;
                squishX = 1.2;
                squishY = 0.8;
            }

            // Wall bounce
            if (x - radius < leftWall - radius) {
                x = leftWall;
                vx = Math.abs(vx);
                squishX = 0.85;
                squishY = 1.15;
            } else if (x + radius > rightWall + radius) {
                x = rightWall;
                vx = -Math.abs(vx);
                squishX = 0.85;
                squishY = 1.15;
            }

            // Keep velocity alive (re-energize if too slow)
            if (Math.abs(vx) < 0.5) vx = vx >= 0 ? 2.2 : -2.2;
            if (Math.abs(vy) < 0.3 && y >= floorY - radius - 1) vy = -5;

            drawSphere(ctx!, x, y, radius, rotation, squishX, squishY);
            drawLoadingText(ctx!, frame);

            frame++;
            animId = requestAnimationFrame(animate);
        }

        animate();

        return () => cancelAnimationFrame(animId);
    }, [width, height, message, theme]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width, height, display: 'block' }}
            aria-label={message || 'Loading'}
            role="img"
        />
    );
});

/** Darken a hex color by a factor (0–1) */
function darkenColor(hex: string, factor: number): string {
    const c = hex.replace('#', '');
    const r = Math.round(parseInt(c.substring(0, 2), 16) * (1 - factor));
    const g = Math.round(parseInt(c.substring(2, 4), 16) * (1 - factor));
    const b = Math.round(parseInt(c.substring(4, 6), 16) * (1 - factor));
    return `rgb(${r},${g},${b})`;
}
