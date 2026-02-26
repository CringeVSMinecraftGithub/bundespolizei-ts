import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Permission, Appointment, AppointmentStatus, User } from '../types';
import { dbCollections, addDoc, onSnapshot, query, orderBy, updateDoc, doc, getDocs, where } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

const AppointmentsPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'Meine' | 'Interne' | 'Externe'>('Meine');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('Alle');
  const [filterPartner, setFilterPartner] = useState<string>('Alle');

  // Reschedule form state
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '', location: '', notes: '' });
  const [isRescheduling, setIsRescheduling] = useState(false);
  
  // Rejection form state
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const canManage = hasPermission(Permission.MANAGE_APPOINTMENTS);

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.appointments, orderBy("createdAt", "desc")), (snap) => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    });

    const fetchOfficers = async () => {
      const snap = await getDocs(dbCollections.users);
      setOfficers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    };
    fetchOfficers();

    return unsub;
  }, []);

  const handleCreateInternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = {};
    formData.forEach((value, key) => { data[key] = value; });

    const partner = officers.find(u => u.id === data.partnerUserId);
    if (!partner) return;

    try {
      await addDoc(dbCollections.appointments, {
        type: 'Intern',
        applicantUserId: user.id,
        applicantName: `${user.rank} ${user.lastName}`,
        partnerUserId: data.partnerUserId,
        partnerName: `${partner.rank} ${partner.lastName}`,
        requestedDate: data.date,
        requestedTime: data.time,
        reason: data.reason,
        status: 'Eingegangen',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusLog: [{
          status: 'Eingegangen',
          timestamp: new Date().toISOString(),
          editorId: user.id,
          editorName: `${user.rank} ${user.lastName}`,
          notes: 'Interne Terminanfrage erstellt.'
        }]
      });
      setIsCreating(false);
    } catch (e) {
      alert("Fehler beim Erstellen der Terminanfrage.");
    }
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: AppointmentStatus, notes?: string, finalDate?: string, finalTime?: string, location?: string) => {
    if (!user || !canManage) return;
    
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    const updateData: any = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      editorId: user.id,
      editorName: `${user.rank} ${user.lastName}`,
    };

    if (finalDate) updateData.finalDate = finalDate;
    if (finalTime) updateData.finalTime = finalTime;
    if (location) updateData.location = location;

    const newLogEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      editorId: user.id,
      editorName: `${user.rank} ${user.lastName}`,
      notes: notes || `Status geändert auf ${newStatus}`
    };

    updateData.statusLog = [
      ...(appointment.statusLog || []),
      newLogEntry
    ];

    try {
      await updateDoc(doc(dbCollections.appointments, appointmentId), updateData);
      setSelectedAppointment(prev => prev ? { ...prev, ...updateData } : null);
      setIsRescheduling(false);
      setIsRejecting(false);
      setRejectionNotes('');
    } catch (e) {
      alert("Fehler beim Aktualisieren des Status.");
    }
  };

  const filteredAppointments = appointments.filter(a => {
    if (activeTab === 'Meine') return a.applicantUserId === user?.id || a.partnerUserId === user?.id;
    if (activeTab === 'Interne') return a.type === 'Intern' && canManage;
    if (activeTab === 'Externe') return a.type === 'Extern' && canManage;
    return false;
  }).filter(a => {
    if (filterStatus !== 'Alle' && a.status !== filterStatus) return false;
    if (filterPartner !== 'Alle' && a.partnerUserId !== filterPartner) return false;
    return true;
  });

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'Eingegangen': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'In Bearbeitung': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'Bestätigt': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
      case 'Abgelehnt': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'Verschoben': return 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#0f172a]">
      {/* Sidebar Navigation */}
      <div className="w-80 bg-slate-900/50 border-r border-white/5 flex flex-col">
        <div className="p-8 border-b border-white/5">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Terminverwaltung</h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Behörden-Kalender</p>
        </div>

        <div className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('Meine')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === 'Meine' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <span className="text-xl">👤</span>
            <span className="text-[11px] font-black uppercase tracking-widest">Meine Termine</span>
          </button>

          {canManage && (
            <>
              <button 
                onClick={() => setActiveTab('Interne')}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === 'Interne' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <span className="text-xl">🏢</span>
                <span className="text-[11px] font-black uppercase tracking-widest">Interne Anfragen</span>
              </button>
              <button 
                onClick={() => setActiveTab('Externe')}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === 'Externe' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/20' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <span className="text-xl">🌍</span>
                <span className="text-[11px] font-black uppercase tracking-widest">Externe Anfragen</span>
              </button>
            </>
          )}
        </div>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={() => setIsCreating(true)}
            className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10"
          >
            + Interner Termin
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filters Header */}
        <div className="h-20 bg-slate-900/30 border-b border-white/5 flex items-center px-8 gap-6 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status:</span>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold text-white uppercase outline-none focus:border-blue-500"
            >
              <option value="Alle">Alle Status</option>
              <option value="Eingegangen">Eingegangen</option>
              <option value="In Bearbeitung">In Bearbeitung</option>
              <option value="Bestätigt">Bestätigt</option>
              <option value="Abgelehnt">Abgelehnt</option>
              <option value="Verschoben">Verschoben</option>
            </select>
          </div>

          {canManage && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Partner:</span>
              <select 
                value={filterPartner}
                onChange={(e) => setFilterPartner(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold text-white uppercase outline-none focus:border-blue-500"
              >
                <option value="Alle">Alle Partner</option>
                {officers.map(u => (
                  <option key={u.id} value={u.id}>{u.rank} {u.lastName}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* List View */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 gap-4">
            {filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <span className="text-4xl mb-4">📅</span>
                <p className="text-[10px] font-black uppercase tracking-widest">Keine Termine gefunden</p>
              </div>
            ) : (
              filteredAppointments.map(a => (
                <button 
                  key={a.id}
                  onClick={() => setSelectedAppointment(a)}
                  className={`w-full flex items-center justify-between p-6 rounded-3xl border transition-all text-left ${selectedAppointment?.id === a.id ? 'bg-blue-600/10 border-blue-500/50 shadow-lg' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${a.type === 'Intern' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {a.type === 'Intern' ? '🏢' : '🌍'}
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        {a.type === 'Intern' ? `Von: ${a.applicantName}` : `Bürger-Code: ${a.citizenCode}`}
                      </div>
                      <div className="text-lg font-black text-white uppercase tracking-tight">
                        {a.reason.length > 40 ? a.reason.substring(0, 40) + '...' : a.reason}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mit: {a.partnerName}</span>
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{a.finalDate || a.requestedDate} um {a.finalTime || a.requestedTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusColor(a.status)}`}>
                    {a.status}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedAppointment && (
          <motion.div 
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="w-[500px] bg-slate-900 border-l border-white/10 flex flex-col shadow-2xl z-20"
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Termindetails</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">ID: {selectedAppointment.id}</p>
              </div>
              <button onClick={() => setSelectedAppointment(null)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</span>
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusColor(selectedAppointment.status)}`}>
                    {selectedAppointment.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Datum</h4>
                    <div className="text-sm font-bold text-white uppercase">{selectedAppointment.finalDate || selectedAppointment.requestedDate}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Uhrzeit</h4>
                    <div className="text-sm font-bold text-white uppercase">{selectedAppointment.finalTime || selectedAppointment.requestedTime}</div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Partner</h4>
                    <div className="text-sm font-bold text-white uppercase">{selectedAppointment.partnerName}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ort</h4>
                    <div className="text-sm font-bold text-white uppercase">{selectedAppointment.location || 'Nicht festgelegt'}</div>
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Anliegen</h4>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">{selectedAppointment.reason}</p>
                </div>

                {canManage && (
                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Bearbeitung</h4>
                    
                    {!isRescheduling && !isRejecting ? (
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleUpdateStatus(selectedAppointment.id, 'Bestätigt')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Bestätigen
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(selectedAppointment.id, 'In Bearbeitung')}
                          className="bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          In Bearbeitung
                        </button>
                        <button 
                          onClick={() => {
                            setRejectionNotes('');
                            setIsRejecting(true);
                          }}
                          className="bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Ablehnen
                        </button>
                        <button 
                          onClick={() => {
                            setRescheduleData({
                              date: selectedAppointment.finalDate || selectedAppointment.requestedDate,
                              time: selectedAppointment.finalTime || selectedAppointment.requestedTime,
                              location: selectedAppointment.location || '',
                              notes: ''
                            });
                            setIsRescheduling(true);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Verschieben
                        </button>
                      </div>
                    ) : isRejecting ? (
                      <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top-4">
                        <h5 className="text-[9px] font-black text-red-500 uppercase tracking-widest">Termin ablehnen</h5>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase">Grund für die Ablehnung</label>
                          <textarea 
                            placeholder="Bitte geben Sie einen Grund an..."
                            value={rejectionNotes}
                            onChange={e => setRejectionNotes(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white outline-none focus:border-red-500 h-24 resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsRejecting(false)}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            Abbrechen
                          </button>
                          <button 
                            disabled={!rejectionNotes.trim()}
                            onClick={() => handleUpdateStatus(selectedAppointment.id, 'Abgelehnt', rejectionNotes)}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                          >
                            Definitiv Ablehnen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-black/40 border border-white/10 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top-4">
                        <h5 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Termin verschieben / Vorschlag</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-500 uppercase">Datum</label>
                            <input 
                              type="date" 
                              value={rescheduleData.date}
                              onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})}
                              className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500 [color-scheme:dark]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-500 uppercase">Uhrzeit</label>
                            <input 
                              type="time" 
                              value={rescheduleData.time}
                              onChange={e => setRescheduleData({...rescheduleData, time: e.target.value})}
                              className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500 [color-scheme:dark]"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase">Ort</label>
                          <input 
                            type="text" 
                            placeholder="Ort angeben..."
                            value={rescheduleData.location}
                            onChange={e => setRescheduleData({...rescheduleData, location: e.target.value})}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase">Anmerkung</label>
                          <textarea 
                            placeholder="Grund für die Verschiebung..."
                            value={rescheduleData.notes}
                            onChange={e => setRescheduleData({...rescheduleData, notes: e.target.value})}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500 h-20 resize-none"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={() => setIsRescheduling(false)}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            Abbrechen
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(
                              selectedAppointment.id, 
                              'Verschoben', 
                              rescheduleData.notes || 'Termin verschoben', 
                              rescheduleData.date, 
                              rescheduleData.time, 
                              rescheduleData.location
                            )}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            Speichern
                          </button>
                        </div>
                      </div>
                    )}

                    {!isRescheduling && !isRejecting && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Ort festlegen</label>
                        <input 
                          type="text" 
                          placeholder="z.B. Besprechungsraum 1"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-xs font-bold outline-none focus:border-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateStatus(selectedAppointment.id, selectedAppointment.status, "Ort aktualisiert", undefined, undefined, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4 pt-6 border-t border-white/5">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Verlauf</h4>
                  <div className="space-y-4">
                    {selectedAppointment.statusLog?.map((log, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="w-1 bg-white/10 rounded-full"></div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{log.status}</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase">{new Date(log.timestamp).toLocaleString('de-DE')}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{log.notes}</p>
                          {log.editorName && <div className="text-[8px] text-blue-500 font-black uppercase mt-1">Bearbeiter: {log.editorName}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl">
          <div className="w-full max-w-xl bg-[#1e293b] border border-white/10 rounded-[40px] p-12 shadow-2xl relative overflow-hidden">
            <button onClick={() => setIsCreating(false)} className="absolute top-8 right-8 text-slate-400 hover:text-white">✕</button>
            
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Interner Termin</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">Dienstliche Terminanfrage erstellen</p>
            </div>

            <form onSubmit={handleCreateInternal} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Wunschdatum</label>
                  <input name="date" type="date" required className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-blue-500 [color-scheme:dark]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Wunschuhrzeit</label>
                  <input name="time" type="time" required className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-blue-500 [color-scheme:dark]" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Terminpartner</label>
                <select name="partnerUserId" required className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold focus:border-blue-500 outline-none transition-all cursor-pointer">
                  <option value="" className="bg-slate-900">Bitte wählen</option>
                  {officers.map(u => (
                    <option key={u.id} value={u.id} className="bg-slate-900">{u.rank} {u.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Begründung / Anliegen</label>
                <textarea name="reason" required rows={4} className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-slate-200 text-sm leading-relaxed outline-none resize-none focus:border-blue-500 transition-all" placeholder="Grund des Termins..."></textarea>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95">
                Anfrage absenden
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
