// Default icon SVG representations and paths
export const DEFAULT_ICONS = {
  TRENDING: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="trendingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ff4444;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#ffaa00;stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#trendingGrad)" opacity="0.2"/>
    <text x="50" y="60" fontSize="48" textAnchor="middle" fill="url(#trendingGrad)" fontWeight="bold">📈</text>
  </svg>`,
  
  RADIO: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="radioGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#ff00ff;stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#radioGrad)" opacity="0.2"/>
    <text x="50" y="60" fontSize="48" textAnchor="middle" fill="url(#radioGrad)" fontWeight="bold">📻</text>
  </svg>`,
  
  TOGETHER: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="togetherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#00ffff;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#ff00ff;stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#togetherGrad)" opacity="0.2"/>
    <text x="50" y="60" fontSize="48" textAnchor="middle" fill="url(#togetherGrad)" fontWeight="bold">🎧</text>
  </svg>`,
  
  SETTINGS: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="settingsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#b24bff;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#ff00ff;stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#settingsGrad)" opacity="0.2"/>
    <text x="50" y="60" fontSize="48" textAnchor="middle" fill="url(#settingsGrad)" fontWeight="bold">⚙️</text>
  </svg>`,
  
  LIKED_SONGS: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="likedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ff1493;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#ff69b4;stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#likedGrad)" opacity="0.2"/>
    <text x="50" y="60" fontSize="48" textAnchor="middle" fill="url(#likedGrad)" fontWeight="bold">❤️</text>
  </svg>`,

  DEFAULT_AVATAR: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#avatarGrad)"/>
    <circle cx="50" cy="35" r="15" fill="white" opacity="0.9"/>
    <path d="M30 70 Q30 55 50 55 Q70 55 70 70 Q70 85 50 85 Q30 85 30 70" fill="white" opacity="0.9"/>
  </svg>`,
};

export const DEFAULT_AVATAR_URL = 'data:image/svg+xml;base64,' + Buffer.from(
  DEFAULT_ICONS.DEFAULT_AVATAR.replace(/"/g, "'")
).toString('base64');
