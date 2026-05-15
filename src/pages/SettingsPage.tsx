import { useEffect } from 'react';
import SEO from '@/components/SEO';
import { Settings, Moon, Sun, Volume2, Timer, Music, Bell, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AppSettings, NotificationPrefs, PlaybackQuality,
  getSettings, saveSettings, useSettings,
} from '@/hooks/useSettings';

export default function SettingsPage() {
  const settings = useSettings();

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', settings.theme === 'light');
  }, [settings.theme]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    saveSettings({ ...getSettings(), [key]: value });
  };
  const updateNotif = <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
    const cur = getSettings();
    saveSettings({ ...cur, notifications: { ...cur.notifications, [key]: value } });
  };

  const qualityOptions = [
    { value: 'low', label: '128 kbps', desc: 'Data saver' },
    { value: 'medium', label: '256 kbps', desc: 'Balanced' },
    { value: 'high', label: '320 kbps', desc: 'Best quality' },
    { value: 'auto', label: 'Auto', desc: 'Adapts to network' },
  ];
  const timerPresets = [15, 30, 45, 60, 90, 120];
  const n = settings.notifications;

  return (
    <ScrollArea className="flex-1 p-4 md:p-6 pb-32">
      <SEO title="Settings — KanaKö" description="Configure playback quality, crossfade, sleep timer, notifications, and quiet hours." path="/settings" />
      <div className="max-w-2xl mx-auto space-y-6">
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
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground font-medium">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Use dark theme throughout the app</p>
              </div>
              <Switch
                checked={settings.theme === 'dark'}
                onCheckedChange={(c) => update('theme', c ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {n.soundEnabled ? <Bell className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
              Notifications
            </CardTitle>
            <CardDescription>Control sounds and which alerts you see</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground font-medium">Notification sound</Label>
                <p className="text-xs text-muted-foreground">Play a sound for incoming alerts</p>
              </div>
              <Switch checked={n.soundEnabled} onCheckedChange={(c) => updateNotif('soundEnabled', c)} />
            </div>

            <div className="space-y-3 pt-2 border-t border-border/30">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Categories</p>
              {[
                { k: 'joinRequests' as const, label: 'Join requests', desc: 'When someone asks to join your room' },
                { k: 'playlistUpdates' as const, label: 'Playlist updates', desc: 'Changes to playlists you follow' },
                { k: 'newReleases' as const, label: 'New releases', desc: 'New music from artists you like' },
              ].map(({ k, label, desc }) => (
                <div key={k} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-foreground font-medium">{label}</Label>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch checked={n[k]} onCheckedChange={(c) => updateNotif(k, c)} />
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2 border-t border-border/30">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground font-medium">Quiet hours</Label>
                  <p className="text-xs text-muted-foreground">Mute notification sounds during this window</p>
                </div>
                <Switch
                  checked={n.quietHoursEnabled}
                  onCheckedChange={(c) => updateNotif('quietHoursEnabled', c)}
                />
              </div>
              {n.quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input type="time" value={n.quietStart} onChange={(e) => updateNotif('quietStart', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input type="time" value={n.quietEnd} onChange={(e) => updateNotif('quietEnd', e.target.value)} />
                  </div>
                </div>
              )}
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
              onValueChange={(v) => update('playbackQuality', v as PlaybackQuality)}
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
                  onClick={() => update('playbackQuality', opt.value as PlaybackQuality)}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={opt.value} id={opt.value} />
                    <div>
                      <Label htmlFor={opt.value} className="text-foreground font-medium cursor-pointer">{opt.label}</Label>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </div>
                  {settings.playbackQuality === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
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
                onCheckedChange={(c) => update('sleepTimerEnabled', c)}
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
                  onValueChange={([v]) => update('sleepTimerDuration', v)}
                  min={5} max={120} step={5}
                />
                <div className="flex flex-wrap gap-2">
                  {timerPresets.map((mins) => (
                    <button
                      key={mins}
                      onClick={() => update('sleepTimerDuration', mins)}
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

        {/* Playback */}
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
              <Switch checked={settings.autoplay} onCheckedChange={(c) => update('autoplay', c)} />
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
                onValueChange={([v]) => update('crossfade', v)}
                min={0} max={12} step={1}
              />
            </div>
          </CardContent>
        </Card>

        <div className="text-center py-6 text-muted-foreground text-xs space-y-1">
          <p className="font-medium text-foreground">KanaKö by TRMS</p>
          <p>Version 1.0.0</p>
        </div>
      </div>
    </ScrollArea>
  );
}
