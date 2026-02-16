
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { Role, Permission, User, Law } from '../types';
import { POLICE_LOGO_RAW } from '../constants';
import { dbCollections, onSnapshot, query, orderBy, setDoc, doc, db, deleteDoc } from '../firebase';

const AdminPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<'Users' | 'Roles' | 'Laws'>('Users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [laws, setLaws] = useState<Law[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Permission[]>>({});
  
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [newLaw, setNewLaw] = useState({ paragraph: '', title: '', description: '' });

  useEffect(() => {
    const unsubUsers = onSnapshot(query(dbCollections.users), (snap) => {
      setUsers(snap.docs.map(d => d.data() as User));
    });
    const unsubLaws = onSnapshot(query(dbCollections.laws, orderBy("paragraph", "asc")), (snap) => {
      setLaws(snap.docs.map(d => ({ id: d.id, ...d.data() } as Law)));
    });
    const unsubSettings = onSnapshot(doc(db, "settings", "permissions"), (snap) => {
      if (snap.exists()) setRolePermissions(snap.data() as any);
    });

    return () => {
      unsubUsers();
      unsubLaws();
      unsubSettings();
    };
  }, []);

  const saveUserToDB = async (user: User) => {
    await setDoc(doc(db, "users", user.id), user);
  };

  const togglePermissionForRole = async (role: string, perm: Permission) => {
    const currentPerms = rolePermissions[role] || [];
    const nextPerms = currentPerms.includes(perm) 
      ? currentPerms.filter(p => p !== perm)
      : [...currentPerms, perm];
    
    await setDoc(doc(db, "settings", "permissions"), {
      ...rolePermissions,
      [role]: nextPerms
    });
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.lastName.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
      u.badgeNumber.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  }, [users, userSearchTerm]);

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-24">
      <div className="flex items-center gap-8 mb-10 border-b border-white/10 pb-10">
        <img src={POLICE_LOGO_RAW} alt="BPOL Logo" className="h-28 w-auto" />
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase">Zentral-Administration</h1>
          <p className="text-blue-500 uppercase tracking-widest text-[10px] font-black mt-2">Dienststelle Teamstadt | Cloud-Schnittstelle</p>
        </div>
      </div>

      <div className="flex gap-4 p-1.5 bg-slate-900 border border-slate-700 rounded-xl w-fit">
        <button onClick={() => setTab('Users')} className={`px-8 py-3 rounded-lg font-bold text-xs uppercase transition-all ${tab === 'Users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Mitarbeiter</button>
        <button onClick={() => setTab('Roles')} className={`px-8 py-3 rounded-lg font-bold text-xs uppercase transition-all ${tab === 'Roles' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Berechtigungen</button>
        <button onClick={() => setTab('Laws')} className={`px-8 py-3 rounded-lg font-bold text-xs uppercase transition-all ${tab === 'Laws' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Gesetzestexte</button>
      </div>

      {tab === 'Users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-end bg-slate-900/50 p-8 rounded-3xl border border-white/5 backdrop-blur-xl">
             <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Personal-Datenbank durchsuchen</label>
                <input value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} placeholder="Name oder Dienstnummer..." className="bg-black/50 border border-white/10 p-4 rounded-xl text-sm w-96 text-white focus:border-blue-500 outline-none transition-all" />
             </div>
             <button onClick={() => {
               setEditingUser({ id: `user-${Date.now()}`, firstName: '', lastName: '', rank: '', badgeNumber: '', role: Role.GE, isAdmin: false, permissions: [] });
               setIsModalOpen(true);
             }} className="bg-blue-600 hover:bg-blue-500 px-10 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all">Neuer Account</button>
          </div>
          <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/50 text-slate-500 uppercase font-black tracking-widest"><tr className="border-b border-white/5"><th className="p-8">Beamter</th><th className="p-8">Dienstnummer</th><th className="p-8">Rolle</th><th className="p-8 text-right">Verwaltung</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-all"><td className="p-8"><div className="flex flex-col"><span className="text-white font-bold text-sm">{u.rank} {u.lastName}</span><span className="text-slate-500 text-[10px]">{u.firstName}</span></div></td><td className="p-8 font-mono text-blue-400 font-bold tracking-tighter text-sm">{u.badgeNumber}</td><td className="p-8"><span className="bg-blue-900/20 text-blue-400 border border-blue-900/40 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{u.role}</span></td><td className="p-8 text-right"><button onClick={() => {setEditingUser(u); setIsModalOpen(true);}} className="bg-white/5 hover:bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg font-bold uppercase mr-2 transition-all">Edit</button><button onClick={() => deleteDoc(doc(db, "users", u.id))} className="bg-red-900/10 hover:bg-red-600 text-red-500 hover:text-white px-4 py-2 rounded-lg font-bold uppercase transition-all">Löschen</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.values(Role).map(role => (
            <div key={role} className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 space-y-6">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center justify-between">{role}<span className="text-[10px] text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">Konfiguration</span></h3>
              <div className="space-y-3">
                {Object.values(Permission).map(perm => (
                  <label key={perm} className="flex items-center gap-3 p-3 bg-black/30 rounded-xl cursor-pointer hover:bg-black/50 transition-all border border-transparent hover:border-white/5">
                    <input type="checkbox" checked={(rolePermissions[role] || []).includes(perm)} onChange={() => togglePermissionForRole(role, perm)} className="w-4 h-4 rounded border-white/10 bg-slate-800 text-blue-600 focus:ring-blue-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{perm.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in">
          <div className="bg-[#0a111f] border border-white/10 p-12 rounded-[48px] w-full max-w-2xl space-y-8 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative">
             <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white">✕</button>
             <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase text-white tracking-tighter">Dienstkonto anpassen</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Änderungen werden sofort in die Cloud synchronisiert</p>
             </div>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-600 uppercase ml-2">Vorname</label><input value={editingUser.firstName} onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-sm text-white outline-none focus:border-blue-600" /></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-600 uppercase ml-2">Nachname</label><input value={editingUser.lastName} onChange={e => setEditingUser({...editingUser, lastName: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-sm text-white outline-none focus:border-blue-600" /></div>
             </div>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-600 uppercase ml-2">Dienstgrad</label><input value={editingUser.rank} onChange={e => setEditingUser({...editingUser, rank: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-sm text-white outline-none focus:border-blue-600" /></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-600 uppercase ml-2">Dienstnummer</label><input value={editingUser.badgeNumber} onChange={e => setEditingUser({...editingUser, badgeNumber: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-sm text-blue-400 font-mono font-bold outline-none focus:border-blue-600" /></div>
             </div>
             <div className="space-y-2"><label className="text-[9px] font-black text-slate-600 uppercase ml-2">Zuweisung Rolle</label><select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as Role})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-sm text-white outline-none focus:border-blue-600 appearance-none">
                {Object.values(Role).map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
             </select></div>
             <div className="flex gap-4 pt-6">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Abbrechen</button>
                <button onClick={() => { saveUserToDB(editingUser); setIsModalOpen(false); }} className="flex-1 bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all">Änderungen Speichern</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
