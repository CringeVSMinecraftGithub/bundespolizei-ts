
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Permission, JobPosting, JobApplication } from '../types';
import { POLICE_RANKS } from '../constants';
import { dbCollections, onSnapshot, query, addDoc, updateDoc, doc, db, deleteDoc, where, getDocs } from '../firebase';
import PoliceOSWindow from '../components/PoliceOSWindow';

const JobsPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [userApplications, setUserApplications] = useState<JobApplication[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [editingPosting, setEditingPosting] = useState<Partial<JobPosting> | null>(null);
  const [selectedPosting, setSelectedPosting] = useState<JobPosting | null>(null);
  const [applicationText, setApplicationText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    const unsubPostings = onSnapshot(query(dbCollections.jobPostings), (snap) => {
      setPostings(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPosting)));
    });

    if (user) {
      const unsubApps = onSnapshot(query(dbCollections.applications, where("userId", "==", user.id), where("type", "==", "Stellenausschreibung")), (snap) => {
        setUserApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication)));
      });
      return () => { unsubPostings(); unsubApps(); };
    }

    return () => unsubPostings();
  }, [user]);

  const showStatus = (text: string, type: 'error' | 'success' = 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const savePosting = async () => {
    if (!editingPosting || !user) return;
    
    if (!editingPosting.title || !editingPosting.description || !editingPosting.minRank || !editingPosting.applicationScope || (editingPosting.slots || 0) < 1) {
      showStatus("Bitte füllen Sie alle Pflichtfelder korrekt aus.");
      return;
    }

    try {
      let finalStatus = editingPosting.status || 'Offen';

      if (editingPosting.id) {
        const q = query(dbCollections.applications, 
          where("jobPostingId", "==", editingPosting.id), 
          where("status", "==", "Angenommen")
        );
        const snap = await getDocs(q);
        const acceptedCount = snap.size;
        
        if (acceptedCount < (editingPosting.slots || 1)) {
           finalStatus = 'Offen';
        }
      }

      const data = {
        ...editingPosting,
        status: finalStatus,
        createdBy: user.id,
        createdAt: editingPosting.createdAt || new Date().toISOString()
      };

      if (editingPosting.id) {
        await updateDoc(doc(db, "jobPostings", editingPosting.id), data);
        showStatus("Ausschreibung aktualisiert.", "success");
      } else {
        await addDoc(dbCollections.jobPostings, data);
        showStatus("Ausschreibung veröffentlicht.", "success");
      }
      setIsModalOpen(false);
      setEditingPosting(null);
    } catch (e) {
      showStatus("Fehler beim Speichern.");
    }
  };

  const deletePosting = async (id: string) => {
    if (!confirm("Ausschreibung wirklich löschen?")) return;
    try {
      await deleteDoc(doc(db, "jobPostings", id));
      showStatus("Ausschreibung gelöscht.", "success");
    } catch (e) {
      showStatus("Fehler beim Löschen.");
    }
  };

  const submitApplication = async () => {
    if (!selectedPosting || !user) return;

    // Check if already applied
    const alreadyApplied = userApplications.some(a => a.jobPostingId === selectedPosting.id);
    if (alreadyApplied) {
      showStatus("Sie haben sich bereits auf diese Stelle beworben.");
      return;
    }

    try {
      const appData: Partial<JobApplication> = {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRank: user.rank,
        type: 'Stellenausschreibung',
        jobPostingId: selectedPosting.id,
        jobTitle: selectedPosting.title,
        name: `${user.firstName} ${user.lastName}`,
        status: 'Eingegangen',
        timestamp: new Date().toISOString(),
        motivation: applicationText,
        cv: '', // User can add PDF logic later if needed
        icPhone: (user as any).icPhone || '',
      };

      await addDoc(dbCollections.applications, appData);
      showStatus("Bewerbung erfolgreich abgesendet.", "success");
      setIsApplyModalOpen(false);
      setApplicationText('');
    } catch (e) {
      showStatus("Fehler beim Absenden der Bewerbung.");
    }
  };

  const meetsRequirements = (minRankName: string) => {
    if (!user) return false;
    const userRank = POLICE_RANKS.find(r => r.name === user.rank);
    const requiredRank = POLICE_RANKS.find(r => r.name === minRankName);
    if (!userRank || !requiredRank) return false;
    return userRank.level <= requiredRank.level;
  };

  const canManage = hasPermission(Permission.MANAGE_JOBS);

  return (
    <PoliceOSWindow title="Stellenausschreibungen">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24 relative">
        
        {statusMsg && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-top-4 duration-300">
            <div className={`px-8 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 backdrop-blur-xl ${statusMsg.type === 'error' ? 'bg-red-600/20 border-red-500 text-red-500' : 'bg-emerald-600/20 border-emerald-500 text-emerald-500'}`}>
              <span className="text-lg">{statusMsg.type === 'error' ? '⚠️' : '✅'}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{statusMsg.text}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Stellen<span className="text-blue-500">ausschreibungen</span></h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Aktuelle Karrieremöglichkeiten innerhalb der Bundespolizei</p>
          </div>
          {canManage && (
            <button 
              onClick={() => { setEditingPosting({ title: '', description: '', minRank: '', additionalRequirements: '', applicationScope: '', slots: 1, status: 'Offen' }); setIsModalOpen(true); }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/20 active:scale-95"
            >
              Neue Ausschreibung
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {postings.map(post => {
            const isQualified = meetsRequirements(post.minRank);
            const hasApplied = userApplications.some(a => a.jobPostingId === post.id);
            const isClosed = post.status === 'Geschlossen' || (post.deadline && new Date(post.deadline) < new Date());

            return (
              <div key={post.id} className="bg-[#1a1c23] border border-white/5 rounded-[32px] p-8 flex flex-col shadow-2xl hover:border-blue-500/30 transition-all group relative overflow-hidden">
                {isClosed && (
                  <div className="absolute top-0 right-0 bg-red-600 text-white px-6 py-1 text-[8px] font-black uppercase tracking-widest rotate-45 translate-x-6 translate-y-4 shadow-lg">
                    Geschlossen
                  </div>
                )}
                
                {userApplications.some(a => a.jobPostingId === post.id && a.status === 'Angenommen') && (
                  <div className="absolute top-0 left-0 bg-emerald-600 text-white px-6 py-1 text-[8px] font-black uppercase tracking-widest -rotate-45 -translate-x-6 translate-y-4 shadow-lg z-10">
                    Angenommen
                  </div>
                )}
                
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-600/10 text-blue-500 border border-blue-500/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                      {post.slots} {post.slots === 1 ? 'Stelle' : 'Stellen'}
                    </span>
                    {post.deadline && (
                      <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/5">
                        Bis {new Date(post.deadline).toLocaleDateString('de-DE')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">{post.title}</h3>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                    <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Mindestdienstgrad</div>
                    <div className="text-[10px] font-black text-white uppercase">{post.minRank}</div>
                  </div>
                  
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {post.description}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3">
                  <button 
                    onClick={() => setSelectedPosting(post)}
                    className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
                  >
                    Details ansehen
                  </button>
                  
                  {!canManage && (
                    <>
                      {hasApplied ? (
                        <div className="w-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-center">
                          Bereits beworben
                        </div>
                      ) : isClosed ? (
                        <div className="w-full bg-red-600/10 border border-red-500/20 text-red-500 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-center">
                          Ausschreibung beendet
                        </div>
                      ) : isQualified ? (
                        <button 
                          onClick={() => { setSelectedPosting(post); setIsApplyModalOpen(true); }}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20"
                        >
                          Jetzt bewerben
                        </button>
                      ) : (
                        <div className="w-full bg-red-900/10 border border-red-900/20 text-red-500/60 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-center cursor-not-allowed">
                          Dienstgrad zu niedrig
                        </div>
                      )}
                    </>
                  )}

                  {canManage && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { 
                          setEditingPosting({
                            ...post,
                            title: post.title || '',
                            description: post.description || '',
                            minRank: post.minRank || '',
                            additionalRequirements: post.additionalRequirements || '',
                            applicationScope: post.applicationScope || '',
                            slots: post.slots || 1,
                            deadline: post.deadline || '',
                            status: post.status || 'Offen'
                          }); 
                          setIsModalOpen(true); 
                        }}
                        className="flex-1 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-blue-500/20"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deletePosting(post.id)}
                        className="flex-1 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-red-500/20"
                      >
                        Löschen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Create/Edit Posting */}
        {isModalOpen && editingPosting && (
          <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-[#0a0c10] border border-white/10 p-10 rounded-[40px] w-full max-w-2xl space-y-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                {editingPosting.id ? 'Ausschreibung bearbeiten' : 'Neue Stellenausschreibung'}
              </h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Titel der Stelle</label>
                  <input 
                    value={editingPosting.title || ''}
                    onChange={e => setEditingPosting({...editingPosting, title: e.target.value})}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-600 text-xs font-bold uppercase"
                    placeholder="z.B. Dienstgruppenleiter (m/w/d)"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Beschreibung</label>
                  <textarea 
                    value={editingPosting.description || ''}
                    onChange={e => setEditingPosting({...editingPosting, description: e.target.value})}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-600 text-xs h-32 resize-none"
                    placeholder="Detaillierte Aufgabenbeschreibung..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Mindestdienstgrad</label>
                  <select 
                    value={editingPosting.minRank || ''}
                    onChange={e => setEditingPosting({...editingPosting, minRank: e.target.value})}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-600 text-xs font-bold uppercase"
                  >
                    <option value="">Auswählen...</option>
                    {POLICE_RANKS.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Anzahl Stellen</label>
                  <input 
                    type="number"
                    min="1"
                    value={editingPosting.slots || 1}
                    onChange={e => setEditingPosting({...editingPosting, slots: parseInt(e.target.value)})}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-600 text-xs font-bold"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Bewerbungsumfang</label>
                  <input 
                    value={editingPosting.applicationScope || ''}
                    onChange={e => setEditingPosting({...editingPosting, applicationScope: e.target.value})}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-600 text-xs font-bold uppercase"
                    placeholder="z.B. Motivationsschreiben, Lebenslauf"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Bewerbungsfrist (Optional)</label>
                  <input 
                    type="date"
                    value={editingPosting.deadline || ''}
                    onChange={e => setEditingPosting({...editingPosting, deadline: e.target.value})}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-600 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Status</label>
                  <select 
                    value={editingPosting.status || 'Offen'}
                    onChange={e => setEditingPosting({...editingPosting, status: e.target.value as any})}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-600 text-xs font-bold uppercase"
                  >
                    <option value="Offen">Offen</option>
                    <option value="Geschlossen">Geschlossen</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors">Abbrechen</button>
                <button onClick={savePosting} className="flex-2 bg-blue-600 py-4 px-10 rounded-2xl font-black uppercase text-[9px] tracking-widest text-white shadow-xl active:scale-95 transition-all">Ausschreibung Speichern</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Apply */}
        {isApplyModalOpen && selectedPosting && (
          <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-[#0a0c10] border border-white/10 p-10 rounded-[40px] w-full max-w-xl space-y-8 shadow-2xl relative">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Bewerbung einreichen</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Stelle: {selectedPosting.title}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-600/5 border border-blue-500/20 p-5 rounded-2xl">
                  <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-2">Ihre Daten (Automatisch)</div>
                  <div className="text-xs font-bold text-white uppercase">{user?.firstName} {user?.lastName}</div>
                  <div className="text-[10px] text-slate-400 uppercase">{user?.rank} • {user?.badgeNumber}</div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Anschreiben / Motivation</label>
                  <textarea 
                    value={applicationText}
                    onChange={e => setApplicationText(e.target.value)}
                    className="w-full bg-black border border-white/10 p-5 rounded-2xl text-white text-xs h-48 outline-none resize-none focus:border-blue-600"
                    placeholder="Warum sind Sie der richtige Kandidat für diese Stelle?"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsApplyModalOpen(false)} className="flex-1 py-4 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors">Abbrechen</button>
                <button onClick={submitApplication} className="flex-2 bg-blue-600 py-4 px-10 rounded-2xl font-black uppercase text-[9px] tracking-widest text-white shadow-xl active:scale-95 transition-all">Bewerbung Absenden</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Details (Read-only for all) */}
        {selectedPosting && !isApplyModalOpen && (
          <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-[#0a0c10] border border-white/10 p-10 rounded-[40px] w-full max-w-2xl space-y-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">{selectedPosting.title}</h2>
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-600/10 text-blue-500 border border-blue-500/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                      {selectedPosting.slots} {selectedPosting.slots === 1 ? 'Stelle' : 'Stellen'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${selectedPosting.status === 'Offen' ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500' : 'bg-red-600/10 border-red-500/20 text-red-500'}`}>
                      Status: {selectedPosting.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedPosting(null)} className="text-slate-500 hover:text-white text-2xl">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Beschreibung</h4>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedPosting.description}</p>
                  </div>
                  {selectedPosting.additionalRequirements && (
                    <div>
                      <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Zusätzliche Anforderungen</h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedPosting.additionalRequirements}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                    <div>
                      <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Erforderlicher Dienstgrad</div>
                      <div className="text-xs font-black text-white uppercase">{selectedPosting.minRank}</div>
                    </div>
                    <div>
                      <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Bewerbungsumfang</div>
                      <div className="text-xs font-black text-white uppercase">{selectedPosting.applicationScope}</div>
                    </div>
                    {selectedPosting.deadline && (
                      <div>
                        <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Bewerbungsfrist</div>
                        <div className="text-xs font-black text-red-500 uppercase">{new Date(selectedPosting.deadline).toLocaleDateString('de-DE')}</div>
                      </div>
                    )}
                  </div>

                  {!canManage && selectedPosting.status === 'Offen' && (
                    <div className="pt-4">
                      {userApplications.some(a => a.jobPostingId === selectedPosting.id) ? (
                        <div className="w-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-xl">
                          Bereits beworben
                        </div>
                      ) : meetsRequirements(selectedPosting.minRank) ? (
                        <button 
                          onClick={() => setIsApplyModalOpen(true)}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40"
                        >
                          Jetzt bewerben
                        </button>
                      ) : (
                        <div className="w-full bg-red-900/10 border border-red-900/20 text-red-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">
                          Voraussetzungen nicht erfüllt
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PoliceOSWindow>
  );
};

export default JobsPage;
