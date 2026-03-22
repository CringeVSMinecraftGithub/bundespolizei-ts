
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { CareerProfile, CareerComponent, User, Permission, Training } from '../types';
import { dbCollections, onSnapshot, query, orderBy, addDoc, updateDoc, doc, db, where, getDocs, setDoc, deleteDoc } from '../firebase';
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
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [activeTab, setActiveTab] = useState<'MyCareer' | 'Trainings' | 'Courses' | 'ManageCareers' | 'ManageTrainings' | 'ManageCourses'>('MyCareer');
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Partial<Training> | null>(null);

  const canManageCareer = hasPermission(Permission.MANAGE_CAREER);
  const canManageTrainings = hasPermission(Permission.MANAGE_TRAININGS);
  const canManageCourses = hasPermission(Permission.MANAGE_COURSES);

  useEffect(() => {
    if (!user) return;

    const unsubProfiles = onSnapshot(query(dbCollections.careerProfiles), (snap) => {
      const allProfiles = snap.docs.map(d => ({ id: d.id, ...d.data() } as CareerProfile));
      if (canManageCareer) {
        setProfiles(allProfiles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      } else {
        const myProfiles = allProfiles.filter(p => p.userId === user.id);
        setProfiles(myProfiles);
        if (myProfiles.length > 0 && !selectedProfile) setSelectedProfile(myProfiles[0]);
      }
    });

    const unsubComponents = onSnapshot(query(dbCollections.careerComponents, orderBy("order", "asc")), (snap) => {
      setComponents(snap.docs.map(d => ({ id: d.id, ...d.data() } as CareerComponent)));
    });

    const unsubUsers = onSnapshot(query(dbCollections.users), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)).filter(u => !u.isLocked));
    });

    const unsubTrainings = onSnapshot(query(dbCollections.trainings, orderBy("date", "asc")), (snap) => {
      setTrainings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Training)));
    });

    setLoading(false);
    return () => {
      unsubProfiles();
      unsubComponents();
      unsubUsers();
      unsubTrainings();
    };
  }, [user, canManageCareer]);

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

  const saveTraining = async () => {
    if (!editingTraining || !user) return;
    if (!editingTraining.title || !editingTraining.date || !editingTraining.time || !editingTraining.type) {
      showStatus("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }

    try {
      const data = {
        ...editingTraining,
        instructorId: editingTraining.instructorId || user.id,
        instructorName: editingTraining.instructorName || `${user.rank} ${user.lastName}`,
        createdAt: editingTraining.createdAt || new Date().toISOString(),
        participants: editingTraining.participants || [],
        status: editingTraining.status || 'Geplant'
      };

      if (editingTraining.id) {
        await updateDoc(doc(db, "trainings", editingTraining.id), data);
      } else {
        await addDoc(dbCollections.trainings, data);
      }
      setIsTrainingModalOpen(false);
      showStatus("Training gespeichert.", "success");
    } catch (e) {
      showStatus("Fehler beim Speichern.");
    }
  };

  const deleteTraining = async (id: string) => {
    try {
      await deleteDoc(doc(db, "trainings", id));
      showStatus("Training gelöscht.", "success");
    } catch (e) {
      showStatus("Fehler beim Löschen.");
    }
  };

  const joinTraining = async (trainingId: string) => {
    if (!user) return;
    try {
      const training = trainings.find(t => t.id === trainingId);
      if (!training) return;
      if (training.participants.includes(user.id)) return;
      if (training.participants.length >= training.maxParticipants) {
        showStatus("Training ist bereits voll.");
        return;
      }

      const updatedParticipants = [...training.participants, user.id];
      await updateDoc(doc(db, "trainings", trainingId), { participants: updatedParticipants });
      showStatus("Erfolgreich angemeldet.", "success");
    } catch (e) {
      showStatus("Fehler bei der Anmeldung.");
    }
  };

  const leaveTraining = async (trainingId: string) => {
    if (!user) return;
    try {
      const training = trainings.find(t => t.id === trainingId);
      if (!training) return;
      if (!training.participants.includes(user.id)) return;

      const updatedParticipants = training.participants.filter(id => id !== user.id);
      await updateDoc(doc(db, "trainings", trainingId), { participants: updatedParticipants });
      showStatus("Erfolgreich abgemeldet.", "success");
    } catch (e) {
      showStatus("Fehler bei der Abmeldung.");
    }
  };

  const saveProfile = async () => {
    if (!editingProfile || !canManageCareer) return;
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
    if (!editingComponent || !selectedProfile || !canManageCareer) return;
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
    if (!canManageCareer) return;
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
    if (!canManageCareer) return;
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
    <div className="h-full flex flex-col gap-6 overflow-hidden">
        
        {statusMsg && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-top-4 duration-300">
            <div className={`px-8 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 backdrop-blur-xl ${statusMsg.type === 'error' ? 'bg-red-600/20 border-red-500 text-red-500' : 'bg-emerald-600/20 border-emerald-500 text-emerald-500'}`}>
              <span className="text-lg">{statusMsg.type === 'error' ? '⚠️' : '✅'}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{statusMsg.text}</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-2">Beamte</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('MyCareer')}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'MyCareer' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Meine Karriere
              </button>
              <button 
                onClick={() => setActiveTab('Trainings')}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'Trainings' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Ausbildungen
              </button>
              <button 
                onClick={() => setActiveTab('Courses')}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'Courses' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Fortbildungen
              </button>
            </div>
          </div>

          {(canManageCareer || canManageTrainings || canManageCourses) && (
            <div className="flex flex-col gap-2 border-l border-slate-200 pl-4">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider ml-2">Ausbilder</span>
              <div className="flex gap-2">
                {canManageCareer && (
                  <button 
                    onClick={() => setActiveTab('ManageCareers')}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'ManageCareers' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                  >
                    Karrieren verwalten
                  </button>
                )}
                {canManageTrainings && (
                  <button 
                    onClick={() => setActiveTab('ManageTrainings')}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'ManageTrainings' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                  >
                    Ausbildungen verwalten
                  </button>
                )}
                {canManageCourses && (
                  <button 
                    onClick={() => setActiveTab('ManageCourses')}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'ManageCourses' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                  >
                    Fortbildungen verwalten
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-1 gap-6 overflow-hidden">
          {/* Main Content Area */}
          {(activeTab === 'MyCareer' || activeTab === 'ManageCareers') && (
            <div className="flex flex-1 gap-6 overflow-hidden">
              {/* Left Sidebar: Profile List */}
              <div className="w-80 shrink-0 flex flex-col gap-4 overflow-hidden">
                {activeTab === 'ManageCareers' && (
                  <button 
                    onClick={() => { setEditingProfile({}); setIsProfileModalOpen(true); }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-semibold transition-all mb-2"
                  >
                    Neues Karriereprofil
                  </button>
                )}

                <div className="bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm flex-1">
                  <div className="p-4 border-b border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      {activeTab === 'ManageCareers' ? 'Alle Profile' : 'Mein Profil'}
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {profiles.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 text-sm">
                        Keine Profile
                      </div>
                    ) : (
                      profiles.map(p => (
                        <div 
                          key={p.id}
                          onClick={() => setSelectedProfile(p)}
                          className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedProfile?.id === p.id ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                        >
                          <div className="text-sm font-semibold truncate">{p.userName}</div>
                          <div className="text-xs text-slate-500 mt-1">{p.goal} • {p.userRank}</div>
                          {activeTab === 'ManageCareers' && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingProfile(p); setIsProfileModalOpen(true); }}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: p.id, type: 'profile' }); }}
                                className="text-xs font-semibold text-red-500 hover:text-red-700"
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

              {/* Career Details */}
              <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                {selectedProfile ? (
                  <>
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-in fade-in duration-500">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl border border-blue-100">
                            🎓
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Karriereziel</div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">{selectedProfile.goal}</h2>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs font-medium text-slate-500">{selectedProfile.type}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className="text-xs font-medium text-slate-500">Start: {new Date(selectedProfile.startDate).toLocaleDateString('de-DE')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${selectedProfile.status === 'Abgeschlossen' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                            {selectedProfile.status}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gesamtfortschritt</div>
                          <div className="text-xl font-bold text-slate-900">{progress}%</div>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-900 transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Ausbildungsbestandteile</h3>
                        {activeTab === 'ManageCareers' && (
                          <button 
                            onClick={() => { setEditingComponent({}); setIsComponentModalOpen(true); }}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                          >
                            Bestandteil hinzufügen
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="grid grid-cols-1 gap-3">
                          {profileComponents.map((comp, idx) => (
                            <div key={comp.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between group hover:border-slate-300 transition-all">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold border ${comp.status === 'Abgeschlossen' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : comp.status === 'In Bearbeitung' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                  {idx + 1}
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-900">{comp.title}</h4>
                                  {comp.description && <p className="text-xs text-slate-500 mt-0.5">{comp.description}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${comp.status === 'Abgeschlossen' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : comp.status === 'In Bearbeitung' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                  {comp.status}
                                </div>
                                {activeTab === 'ManageCareers' && (
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => { setEditingComponent(comp); setIsComponentModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-all">✏️</button>
                                    <button onClick={() => setDeleteConfirm({ id: comp.id, type: 'component' })} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-all">🗑️</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                    <div className="text-6xl mb-4">🎓</div>
                    <div className="text-sm font-semibold uppercase tracking-wider">Profil auswählen um Fortschritt zu sehen</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trainings & Courses Views */}
          {(activeTab === 'Trainings' || activeTab === 'Courses' || activeTab === 'ManageTrainings' || activeTab === 'ManageCourses') && (
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  {activeTab === 'Trainings' ? 'Verfügbare Ausbildungen' : 
                   activeTab === 'Courses' ? 'Verfügbare Fortbildungen' :
                   activeTab === 'ManageTrainings' ? 'Ausbildungen verwalten' : 'Fortbildungen verwalten'}
                </h3>
                {(activeTab === 'ManageTrainings' || activeTab === 'ManageCourses') && (
                  <button 
                    onClick={() => { setEditingTraining({ type: activeTab === 'ManageTrainings' ? 'Ausbildung' : 'Fortbildung' }); setIsTrainingModalOpen(true); }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-xl text-xs font-semibold transition-all"
                  >
                    {activeTab === 'ManageTrainings' ? 'Ausbildung erstellen' : 'Fortbildung erstellen'}
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {trainings
                    .filter(t => {
                      const type = (activeTab === 'Trainings' || activeTab === 'ManageTrainings') ? 'Ausbildung' : 'Fortbildung';
                      return t.type === type;
                    })
                    .map(training => {
                      const isParticipant = training.participants.includes(user?.id || '');
                      const isFull = training.participants.length >= training.maxParticipants;
                      const isAdminView = activeTab === 'ManageTrainings' || activeTab === 'ManageCourses';

                      return (
                        <div key={training.id} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm hover:border-slate-300 transition-all group">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border ${training.type === 'Ausbildung' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`}>
                                {training.type === 'Ausbildung' ? '👮' : '📚'}
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900">{training.title}</h4>
                                <div className="text-xs font-medium text-slate-500 mt-0.5">Leitung: {training.instructorName}</div>
                              </div>
                            </div>
                            <div className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${training.status === 'Geplant' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                              {training.status}
                            </div>
                          </div>

                          <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{training.description}</p>

                          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Datum & Zeit</div>
                              <div className="text-sm font-medium text-slate-900">{new Date(training.date).toLocaleDateString('de-DE')} • {training.time}</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Ort</div>
                              <div className="text-sm font-medium text-slate-900">{training.location}</div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-end">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Teilnehmer</div>
                              <div className="text-xs font-semibold text-slate-900">{training.participants.length} / {training.maxParticipants}</div>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-slate-900'}`}
                                style={{ width: `${(training.participants.length / training.maxParticipants) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {isAdminView ? (
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Angemeldete Beamte</div>
                              <div className="flex flex-wrap gap-2">
                                {training.participants.map(pId => {
                                  const pUser = users.find(u => u.id === pId);
                                  return (
                                    <span key={pId} className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg text-xs font-medium text-slate-700">
                                      {pUser ? `${pUser.rank} ${pUser.lastName}` : 'Unbekannt'}
                                    </span>
                                  );
                                })}
                                {training.participants.length === 0 && <span className="text-xs text-slate-400 italic">Keine Anmeldungen</span>}
                              </div>
                              <div className="flex gap-2 pt-2">
                                <button onClick={() => { setEditingTraining(training); setIsTrainingModalOpen(true); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-semibold transition-all">Bearbeiten</button>
                                <button onClick={() => deleteTraining(training.id)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-2 rounded-xl text-xs font-semibold transition-all">Löschen</button>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-4 border-t border-slate-100">
                              {isParticipant ? (
                                <button 
                                  onClick={() => leaveTraining(training.id)}
                                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 py-2 rounded-xl text-xs font-semibold transition-all"
                                >
                                  Abmelden
                                </button>
                              ) : (
                                <button 
                                  onClick={() => joinTraining(training.id)}
                                  disabled={isFull || training.status !== 'Geplant'}
                                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white py-2 rounded-xl text-xs font-semibold transition-all"
                                >
                                  {isFull ? 'Vollbesetzt' : training.status !== 'Geplant' ? 'Nicht verfügbar' : 'Anmelden'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {trainings.filter(t => {
                    const type = (activeTab === 'Trainings' || activeTab === 'ManageTrainings') ? 'Ausbildung' : 'Fortbildung';
                    return t.type === type;
                  }).length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400">
                      <div className="text-6xl mb-4">📅</div>
                      <div className="text-sm font-semibold uppercase tracking-wider">Keine Einträge gefunden</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modals remain below */}
        <DataModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Löschen bestätigen"
          subtitle="Sicherheitsabfrage"
          icon="⚠️"
          maxWidth="max-w-md"
        >
          <div className="space-y-6">
            <p className="text-slate-600 text-sm text-center leading-relaxed">
              Möchten Sie diesen Eintrag wirklich unwiderruflich aus dem System löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-semibold transition-all"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => {
                  if (deleteConfirm?.type === 'profile') deleteProfile(deleteConfirm.id);
                  else if (deleteConfirm?.type === 'component') deleteComponent(deleteConfirm.id);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-semibold transition-all"
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
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Beamter auswählen</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Name oder Dienstnummer suchen..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
                  />
                  {userSearch && filteredUsers.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto custom-scrollbar">
                      {filteredUsers.map(u => (
                        <div 
                          key={u.id}
                          onClick={() => {
                            setEditingProfile({ ...editingProfile, userId: u.id });
                            setUserSearch(`${u.firstName} ${u.lastName} (${u.badgeNumber})`);
                          }}
                          className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">{u.firstName} {u.lastName}</span>
                            <span className="text-xs text-slate-500">{u.rank} • {u.badgeNumber}</span>
                          </div>
                          {editingProfile?.userId === u.id && <span className="text-slate-900 text-sm">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Karriereziel</label>
              <input 
                type="text"
                value={editingProfile?.goal || ''}
                onChange={(e) => setEditingProfile({ ...editingProfile, goal: e.target.value })}
                placeholder="z.B. Polizeimeister, Polizeikommissar..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Ausbildungsart</label>
              <input 
                type="text"
                value={editingProfile?.type || ''}
                onChange={(e) => setEditingProfile({ ...editingProfile, type: e.target.value })}
                placeholder="z.B. Studium, Ausbildung mD..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Startdatum</label>
                <input 
                  type="date"
                  value={editingProfile?.startDate || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, startDate: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Geplantes Ende</label>
                <input 
                  type="date"
                  value={editingProfile?.endDate || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, endDate: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Status</label>
              <select 
                value={editingProfile?.status || 'Aktiv'}
                onChange={(e) => setEditingProfile({ ...editingProfile, status: e.target.value as any })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
              >
                <option value="Aktiv">Aktiv</option>
                <option value="Abgeschlossen">Abgeschlossen</option>
              </select>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-semibold transition-all"
              >
                Abbrechen
              </button>
              <button 
                onClick={saveProfile}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-semibold transition-all"
              >
                Profil speichern
              </button>
            </div>
          </div>
        </DataModal>

        {/* Training Modal */}
        <DataModal
          isOpen={isTrainingModalOpen}
          onClose={() => setIsTrainingModalOpen(false)}
          title={editingTraining?.id ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
          icon={editingTraining?.type === 'Ausbildung' ? '👮' : '📚'}
          maxWidth="max-w-xl"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Titel</label>
              <input 
                type="text"
                value={editingTraining?.title || ''}
                onChange={(e) => setEditingTraining({ ...editingTraining, title: e.target.value })}
                placeholder="z.B. Modul 1: Grundlagen..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Beschreibung</label>
              <textarea 
                value={editingTraining?.description || ''}
                onChange={(e) => setEditingTraining({ ...editingTraining, description: e.target.value })}
                placeholder="Details zum Inhalt..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 h-32 outline-none focus:border-slate-900 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Datum</label>
                <input 
                  type="date"
                  value={editingTraining?.date || ''}
                  onChange={(e) => setEditingTraining({ ...editingTraining, date: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Uhrzeit</label>
                <input 
                  type="time"
                  value={editingTraining?.time || ''}
                  onChange={(e) => setEditingTraining({ ...editingTraining, time: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Ort</label>
                <input 
                  type="text"
                  value={editingTraining?.location || ''}
                  onChange={(e) => setEditingTraining({ ...editingTraining, location: e.target.value })}
                  placeholder="z.B. Schulungsraum 1"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Max. Teilnehmer</label>
                <input 
                  type="number"
                  value={editingTraining?.maxParticipants || ''}
                  onChange={(e) => setEditingTraining({ ...editingTraining, maxParticipants: parseInt(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Status</label>
              <select 
                value={editingTraining?.status || 'Geplant'}
                onChange={(e) => setEditingTraining({ ...editingTraining, status: e.target.value as any })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
              >
                <option value="Geplant">Geplant</option>
                <option value="Laufend">Laufend</option>
                <option value="Beendet">Beendet</option>
                <option value="Abgesagt">Abgesagt</option>
              </select>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => setIsTrainingModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-semibold transition-all"
              >
                Abbrechen
              </button>
              <button 
                onClick={saveTraining}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-semibold transition-all"
              >
                Speichern
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
              <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Bezeichnung</label>
              <input 
                type="text"
                value={editingComponent?.title || ''}
                onChange={(e) => setEditingComponent({ ...editingComponent, title: e.target.value })}
                placeholder="z.B. Modul 1: Grundlagen..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Beschreibung</label>
              <textarea 
                value={editingComponent?.description || ''}
                onChange={(e) => setEditingComponent({ ...editingComponent, description: e.target.value })}
                placeholder="Optionale Details zum Modul..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 h-32 outline-none focus:border-slate-900 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Reihenfolge</label>
                <input 
                  type="number"
                  value={editingComponent?.order || ''}
                  onChange={(e) => setEditingComponent({ ...editingComponent, order: parseInt(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Status</label>
                <select 
                  value={editingComponent?.status || 'Offen'}
                  onChange={(e) => setEditingComponent({ ...editingComponent, status: e.target.value as any })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
                >
                  <option value="Offen">Offen</option>
                  <option value="In Bearbeitung">In Bearbeitung</option>
                  <option value="Abgeschlossen">Abgeschlossen</option>
                </select>
              </div>
            </div>

            {editingComponent?.status === 'Abgeschlossen' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Abschlussdatum</label>
                <input 
                  type="date"
                  value={editingComponent?.completionDate || ''}
                  onChange={(e) => setEditingComponent({ ...editingComponent, completionDate: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-all"
                />
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => setIsComponentModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-semibold transition-all"
              >
                Abbrechen
              </button>
              <button 
                onClick={saveComponent}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-semibold transition-all"
              >
                Speichern
              </button>
            </div>
          </div>
        </DataModal>
      </div>
  );
};

export default CareerPage;
