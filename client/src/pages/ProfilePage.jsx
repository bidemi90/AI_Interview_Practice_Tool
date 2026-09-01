import { useState } from 'react';
import { changeCurrentPassword, updateCurrentUser } from '../api/authApi.js';
import FormError from '../components/FormError.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({
    name: user.name,
    targetRoles: user.targetRoles?.join(', ') || '',
    experienceLevel: user.profile?.experienceLevel || '',
    yearsOfExperience: user.profile?.yearsOfExperience ?? '',
    preferredJobTitle: user.profile?.preferredJobTitle || '',
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [profileStatus, setProfileStatus] = useState({ error: null, message: '' });
  const [passwordStatus, setPasswordStatus] = useState({ error: null, message: '' });

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileStatus({ error: null, message: '' });
    try {
      const updatedUser = await updateCurrentUser({
        name: profile.name,
        targetRoles: profile.targetRoles.split(',').map((role) => role.trim()).filter(Boolean),
        experienceLevel: profile.experienceLevel || null,
        yearsOfExperience: profile.yearsOfExperience === '' ? null : Number(profile.yearsOfExperience),
        preferredJobTitle: profile.preferredJobTitle || null,
      });
      setUser(updatedUser);
      setProfileStatus({ error: null, message: 'Profile saved.' });
    } catch (error) {
      setProfileStatus({ error, message: '' });
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordStatus({ error: null, message: '' });
    try {
      await changeCurrentPassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      setPasswordStatus({ error: null, message: 'Password updated.' });
    } catch (error) {
      setPasswordStatus({ error, message: '' });
    }
  };

  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2';
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-950">Your profile</h1>
      <p className="mt-2 text-slate-600">Signed in as {user.email}</p>

      <form className="mt-10 space-y-5 rounded-xl bg-white p-6 shadow-sm" onSubmit={saveProfile}>
        <h2 className="text-xl font-semibold">Profile details</h2>
        <FormError error={profileStatus.error} />
        {profileStatus.message && <p className="text-sm text-emerald-700" role="status">{profileStatus.message}</p>}
        <label className="block text-sm font-medium">Name<input className={inputClass} required minLength={2} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
        <label className="block text-sm font-medium">Target roles <span className="font-normal text-slate-500">(comma separated)</span><input className={inputClass} value={profile.targetRoles} onChange={(event) => setProfile({ ...profile, targetRoles: event.target.value })} /></label>
        <label className="block text-sm font-medium">Experience level<select className={inputClass} value={profile.experienceLevel} onChange={(event) => setProfile({ ...profile, experienceLevel: event.target.value })}><option value="">Not specified</option><option value="entry">Entry</option><option value="mid">Mid-level</option><option value="senior">Senior</option><option value="lead">Lead</option><option value="executive">Executive</option></select></label>
        <label className="block text-sm font-medium">Years of experience<input className={inputClass} type="number" min="0" max="60" value={profile.yearsOfExperience} onChange={(event) => setProfile({ ...profile, yearsOfExperience: event.target.value })} /></label>
        <label className="block text-sm font-medium">Preferred job title<input className={inputClass} maxLength={100} value={profile.preferredJobTitle} onChange={(event) => setProfile({ ...profile, preferredJobTitle: event.target.value })} /></label>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Save profile</button>
      </form>

      <form className="mt-8 space-y-5 rounded-xl bg-white p-6 shadow-sm" onSubmit={savePassword}>
        <h2 className="text-xl font-semibold">Change password</h2>
        <FormError error={passwordStatus.error} />
        {passwordStatus.message && <p className="text-sm text-emerald-700" role="status">{passwordStatus.message}</p>}
        <label className="block text-sm font-medium">Current password<input className={inputClass} type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label>
        <label className="block text-sm font-medium">New password<input className={inputClass} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label>
        <button className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">Update password</button>
      </form>
    </section>
  );
}
