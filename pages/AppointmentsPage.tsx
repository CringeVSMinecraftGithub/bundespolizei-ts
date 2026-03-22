import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Permission, Appointment, AppointmentStatus, User } from '../types';
import { dbCollections, addDoc, onSnapshot, query, orderBy, updateDoc, doc, getDocs } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

const AppointmentsPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'Meine' | 'Interne' | 'Externe'>('Meine');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [partnerType, setPartnerType] = useState<'Beamter' | 'Abteilung'>('Beamter');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('Alle');
  const [filterPartner, setFilterPartner] = useState<string>('Alle');

  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '', location: '', notes: '' });
  const [isRescheduling, setIsRescheduling] = useState(false);
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
    const fetchRoles = async () => {
      const snap = await getDocs(dbCollections.roles);
      setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchOfficers();
    fetchRoles();

    return unsub;
  }, []);

  const handleCreateInternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = {};
    formData.forEach((value, key) => { data[key] = value; });

    let partnerName = '';
    let partnerUserId = data.partnerUserId || 'DEPARTMENT';

    if (partnerType === 'Beamter') {
      const partner = officers.find(u => u.id === data.partnerUserId);
      if (!partner) return;
      partnerName = `${partner.rank} ${partner.lastName}`;
    } else {
      const role = roles.find(r => r.id === data.roleId);
      partnerName = role ? role.name : (data.customRole || 'Abteilung');
      partnerUserId = data.roleId || 'CUSTOM_DEPT';
    }

    try {
      await addDoc(dbCollections.appointments, {
        type: 'Intern',
        applicantUserId: user.id,
        applicantName: `${user.rank} ${user.lastName}`,
        partnerUserId: partnerUserId,
        partnerName: partnerName,
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
      case 'Eingegangen': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'In Bearbeitung': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Bestätigt': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Abgelehnt': return 'bg-red-50 text-red-600 border-red-200';
      case 'Verschoben': return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-50">
      {/* Sidebar Navigation */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-8 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Terminverwaltung</h2>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Behörden-Kalender</p>
        </div>

        <div className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('Meine')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all ${activeTab === 'Meine' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span>👤</span>
            <span className="text-[11px] font-bold uppercase tracking-wider">Meine Termine</span>
          </button>

          {canManage && (
            <>
              <button 
                onClick={() => setActiveTab('Interne')}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all ${activeTab === 'Interne' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <span>🏢</span>
                <span className="text-[11px] font-bold uppercase tracking-wider">Interne Anfragen</span>
              </button>
              <button 
                onClick={() => setActiveTab('Externe')}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all ${activeTab === 'Externe' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <span>🌍</span>
                <span className="text-[11px] font-bold uppercase tracking-wider">Externe Anfragen</span>
              </button>
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-200">
          <button 
            onClick={() => { setIsCreating(true); setSelectedRoleId(''); }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all"
          >
            + Interner Termin
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filters Header */}
        <div className="h-20 bg-white border-b border-slate-200 flex items-center px-8 gap-6 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[10px] font-bold text-slate-900 uppercase outline-none focus:border-blue-500"
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
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Partner:</span>
              <select 
                value={filterPartner}
                onChange={(e) => setFilterPartner(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[10px] font-bold text-slate-900 uppercase outline-none focus:border-blue-500"
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
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 gap-4">
            {filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <span className="text-4xl mb-4">📅</span>
                <p className="text-[10px] font-bold uppercase tracking-wider">Keine Termine gefunden</p>
              </div>
            ) : (
              filteredAppointments.map(a => (
                <button 
                  key={a.id}
                  onClick={() => setSelectedAppointment(a)}
                  className={`w-full flex items-center justify-between p-6 rounded-xl border transition-all text-left ${selectedAppointment?.id === a.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${a.type === 'Intern' ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-600'}`}>
                      {a.type === 'Intern' ? '🏢' : '🌍'}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        {a.type === 'Intern' ? `Von: ${a.applicantName}` : `Bürger-Code: ${a.citizenCode}`}
                      </div>
                      <div className="text-base font-bold text-slate-900 uppercase tracking-tight">
                        {a.reason.length > 40 ? a.reason.substring(0, 40) + '...' : a.reason}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mit: {a.partnerName}</span>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{a.finalDate || a.requestedDate} um {a.finalTime || a.requestedTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(a.status)}`}>
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
            className="w-[500px] bg-white border-l border-slate-200 flex flex-col shadow-xl z-20"
          >
            <div className="p-8 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Termindetails</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">ID: {selectedAppointment.id}</p>
              </div>
              <button onClick={() => setSelectedAppointment(null)} className="text-slate-400 hover:text-slate-900 transition-colors">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
                  <span className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(selectedAppointment.status)}`}>
                    {selectedAppointment.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Datum</h4>
                    <div className="text-sm font-bold text-slate-900 uppercase">{selectedAppointment.finalDate || selectedAppointment.requestedDate}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Uhrzeit</h4>
                    <div className="text-sm font-bold text-slate-900 uppercase">{selectedAppointment.finalTime || selectedAppointment.requestedTime}</div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Partner</h4>
                    <div className="text-sm font-bold text-slate-900 uppercase">{selectedAppointment.partnerName}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Ort</h4>
                    <div className="text-sm font-bold text-slate-900 uppercase">{selectedAppointment.location || 'Nicht festgelegt'}</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Anliegen</h4>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{selectedAppointment.reason}</p>
                </div>

                {canManage && (
                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-4">Bearbeitung</h4>
                    
                    {!isRescheduling && !isRejecting ? (
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleUpdateStatus(selectedAppointment.id, 'Bestätigt')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          Bestätigen
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(selectedAppointment.id, 'In Bearbeitung')}
                          className="bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          In Bearbeitung
                        </button>
                        <button 
                          onClick={() => {
                            setRejectionNotes('');
                            setIsRejecting(true);
                          }}
                          className="bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
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
                          className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          Verschieben
                        </button>
                      </div>
                    ) : isRejecting ? (
                      <div className="bg-red-50 border border-red-200 p-6 rounded-xl space-y-4">
                        <h5 className="text-[9px] font-bold text-red-600 uppercase tracking-wider">Termin ablehnen</h5>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-500 uppercase">Grund für die Ablehnung</label>
                          <textarea 
                            placeholder="Bitte geben Sie einen Grund an..."
                            value={rejectionNotes}
                            onChange={e => setRejectionNotes(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-900 outline-none focus:border-red-500 h-24 resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsRejecting(false)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"
                          >
                            Abbrechen
                          </button>
                          <button 
                            disabled={!rejectionNotes.trim()}
                            onClick={() => handleUpdateStatus(selectedAppointment.id, 'Abgelehnt', rejectionNotes)}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            Definitiv Ablehnen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl space-y-4">
                        <h5 className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">Termin verschieben / Vorschlag</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-500 uppercase">Datum</label>
                            <input 
                              type="date" 
                              value={rescheduleData.date}
                              onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-500 uppercase">Uhrzeit</label>
                            <input 
                              type="time" 
                              value={rescheduleData.time}
                              onChange={e => setRescheduleData({...rescheduleData, time: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-500 uppercase">Ort</label>
                          <input 
                            type="text" 
                            placeholder="Ort angeben..."
                            value={rescheduleData.location}
                            onChange={e => setRescheduleData({...rescheduleData, location: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-500 uppercase">Anmerkung</label>
                          <textarea 
                            placeholder="Grund für die Verschiebung..."
                            value={rescheduleData.notes}
                            onChange={e => setRescheduleData({...rescheduleData, notes: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 outline-none focus:border-indigo-500 h-20 resize-none"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={() => setIsRescheduling(false)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"
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
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"
                          >
                            Speichern
                          </button>
                        </div>
                      </div>
                    )}

                    {!isRescheduling && !isRejecting && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-2">Ort festlegen</label>
                        <input 
                          type="text" 
                          placeholder="z.B. Besprechungsraum 1"
                          className="w-full bg-white border border-slate-200 rounded-lg p-4 text-slate-900 text-xs font-bold outline-none focus:border-blue-500"
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

                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Verlauf</h4>
                  <div className="space-y-4">
                    {selectedAppointment.statusLog?.map((log, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="w-1 bg-slate-200 rounded-full"></div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">{log.status}</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase">{new Date(log.timestamp).toLocaleString('de-DE')}</span>
                          </div>
                          <p className="text-[10px] text-slate-600 mt-1">{log.notes}</p>
                          {log.editorName && <div className="text-[8px] text-blue-600 font-bold uppercase mt-1">Bearbeiter: {log.editorName}</div>}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-12 shadow-xl relative overflow-hidden">
            <button onClick={() => setIsCreating(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900">✕</button>
            
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Interner Termin</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2">Dienstliche Terminanfrage erstellen</p>
            </div>

            <form onSubmit={handleCreateInternal} className="space-y-6">
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  type="button"
                  onClick={() => setPartnerType('Beamter')}
                  className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${partnerType === 'Beamter' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Einzelner Beamter
                </button>
                <button 
                  type="button"
                  onClick={() => setPartnerType('Abteilung')}
                  className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${partnerType === 'Abteilung' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Abteilung / Bereich
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-4">Wunschdatum</label>
                  <input name="date" type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-900 outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-4">Wunschuhrzeit</label>
                  <input name="time" type="time" required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-900 outline-none focus:border-blue-500" />
                </div>
              </div>

              {partnerType === 'Beamter' ? (
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-4">Terminpartner (Beamter)</label>
                  <select name="partnerUserId" required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-900 font-bold focus:border-blue-500 outline-none transition-all cursor-pointer">
                    <option value="">Bitte wählen</option>
                    {officers.map(u => (
                      <option key={u.id} value={u.id}>{u.rank} {u.lastName}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-4">Abteilung / Bereich</label>
                    <select 
                      name="roleId" 
                      required 
                      value={selectedRoleId}
                      onChange={e => setSelectedRoleId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-900 font-bold focus:border-blue-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Bitte wählen</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                      <option value="Sonstiges">Sonstiges / Manuelle Eingabe</option>
                    </select>
                  </div>
                  {selectedRoleId === 'Sonstiges' && (
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-4">Bezeichnung angeben</label>
                      <input 
                        name="customRole" 
                        type="text" 
                        required 
                        placeholder="z.B. IT-Abteilung"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-900 outline-none focus:border-blue-500" 
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-4">Begründung / Anliegen</label>
                <textarea name="reason" required rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-6 text-slate-900 text-sm leading-relaxed outline-none resize-none focus:border-blue-500 transition-all"></textarea>
              </div>

              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95">
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
