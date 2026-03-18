import React, { useState } from 'react';
import { useAuth } from '../App';
import { db, doc, updateDoc } from '../firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [birthDate, setBirthDate] = useState(user?.birthDate || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState(user?.profilePictureUrl || '');
  const [newPassword, setNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  if (!user) return null;

  const showStatus = (text: string, type: 'error' | 'success' = 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const updateProfile = async () => {
    try {
      await updateDoc(doc(db, "users", user.id), {
        firstName,
        lastName,
        birthDate,
        profilePictureUrl
      });
      showStatus("Profil aktualisiert.", "success");
    } catch (e) {
      showStatus("Fehler beim Aktualisieren des Profils.");
    }
  };

  const updatePass = async () => {
    if (!newPassword) return;
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        showStatus("Passwort aktualisiert.", "success");
        setNewPassword('');
      }
    } catch (e) {
      showStatus("Fehler beim Aktualisieren des Passworts.");
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Mein Profil</h1>
      
      {statusMsg && (
        <div className={`px-4 py-2 rounded-lg ${statusMsg.type === 'error' ? 'bg-red-900/20 text-red-500' : 'bg-emerald-900/20 text-emerald-500'}`}>
          {statusMsg.text}
        </div>
      )}

      <div className="bg-[#1a1c23] p-6 rounded-3xl border border-white/5 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Vorname</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Nachname</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Geburtsdatum</label>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Profilbild URL</label>
            <input value={profilePictureUrl} onChange={e => setProfilePictureUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none" />
          </div>
        </div>
        <button onClick={updateProfile} className="w-full bg-blue-600 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-white">Profil speichern</button>
      </div>

      <div className="bg-[#1a1c23] p-6 rounded-3xl border border-white/5 space-y-6">
        <h2 className="text-xl font-black text-white uppercase">Sicherheit</h2>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Neues Passwort</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none" />
        </div>
        <button onClick={updatePass} className="w-full bg-red-600 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-white">Passwort ändern</button>
      </div>

      <div className="bg-[#1a1c23] p-6 rounded-3xl border border-white/5 space-y-4">
        <h2 className="text-xl font-black text-white uppercase">Dienstdaten (Nicht änderbar)</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-slate-500">Dienstgrad:</div><div className="text-white font-bold">{user.rank}</div>
          <div className="text-slate-500">Dienstnummer:</div><div className="text-white font-bold">{user.badgeNumber}</div>
          <div className="text-slate-500">Hauptrolle:</div><div className="text-white font-bold">{user.role}</div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
