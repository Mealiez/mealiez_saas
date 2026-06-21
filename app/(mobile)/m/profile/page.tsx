"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  Camera, 
  Loader2, 
  ShieldCheck,
  AlertCircle,
  KeyRound,
  ChevronLeft,
  LogOut,
  Download,
  Share,
  PlusSquare,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/client-session';
import { installManager } from '@/components/pwa/install-manager';
import { cn } from '@/lib/utils';

export default function MobileProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSubmitting] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [personalInfo, setPersonalInfo] = useState({ full_name: '', phone: '', avatar_url: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [platform, setPlatform] = useState<any>('other');

  useEffect(() => {
    setIsInstalled(installManager.isInstalled());
    setPlatform(installManager.getPlatform());

    const unsubscribe = installManager.subscribe(() => {
      setIsInstalled(installManager.isInstalled());
      setPlatform(installManager.getPlatform());
    });

    return unsubscribe;
  }, []);

  const handleManualInstall = async () => {
    installManager.trackAnalytics('manual_install_clicked');
    if (platform === 'ios') {
      setShowIosModal(true);
      installManager.trackAnalytics('ios_install_instructions_opened');
    } else {
      await installManager.triggerInstall();
    }
  };

  const fetchProfile = async () => {
    try {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (isOffline) {
        if (typeof window !== 'undefined') {
          const cachedUser = localStorage.getItem('mealiez_auth_user');
          if (cachedUser) {
            try {
              const u = JSON.parse(cachedUser);
              setUser(u);
              setPersonalInfo({
                full_name: u.full_name,
                phone: u.phone || '',
                avatar_url: u.avatar_url || ''
              });
              setIsLoading(false);
              return;
            } catch (e) {}
          }
        }
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('users')
        .select('*, tenants(name)')
        .eq('auth_id', authUser.id)
        .single();

      const combinedUser = { ...profile, email: authUser.email };
      setUser(combinedUser);
      setPersonalInfo({ 
        full_name: profile.full_name, 
        phone: profile.phone || '', 
        avatar_url: profile.avatar_url || '' 
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('mealiez_auth_user', JSON.stringify({
          id: profile.id,
          auth_id: authUser.id,
          tenant_id: profile.tenant_id,
          role: profile.role || 'member',
          full_name: profile.full_name,
          email: authUser.email!,
          is_active: profile.is_active,
          branch_id: profile.branch_id,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
          tenants: profile.tenants
        }));
      }
    } catch (err) {
      console.error('[PROFILE_FETCH_ERROR]', err);
      if (typeof window !== 'undefined') {
        const cachedUser = localStorage.getItem('mealiez_auth_user');
        if (cachedUser) {
          try {
            const u = JSON.parse(cachedUser);
            setUser(u);
            setPersonalInfo({
              full_name: u.full_name,
              phone: u.phone || '',
              avatar_url: u.avatar_url || ''
            });
            return;
          } catch (e) {}
        }
      }
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      toast.error('Offline: Cannot upload avatar');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatar')
        .getPublicUrl(filePath);

      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: publicUrl })
      });
      
      setPersonalInfo(prev => ({ ...prev, avatar_url: publicUrl }));
      
      // Update cached user too
      if (typeof window !== 'undefined') {
        const cachedUser = localStorage.getItem('mealiez_auth_user');
        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser);
            parsed.avatar_url = publicUrl;
            localStorage.setItem('mealiez_auth_user', JSON.stringify(parsed));
          } catch (e) {}
        }
      }

      toast.success('Avatar updated!');
    } catch (err: any) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const updatePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      toast.error('Offline: Cannot update profile info');
      return;
    }

    setIsSubmitting('personal');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: personalInfo.full_name, phone: personalInfo.phone })
      });
      if (!res.ok) throw new Error();

      // Update cached user too
      if (typeof window !== 'undefined') {
        const cachedUser = localStorage.getItem('mealiez_auth_user');
        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser);
            parsed.full_name = personalInfo.full_name;
            parsed.phone = personalInfo.phone;
            localStorage.setItem('mealiez_auth_user', JSON.stringify(parsed));
          } catch (e) {}
        }
      }

      toast.success('Profile updated');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <header className="bg-white px-6 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">My Profile</h1>
      </header>

      <div className="p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        {/* Profile Identity Card */}
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
           <div className="h-24 bg-blue-600 relative">
              <div className="absolute -bottom-10 left-6">
                 <div className="relative group">
                    <div className="h-20 w-20 rounded-3xl bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                       {personalInfo.avatar_url ? (
                         <img src={personalInfo.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                       ) : (
                         <span className="text-3xl font-black text-blue-600 uppercase">{user?.full_name?.charAt(0) || '?'}</span>
                       )}
                       {isUploading && (
                         <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                            <Loader2 className="animate-spin text-blue-600" size={20} />
                         </div>
                       )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 text-white rounded-xl shadow-lg cursor-pointer">
                      <Camera size={14} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                    </label>
                 </div>
              </div>
           </div>
           <CardContent className="pt-12 pb-6 px-6">
              <div className="flex items-center justify-between mb-1">
                 <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{user?.full_name}</h2>
                 <Badge className="bg-blue-50 text-blue-700 border-none font-black text-[8px] uppercase tracking-widest">{user?.role}</Badge>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{user?.tenants?.name}</p>
           </CardContent>
        </Card>

        {/* Forms */}
        <div className="space-y-6">
           <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6">
              <div className="flex items-center gap-2 mb-6">
                 <User className="text-blue-600" size={18} />
                 <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Personal Details</h3>
              </div>
              <form onSubmit={updatePersonalInfo} className="space-y-4">
                 <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-gray-400 uppercase ml-1">Full Name</Label>
                    <Input 
                      value={personalInfo.full_name} 
                      onChange={e => setPersonalInfo({...personalInfo, full_name: e.target.value})}
                      className="rounded-xl border-gray-100 bg-gray-50/50 font-bold"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-gray-400 uppercase ml-1">Phone</Label>
                    <Input 
                      value={personalInfo.phone} 
                      onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})}
                      className="rounded-xl border-gray-100 bg-gray-50/50 font-bold"
                    />
                 </div>
                 <Button type="submit" disabled={isSaving === 'personal'} className="w-full rounded-xl bg-blue-600 font-black uppercase text-[10px] tracking-widest h-12">
                    {isSaving === 'personal' ? <Loader2 className="animate-spin" size={16} /> : 'Update Info'}
                 </Button>
              </form>
           </Card>

           <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6">
              <div className="flex items-center gap-2 mb-6">
                 <Mail className="text-indigo-600" size={18} />
                 <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Account Access</h3>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
                 <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Email Address</p>
                 <p className="text-sm font-black text-gray-900">{user.email}</p>
              </div>
              <p className="text-[8px] text-center text-gray-400 font-bold uppercase tracking-tight">Email and password can be changed on desktop for security.</p>
           </Card>

           <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-4">
                 <Download className={cn("text-blue-600", !isInstalled && "animate-pulse")} size={18} />
                 <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Application</h3>
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-tight mb-4 leading-relaxed">
                 Install Mealiez on your home screen for rapid access, live notifications, and offline support.
              </p>
              <Button 
                onClick={handleManualInstall}
                className="w-full rounded-xl bg-gray-900 text-white font-black uppercase text-[10px] tracking-widest h-12 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Download size={14} /> Install App
              </Button>
              {isInstalled && (
                <p className="text-[9px] text-green-600 font-black uppercase tracking-wider text-center mt-3 flex items-center justify-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  PWA Installation Detected
                </p>
              )}
           </Card>

           <Button 
             onClick={handleLogout}
             variant="outline" 
             className="w-full rounded-2xl border-red-100 text-red-600 font-black uppercase text-[10px] tracking-widest h-14 bg-red-50/30"
           >
              <LogOut size={16} className="mr-2" /> Sign Out from Mealiez
           </Button>
        </div>
      </div>

      {/* iOS Sharing Instruction Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div 
            className="w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-2xl space-y-6 pb-8 animate-in slide-in-from-bottom-10 duration-300 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:bg-gray-50 active:scale-90 rounded-full p-1.5 transition-all"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-2 pt-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto">
                <Share size={24} className="animate-bounce" />
              </div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Add to Home Screen</h3>
              <p className="text-[10px] text-gray-500 font-bold px-4 uppercase tracking-wider">
                Follow these simple steps to install Mealiez on your iOS device
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <p className="text-xs text-gray-700 font-bold leading-relaxed">
                  Tap the <span className="inline-flex items-center justify-center p-1 bg-white border border-gray-100 rounded-md mx-1 shadow-sm shrink-0"><Share size={12} className="text-blue-600" /></span> Share button in your Safari toolbar.
                </p>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <p className="text-xs text-gray-700 font-bold leading-relaxed">
                  Scroll down the share menu and select <span className="font-extrabold uppercase text-blue-600 tracking-tight flex items-center gap-1 inline-flex"><PlusSquare size={12} /> "Add to Home Screen"</span>.
                </p>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <p className="text-xs text-gray-700 font-bold leading-relaxed">
                  Tap <span className="font-extrabold uppercase text-blue-600 tracking-tight">"Add"</span> in the top-right corner to complete the installation.
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowIosModal(false)}
              className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-4"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
