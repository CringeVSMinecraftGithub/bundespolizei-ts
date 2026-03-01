
import React, { useState, useEffect, useMemo } from 'react';
import { dbCollections, onSnapshot, updateDoc, doc, db, addDoc, deleteDoc, query, where, orderBy } from '../firebase';
import { Vehicle, VehicleLog, Permission } from '../types';
import { useAuth } from '../App';
import DataModal from '../components/DataModal';

const FleetPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const { user, hasPermission } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const canManage = hasPermission(Permission.MANAGE_FLEET);

  useEffect(() => {
    const unsubVehicles = onSnapshot(dbCollections.fleet, (snap) => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
    });

    const unsubLogs = onSnapshot(query(dbCollections.fleetLogs, orderBy("timestamp", "desc")), (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleLog)));
    });

    return () => {
      unsubVehicles();
      unsubLogs();
    };
  }, []);

  const showStatus = (text: string, type: 'error' | 'success' = 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const addLog = async (vehicleId: string, action: string, details?: string) => {
    if (!user) return;
    try {
      await addDoc(dbCollections.fleetLogs, {
        vehicleId,
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: `${user.rank} ${user.lastName}`,
        action,
        details
      });
    } catch (e) {
      console.error("Error adding log:", e);
    }
  };

  const saveVehicle = async () => {
    if (!editingVehicle || !canManage) return;
    if (!editingVehicle.plate || !editingVehicle.model) {
      showStatus("Kennzeichen und Modell sind erforderlich.");
      return;
    }

    try {
      const data = {
        ...editingVehicle,
        fuel: editingVehicle.fuel || 100,
        status: editingVehicle.status || 'Einsatzbereit',
        updatedAt: new Date().toISOString()
      };

      if (editingVehicle.id) {
        const oldVehicle = vehicles.find(v => v.id === editingVehicle.id);
        await updateDoc(doc(db, "fleet", editingVehicle.id), data);
        
        // Log changes
        if (oldVehicle && oldVehicle.status !== data.status) {
          await addLog(editingVehicle.id, "Status geändert", `Von ${oldVehicle.status} zu ${data.status}`);
        }
        showStatus("Fahrzeug aktualisiert.", "success");
      } else {
        const docRef = await addDoc(dbCollections.fleet, data);
        await addLog(docRef.id, "Fahrzeug angelegt", `Kennzeichen: ${data.plate}, Modell: ${data.model}`);
        showStatus("Fahrzeug hinzugefügt.", "success");
      }
      setIsModalOpen(false);
      setEditingVehicle(null);
    } catch (e) {
      showStatus("Fehler beim Speichern.");
    }
  };

  const deleteVehicle = async () => {
    if (!selectedVehicle || !canManage) return;
    try {
      await deleteDoc(doc(db, "fleet", selectedVehicle.id));
      // Optionally delete logs or keep them? Usually better to keep or delete.
      // For now just delete vehicle.
      showStatus("Fahrzeug gelöscht.", "success");
      setIsDeleteConfirmOpen(false);
      setSelectedVehicle(null);
    } catch (e) {
      showStatus("Fehler beim Löschen.");
    }
  };

  const toggleStatus = async (v: Vehicle) => {
    if (!canManage) return;
    const nextStatusMap: Record<string, Vehicle['status']> = {
      'Einsatzbereit': 'Im Einsatz',
      'Im Einsatz': 'Defekt',
      'Defekt': 'Wartung',
      'Wartung': 'Einsatzbereit'
    };
    const nextStatus = nextStatusMap[v.status] || 'Einsatzbereit';
    
    try {
      await updateDoc(doc(db, "fleet", v.id), { 
        status: nextStatus,
        lastDriver: user ? `${user.rank} ${user.lastName}` : v.lastDriver,
        updatedAt: new Date().toISOString()
      });
      await addLog(v.id, "Status-Schnellwahl", `Status auf ${nextStatus} gesetzt.`);
    } catch (e) {
      showStatus("Fehler beim Status-Update.");
    }
  };

  const vehicleLogs = useMemo(() => {
    if (!selectedVehicle) return [];
    return logs.filter(l => l.vehicleId === selectedVehicle.id);
  }, [logs, selectedVehicle]);

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

        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Fuhrpark <span className="text-blue-500">Zentrale</span></h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Verwaltung und Überwachung der Dienstfahrzeuge</p>
          </div>
          {canManage && (
            <button 
              onClick={() => { setEditingVehicle({ status: 'Einsatzbereit', fuel: 100 }); setIsModalOpen(true); }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/20 active:scale-95"
            >
              Fahrzeug hinzufügen
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {vehicles.map(v => (
              <div key={v.id} className="bg-[#1a1c23] border border-white/5 rounded-[32px] p-8 flex flex-col shadow-2xl hover:border-blue-500/30 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{v.model} {v.type ? `• ${v.type}` : ''}</div>
                    <div className="text-2xl font-black text-white uppercase tracking-tighter">{v.plate}</div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${v.status === 'Einsatzbereit' ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-500' : v.status === 'Im Einsatz' ? 'bg-blue-600/20 border-blue-500/30 text-blue-500' : v.status === 'Defekt' ? 'bg-red-600/20 border-red-500/30 text-red-500' : 'bg-amber-600/20 border-amber-500/30 text-amber-500'}`}>
                    {v.status}
                  </div>
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-500">Treibstoff</span>
                      <span className={v.fuel < 20 ? 'text-red-500' : 'text-slate-300'}>{v.fuel}%</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 ${v.fuel < 20 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]'}`}
                        style={{ width: `${v.fuel}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div>
                      <div className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-1">Kilometerstand</div>
                      <div className="text-[10px] font-bold text-slate-300">{v.mileage?.toLocaleString('de-DE') || 0} KM</div>
                    </div>
                    <div>
                      <div className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-1">Zuletzt geführt</div>
                      <div className="text-[10px] font-bold text-slate-300 truncate">{v.lastDriver || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setSelectedVehicle(v); setIsDetailsOpen(true); }}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
                    >
                      Details & Log
                    </button>
                    {canManage && (
                      <button 
                        onClick={() => toggleStatus(v)}
                        className="flex-1 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-blue-500/20"
                      >
                        Status
                      </button>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setEditingVehicle(v); setIsModalOpen(true); }}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-white/5"
                      >
                        Bearbeiten
                      </button>
                      <button 
                        onClick={() => { setSelectedVehicle(v); setIsDeleteConfirmOpen(true); }}
                        className="flex-1 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-red-500/20"
                      >
                        Löschen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Modal (Add/Edit) */}
        <DataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingVehicle?.id ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}
          icon="🚓"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Kennzeichen</label>
                <input 
                  value={editingVehicle?.plate || ''}
                  onChange={e => setEditingVehicle({...editingVehicle, plate: e.target.value.toUpperCase()})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all font-black"
                  placeholder="BP-42"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Modell</label>
                <input 
                  value={editingVehicle?.model || ''}
                  onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all font-bold"
                  placeholder="Audi RS6"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Fahrzeugtyp</label>
                <input 
                  value={editingVehicle?.type || ''}
                  onChange={e => setEditingVehicle({...editingVehicle, type: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                  placeholder="Streifenwagen"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">VIN / Fahrgestellnummer</label>
                <input 
                  value={editingVehicle?.vin || ''}
                  onChange={e => setEditingVehicle({...editingVehicle, vin: e.target.value.toUpperCase()})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all font-mono"
                  placeholder="WBA..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Kilometerstand</label>
                <input 
                  type="number"
                  value={editingVehicle?.mileage || 0}
                  onChange={e => setEditingVehicle({...editingVehicle, mileage: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Treibstoff (%)</label>
                <input 
                  type="number"
                  max="100"
                  min="0"
                  value={editingVehicle?.fuel || 0}
                  onChange={e => setEditingVehicle({...editingVehicle, fuel: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Status</label>
                <select 
                  value={editingVehicle?.status || 'Einsatzbereit'}
                  onChange={e => setEditingVehicle({...editingVehicle, status: e.target.value as any})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="Einsatzbereit">Einsatzbereit</option>
                  <option value="Im Einsatz">Im Einsatz</option>
                  <option value="Defekt">Defekt</option>
                  <option value="Wartung">Wartung</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Nächster Service</label>
                <input 
                  type="date"
                  value={editingVehicle?.nextService || ''}
                  onChange={e => setEditingVehicle({...editingVehicle, nextService: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Notizen / Ausstattung</label>
              <textarea 
                value={editingVehicle?.notes || ''}
                onChange={e => setEditingVehicle({...editingVehicle, notes: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white h-32 outline-none focus:border-blue-500 transition-all resize-none"
                placeholder="Besondere Ausstattung, Mängel etc."
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
              >
                Abbrechen
              </button>
              <button 
                onClick={saveVehicle}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20"
              >
                Fahrzeug speichern
              </button>
            </div>
          </div>
        </DataModal>

        {/* Vehicle Details & Log Modal */}
        <DataModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`Details: ${selectedVehicle?.plate}`}
          subtitle={selectedVehicle?.model}
          icon="📊"
          maxWidth="max-w-4xl"
        >
          {selectedVehicle && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-black/20 rounded-3xl p-6 border border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Fahrzeugdaten</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-[8px] font-black text-slate-500 uppercase">Kennzeichen</span>
                      <span className="text-xs font-black text-white">{selectedVehicle.plate}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-[8px] font-black text-slate-500 uppercase">Modell</span>
                      <span className="text-xs font-bold text-white">{selectedVehicle.model}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-[8px] font-black text-slate-500 uppercase">Typ</span>
                      <span className="text-xs font-bold text-white">{selectedVehicle.type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-[8px] font-black text-slate-500 uppercase">VIN</span>
                      <span className="text-[10px] font-mono text-slate-400">{selectedVehicle.vin || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-[8px] font-black text-slate-500 uppercase">KM-Stand</span>
                      <span className="text-xs font-bold text-white">{selectedVehicle.mileage?.toLocaleString('de-DE') || 0} KM</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-[8px] font-black text-slate-500 uppercase">Service</span>
                      <span className="text-xs font-bold text-white">{selectedVehicle.nextService ? new Date(selectedVehicle.nextService).toLocaleDateString('de-DE') : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {selectedVehicle.notes && (
                  <div className="bg-black/20 rounded-3xl p-6 border border-white/5">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Notizen</h4>
                    <p className="text-xs text-slate-400 leading-relaxed italic">{selectedVehicle.notes}</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Fahrzeug-Logbuch</h4>
                  {canManage && (
                    <button 
                      onClick={() => {
                        const note = prompt("Log-Eintrag hinzufügen:");
                        if (note) addLog(selectedVehicle.id, "Manuelle Notiz", note);
                      }}
                      className="text-[8px] font-black text-slate-500 hover:text-white uppercase tracking-widest"
                    >
                      + Eintrag
                    </button>
                  )}
                </div>
                <div className="flex-1 bg-black/20 rounded-3xl border border-white/5 overflow-hidden flex flex-col max-h-[500px]">
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                    {vehicleLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                        <div className="text-4xl mb-2">📋</div>
                        <div className="text-[8px] font-black uppercase tracking-widest">Keine Einträge vorhanden</div>
                      </div>
                    ) : (
                      vehicleLogs.map(log => (
                        <div key={log.id} className="border-l-2 border-blue-500/30 pl-4 py-1">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[9px] font-black text-white uppercase">{log.action}</span>
                            <span className="text-[8px] font-mono text-slate-600">{new Date(log.timestamp).toLocaleString('de-DE')}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{log.details}</div>
                          <div className="text-[8px] text-slate-600 mt-1 uppercase font-bold">Durch: {log.userName}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DataModal>

        {/* Delete Confirmation Modal */}
        <DataModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          title="Fahrzeug löschen"
          subtitle="Sicherheitsabfrage"
          icon="⚠️"
          maxWidth="max-w-md"
        >
          <div className="space-y-6">
            <p className="text-slate-400 text-xs text-center leading-relaxed">
              Möchten Sie das Fahrzeug <span className="text-white font-black">{selectedVehicle?.plate}</span> wirklich unwiderruflich aus dem System löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
              >
                Abbrechen
              </button>
              <button 
                onClick={deleteVehicle}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl shadow-red-900/20"
              >
                Löschen bestätigen
              </button>
            </div>
          </div>
        </DataModal>
      </div>
  );
};

export default FleetPage;
