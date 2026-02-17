
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { Role, Permission, User, Law } from '../types';
import { POLICE_LOGO_RAW } from '../constants';
import { dbCollections, onSnapshot, query, orderBy, setDoc, doc, db, deleteDoc, addDoc } from '../firebase';
import PoliceOSWindow from '../components/PoliceOSWindow';

const RANKS = {
  "Mittlerer Dienst": [
    "Polizeimeisteranwärter/in",
    "Polizeimeister/in",
    "Polizeiobermeister/in",
    "Polizeihauptmeister/in",
    "Polizeihauptmeister/in mit Amtszulage",
    "Erste/r Polizeihauptmeister/in"
  ],
  "Gehobener Dienst": [
    "Polizeikommissaranwärter/in",
    "Polizeikommissar/in",
    "Polizeioberkommissar/in",
    "Polizeihauptkommissar/in A12",
    "Erste/r Polizeihauptkommissar/in"
  ],
  "Höherer Dienst": [
    "Polizeiratanwärter/in",
    "Polizeirat/rätin",
    "Polizeioberrat/rätin",
    "Polizeidirektor/in",
    "Leitende/r Polizeidirektor/in",
    "Leitende/r Polizeidirektor/in B2",
    "Leitende/r Polizeidirektor/in B3",
    "Bundespolizeivizepräsident",
    "Bundespolizeipräsident"
  ]
};

const AdminPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<'Users' | 'Roles' | 'Laws'>('Users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [laws, setLaws] = useState<Law[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Permission[]>>({});
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<Role>(Role.GE);
  
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [newLaw, setNewLaw] = useState({ paragraph: '', title: '', description: '' });

  const permissionLabels: Record<Permission, string> = {
    [Permission.VIEW_REPORTS]: "Einsatzberichte einsehen",
    [Permission.CREATE_REPORTS]: "Einsatzberichte/Anzeigen erstellen",
    [Permission.EDIT_REPORTS]: "Berichte bearbeiten",
    [Permission.DELETE_REPORTS]: "Berichte löschen",
    [Permission.MANAGE_USERS]: "Benutzerkonten verwalten",
    [Permission.VIEW_WARRANTS]: "Fahndungsliste einsehen",
    [Permission.MANAGE_WARRANTS]: "Fahndungen ausschreiben/aufheben",
    [Permission.ADMIN_ACCESS]: "Admin-Panel Vollzugriff",
    [Permission.MANAGE_LAWS]: "Gesetzesdatenbank verwalten",
    [Permission.MANAGE_FLEET]: "Fuhrpark verwalten",
    [Permission.MANAGE_EVIDENCE]: "Asservatenkammer verwalten",
    [Permission.VIEW_APPLICATIONS]: "Bewerbungen einsehen",
    [Permission.MANAGE_APPLICATIONS]: "Bewerbungen bearbeiten/entscheiden",
    [Permission.VIEW_TIPS]: "Bürgerhinweise einsehen",
    [Permission.MANAGE_TIPS]: "Hinweise bearbeiten/löschen",
    [Permission.VIEW_CALENDAR]: "Dienstkalender einsehen",
    [Permission.MANAGE_CALENDAR]: "Dienstkalender verwalten"
  };

  useEffect(() => {
    const unsubUsers = onSnapshot(query(dbCollections.users), (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    });
    const unsubLaws = onSnapshot(query(dbCollections.laws, orderBy("paragraph", "asc")), (snap) => {
      setLaws(snap.docs.map(d => ({ id: d.id, ...d.data() } as Law)));
    });
    const unsubSettings = onSnapshot(doc(db, "settings", "permissions"), (snap) => {
      if (snap.exists()) setRolePermissions(snap.data() as Record<string, Permission[]>);
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

  const handleSaveLaw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLaw.paragraph || !newLaw.title) return;
    await addDoc(dbCollections.laws, {
      paragraph: newLaw.paragraph,
      title: newLaw.title,
      description: newLaw.description,
      timestamp: new Date().toISOString()
    });
    setNewLaw({ paragraph: '', title: '', description: '' });
  };

  const handleDeleteLaw = async (id: string) => {
    if (confirm("Möchten Sie diesen Gesetzestext wirklich löschen?")) {
      await deleteDoc(doc(db, "laws", id));
    }
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
      u.badgeNumber.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.firstName.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  }, [users, userSearchTerm]);

  return (
    <PoliceOSWindow title="Systemadministration">
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-24">
        <div className="flex items-center gap-8 mb-10 border-b border-white/10 pb-10">
          <img src={POLICE_LOGO_RAW} alt="BPOL Logo" className="h-24 w-auto drop-shadow-lg" />
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Administration</h1>
            <p className="text-blue-500 uppercase tracking-widest text-[9px] font-black mt-2">Dienststelle Teamstadt | Cloud-Kontrollzentrum</p>
          </div>
        </div>

        <div className="flex gap-4 p-1.5 bg-slate-900 border border-slate-700/50 rounded-2xl w-fit shadow-2xl">
          <button onClick={() => setTab('Users')} className={`px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'Users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Mitarbeiter</button>
          <button onClick={() => setTab('Roles')} className={`px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'Roles' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Berechtigungen</button>
          <button onClick={() => setTab('Laws')} className={`px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'Laws' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Gesetzestexte</button>
        </div>

        {tab === 'Users' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-end bg-[#1a1c23] p-8 rounded-[40px] border border-white/5 shadow-2xl">
               <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Personal-Datenbank</label>
                  <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-2xl px-6 w-96 focus-within:border-blue-500 transition-colors">
                    <span className="text-slate-500">🔍</span>
                    <input value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} placeholder="Name oder Dienstnummer..." className="bg-transparent py-4 text-sm text-white outline-none w-full" />
                  </div>
               </div>
               <button onClick={() => {
                 setEditingUser({ id: `user-${Date.now()}`, firstName: '', lastName: '', rank: RANKS["Mittlerer Dienst"][0], badgeNumber: '', role: Role.GE, isAdmin: false, permissions: [] });
                 setIsModalOpen(true);
               }} className="bg-blue-600 hover:bg-blue-500 px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95">Account erstellen</button>
            </div>
            
            <div className="bg-[#1a1c23] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/50 text-slate-500 uppercase font-black tracking-widest sticky top-0 z-10">
                    <tr className="border-b border-white/5">
                      <th className="p-8">Name & Dienstgrad</th>
                      <th className="p-8">Dienstnummer</th>
                      <th className="p-8">Direktion / Rolle</th>
                      <th className="p-8 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-all group">
                        <td className="p-8">
                          <div className="flex flex-col">
                            <span className="text-white font-black text-sm uppercase tracking-tight">{u.firstName} {u.lastName}</span>
                            <span className="text-slate-500 text-[10px] font-medium uppercase tracking-widest mt-1">{u.rank}</span>
                          </div>
                        </td>
                        <td className="p-8">
                          <span className="font-mono text-blue-400 font-black tracking-widest bg-blue-500/5 px-3 py-1 rounded-lg border border-blue-500/10">
                            {u.badgeNumber}
                          </span>
                        </td>
                        <td className="p-8">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${u.role === Role.LS ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-8 text-right space-x-3">
                          <button onClick={() => {setEditingUser(u); setIsModalOpen(true);}} className="bg-white/5 hover:bg-blue-600 text-blue-400 hover:text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Anpassen</button>
                          {u.badgeNumber !== 'Adler 51/01' && (
                            <button onClick={() => deleteDoc(doc(db, "users", u.id))} className="bg-red-900/10 hover:bg-red-600 text-red-500 hover:text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Löschen</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={4} className="p-20 text-center text-slate-600 italic uppercase tracking-widest text-[10px]">Keine Datensätze gefunden</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'Laws' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
             <div className="bg-[#1a1c23] border border-white/5 p-10 rounded-[40px] shadow-2xl">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8">Gesetzestext erfassen</h3>
                <form onSubmit={handleSaveLaw} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Paragraph</label>
                      <input value={newLaw.paragraph} onChange={e => setNewLaw({...newLaw, paragraph: e.target.value})} placeholder="z.B. § 242 StGB" className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-sm text-white outline-none focus:border-blue-600 transition-all" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Titel / Delikt</label>
                      <input value={newLaw.title} onChange={e => setNewLaw({...newLaw, title: e.target.value})} placeholder="z.B. Diebstahl" className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-sm text-white outline-none focus:border-blue-600 transition-all" />
                   </div>
                   <div className="space-y-2 flex flex-col justify-end">
                      <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white h-16 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20">Datensatz Speichern</button>
                   </div>
                   <div className="md:col-span-3 space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Beschreibung / Strafmaß</label>
                      <textarea value={newLaw.description} onChange={e => setNewLaw({...newLaw, description: e.target.value})} placeholder="Details zum Tatbestand und empfohlene Haftzeit/Geldstrafe..." className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-sm text-white outline-none focus:border-blue-600 h-32 resize-none transition-all" />
                   </div>
                </form>
             </div>

             <div className="bg-[#1a1c23] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/50 text-slate-500 uppercase font-black tracking-widest sticky top-0 z-10"><tr className="border-b border-white/5"><th className="p-8">Paragraph</th><th className="p-8">Titel</th><th className="p-8">Inhalt</th><th className="p-8 text-right">Aktion</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {laws.map(l => (
                        <tr key={l.id} className="hover:bg-white/[0.02] transition-all">
                          <td className="p-8 font-black text-blue-500 whitespace-nowrap tracking-widest">{l.paragraph}</td>
                          <td className="p-8 font-black text-white uppercase tracking-tight">{l.title}</td>
                          <td className="p-8 text-slate-400 max-w-md italic">{l.description}</td>
                          <td className="p-8 text-right"><button onClick={() => handleDeleteLaw(l.id)} className="bg-red-900/10 text-red-500 hover:bg-red-600 hover:text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Löschen</button></td>
                        </tr>
                      ))}
                      {laws.length === 0 && <tr><td colSpan={4} className="p-20 text-center text-slate-600 italic uppercase tracking-widest text-[10px]">Keine Gesetze in der Datenbank</td></tr>}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}

        {tab === 'Roles' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 animate-in slide-in-from-right-4">
            <div className="md:col-span-1 space-y-3">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 px-2">Struktur & Einheiten</h3>
               {Object.values(Role).map(role => (
                 <button 
                   key={role}
                   onClick={() => setSelectedRoleForPerms(role)}
                   className={`w-full text-left px-8 py-5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all border ${selectedRoleForPerms === role ? 'bg-blue-600 border-blue-500 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)]' : 'bg-[#1a1c23] border-white/5 text-slate-500 hover:border-blue-500/30 hover:text-slate-300'}`}
                 >
                   {role}
                 </button>
               ))}
            </div>
            <div className="md:col-span-3 bg-[#1a1c23] border border-white/5 rounded-[40px] p-12 space-y-10 shadow-2xl">
               <div className="flex justify-between items-center border-b border-white/10 pb-8">
                  <div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Berechtigungen</h3>
                    <p className="text-blue-500 text-[9px] font-black uppercase tracking-widest mt-1">Konfiguration für {selectedRoleForPerms}</p>
                  </div>
                  <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-5 py-2 rounded-full border border-emerald-500/20 uppercase font-black tracking-widest">Aktiv synchron</span>
               </div>
               
               <div className="overflow-y-auto max-h-[600px] pr-6 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.values(Permission).map(perm => (
                      <label key={perm} className="flex items-center gap-5 p-6 bg-black/30 rounded-3xl cursor-pointer hover:bg-black/50 transition-all border border-white/5 group active:scale-[0.98]">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            checked={(rolePermissions[selectedRoleForPerms] || []).includes(perm)} 
                            onChange={() => togglePermissionForRole(selectedRoleForPerms, perm)} 
                            className="w-6 h-6 rounded-lg border-white/10 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer appearance-none checked:bg-blue-600 checked:border-transparent transition-all" 
                          />
                          {(rolePermissions[selectedRoleForPerms] || []).includes(perm) && (
                            <span className="absolute inset-0 flex items-center justify-center text-white pointer-events-none text-xs">✓</span>
                          )}
                        </div>
                        <span className="text-[10px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest transition-colors flex-1">
                          {permissionLabels[perm]}
                        </span>
                      </label>
                    ))}
                </div>
               </div>

               <div className="p-8 bg-blue-600/5 border border-blue-600/10 rounded-3xl">
                  <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest leading-relaxed flex items-start gap-4">
                     <span className="text-xl">ℹ️</span>
                     System-Kern-Hinweis: Änderungen an den Rollen-Berechtigungen werden in Echtzeit auf alle Endgeräte der betroffenen Beamten übertragen. Administratoren unterliegen nicht dieser Rechte-Einschränkung.
                  </p>
               </div>
            </div>
          </div>
        )}

        {isModalOpen && editingUser && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-8 animate-in fade-in">
            <div className="bg-[#0a111f] border border-white/10 p-12 rounded-[60px] w-full max-w-2xl space-y-10 shadow-[0_40px_150px_rgba(0,0,0,0.9)] relative animate-in zoom-in duration-300">
               <button onClick={() => setIsModalOpen(false)} className="absolute top-12 right-12 text-slate-500 hover:text-white transition-all text-xl">✕</button>
               <div className="space-y-2">
                  <h2 className="text-4xl font-black uppercase text-white tracking-tighter">Dienstkonto <span className="text-blue-500">Profil</span></h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Datenbank-Eintrag bearbeiten</p>
               </div>
               
               <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-600 uppercase ml-2 tracking-widest">Vorname</label>
                      <input value={editingUser.firstName} onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-sm text-white outline-none focus:border-blue-600 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-600 uppercase ml-2 tracking-widest">Nachname</label>
                      <input value={editingUser.lastName} onChange={e => setEditingUser({...editingUser, lastName: e.target.value})} className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-sm text-white outline-none focus:border-blue-600 transition-all" />
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-600 uppercase ml-2 tracking-widest">Dienstgrad</label>
                      <select 
                        value={editingUser.rank} 
                        onChange={e => setEditingUser({...editingUser, rank: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-sm text-white outline-none focus:border-blue-600 appearance-none cursor-pointer transition-all"
                      >
                        {Object.entries(RANKS).map(([group, ranks]) => (
                          <optgroup key={group} label={group} className="bg-slate-900 text-slate-400 font-black uppercase text-[10px]">
                            {ranks.map(rank => (
                              <option key={rank} value={rank} className="bg-slate-900 text-white font-normal capitalize">
                                {rank}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-600 uppercase ml-2 tracking-widest">Dienstnummer</label>
                      <input value={editingUser.badgeNumber} onChange={e => setEditingUser({...editingUser, badgeNumber: e.target.value})} className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-sm text-blue-400 font-mono font-black tracking-widest outline-none focus:border-blue-600 transition-all" />
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase ml-2 tracking-widest">Zuweisung Direktion / Einheit</label>
                    <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as Role})} className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-sm text-white outline-none focus:border-blue-600 appearance-none cursor-pointer transition-all">
                      {Object.values(Role).map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                    </select>
                 </div>
               </div>

               <div className="flex gap-6 pt-10">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 py-6 rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all">Abbrechen</button>
                  <button onClick={() => { saveUserToDB(editingUser); setIsModalOpen(false); }} className="flex-1 bg-blue-600 hover:bg-blue-500 py-6 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all shadow-blue-900/40 active:scale-95">Eintrag validieren</button>
               </div>
            </div>
          </div>
        )}
      </div>
    </PoliceOSWindow>
  );
};

export default AdminPanel;
