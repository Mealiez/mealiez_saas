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
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/client-session';

export default function MobileProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSubmitting] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [personalInfo, setPersonalInfo] = useState({ full_name: '', phone: '', avatar_url: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const fetchProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('users')
        .select('*, tenants(name)')
        .eq('auth_id', authUser.id)
        .single();

      setUser({ ...profile, email: authUser.email });
      setPersonalInfo({ 
        full_name: profile.full_name, 
        phone: profile.phone || '', 
        avatar_url: profile.avatar_url || '' 
      });
    } catch (err) {
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
      toast.success('Avatar updated!');
    } catch (err: any) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const updatePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting('personal');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: personalInfo.full_name, phone: personalInfo.phone })
      });
      if (!res.ok) throw new Error();
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

  if (isLoading) {
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
                         <span className="text-3xl font-black text-blue-600 uppercase">{user.full_name.charAt(0)}</span>
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
                 <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{user.full_name}</h2>
                 <Badge className="bg-blue-50 text-blue-700 border-none font-black text-[8px] uppercase tracking-widest">{user.role}</Badge>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{user.tenants?.name}</p>
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

           <Button 
             onClick={handleLogout}
             variant="outline" 
             className="w-full rounded-2xl border-red-100 text-red-600 font-black uppercase text-[10px] tracking-widest h-14 bg-red-50/30"
           >
              <LogOut size={16} className="mr-2" /> Sign Out from Mealiez
           </Button>
        </div>
      </div>
    </div>
  );
}
