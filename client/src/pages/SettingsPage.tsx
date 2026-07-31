import { useAuth } from '@/hooks/useAuth';
import { User, Mail, Calendar, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease-out] max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      <div className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
            <span className="text-xl font-bold text-primary-400">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="grid gap-3 pt-2">
          <div className="flex items-center gap-3 p-3 bg-surface-800 rounded-lg">
            <User className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="text-sm text-foreground">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-surface-800 rounded-lg">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm text-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-surface-800 rounded-lg">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Member Since</p>
              <p className="text-sm text-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Security</h2>
        <div className="flex items-center gap-3 p-3 bg-surface-800 rounded-lg">
          <Shield className="w-4 h-4 text-accent-400" />
          <div>
            <p className="text-sm text-foreground">JWT Authentication</p>
            <p className="text-xs text-muted-foreground">Token expires in 7 days</p>
          </div>
        </div>
      </div>
    </div>
  );
}
