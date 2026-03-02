import { useRef, useEffect, useState, useCallback } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  barCount?: number;
  className?: string;
}

export default function AudioVisualizer({ audioElement, barCount = 32, className = '' }: AudioVisualizerProps) {
  const { isPlaying } = usePlayerStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const [connected, setConnected] = useState(false);

  const connectAudio = useCallback(() => {
    if (!audioElement || connected) return;

    try {
      if (!contextRef.current) {
        contextRef.current = new AudioContext();
      }
      const ctx = contextRef.current;

      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audioElement);
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;

      sourceRef.current.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      setConnected(true);
    } catch (e) {
      // Already connected or CORS issue — use fallback animation
      console.warn('AudioVisualizer: could not connect', e);
    }
  }, [audioElement, connected]);

  useEffect(() => {
    if (audioElement && isPlaying) {
      connectAudio();
      if (contextRef.current?.state === 'suspended') {
        contextRef.current.resume();
      }
    }
  }, [audioElement, isPlaying, connectAudio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      let bars: number[] = [];

      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const step = Math.floor(bufferLength / barCount);
        for (let i = 0; i < barCount; i++) {
          bars.push(dataArray[i * step] / 255);
        }
      } else if (isPlaying) {
        // Fallback: fake animation when Web Audio can't connect (CORS)
        const time = Date.now() / 1000;
        for (let i = 0; i < barCount; i++) {
          bars.push(
            0.3 + 0.4 * Math.sin(time * 3 + i * 0.5) * Math.cos(time * 2 + i * 0.3)
          );
        }
      } else {
        bars = Array(barCount).fill(0.05);
      }

      const barWidth = width / barCount - 2;
      const primaryH = 270;
      const accentH = 340;

      bars.forEach((val, i) => {
        const barHeight = Math.max(2, val * height * 0.9);
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        const hue = primaryH + ((accentH - primaryH) * i) / barCount;
        const alpha = 0.5 + val * 0.5;

        ctx.fillStyle = `hsla(${hue}, 70%, 55%, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      });
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, barCount]);

  return (
    <motion.canvas
      ref={canvasRef}
      width={barCount * 8}
      height={40}
      initial={{ opacity: 0 }}
      animate={{ opacity: isPlaying ? 1 : 0.3 }}
      transition={{ duration: 0.3 }}
      className={`${className}`}
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}
