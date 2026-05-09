import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { UserCircle, Lock } from 'lucide-react';

export default function AccountSettings() {
  const [user, setUser] = useState<{ id: number; name?: string; email: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    api.auth.me()
      .then((data) => setUser(data.user))
      .catch(() => toast.error('Failed to load account info'));
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    const email = (fd.get('email') as string).trim();
    const currentPassword = (fd.get('currentPassword') as string);

    if (!name || !email || !currentPassword) {
      toast.error('All fields are required');
      return;
    }

    setSaving(true);
    try {
      const result = await api.auth.updateProfile({ name, email, currentPassword });
      setUser(result.user);
      toast.success('Profile updated successfully');
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = fd.get('currentPassword') as string;
    const newPassword = fd.get('newPassword') as string;
    const confirmPassword = fd.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      await api.auth.updatePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully');
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-2xl">
      <div className="border-b pb-6">
        <h2 className="text-3xl font-bold tracking-tight">Account Settings</h2>
        <p className="text-muted-foreground text-sm mt-1 italic">Manage your name, email, and password.</p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </div>
          <CardDescription>Update your display name and email address. You must confirm your current password to save changes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input name="name" defaultValue={user?.name || ''} placeholder="Your full name" required />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input name="email" type="email" defaultValue={user?.email || ''} placeholder="your@email.com" required />
            </div>
            <div className="space-y-2">
              <Label>Current Password <span className="text-muted-foreground text-xs">(required to save)</span></Label>
              <Input name="currentPassword" type="password" placeholder="Enter your current password" required />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Change Password</CardTitle>
          </div>
          <CardDescription>Choose a strong password at least 6 characters long.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input name="currentPassword" type="password" placeholder="Enter your current password" required />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input name="newPassword" type="password" placeholder="At least 6 characters" required />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input name="confirmPassword" type="password" placeholder="Repeat new password" required />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={changingPassword}>{changingPassword ? 'Updating...' : 'Change Password'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
