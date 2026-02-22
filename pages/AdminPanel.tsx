
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Permission, User, Law, UserRole } from '../types';
import { POLICE_LOGO_RAW, POLICE_RANKS } from '../constants';
import { dbCollections, onSnapshot, query, setDoc, doc, db, deleteDoc, addDoc, updateDoc } from '../firebase';
import PoliceOSWindow from '../components/PoliceOSWindow';

const LEGACY_PERMISSION_MAP: Record<string, Permission> = {
  'view_reports': Permission.VIEW_REPORTS,
  'create_reports': Permission.CREATE_REPORTS,
  'edit_reports': Permission.EDIT_REPORTS,
  'delete_reports': Permission.DELETE_REPORTS,
  'manage_users': Permission.MANAGE_USERS,
  'view_warrants': Permission.VIEW_WARRANTS,
  'manage_warrants': Permission.MANAGE_WARRANTS,
  'admin_access': Permission.ADMIN_ACCESS,
  'manage_laws': Permission.MANAGE_LAWS,
  'manage_fleet': Permission.MANAGE_FLEET,
  'manage_evidence': Permission.MANAGE_EVIDENCE,
  'view_applications': Permission.VIEW_APPLICATIONS,
  'manage_applications': Permission.MANAGE_APPLICATIONS,
  'view_tips': Permission.VIEW_TIPS,
  'manage_tips': Permission.MANAGE_TIPS,
  'view_calendar': Permission.VIEW_CALENDAR,
  'manage_calendar': Permission.MANAGE_CALENDAR,
  'manage_news': Permission.MANAGE_NEWS,
  'manage_org': Permission.MANAGE_ORG
};

const LAW_ABBREVIATIONS = [
  'StGB', 'StPO', 'StVO', 'StVG', 'FeV', 'BtMG', 'WaffG', 
  'OWiG', 'GG', 'AufenthG', 'AsylG', 'VersG', 'BPolG'
];

const AdminPanel: React.FC = () => {
  const { roles: allRoles, hasPermission, user: currentUser } = useAuth();
  const [tab, setTab] = useState<'Users' | 'Roles' | 'Laws'>('Users');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isLawModalOpen, setIsLawModalOpen] = useState(false);
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [editingLaw, setEditingLaw] = useState<Partial<Law> | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [laws, setLaws] = useState<Law[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [lawSearchTerm, setLawSearchTerm] = useState('');
  
  const [valErrors, setValErrors] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const sortLawsNumerically = (lawsList: Law[]) => {
    return [...lawsList].sort((a, b) => {
      const getParts = (p: string) => {
        const match = p.match(/(\d+)([a-z]*)/i);
        if (!match) return { num: 0, suffix: p.toLowerCase() };
        return { 
          num: parseInt(match[1], 10), 
          suffix: match[2].toLowerCase() 
        };
      };
      const aParts = getParts(a.paragraph);
      const bParts = getParts(b.paragraph);
      if (aParts.num !== bParts.num) return aParts.num - bParts.num;
      return aParts.suffix.localeCompare(bParts.suffix);
    });
  };

  useEffect(() => {
    const unsubUsers = onSnapshot(query(dbCollections.users), (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    });
    
    const unsubLaws = onSnapshot(query(dbCollections.laws), (snap) => {
      const rawLaws = snap.docs.map(d => ({ id: d.id, ...d.data() } as Law));
      setLaws(sortLawsNumerically(rawLaws));
    });

    return () => { unsubUsers(); unsubLaws(); };
  }, []);

  const showStatus = (text: string, type: 'error' | 'success' = 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const normalizePermissions = (perms: any[] = []): Permission[] => {
    if (!perms || !Array.isArray(perms)) return [];
    const normalized = perms.map(p => LEGACY_PERMISSION_MAP[p] || p as Permission);
    const validValues = Object.values(Permission) as string[];
    return Array.from(new Set(normalized)).filter(p => validValues.includes(p as string)) as Permission[];
  };

  const saveUser = async () => {
    if (!editingUser) return;
    try {
      await setDoc(doc(db, "users", editingUser.id), { 
        ...editingUser, 
        permissions: normalizePermissions(editingUser.permissions) 
      });
      setIsUserModalOpen(false);
      showStatus("Mitarbeiterprofil aktualisiert.", "success");
    } catch (e) { showStatus("Fehler beim Speichern."); }
  };

  const toggleUserLock = async (user: User) => {
    try {
      await updateDoc(doc(db, "users", user.id), {
        isLocked: !user.isLocked
      });
      showStatus(`Account ${user.isLocked ? 'entsperrt' : 'gesperrt'}.`, "success");
    } catch (e) {
      showStatus("Fehler beim Ändern des Sperrstatus.");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Soll dieser Account wirklich vollständig aus der Datenbank gelöscht werden?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      showStatus("Account vollständig gelöscht.", "success");
    } catch (e) {
      showStatus("Fehler beim Löschen des Accounts.");
    }
  };

  const saveRole = async () => {
    if (!editingRole) return;
    if (!editingRole.name.trim()) { showStatus("Name erforderlich."); return; }
    try {
      const id = editingRole.id || editingRole.name.toUpperCase().replace(/\s/g, '_');
      await setDoc(doc(db, "roles", id), { 
        ...editingRole, 
        id, 
        permissions: normalizePermissions(editingRole.permissions) 
      });
      setIsRoleModalOpen(false);
      showStatus("Rolle erfolgreich gespeichert.", "success");
    } catch (e) { showStatus("Fehler beim Speichern der Rolle."); }
  };

  const saveLaw = async () => {
    if (!editingLaw) return;
    const p = editingLaw.paragraph?.trim() || "";
    const t = editingLaw.title?.trim() || "";
    const c = editingLaw.category?.trim() || "";
    const errors: string[] = [];
    if (!p || p === '§') errors.push('paragraph');
    if (!t) errors.push('title');
    if (!c) errors.push('category');
    if (errors.length > 0) {
      setValErrors(errors);
      showStatus("Bitte füllen Sie alle markierten Pflichtfelder aus.");
      return;
    }
    try {
      const dataToSave = { ...editingLaw, paragraph: p, title: t, category: c };
      if (dataToSave.id) {
        await setDoc(doc(db, "laws", dataToSave.id), dataToSave);
      } else {
        await addDoc(dbCollections.laws, dataToSave);
      }
      setIsLawModalOpen(false);
      setEditingLaw(null);
      setValErrors([]);
      showStatus("Gesetzestext gespeichert.", "success");
    } catch (e) { showStatus("Datenbankfehler."); }
  };

  const deleteLaw = async (id: string) => {
    if (confirm("Eintrag wirklich löschen?")) {
      try {
        await deleteDoc(doc(db, "laws", id));
        showStatus("Gesetz gelöscht.", "success");
      } catch (e) { showStatus("Fehler beim Löschen."); }
    }
  };

  const filteredUsers = users.filter(u => 
    u.lastName.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
    u.firstName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.badgeNumber.toLowerCase().includes(userSearchTerm.toLowerCase())
  );
  
  const filteredLaws = laws.filter(l => 
    l.paragraph.toLowerCase().includes(lawSearchTerm.toLowerCase()) || 
    l.title.toLowerCase().includes(lawSearchTerm.toLowerCase()) ||
    l.category.toLowerCase().includes(lawSearchTerm.toLowerCase())
  );

  const groupedLaws = filteredLaws.reduce((groups: Record<string, Law[]>, law) => {
    const cat = law.category || 'Sonstiges';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(law);
    return groups;
  }, {});

  const sortedCategories = Object.keys(groupedLaws).sort();

  return (
    <PoliceOSWindow title="Systemadministration">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700 pb-24 relative">
        
        {statusMsg && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-top-4 duration-300">
            <div className={`px-8 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 backdrop-blur-xl ${statusMsg.type === 'error' ? 'bg-red-600/20 border-red-500 text-red-500' : 'bg-emerald-600/20 border-emerald-500 text-emerald-500'}`}>
              <span className="text-lg">{statusMsg.type === 'error' ? '⚠️' : '✅'}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{statusMsg.text}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-6 mb-8 border-b border-white/5 pb-6">
          <img src={POLICE_LOGO_RAW} alt="BPOL Logo" className="h-16 w-auto" />
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">System <span className="text-blue-500">Administration</span></h1>
        </div>

        <div className="flex gap-2 p-1.5 bg-[#1a1c23] border border-white/5 rounded-2xl w-fit shadow-xl">
          <button onClick={() => setTab('Users')} className={`px-8 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${tab === 'Users' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Mitarbeiter</button>
          {(currentUser?.isAdmin || hasPermission(Permission.ADMIN_ACCESS)) && (
            <>
              <button onClick={() => setTab('Roles')} className={`px-8 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${tab === 'Roles' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Rollen & Rechte</button>
              <button onClick={() => setTab('Laws')} className={`px-8 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${tab === 'Laws' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Gesetzestexte</button>
            </>
          )}
        </div>

        {tab === 'Users' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center bg-[#1a1c23]/50 p-4 rounded-3xl border border-white/5">
               <input value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} placeholder="Personal suchen..." className="bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-xs text-white w-72 outline-none focus:border-blue-500" />
               <button onClick={() => { setEditingUser({ id: `user-${Date.now()}`, firstName: '', lastName: '', rank: '', badgeNumber: '', role: 'DSL', specialRoles: [], isAdmin: false, permissions: [], isLocked: false }); setIsUserModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Account anlegen</button>
            </div>
            <div className="bg-[#1a1c23] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/50 text-slate-500 uppercase font-black tracking-widest border-b border-white/5">
                    <tr>
                      <th className="p-5">Mitarbeiter</th>
                      <th className="p-5">Dienstgrad</th>
                      <th className="p-5">Dienstnummer</th>
                      <th className="p-5">Hauptrolle</th>
                      <th className="p-5">Sonderrolle</th>
                      <th className="p-5 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-[11px]">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className={`hover:bg-white/[0.02] transition-all ${u.isLocked ? 'bg-red-900/10' : ''}`}>
                        <td className="p-5">
                          <div className="flex flex-col">
                            <span className={`font-black text-white uppercase ${u.isLocked ? 'text-red-400' : ''}`}>{u.firstName} {u.lastName}</span>
                            {u.isLocked && <span className="text-[7px] font-black text-red-500 uppercase tracking-widest">Konto gesperrt</span>}
                          </div>
                        </td>
                        <td className="p-5 text-slate-400 font-bold uppercase">{u.rank}</td>
                        <td className="p-5 font-mono text-blue-400 font-black">{u.badgeNumber}</td>
                        <td className="p-5">
                          <span className="bg-blue-600/10 text-blue-500 px-2 py-1 rounded text-[9px] font-black uppercase border border-blue-500/20">
                            {allRoles.find(r => r.id === u.role)?.name || u.role}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex flex-wrap gap-1">
                            {u.specialRoles?.length > 0 ? u.specialRoles.map(srId => {
                              const sr = allRoles.find(r => r.id === srId);
                              return (
                                <span key={srId} className="bg-indigo-600/10 text-indigo-400 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-indigo-600/20">
                                  {sr?.name || srId}
                                </span>
                              );
                            }) : <span className="text-slate-600 italic">Keine</span>}
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex justify-end gap-3">
                            <button onClick={() => { 
                              setEditingUser({ 
                                ...u, 
                                firstName: u.firstName || '',
                                lastName: u.lastName || '',
                                rank: u.rank || '',
                                badgeNumber: u.badgeNumber || '',
                                role: u.role || 'DSL',
                                specialRoles: u.specialRoles || [],
                                permissions: normalizePermissions(u.permissions) 
                              }); 
                              setIsUserModalOpen(true); 
                            }} className="text-blue-500 text-[10px] font-black uppercase hover:text-white transition-colors">Edit</button>
                            <button onClick={() => toggleUserLock(u)} className={`${u.isLocked ? 'text-emerald-500' : 'text-amber-500'} text-[10px] font-black uppercase hover:text-white transition-colors`}>
                              {u.isLocked ? 'Entsperren' : 'Sperren'}
                            </button>
                            <button onClick={() => deleteUser(u.id)} className="text-red-500 text-[10px] font-black uppercase hover:text-white transition-colors">Löschen</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        )}

        {tab === 'Roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-2">
             {['Hauptrollen', 'Sonderrollen'].map(type => (
                <div key={type} className="bg-[#1a1c23] border border-white/5 p-6 rounded-[32px] shadow-2xl">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter">{type}</h3>
                      <button onClick={() => { setEditingRole({ id: '', name: '', permissions: [], isSpecial: type === 'Sonderrollen' }); setIsRoleModalOpen(true); }} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest">Hinzufügen</button>
                   </div>
                   <div className="space-y-2">
                      {allRoles.filter(r => type === 'Sonderrollen' ? r.isSpecial : !r.isSpecial).map(r => (
                        <div key={r.id} className="bg-black/30 border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:border-blue-500/30 transition-all">
                           <div className="text-[10px] font-black text-white uppercase">{r.name} <span className="text-slate-500 font-bold ml-2">({normalizePermissions(r.permissions).length} Rechte)</span></div>
                           <button onClick={() => { 
                              setEditingRole({ 
                                ...r, 
                                name: r.name || '',
                                permissions: normalizePermissions(r.permissions),
                                isSpecial: r.isSpecial || false
                              }); 
                              setIsRoleModalOpen(true); 
                            }} className="text-blue-500 text-[10px] font-black uppercase">Edit</button>
                        </div>
                      ))}
                   </div>
                </div>
             ))}
          </div>
        )}

        {tab === 'Laws' && (
          <div className="space-y-4 animate-in slide-in-from-left-2">
            <div className="flex justify-between items-center bg-[#1a1c23]/50 p-4 rounded-3xl border border-white/5">
               <div className="flex items-center gap-3 bg-black/40 border border-white/10 p-2 px-4 rounded-xl w-80 shadow-inner">
                  <span className="text-slate-600">🔍</span>
                  <input value={lawSearchTerm} onChange={e => setLawSearchTerm(e.target.value)} placeholder="Suche nach § oder Titel..." className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-white flex-1" />
               </div>
               <button onClick={() => { setValErrors([]); setEditingLaw({ paragraph: '§ ', title: '', category: '', description: '' }); setIsLawModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20">Neues Gesetz erfassen</button>
            </div>
            
            <div className="space-y-6">
              {sortedCategories.map(cat => (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-3 px-4">
                    <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">{cat}</h3>
                    <div className="h-px flex-1 bg-blue-500/10"></div>
                  </div>
                  <div className="bg-[#1a1c23]/80 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-black/50 text-slate-600 uppercase font-black tracking-widest border-b border-white/5">
                        <tr>
                          <th className="px-6 py-2.5 w-24 shrink-0">§ Paragraph</th>
                          <th className="px-6 py-2.5 w-20 shrink-0 text-center">Gesetz</th>
                          <th className="px-6 py-2.5 w-1/4">Bezeichnung</th>
                          <th className="px-6 py-2.5">Beschreibung</th>
                          <th className="px-6 py-2.5 text-right w-32">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03] text-[10.5px]">
                        {groupedLaws[cat].map(l => (
                          <tr key={l.id} className="hover:bg-white/[0.01] transition-all">
                            <td className="px-6 py-1.5 font-black text-blue-400 font-mono">{l.paragraph}</td>
                            <td className="px-6 py-1.5 text-center">
                               <span className="bg-blue-600/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase">{l.category}</span>
                            </td>
                            <td className="px-6 py-1.5 font-black text-white uppercase tracking-tight">{l.title}</td>
                            <td className="px-6 py-1.5 text-slate-500 italic truncate max-w-xs">{l.description || 'N/A'}</td>
                            <td className="px-6 py-1.5 text-right">
                               <div className="flex justify-end gap-3">
                                  <button onClick={() => { 
                                    setValErrors([]); 
                                    setEditingLaw({
                                      ...l,
                                      paragraph: l.paragraph || '',
                                      title: l.title || '',
                                      category: l.category || '',
                                      description: l.description || ''
                                    }); 
                                    setIsLawModalOpen(true); 
                                  }} className="text-blue-500 font-black uppercase text-[9px] hover:text-white transition-colors">Edit</button>
                                  <button onClick={() => deleteLaw(l.id)} className="text-red-500 font-black uppercase text-[9px] hover:text-white transition-colors">Löschen</button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {filteredLaws.length === 0 && <div className="p-20 text-center opacity-20 uppercase tracking-[0.5em] text-xs">Keine Treffer</div>}
            </div>
          </div>
        )}
      </div>

      {isLawModalOpen && editingLaw && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-200">
           <div className="bg-[#0a0c10] border border-white/10 p-10 rounded-[40px] w-full max-w-xl space-y-8 shadow-2xl relative">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{editingLaw.id ? 'Gesetz editieren' : 'Neuer Eintrag'}</h2>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Gesetz (Kürzel)</label>
                    <select 
                      value={editingLaw.category} 
                      onChange={e => {
                        setEditingLaw({...editingLaw, category: e.target.value});
                        setValErrors(prev => prev.filter(err => err !== 'category'));
                      }} 
                      className={`w-full bg-black border p-4 rounded-xl text-white outline-none focus:border-blue-600 uppercase font-black appearance-none cursor-pointer transition-all ${valErrors.includes('category') ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-white/10'}`}
                    >
                      <option value="" disabled>Auswählen...</option>
                      {LAW_ABBREVIATIONS.map(abbr => (
                        <option key={abbr} value={abbr} className="bg-slate-900">{abbr}</option>
                      ))}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Paragraph</label>
                    <input 
                      value={editingLaw.paragraph} 
                      onChange={e => {
                        setEditingLaw({...editingLaw, paragraph: e.target.value});
                        setValErrors(prev => prev.filter(err => err !== 'paragraph'));
                      }} 
                      className={`w-full bg-black border p-4 rounded-xl text-white outline-none focus:border-blue-600 font-mono transition-all ${valErrors.includes('paragraph') ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-white/10'}`} 
                      placeholder="§ 242" 
                    />
                 </div>
                 <div className="col-span-2 space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Titel</label>
                    <input 
                      value={editingLaw.title} 
                      onChange={e => {
                        setEditingLaw({...editingLaw, title: e.target.value});
                        setValErrors(prev => prev.filter(err => err !== 'title'));
                      }} 
                      className={`w-full bg-black border p-4 rounded-xl text-white outline-none focus:border-blue-600 uppercase font-black transition-all ${valErrors.includes('title') ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-white/10'}`} 
                      placeholder="Diebstahl" 
                    />
                 </div>
                 <div className="col-span-2 space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Beschreibung</label>
                    <textarea 
                      value={editingLaw.description} 
                      onChange={e => setEditingLaw({...editingLaw, description: e.target.value})} 
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-white text-xs h-24 outline-none resize-none focus:border-blue-600" 
                      placeholder="Zusätzliche Informationen..." 
                    />
                 </div>
              </div>
              <div className="flex gap-4 pt-4">
                 <button onClick={() => { setIsLawModalOpen(false); setStatusMsg(null); setValErrors([]); }} className="flex-1 py-4 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors">Abbrechen</button>
                 <button onClick={saveLaw} className="flex-2 bg-blue-600 py-4 px-10 rounded-2xl font-black uppercase text-[9px] tracking-widest text-white shadow-xl active:scale-95 transition-all">Daten Speichern</button>
              </div>
           </div>
        </div>
      )}

      {isRoleModalOpen && editingRole && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-8 animate-in fade-in">
           <div className="bg-[#0a111f] border border-white/10 p-12 rounded-[50px] w-full max-w-2xl space-y-10 shadow-2xl relative">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Rolle konfigurieren</h2>
              <input value={editingRole.name || ''} onChange={e => setEditingRole({...editingRole, name: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black uppercase outline-none focus:border-blue-600" placeholder="Rollenname" />
              <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-3xl border border-white/5">
                 {Object.values(Permission).map(p => {
                   const isChecked = (editingRole.permissions || []).includes(p);
                   return (
                     <label key={p} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 border border-white/5 transition-all group">
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={e => {
                            const currentPerms = editingRole.permissions || [];
                            const permsSet = new Set(currentPerms);
                            if (e.target.checked) permsSet.add(p); else permsSet.delete(p);
                            setEditingRole({...editingRole, permissions: Array.from(permsSet)});
                          }} 
                          className="w-5 h-5 rounded-lg border-white/10 bg-slate-800 text-blue-600 focus:ring-0" 
                        />
                        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isChecked ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>{p}</span>
                     </label>
                   );
                 })}
              </div>
              <div className="flex gap-4 pt-8 border-t border-white/5">
                 <button onClick={() => { setIsRoleModalOpen(false); setStatusMsg(null); }} className="flex-1 bg-white/5 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:text-white transition-colors">Abbrechen</button>
                 <button onClick={saveRole} className="flex-1 bg-blue-600 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white shadow-xl shadow-blue-900/40 active:scale-95 transition-all">Rolle Speichern</button>
              </div>
           </div>
        </div>
      )}

      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-8 animate-in fade-in">
           <div className="bg-[#0a111f] border border-white/10 p-12 rounded-[50px] w-full max-w-2xl space-y-10 shadow-2xl relative">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Mitarbeiterprofil</h2>
               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Vorname</label><input value={editingUser.firstName || ''} onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none" /></div>
                 <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Nachname</label><input value={editingUser.lastName || ''} onChange={e => setEditingUser({...editingUser, lastName: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none" /></div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Dienstgrad</label>
                    <select value={editingUser.rank || ''} onChange={e => setEditingUser({...editingUser, rank: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none">
                       <option value="" disabled>Auswählen...</option>
                       {['Höherer Dienst', 'Gehobener Dienst', 'Mittlerer Dienst'].map(group => (
                         <optgroup key={group} label={group} className="bg-slate-950 text-blue-500 font-black">
                           {POLICE_RANKS.filter(r => r.group === group).map(rank => (
                             <option key={rank.name} value={rank.name} className="bg-slate-900 text-white font-bold">
                               {rank.name}
                             </option>
                           ))}
                         </optgroup>
                       ))}
                    </select>
                 </div>
                 <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Dienstnummer</label><input value={editingUser.badgeNumber || ''} onChange={e => setEditingUser({...editingUser, badgeNumber: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-blue-400 font-black uppercase outline-none" /></div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Hauptrolle</label>
                    <select value={editingUser.role || ''} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none">
                       {allRoles.filter(r => !r.isSpecial).map(r => <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>)}
                    </select>
                 </div>
                 <div className="col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Sonderrollen</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar bg-black/20 p-4 rounded-xl">
                       {allRoles.filter(r => r.isSpecial).map(r => {
                         const isChecked = (editingUser.specialRoles || []).includes(r.id);
                         return (
                           <label key={r.id} className="flex items-center gap-2 cursor-pointer group">
                              <input type="checkbox" checked={isChecked} onChange={e => {
                                 const sRoles = new Set(editingUser.specialRoles || []);
                                 if (e.target.checked) sRoles.add(r.id); else sRoles.delete(r.id);
                                 setEditingUser({...editingUser, specialRoles: Array.from(sRoles)});
                              }} className="w-4 h-4 rounded border-white/10 bg-slate-800 text-indigo-600" />
                              <span className={`text-[9px] font-bold uppercase transition-colors ${isChecked ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'}`}>{r.name}</span>
                           </label>
                         );
                       })}
                       {allRoles.filter(r => r.isSpecial).length === 0 && <div className="col-span-2 text-[8px] text-slate-600 uppercase italic">Keine Sonderrollen konfiguriert</div>}
                    </div>
                 </div>
                 <div className="col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Zusätzliche Berechtigungen (Manuell)</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar bg-black/20 p-4 rounded-xl">
                       {Object.values(Permission).map(p => {
                         const isChecked = (editingUser.permissions || []).includes(p);
                         return (
                           <label key={p} className="flex items-center gap-2 cursor-pointer group">
                              <input type="checkbox" checked={isChecked} onChange={e => {
                                 const perms = new Set(editingUser.permissions || []);
                                 if (e.target.checked) perms.add(p); else perms.delete(p);
                                 setEditingUser({...editingUser, permissions: Array.from(perms)});
                              }} className="w-4 h-4 rounded border-white/10 bg-slate-800 text-blue-600" />
                              <span className={`text-[9px] font-bold uppercase transition-colors ${isChecked ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`}>{p}</span>
                           </label>
                         );
                       })}
                    </div>
                 </div>
              </div>
              <div className="flex gap-4 pt-8">
                 <button onClick={() => { setIsUserModalOpen(false); setStatusMsg(null); }} className="flex-1 bg-white/5 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Abbrechen</button>
                 <button onClick={saveUser} className="flex-1 bg-blue-600 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Speichern</button>
              </div>
           </div>
        </div>
      )}
    </PoliceOSWindow>
  );
};

export default AdminPanel;
