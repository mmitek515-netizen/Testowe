import React, { useEffect, useRef, useState } from 'react';
import { Eye, Shield, Globe, Play, Pause, RotateCw } from 'lucide-react';

export default function SphericalScopeVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRotating, setIsRotating] = useState(true);
  const angleRef = useRef({ x: 0.4, y: 0.6 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      if (isRotating) {
        angleRef.current.y += 0.012;
        angleRef.current.x += 0.004;
      }

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.38;

      ctx.clearRect(0, 0, width, height);

      // Background glow
      const radialGlow = ctx.createRadialGradient(cx, cy, 5, cx, cy, radius * 1.3);
      radialGlow.addColorStop(0, 'rgba(14, 165, 233, 0.15)');
      radialGlow.addColorStop(0.7, 'rgba(99, 102, 241, 0.05)');
      radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // 3D rotation projection helper
      const project = (x: number, y: number, z: number) => {
        // Rotate around Y
        const cosY = Math.cos(angleRef.current.y);
        const sinY = Math.sin(angleRef.current.y);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // Rotate around X
        const cosX = Math.cos(angleRef.current.x);
        const sinX = Math.sin(angleRef.current.x);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // Perspective
        const scale = 300 / (300 + z2);
        return {
          px: cx + x1 * scale,
          py: cy + y2 * scale,
          z: z2,
        };
      };

      // Draw latitude circles
      const latitudes = [-0.6, -0.3, 0, 0.3, 0.6];
      ctx.lineWidth = 1;

      latitudes.forEach((latFactor) => {
        const rLat = radius * Math.sqrt(Math.max(0, 1 - latFactor * latFactor));
        const yVal = radius * latFactor;
        const steps = 36;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          const x = rLat * Math.cos(theta);
          const z = rLat * Math.sin(theta);
          const p = project(x, yVal, z);
          if (i === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        }
        ctx.strokeStyle = latFactor === 0 ? 'rgba(56, 189, 248, 0.6)' : 'rgba(148, 163, 184, 0.2)';
        ctx.stroke();
      });

      // Draw longitude circles
      const longitudes = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];
      longitudes.forEach((lon) => {
        const steps = 40;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const phi = (i / steps) * Math.PI * 2;
          const x = radius * Math.cos(phi) * Math.cos(lon);
          const y = radius * Math.sin(phi);
          const z = radius * Math.cos(phi) * Math.sin(lon);
          const p = project(x, y, z);
          if (i === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        }
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.stroke();
      });

      // Draw Principal Axes (PXYZ)
      const axisLen = radius * 1.35;
      const origin = project(0, 0, 0);

      const axes = [
        { label: 'P(X)', pt: project(axisLen, 0, 0), color: '#38bdf8' },
        { label: 'P(Y)', pt: project(0, -axisLen, 0), color: '#a855f7' },
        { label: 'P(Z)', pt: project(0, 0, axisLen), color: '#34d399' },
      ];

      axes.forEach((axis) => {
        ctx.beginPath();
        ctx.moveTo(origin.px, origin.py);
        ctx.lineTo(axis.pt.px, axis.pt.py);
        ctx.strokeStyle = axis.color;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = axis.color;
        ctx.font = '10px monospace';
        ctx.fillText(axis.label, axis.pt.px + 4, axis.pt.py - 4);
      });

      // Core anchor point
      ctx.beginPath();
      ctx.arc(origin.px, origin.py, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isRotating]);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-400" />
          <div>
            <h4 className="text-sm font-semibold text-white">
              VisualScope: Spherical-PXYZ
            </h4>
            <p className="text-[11px] text-neutral-400 font-mono">
              Tryb: CAŁOŚĆ | Geometria izolacji tożsamości
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsRotating(!isRotating)}
          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
          title={isRotating ? 'Zatrzymaj rotację' : 'Uruchom rotację'}
        >
          {isRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      </div>

      <div className="relative flex items-center justify-center my-2">
        <canvas
          ref={canvasRef}
          width={240}
          height={200}
          className="w-full max-w-[240px] h-[200px]"
        />
        <div className="absolute bottom-1 right-2 text-[10px] font-mono text-neutral-500 bg-black/40 px-2 py-0.5 rounded">
          P-XYZ 360°
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
        <span>render: <strong className="text-emerald-400">TRUE</strong></span>
        <span>armor: <strong className="text-cyan-400">MAXIMUM</strong></span>
        <span>root: <strong className="text-purple-400">364_OMNIKLUCZ</strong></span>
      </div>
    </div>
  );
}
