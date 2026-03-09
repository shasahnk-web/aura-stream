import { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Volume2, Timer, ChevronRight, Music } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

type Theme = 'dark' | 'light';
type PlaybackQuality = 'low' | 'medium' | 'high' | 'auto';

interface SettingsState {
  theme: Theme;
  playbackQuality: PlaybackQuality;
  sleepTimerEnabled: boolean;
  sleepTimerDuration: number;
  autoplay: boolean;
  crossfade: number;
}

const DEFAULT_SETTINGS: SettingsState = {
  theme: 'dark',
  playbackQuality: 'high',
  sleepTimerEnabled: false,
  sleepTimerDuration: 30,
  autoplay: true,
  crossfade: 0,
};

function loadSettings(): SettingsState {
  try {
    const data = localStorage.getItem('kanako-settings');
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: SettingsState) {
  localStorage.setItem('kanako-settings', JSON.stringify(settings));
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
    // Apply theme
    document.documentElement.classList.toggle('light-theme', settings.theme === 'light');
  }, [settings]);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const qualityOptions = [
    { value: 'low', label: '128 kbps', desc: 'Data saver' },
    { value: 'medium', label: '256 kbps', desc: 'Balanced' },
    { value: 'high', label: '320 kbps', desc: 'Best quality' },
    { value: 'auto', label: 'Auto', desc: 'Adapts to network' },
  ];

  const timerPresets = [15, 30, 45, 60, 90, 120];

  return (
    <ScrollArea className="flex-1 p-4 md:p-6 pb-32">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Customize your experience</p>
          </div>
        </div>

        {/* Appearance */}
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {settings.theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-accent" />}
              Appearance
            </CardTitle>
            <CardDescription>Customize how KanaKö looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground font-medium">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Use dark theme throughout the app</p>
              </div>
              <Switch
                checked={settings.theme === 'dark'}
                onCheckedChange={(checked) => updateSetting('theme', checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Playback Quality */}
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              Playback Quality
            </CardTitle>
            <CardDescription>Choose your preferred audio quality</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={settings.playbackQuality}
              onValueChange={(v) => updateSetting('playbackQuality', v as PlaybackQuality)}
              className="space-y-3"
            >
              {qualityOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    settings.playbackQuality === opt.value
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border/30 hover:bg-secondary/30'
                  }`}
                  onClick={() => updateSetting('playbackQuality', opt.value as PlaybackQuality)}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={opt.value} id={opt.value} />
                    <div>
                      <Label htmlFor={opt.value} className="text-foreground font-medium cursor-pointer">
                        {opt.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </div>
                  {settings.playbackQuality === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Sleep Timer */}
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary" />
              Sleep Timer
            </CardTitle>
            <CardDescription>Automatically stop playback after a set time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground font-medium">Enable Sleep Timer</Label>
                <p className="text-xs text-muted-foreground">Music will stop after the timer ends</p>
              </div>
              <Switch
                checked={settings.sleepTimerEnabled}
                onCheckedChange={(checked) => updateSetting('sleepTimerEnabled', checked)}
              />
            </div>

            {settings.sleepTimerEnabled && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Duration</Label>
                  <span className="text-lg font-bold gradient-text">{settings.sleepTimerDuration} min</span>
                </div>
                <Slider
                  value={[settings.sleepTimerDuration]}
                  onValueChange={([v]) => updateSetting('sleepTimerDuration', v)}
                  min={5}
                  max={120}
                  step={5}
                  className="w-full"
                />
                <div className="flex flex-wrap gap-2">
                  {timerPresets.map((mins) => (
                    <button
                      key={mins}
                      onClick={() => updateSetting('sleepTimerDuration', mins)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        settings.sleepTimerDuration === mins
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Playback Settings */}
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Playback
            </CardTitle>
            <CardDescription>Control how music plays</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground font-medium">Autoplay</Label>
                <p className="text-xs text-muted-foreground">Play recommended songs automatically</p>
              </div>
              <Switch
                checked={settings.autoplay}
                onCheckedChange={(checked) => updateSetting('autoplay', checked)}
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground font-medium">Crossfade</Label>
                  <p className="text-xs text-muted-foreground">Smooth transition between songs</p>
                </div>
                <span className="text-sm font-medium text-primary">
                  {settings.crossfade === 0 ? 'Off' : `${settings.crossfade}s`}
                </span>
              </div>
              <Slider
                value={[settings.crossfade]}
                onValueChange={([v]) => updateSetting('crossfade', v)}
                min={0}
                max={12}
                step={1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center py-6 text-muted-foreground text-xs space-y-1">
          <p className="font-medium text-foreground">KanaKö by TRMS</p>
          <p>Version 1.0.0</p>
        </div>
      </div>
    </ScrollArea>
  );
}
