
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { Permission, User, Law, UserRole } from '../types';
import { POLICE_LOGO_RAW } from '../constants';
import { dbCollections, onSnapshot, query, orderBy, setDoc, doc, db, deleteDoc, addDoc } from '../firebase';
import PoliceOSWindow from '../components/PoliceOSWindow';

// Mapping-Tabelle für alte englische Keys auf neue deutsche Enum-Werte
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
  'manage_news': Permission.MANAGE_NEWS
};

const AdminPanel: React.FC = () => {
  const { roles: allRoles } = useAuth();
  const [tab, setTab] = useState<'Users' | 'Roles' | 'Laws'>('Users');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [laws, setLaws] = useState<Law[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(query(dbCollections.users), (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    });
    const unsubLaws = onSnapshot(query(dbCollections.laws, orderBy("paragraph", "asc")), (snap) => {
      setLaws(snap.docs.map(d => ({ id: d.id, ...d.data() } as Law)));
    });
    return () => { unsubUsers(); unsubLaws(); };
  }, []);

  // Hilfsfunktion zur Bereinigung von Berechtigungen (Migration alter Keys)
  const normalizePermissions = (perms: any[] = []): Permission[] => {
    const normalized = perms.map(p => {
      // Wenn es ein alter Key ist, mappe ihn auf das deutsche Label
      if (LEGACY_PERMISSION_MAP[p]) return LEGACY_PERMISSION_MAP[p];
      // Sonst lass es so (falls es schon ein deutsches Label ist)
      return p as Permission;
    });
    // Entferne Duplikate und ungültige Werte
    const validValues = Object.values(Permission) as string[];
    return Array.from(new Set(normalized)).filter(p => validValues.includes(p)) as Permission[];
  };

  const handleEditUser = (user: User) => {
    setEditingUser({
      ...user,
      permissions: normalizePermissions(user.permissions || [])
    });
    setIsUserModalOpen(true);
  };

  const handleEditRole = (role: UserRole) => {
    setEditingRole({
      ...role,
      permissions: normalizePermissions(role.permissions || [])
    });
    setIsRoleModalOpen(true);
  };

  const saveUser = async () => {
    if (editingUser) {
      const cleanedUser = {
        ...editingUser,
        permissions: normalizePermissions(editingUser.permissions)
      };
      await setDoc(doc(db, "users", editingUser.id), cleanedUser);
    }
    setIsUserModalOpen(false);
  };

  const saveRole = async () => {
    if (editingRole) {
      const id = editingRole.id || editingRole.name.toUpperCase().replace(/\s/g, '_');
      const cleanedRole = {
        ...editingRole,
        id,
        permissions: normalizePermissions(editingRole.permissions)
      };
      await setDoc(doc(db, "roles", id), cleanedRole);
    }
    setIsRoleModalOpen(false);
  };

  const deleteRole = async (id: string) => {
    if (confirm("Rolle wirklich löschen?")) await deleteDoc(doc(db, "roles", id));
  };

  const filteredUsers = users.filter(u => 
    u.lastName.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
    u.badgeNumber.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  return (
    <PoliceOSWindow title="Systemadministration">
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-24">
        <div className="flex items-center gap-8 mb-10 border-b border-white/10 pb-10">
          <img src={POLICE_LOGO_RAW} alt="BPOL Logo" className="h-24 w-auto drop-shadow-lg" />
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Administration</h1>
            <p className="text-blue-500 uppercase tracking-widest text-[9px] font-black mt-2">Zentrale Systemsteuerung • Mitarbeiter & Berechtigungen</p>
          </div>
        </div>

        <div className="flex gap-4 p-1.5 bg-slate-900 border border-slate-700/50 rounded-2xl w-fit shadow-2xl">
          <button onClick={() => setTab('Users')} className={`px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'Users' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Mitarbeiter</button>
          <button onClick={() => setTab('Roles')} className={`px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'Roles' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Rollen & Rechte</button>
          <button onClick={() => setTab('Laws')} className={`px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'Laws' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Gesetzestexte</button>
        </div>

        {tab === 'Users' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-end bg-[#1a1c23] p-8 rounded-[40px] border border-white/5 shadow-2xl">
               <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Personal-Datenbank durchsuchen</label>
                  <input value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} placeholder="Name oder Dienstnummer..." className="bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white w-96 outline-none focus:border-blue-500" />
               </div>
               <button onClick={() => {
                 setEditingUser({ id: `user-${Date.now()}`, firstName: '', lastName: '', rank: '', badgeNumber: '', role: 'DSL', specialRoles: [], isAdmin: false, permissions: [] });
                 setIsUserModalOpen(true);
               }} className="bg-blue-600 hover:bg-blue-500 px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Neuen Account anlegen</button>
            </div>
            
            <div className="bg-[#1a1c23] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/50 text-slate-500 uppercase font-black tracking-widest border-b border-white/5">
                    <tr><th className="p-8">Mitarbeiter</th><th className="p-8">Dienstnummer</th><th className="p-8">Hauptrolle</th><th className="p-8">Sonderrollen</th><th className="p-8 text-right">Aktionen</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-all">
                        <td className="p-8">
                           <div className="font-black text-white uppercase">{u.rank} {u.lastName}</div>
                           <div className="text-[10px] text-slate-500">{u.firstName} {u.lastName}</div>
                        </td>
                        <td className="p-8 font-mono text-blue-400 font-black">{u.badgeNumber}</td>
                        <td className="p-8">
                           <span className="bg-blue-600/10 text-blue-400 px-3 py-1 rounded-lg border border-blue-600/20 text-[9px] font-black uppercase">
                              {allRoles.find(r => r.id === u.role)?.name || u.role}
                           </span>
                        </td>
                        <td className="p-8">
                           <div className="flex flex-wrap gap-1">
                              {u.specialRoles?.map(srId => (
                                <span key={srId} className="text-[7px] bg-indigo-600/10 text-indigo-400 px-2 py-1 rounded border border-indigo-600/20 uppercase font-black">
                                  {allRoles.find(r => r.id === srId)?.name || srId}
                                </span>
                              ))}
                           </div>
                        </td>
                        <td className="p-8 text-right">
                          <button onClick={() => handleEditUser(u)} className="bg-white/5 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all">Bearbeiten</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        )}

        {tab === 'Roles' && (
           <div className="space-y-10 animate-in slide-in-from-right-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-[#1a1c23] border border-white/5 p-10 rounded-[40px] shadow-2xl">
                    <div className="flex justify-between items-center mb-10">
                       <div>
                          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Hauptrollen</h3>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Dienstgrade & Stamm-Funktionen</p>
                       </div>
                       <button onClick={() => { setEditingRole({ id: '', name: '', permissions: [], isSpecial: false }); setIsRoleModalOpen(true); }} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase">Rolle hinzufügen</button>
                    </div>
                    <div className="space-y-3">
                       {allRoles.filter(r => !r.isSpecial).map(r => (
                         <div key={r.id} className="bg-black/40 border border-white/5 p-5 rounded-2xl flex justify-between items-center group hover:border-blue-500/30 transition-all">
                            <div>
                               <div className="text-xs font-black text-white uppercase">{r.name}</div>
                               <div className="text-[8px] text-slate-600 mt-1 uppercase font-bold">{normalizePermissions(r.permissions).length} Rechte aktiv</div>
                            </div>
                            <div className="flex gap-4">
                               <button onClick={() => handleEditRole(r)} className="text-blue-500 text-[10px] font-black uppercase hover:text-white">Bearbeiten</button>
                               <button onClick={() => deleteRole(r.id)} className="text-red-500 text-[10px] font-black uppercase hover:text-white">Löschen</button>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="bg-[#1a1c23] border border-white/5 p-10 rounded-[40px] shadow-2xl">
                    <div className="flex justify-between items-center mb-10">
                       <div>
                          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Sonderrollen <span className="text-indigo-500">(Zusatz)</span></h3>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Spezialfunktionen & Admin-Rechte</p>
                       </div>
                       <button onClick={() => { setEditingRole({ id: '', name: '', permissions: [], isSpecial: true }); setIsRoleModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase">Rolle hinzufügen</button>
                    </div>
                    <div className="space-y-3">
                       {allRoles.filter(r => r.isSpecial).map(r => (
                         <div key={r.id} className="bg-indigo-600/5 border border-indigo-600/20 p-5 rounded-2xl flex justify-between items-center group hover:border-indigo-600 transition-all">
                            <div>
                               <div className="text-xs font-black text-white uppercase">{r.name}</div>
                               <div className="text-[8px] text-indigo-400 mt-1 uppercase font-bold tracking-widest">{normalizePermissions(r.permissions).length} Zusatzrechte</div>
                            </div>
                            <div className="flex gap-4">
                               <button onClick={() => handleEditRole(r)} className="text-indigo-400 text-[10px] font-black uppercase hover:text-white">Bearbeiten</button>
                               <button onClick={() => deleteRole(r.id)} className="text-red-500 text-[10px] font-black uppercase hover:text-white">Löschen</button>
                            </div>
                         </div>
                       ))}
                       {allRoles.filter(r => r.isSpecial).length === 0 && (
                         <div className="py-10 text-center text-[9px] font-black text-slate-700 uppercase tracking-widest italic">Keine Sonderrollen definiert</div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>

      {isRoleModalOpen && editingRole && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-8 animate-in fade-in">
           <div className="bg-[#0a111f] border border-white/10 p-12 rounded-[50px] w-full max-w-2xl space-y-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{editingRole.isSpecial ? 'Sonderrolle' : 'Hauptrolle'} konfigurieren</h2>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Name der Rolle</label>
                    <input value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-blue-600" placeholder="z.B. Dienstgruppenleitung..." />
                 </div>
                 <div className="space-y-4">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Berechtigungen für dieses Profil</label>
                    <div className="grid grid-cols-2 gap-2">
                       {Object.values(Permission).map(p => (
                         <label key={p} className="flex items-center gap-3 p-3 bg-black/30 rounded-xl cursor-pointer hover:bg-white/5 border border-white/5 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={(editingRole.permissions || []).includes(p)} 
                              onChange={(e) => {
                                 const permsSet = new Set(editingRole.permissions || []);
                                 if (e.target.checked) permsSet.add(p);
                                 else permsSet.delete(p);
                                 setEditingRole({...editingRole, permissions: Array.from(permsSet)});
                              }} 
                              className="w-4 h-4 rounded-md border-white/10 bg-slate-800 text-blue-600" 
                            />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p}</span>
                         </label>
                       ))}
                    </div>
                 </div>
              </div>
              <div className="flex gap-4 pt-8">
                 <button onClick={() => setIsRoleModalOpen(false)} className="flex-1 bg-white/5 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest">Abbrechen</button>
                 <button onClick={saveRole} className="flex-1 bg-blue-600 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-950/20 transition-all active:scale-95">Rolle Speichern</button>
              </div>
           </div>
        </div>
      )}

      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-8 animate-in fade-in">
           <div className="bg-[#0a111f] border border-white/10 p-12 rounded-[50px] w-full max-w-2xl space-y-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Mitarbeiterprofil bearbeiten</h2>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Vorname</label>
                    <input value={editingUser.firstName} onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Nachname</label>
                    <input value={editingUser.lastName} onChange={e => setEditingUser({...editingUser, lastName: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Hauptrolle (Dienstgrad)</label>
                    <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none cursor-pointer">
                       {allRoles.filter(r => !r.isSpecial).map(r => <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Dienstnummer</label>
                    <input value={editingUser.badgeNumber} onChange={e => setEditingUser({...editingUser, badgeNumber: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-blue-400 font-black uppercase tracking-widest outline-none focus:border-blue-500" />
                 </div>
              </div>
              <div className="space-y-4">
                 <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Zusätzliche Sonderrollen</label>
                 <div className="grid grid-cols-2 gap-2">
                    {allRoles.filter(r => r.isSpecial).map(r => (
                      <label key={r.id} className="flex items-center gap-3 p-3 bg-indigo-600/5 rounded-xl cursor-pointer hover:bg-indigo-600/10 border border-indigo-600/10 transition-colors">
                         <input type="checkbox" checked={editingUser.specialRoles?.includes(r.id)} onChange={(e) => {
                            const sr = editingUser.specialRoles || [];
                            const next = e.target.checked ? [...sr, r.id] : sr.filter(x => x !== r.id);
                            setEditingUser({...editingUser, specialRoles: next});
                         }} className="w-4 h-4 rounded-md border-indigo-600/30 bg-slate-800 text-indigo-600" />
                         <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{r.name}</span>
                      </label>
                    ))}
                 </div>
              </div>
              <div className="flex gap-4 pt-8">
                 <button onClick={() => setIsUserModalOpen(false)} className="flex-1 bg-white/5 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-colors hover:bg-white/10">Abbrechen</button>
                 <button onClick={saveUser} className="flex-1 bg-blue-600 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-950/20 transition-all active:scale-95">Profil Speichern</button>
              </div>
           </div>
        </div>
      )}
    </PoliceOSWindow>
  );
};

export default AdminPanel;
