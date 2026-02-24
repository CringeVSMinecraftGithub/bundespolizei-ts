
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { CareerProfile, CareerComponent, User, Permission } from '../types';
import { dbCollections, onSnapshot, query, orderBy, addDoc, updateDoc, doc, db, where, getDocs, setDoc, deleteDoc } from '../firebase';
import PoliceOSWindow from '../components/PoliceOSWindow';
import DataModal from '../components/DataModal';

const CareerPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [profiles, setProfiles] = useState<CareerProfile[]>([]);
  const [components, setComponents] = useState<CareerComponent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<CareerProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'profile' | 'component' } | null>(null);
  const [editingProfile, setEditingProfile] = useState<Partial<CareerProfile> | null>(null);
  const [editingComponent, setEditingComponent] = useState<Partial<CareerComponent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  const [userSearch, setUserSearch] = useState('');

  const canManage = hasPermission(Permission.MANAGE_CAREER);

  useEffect(() => {
    if (!user) return;

    let unsubProfiles: () => void;
    if (canManage) {
      unsubProfiles = onSnapshot(query(dbCollections.careerProfiles, orderBy("updatedAt", "desc")), (snap) => {
        setProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() } as CareerProfile)));
      });
    } else {
      unsubProfiles = onSnapshot(query(dbCollections.careerProfiles, where("userId", "==", user.id)), (snap) => {
        const userProfiles = snap.docs.map(d => ({ id: d.id, ...d.data() } as CareerProfile));
        setProfiles(userProfiles);
        if (userProfiles.length > 0) setSelectedProfile(userProfiles[0]);
      });
    }

    const unsubComponents = onSnapshot(query(dbCollections.careerComponents, orderBy("order", "asc")), (snap) => {
      setComponents(snap.docs.map(d => ({ id: d.id, ...d.data() } as CareerComponent)));
    });

    const unsubUsers = onSnapshot(query(dbCollections.users), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)).filter(u => !u.isLocked));
    });

    setLoading(false);
    return () => {
      unsubProfiles();
      unsubComponents();
      unsubUsers();
    };
  }, [user, canManage]);

  const showStatus = (text: string, type: 'error' | 'success' = 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const profileComponents = useMemo(() => {
    if (!selectedProfile) return [];
    return components.filter(c => c.profileId === selectedProfile.id);
  }, [components, selectedProfile]);

  const progress = useMemo(() => {
    if (profileComponents.length === 0) return 0;
    const completed = profileComponents.filter(c => c.status === 'Abgeschlossen').length;
    return Math.round((completed / profileComponents.length) * 100);
  }, [profileComponents]);

  const saveProfile = async () => {
    if (!editingProfile || !canManage) return;
    if (!editingProfile.userId || !editingProfile.goal || !editingProfile.type || !editingProfile.startDate) {
      showStatus("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }

    const targetUser = users.find(u => u.id === editingProfile.userId);
    if (!targetUser) return;

    try {
      const data = {
        ...editingProfile,
        userName: `${targetUser.firstName} ${targetUser.lastName}`,
        userRank: targetUser.rank,
        updatedAt: new Date().toISOString(),
        createdAt: editingProfile.createdAt || new Date().toISOString(),
        status: editingProfile.status || 'Aktiv'
      };

      if (editingProfile.id) {
        await updateDoc(doc(db, "careerProfiles", editingProfile.id), data);
      } else {
        await addDoc(dbCollections.careerProfiles, data);
      }
      setIsProfileModalOpen(false);
      showStatus("Profil gespeichert.", "success");
    } catch (e) {
      showStatus("Fehler beim Speichern.");
    }
  };

  const saveComponent = async () => {
    if (!editingComponent || !selectedProfile || !canManage) return;
    if (!editingComponent.title) {
      showStatus("Titel ist erforderlich.");
      return;
    }

    try {
      const data = {
        ...editingComponent,
        profileId: selectedProfile.id,
        order: editingComponent.order || profileComponents.length + 1,
        status: editingComponent.status || 'Offen'
      };

      if (editingComponent.id) {
        await updateDoc(doc(db, "careerComponents", editingComponent.id), data);
      } else {
        await addDoc(dbCollections.careerComponents, data);
      }
      setIsComponentModalOpen(false);
      showStatus("Bestandteil gespeichert.", "success");
    } catch (e) {
      showStatus("Fehler beim Speichern.");
    }
  };

  const deleteProfile = async (id: string) => {
    if (!canManage) return;
    try {
      await deleteDoc(doc(db, "careerProfiles", id));
      // Also delete components
      const profileComps = components.filter(c => c.profileId === id);
      for (const comp of profileComps) {
        await deleteDoc(doc(db, "careerComponents", comp.id));
      }
      setSelectedProfile(null);
      setDeleteConfirm(null);
      showStatus("Profil gelöscht.", "success");
    } catch (e) {
      showStatus("Fehler beim Löschen.");
    }
  };

  const deleteComponent = async (id: string) => {
    if (!canManage) return;
    try {
      await deleteDoc(doc(db, "careerComponents", id));
      setDeleteConfirm(null);
      showStatus("Bestandteil gelöscht.", "success");
    } catch (e) {
      showStatus("Fehler beim Löschen.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.lastName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.badgeNumber.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <PoliceOSWindow title="Karriere & Ausbildung">
      <div className="h-full flex flex-col gap-6 overflow-hidden">
        
        {statusMsg && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-top-4 duration-300">
            <div className={`px-8 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 backdrop-blur-xl ${statusMsg.type === 'error' ? 'bg-red-600/20 border-red-500 text-red-500' : 'bg-emerald-600/20 border-emerald-500 text-emerald-500'}`}>
              <span className="text-lg">{statusMsg.type === 'error' ? '⚠️' : '✅'}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{statusMsg.text}</span>
            </div>
          </div>
        )}

        <div className="flex flex-1 gap-6 overflow-hidden">
          {/* Left Sidebar: Profile List (Admin) or Profile Info (User) */}
          <div className="w-80 shrink-0 flex flex-col gap-4 overflow-hidden">
            {canManage && (
              <button 
                onClick={() => { setEditingProfile({}); setIsProfileModalOpen(true); }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 mb-2"
              >
                Neues Karriereprofil
              </button>
            )}

            <div className="bg-[#1a1c23]/50 border border-white/5 rounded-[32px] flex flex-col overflow-hidden shadow-2xl flex-1">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                  {canManage ? 'Alle Profile' : 'Mein Profil'}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {profiles.length === 0 ? (
                  <div className="py-10 text-center opacity-20 text-[10px] font-black uppercase tracking-widest">
                    Keine Profile
                  </div>
                ) : (
                  profiles.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedProfile(p)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${selectedProfile?.id === p.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                      <div className="text-[10px] font-black uppercase truncate">{p.userName}</div>
                      <div className="text-[8px] font-bold uppercase opacity-60 mt-1">{p.goal} • {p.userRank}</div>
                          {canManage && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setEditingProfile(p); setIsProfileModalOpen(true); }}
                                  className="text-[8px] font-black uppercase hover:text-white"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: p.id, type: 'profile' }); }}
                                  className="text-[8px] font-black uppercase hover:text-red-400"
                                >
                                  Löschen
                                </button>
                              </div>
                            )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content: Progress & Components */}
          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            {selectedProfile ? (
              <>
                {/* Profile Header & Progress */}
                <div className="bg-[#1a1c23]/50 border border-white/5 rounded-[40px] p-8 shadow-2xl animate-in fade-in duration-500">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-blue-600/20 text-blue-500 rounded-3xl flex items-center justify-center text-4xl border border-blue-500/20 shadow-inner">
                        🎓
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Karriereziel</div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">{selectedProfile.goal}</h2>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedProfile.type}</span>
                          <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Start: {new Date(selectedProfile.startDate).toLocaleDateString('de-DE')}</span>
                          {selectedProfile.endDate && (
                            <>
                              <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ziel: {new Date(selectedProfile.endDate).toLocaleDateString('de-DE')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Status</div>
                      <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${selectedProfile.status === 'Abgeschlossen' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-500' : 'bg-blue-600/20 border-blue-500 text-blue-500'}`}>
                        {selectedProfile.status === 'Abgeschlossen' ? 'Abgeschlossen' : progress >= 90 ? 'Kurz vor Abschluss' : 'In Ausbildung'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gesamtfortschritt</div>
                      <div className="text-2xl font-black text-white">{progress}%</div>
                    </div>
                    <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Components List */}
                <div className="flex-1 bg-[#1a1c23]/50 border border-white/5 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ausbildungsbestandteile</h3>
                    {canManage && (
                      <button 
                        onClick={() => { setEditingComponent({}); setIsComponentModalOpen(true); }}
                        className="bg-white/5 hover:bg-white/10 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
                      >
                        Bestandteil hinzufügen
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-1 gap-4">
                      {profileComponents.map((comp, idx) => (
                        <div 
                          key={comp.id}
                          className="bg-black/20 border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:border-white/10 transition-all"
                        >
                          <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black border shadow-xl ${comp.status === 'Abgeschlossen' ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-500' : comp.status === 'In Bearbeitung' ? 'bg-amber-600/20 border-amber-500/30 text-amber-500' : 'bg-slate-800/50 border-white/5 text-slate-600'}`}>
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white uppercase tracking-tight">{comp.title}</h4>
                              {comp.description && <p className="text-[10px] text-slate-500 mt-1">{comp.description}</p>}
                              {comp.completionDate && (
                                <div className="text-[8px] font-mono text-emerald-500/60 uppercase mt-2">Abgeschlossen am {new Date(comp.completionDate).toLocaleDateString('de-DE')}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${comp.status === 'Abgeschlossen' ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-500' : comp.status === 'In Bearbeitung' ? 'bg-amber-600/20 border-amber-500/30 text-amber-500' : 'bg-white/5 border-white/10 text-slate-600'}`}>
                              {comp.status}
                            </div>
                            {canManage && (
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => { setEditingComponent(comp); setIsComponentModalOpen(true); }}
                                  className="p-2 bg-white/5 hover:bg-blue-600/20 text-slate-500 hover:text-blue-500 rounded-lg transition-all"
                                >
                                  ✏️
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirm({ id: comp.id, type: 'component' })}
                                  className="p-2 bg-white/5 hover:bg-red-600/20 text-slate-500 hover:text-red-500 rounded-lg transition-all"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {profileComponents.length === 0 && (
                        <div className="py-20 text-center opacity-20 flex flex-col items-center">
                          <div className="text-6xl mb-4">📋</div>
                          <div className="text-[10px] font-black uppercase tracking-[0.4em]">Keine Bestandteile definiert</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 bg-[#1a1c23]/30 border border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center opacity-20">
                <div className="text-8xl mb-6">🎓</div>
                <div className="text-xs font-black uppercase tracking-[0.5em]">Profil auswählen um Fortschritt zu sehen</div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <DataModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Löschen bestätigen"
          subtitle="Sicherheitsabfrage"
          icon="⚠️"
          maxWidth="max-w-md"
        >
          <div className="space-y-6">
            <p className="text-slate-400 text-xs text-center leading-relaxed">
              Möchten Sie diesen Eintrag wirklich unwiderruflich aus dem System löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => {
                  if (deleteConfirm?.type === 'profile') deleteProfile(deleteConfirm.id);
                  else if (deleteConfirm?.type === 'component') deleteComponent(deleteConfirm.id);
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl shadow-red-900/20"
              >
                Löschen bestätigen
              </button>
            </div>
          </div>
        </DataModal>

        {/* Profile Modal */}
        <DataModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          title={editingProfile?.id ? 'Profil bearbeiten' : 'Neues Karriereprofil'}
          icon="🎓"
          maxWidth="max-w-xl"
        >
          <div className="space-y-6">
            {!editingProfile?.id && (
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Beamter auswählen</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Name oder Dienstnummer suchen..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                  />
                  {userSearch && filteredUsers.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                      {filteredUsers.map(u => (
                        <div 
                          key={u.id}
                          onClick={() => {
                            setEditingProfile({ ...editingProfile, userId: u.id });
                            setUserSearch(`${u.firstName} ${u.lastName} (${u.badgeNumber})`);
                          }}
                          className="p-4 hover:bg-white/5 cursor-pointer flex items-center justify-between border-b border-white/5 last:border-0"
                        >
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white uppercase">{u.firstName} {u.lastName}</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase">{u.rank} • {u.badgeNumber}</span>
                          </div>
                          {editingProfile?.userId === u.id && <span className="text-blue-500 text-xs">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Karriereziel</label>
              <input 
                type="text"
                value={editingProfile?.goal || ''}
                onChange={(e) => setEditingProfile({ ...editingProfile, goal: e.target.value })}
                placeholder="z.B. Polizeimeister, Polizeikommissar..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Ausbildungsart</label>
              <input 
                type="text"
                value={editingProfile?.type || ''}
                onChange={(e) => setEditingProfile({ ...editingProfile, type: e.target.value })}
                placeholder="z.B. Studium, Ausbildung mD..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Startdatum</label>
                <input 
                  type="date"
                  value={editingProfile?.startDate || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, startDate: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Geplantes Ende</label>
                <input 
                  type="date"
                  value={editingProfile?.endDate || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, endDate: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Status</label>
              <select 
                value={editingProfile?.status || 'Aktiv'}
                onChange={(e) => setEditingProfile({ ...editingProfile, status: e.target.value as any })}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all appearance-none"
              >
                <option value="Aktiv">Aktiv</option>
                <option value="Abgeschlossen">Abgeschlossen</option>
              </select>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
              >
                Abbrechen
              </button>
              <button 
                onClick={saveProfile}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20"
              >
                Profil speichern
              </button>
            </div>
          </div>
        </DataModal>

        {/* Component Modal */}
        <DataModal
          isOpen={isComponentModalOpen}
          onClose={() => setIsComponentModalOpen(false)}
          title={editingComponent?.id ? 'Bestandteil bearbeiten' : 'Neuer Bestandteil'}
          icon="📋"
          maxWidth="max-w-xl"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Bezeichnung</label>
              <input 
                type="text"
                value={editingComponent?.title || ''}
                onChange={(e) => setEditingComponent({ ...editingComponent, title: e.target.value })}
                placeholder="z.B. Modul 1: Grundlagen..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Beschreibung</label>
              <textarea 
                value={editingComponent?.description || ''}
                onChange={(e) => setEditingComponent({ ...editingComponent, description: e.target.value })}
                placeholder="Optionale Details zum Modul..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white h-32 outline-none focus:border-blue-500 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Reihenfolge</label>
                <input 
                  type="number"
                  value={editingComponent?.order || ''}
                  onChange={(e) => setEditingComponent({ ...editingComponent, order: parseInt(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Status</label>
                <select 
                  value={editingComponent?.status || 'Offen'}
                  onChange={(e) => setEditingComponent({ ...editingComponent, status: e.target.value as any })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="Offen">Offen</option>
                  <option value="In Bearbeitung">In Bearbeitung</option>
                  <option value="Abgeschlossen">Abgeschlossen</option>
                </select>
              </div>
            </div>

            {editingComponent?.status === 'Abgeschlossen' && (
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Abschlussdatum</label>
                <input 
                  type="date"
                  value={editingComponent?.completionDate || ''}
                  onChange={(e) => setEditingComponent({ ...editingComponent, completionDate: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => setIsComponentModalOpen(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
              >
                Abbrechen
              </button>
              <button 
                onClick={saveComponent}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20"
              >
                Speichern
              </button>
            </div>
          </div>
        </DataModal>
      </div>
    </PoliceOSWindow>
  );
};

export default CareerPage;
