import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProfileStore } from '@/store/profileStore';
import { User, Mail, Save } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileEditModal({ open, onOpenChange }: Props) {
  const { name, email, setName, setEmail, save } = useProfileStore();
  const [localName, setLocalName] = useState(name);
  const [localEmail, setLocalEmail] = useState(email);

  const handleSave = () => {
    const trimmedName = localName.trim().slice(0, 100);
    const trimmedEmail = localEmail.trim().slice(0, 255);
    if (trimmedName) setName(trimmedName);
    setEmail(trimmedEmail);
    setTimeout(() => save(), 0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50 max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text text-center">
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 pt-2 pb-4">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <User className="w-8 h-8 text-primary-foreground" />
          </div>

          {/* Name */}
          <div className="w-full space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</label>
            <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                maxLength={100}
                placeholder="Your name"
                className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {/* Email */}
          <div className="w-full space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
            <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="email"
                value={localEmail}
                onChange={(e) => setLocalEmail(e.target.value)}
                maxLength={255}
                placeholder="your@email.com"
                className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
