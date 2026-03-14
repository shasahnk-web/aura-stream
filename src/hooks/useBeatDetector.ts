import { useEffect, useRef } from 'react';

export type BeatDropCallback = (timestamp: number) => void;

export default function useBeatDetector(
  audioElement: HTMLAudioElement | null,
  enabled: boolean,
  onDrop: BeatDropCallback,
  options?: {
    sensitivity?: number;
    minIntervalMs?: number;
  }
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDropRef = useRef<number>(0);
  const energyRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    if (!audioElement) return;
    if (!audioElement.src) return;

    const sensitivity = options?.sensitivity ?? 1.6;
    const minIntervalMs = options?.minIntervalMs ?? 1200;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.85;
    analyserRef.current = analyser;

    const source = ctx.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);

      // Simple energy metric
      const energy = Math.sqrt(
        dataArray.reduce((acc, v) => acc + v * v, 0) / dataArray.length
      );

      // Moving average
      energyRef.current = energyRef.current * 0.9 + energy * 0.1;

      const now = Date.now();
      const isBeat = energy > energyRef.current * sensitivity;
      const enoughTimePassed = now - lastDropRef.current > minIntervalMs;

      if (isBeat && enoughTimePassed) {
        lastDropRef.current = now;
        onDrop(audioElement.currentTime);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [audioElement, enabled, onDrop, options?.sensitivity, options?.minIntervalMs]);
}
