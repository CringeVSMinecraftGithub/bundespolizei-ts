import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import DataModal from '../components/DataModal';
import { dbCollections, onSnapshot, query, orderBy, updateDoc, doc, db, where, getDoc, getDocs, addDoc } from '../firebase';
import { JobApplication, Permission, JobPosting } from '../types';
import { useAuth } from '../App';

const ApplicationsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [allApps, setAllApps] = useState<JobApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Alle');
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<JobApplication['status'] | null>(null);
  const [statusNotes, setStatusNotes] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.applications, orderBy("timestamp", "desc")), (snap) => {
      setAllApps(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication)));
    });
    return unsub;
  }, []);

  const triggerStatusChange = (status: JobApplication['status']) => {
    setPendingStatus(status);
    setStatusNotes('');
    setIsStatusChangeModalOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedApp || !pendingStatus || !user) return;

    try {
      const newLogEntry = {
        timestamp: new Date().toISOString(),
        editorId: user.id,
        editorName: `${user.rank} ${user.lastName}`,
        status: pendingStatus,
        notes: statusNotes
      };

      const updatedLog = [...(selectedApp.statusLog || []), newLogEntry];
      
      const updateData: any = { 
        status: pendingStatus,
        statusLog: updatedLog
      };

      if (pendingStatus === 'Angenommen' || pendingStatus === 'Abgelehnt') {
        updateData.additionalInfo = statusNotes;
      }

      await updateDoc(doc(db, "applications", selectedApp.id), updateData);

      // Create Notification
      await addDoc(dbCollections.notifications, {
        userId: selectedApp.userId,
        title: `Bewerbung: ${selectedApp.jobTitle || 'Polizeidienst'}`,
        message: pendingStatus === 'Angenommen' 
          ? `Ihre Bewerbung für "${selectedApp.jobTitle}" wurde ANGENOMMEN. ${statusNotes ? `\n\nHinweise: ${statusNotes}` : '\n\nWeitere Schritte folgen in Kürze.'}`
          : `Ihre Bewerbung für "${selectedApp.jobTitle || 'den Polizeidienst'}" wurde ABGELEHNT. ${statusNotes ? `\n\nFeedback: ${statusNotes}` : ''}`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'Application'
      });
      
      // If status is 'Angenommen' and it's a job posting application, check if we should close the posting
      if (pendingStatus === 'Angenommen' && selectedApp.type === 'Stellenausschreibung' && selectedApp.jobPostingId) {
        const q = query(dbCollections.applications, 
          where("jobPostingId", "==", selectedApp.jobPostingId), 
          where("status", "==", "Angenommen")
        );
        const snap = await getDocs(q);
        const acceptedCount = snap.size;
        
        const jobRef = doc(db, "jobPostings", selectedApp.jobPostingId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {
          const jobData = jobSnap.data() as JobPosting;
          if (acceptedCount >= jobData.slots) {
            await updateDoc(jobRef, { status: 'Geschlossen' });
          }
        }
      }

      setSelectedApp({ ...selectedApp, ...updateData });
      setIsStatusChangeModalOpen(false);
      setPendingStatus(null);
    } catch (e) { console.error(e); }
  };

  const canSeeStandard = hasPermission(Permission.VIEW_APPLICATIONS);
  const canSeeJobs = hasPermission(Permission.MANAGE_JOBS);

  const filteredApps = allApps.filter(a => {
    if (a.type === 'Stellenausschreibung' && !canSeeJobs) return false;
    if (a.type !== 'Stellenausschreibung' && !canSeeStandard) return false;

    const matchesStatus = statusFilter === 'Alle' || a.status === statusFilter;
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (a.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (a.careerPath || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const handleOpenApp = (app: JobApplication) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  return (
    <PoliceOSWindow title="Personalwesen / Bewerbermanagement">
      <div className="h-full flex flex-col gap-6 overflow-hidden">
        
        {/* Compact Header */}
        <div className="shrink-0 flex items-center justify-between bg-[#1a1c23]/50 p-4 rounded-2xl border border-white/5 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center text-xl">📂</div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">Bewerber <span className="text-emerald-500">Cockpit</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-black/40 border border-white/10 p-2 rounded-xl text-[10px] font-black uppercase text-slate-200 outline-none focus:border-emerald-500"
            >
              <option value="Alle">Alle Status</option>
              <option value="Eingegangen">Eingegangen</option>
              <option value="In Prüfung">In Prüfung</option>
              <option value="Eingeladen">Eingeladen</option>
              <option value="Angenommen">Angenommen</option>
              <option value="Abgelehnt">Abgelehnt</option>
            </select>
            <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-2 rounded-xl w-64 focus-within:border-emerald-500 transition-all">
              <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Suchen..." 
                className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase text-slate-200 placeholder:text-slate-700 px-2" 
              />
            </div>
          </div>
        </div>

        {/* Full-Width List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 gap-3">
            {filteredApps.map(a => (
              <div 
                key={a.id} 
                className="bg-[#1a1c23]/40 border border-white/5 rounded-[24px] p-6 flex items-center justify-between group hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 ${a.type === 'Stellenausschreibung' ? 'bg-blue-600/10 text-blue-500' : 'bg-emerald-600/10 text-emerald-500'} rounded-2xl flex items-center justify-center text-2xl shadow-xl`}>
                    {a.type === 'Stellenausschreibung' ? '💼' : (a.careerPath === 'Mittlerer Dienst' ? '🛡️' : '🎓')}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">#{a.id.slice(-6).toUpperCase()}</span>
                      {a.type === 'Stellenausschreibung' ? (
                        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[7px] font-black text-blue-500 uppercase">Stellenausschreibung</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[7px] font-black text-emerald-500 uppercase">{a.careerPath}</span>
                      )}
                      <span className="text-[7px] font-mono text-slate-600 uppercase tracking-widest">{new Date(a.timestamp).toLocaleString('de-DE')}</span>
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                      {a.type === 'Stellenausschreibung' ? `${a.userName || a.name} (${a.userRank || 'N/A'})` : a.name}
                    </h3>
                    {a.jobTitle && <p className="text-[9px] font-black text-blue-400 uppercase mt-1">Stelle: {a.jobTitle}</p>}
                    <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Status: {a.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <div className="text-[8px] font-black text-slate-600 uppercase">Discord</div>
                    <div className="text-[10px] font-black text-emerald-500 uppercase">{a.discordId || 'N/A'}</div>
                  </div>
                  <button 
                    onClick={() => handleOpenApp(a)}
                    className="px-6 py-2.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
                  >
                    Anzeigen
                  </button>
                </div>
              </div>
            ))}
            {filteredApps.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <div className="text-6xl mb-4">📂</div>
                <div className="text-xs font-black uppercase tracking-[0.4em]">Keine Bewerbungen gefunden</div>
              </div>
            )}
          </div>
        </div>

        <DataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedApp?.name || 'Bewerberdetails'}
          subtitle={selectedApp?.type === 'Stellenausschreibung' ? `Stelle: ${selectedApp.jobTitle}` : `Bewerber-ID: ${selectedApp?.id.slice(-6).toUpperCase() || 'N/A'}`}
          icon={selectedApp?.type === 'Stellenausschreibung' ? '💼' : (selectedApp?.careerPath === 'Mittlerer Dienst' ? '🛡️' : '🎓')}
          maxWidth="max-w-4xl"
          footer={
            <div className="flex items-center justify-between">
              <div className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Personalwesen • AES-256 Verschlüsselt</div>
              <div className="flex gap-4">
                {selectedApp && (
                  (selectedApp.type === 'Stellenausschreibung' ? hasPermission(Permission.MANAGE_JOBS) : hasPermission(Permission.MANAGE_APPLICATIONS))
                ) && (
                  <>
                    <button 
                      onClick={() => triggerStatusChange('Angenommen')} 
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                    >
                      Annehmen
                    </button>
                    <button 
                      onClick={() => triggerStatusChange('In Prüfung')} 
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                    >
                      In Prüfung
                    </button>
                    <button 
                      onClick={() => triggerStatusChange('Abgelehnt')} 
                      className="px-6 py-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                    >
                      Ablehnen
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Schließen
                </button>
              </div>
            </div>
          }
        >
          {selectedApp && selectedApp.type === 'Stellenausschreibung' ? (
            <div className="space-y-8">
              {/* Job Application Detail View */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-blue-600"></span> 
                  Bewerbungsinformationen
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Verknüpfter Account</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedApp.userName} ({selectedApp.userRank})</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Stellenausschreibung</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedApp.jobTitle} (ID: {selectedApp.jobPostingId})</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Zeitstempel</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{new Date(selectedApp.timestamp).toLocaleString('de-DE')}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Status</div>
                    <div className="text-[11px] font-black text-blue-500 uppercase">{selectedApp.status}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-blue-600"></span> 
                  Anschreiben / Motivation
                </h4>
                <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-xl shadow-inner">
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedApp.motivation || 'Kein Anschreiben hinterlegt.'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-blue-600"></span> 
                  Hochgeladene Unterlagen (CV)
                </h4>
                <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-xl shadow-inner">
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedApp.cv || 'Keine Unterlagen hinterlegt.'}
                  </div>
                </div>
              </div>

              {selectedApp.statusLog && selectedApp.statusLog.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                    <span className="w-5 h-0.5 bg-slate-700"></span> 
                    Bearbeitungsprotokoll
                  </h4>
                  <div className="space-y-2">
                    {selectedApp.statusLog.map((log, idx) => (
                      <div key={idx} className="bg-black/20 border border-white/5 p-4 rounded-xl flex justify-between items-start">
                        <div>
                          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            {new Date(log.timestamp).toLocaleString('de-DE')} • {log.editorName}
                          </div>
                          <div className="text-[10px] font-bold text-white mt-1">Status geändert auf: <span className="text-blue-400">{log.status}</span></div>
                          {log.notes && <p className="text-[9px] text-slate-500 mt-1 italic">"{log.notes}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : selectedApp && (
            <div className="space-y-8">
              {/* Section: Personal Information */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-emerald-600"></span> 
                  Persönliche Informationen
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Discord ID</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase truncate">{selectedApp.discordId || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Geschlecht</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedApp.gender || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Geburtsdatum</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedApp.icBirthDate || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Telefonnummer</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedApp.icPhone || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Section: Qualification */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-emerald-600"></span> 
                  Qualifikation & Erfahrung
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Schulabschluss</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedApp.education || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Bisherige Erfahrung</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedApp.experience || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Section: Motivation */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-emerald-600"></span> 
                  Motivation & Beweggründe
                </h4>
                <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-xl shadow-inner">
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedApp.motivation}
                  </div>
                </div>
              </div>

              {/* Section: CV */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-emerald-600"></span> 
                  Lebenslauf / Werdegang
                </h4>
                <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-xl shadow-inner">
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedApp.cv}
                  </div>
                </div>
              </div>

              {/* Section: Status Details */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-slate-700"></span> 
                  Bewerbungsstatus
                </h4>
                <div className="bg-black/30 border border-white/5 p-6 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Aktueller Status</div>
                    <div className="text-[12px] font-black text-emerald-500 uppercase mt-1">{selectedApp.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Eingangsdatum</div>
                    <div className="text-[11px] font-bold text-slate-400 mt-1">{new Date(selectedApp.timestamp).toLocaleString('de-DE')}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DataModal>

        {/* Status Change Modal */}
        {isStatusChangeModalOpen && pendingStatus && (
          <div className="fixed inset-0 z-[1100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-[#0a0c10] border border-white/10 p-10 rounded-[40px] w-full max-w-lg space-y-8 shadow-2xl relative">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Status ändern</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Neuer Status: <span className="text-blue-500">{pendingStatus}</span></p>
              </div>

              {(pendingStatus === 'Angenommen' || pendingStatus === 'Abgelehnt') && (
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">
                    {pendingStatus === 'Angenommen' ? 'Weitere Schritte / Hinweise' : 'Individuelles Feedback (Optional)'}
                  </label>
                  <textarea 
                    value={statusNotes}
                    onChange={e => setStatusNotes(e.target.value)}
                    className="w-full bg-black border border-white/10 p-5 rounded-2xl text-white text-xs h-32 outline-none resize-none focus:border-blue-600"
                    placeholder={pendingStatus === 'Angenommen' ? "Welche Schritte folgen als nächstes?" : "Feedback für den Bewerber..."}
                  />
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsStatusChangeModalOpen(false)} className="flex-1 py-4 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors">Abbrechen</button>
                <button onClick={confirmStatusChange} className="flex-2 bg-blue-600 py-4 px-10 rounded-2xl font-black uppercase text-[9px] tracking-widest text-white shadow-xl active:scale-95 transition-all">Status Bestätigen</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PoliceOSWindow>
  );
};

export default ApplicationsPage;
