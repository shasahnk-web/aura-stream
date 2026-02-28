import { useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';

function extractColor(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = 50;
  canvas.height = 50;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '240, 20%, 7%';
  ctx.drawImage(img, 0, 0, 50, 50);
  const data = ctx.getImageData(0, 0, 50, 50).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 16) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);
  // Convert to HSL-ish string for CSS
  return `${r}, ${g}, ${b}`;
}

export default function DynamicBackground() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const setDominantColor = usePlayerStore((s) => s.setDominantColor);

  useEffect(() => {
    if (!currentSong?.image) {
      setDominantColor(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const rgb = extractColor(img);
      setDominantColor(rgb);
    };
    img.onerror = () => setDominantColor(null);
    img.src = currentSong.image;
  }, [currentSong?.image, setDominantColor]);

  const dominantColor = usePlayerStore((s) => s.dominantColor);

  return (
    <div
      className="fixed inset-0 -z-10 transition-all duration-1000 ease-in-out"
      style={{
        background: dominantColor
          ? `radial-gradient(ellipse at 30% 20%, rgba(${dominantColor}, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(${dominantColor}, 0.08) 0%, transparent 50%), linear-gradient(135deg, hsl(240 30% 8%), hsl(260 25% 12%), hsl(240 20% 8%))`
          : 'linear-gradient(135deg, hsl(240 30% 8%), hsl(260 25% 15%), hsl(240 20% 10%))',
      }}
    />
  );
}
