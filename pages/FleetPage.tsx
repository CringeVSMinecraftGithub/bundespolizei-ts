
import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, onSnapshot, updateDoc, doc, db, addDoc } from '../firebase';
import { Vehicle } from '../types';
import { useAuth } from '../App';

const FleetPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ plate: '', model: '' });

  useEffect(() => {
    const unsub = onSnapshot(dbCollections.fleet, (snap) => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
    });
    return unsub;
  }, []);

  const toggleStatus = async (v: Vehicle) => {
    const nextStatus = v.status === 'Einsatzbereit' ? 'Im Einsatz' : v.status === 'Im Einsatz' ? 'Defekt' : 'Einsatzbereit';
    await updateDoc(doc(db, "fleet", v.id), { 
      status: nextStatus,
      lastDriver: user ? `${user.rank} ${user.lastName}` : v.lastDriver
    });
  };

  const handleAdd = async () => {
    await addDoc(dbCollections.fleet, { ...newVehicle, status: 'Einsatzbereit', fuel: 100 });
    setShowAdd(false);
    setNewVehicle({ plate: '', model: '' });
  };

  return (
    <PoliceOSWindow title="Fuhrpark-Verwaltung">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-light text-white tracking-tight">Fuhrpark <span className="text-blue-500 font-bold">Zentrale</span></h1>
          <button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-sm text-xs font-bold uppercase transition-all">Fahrzeug hinzufügen</button>
        </div>

        {showAdd && (
          <div className="bg-[#1f2937]/50 border border-blue-500/30 p-6 rounded-sm space-y-4 animate-in slide-in-from-top-4">
             <div className="grid grid-cols-2 gap-4">
               <input placeholder="Kennzeichen (z.B. BP-42)" className="bg-black/40 border border-white/10 p-3 text-sm text-white outline-none" value={newVehicle.plate} onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})} />
               <input placeholder="Modell (z.B. Audi RS6)" className="bg-black/40 border border-white/10 p-3 text-sm text-white outline-none" value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} />
             </div>
             <div className="flex gap-2">
                <button onClick={handleAdd} className="bg-emerald-600 px-6 py-2 rounded-sm text-xs font-bold uppercase">Speichern</button>
                <button onClick={() => setShowAdd(false)} className="bg-slate-700 px-6 py-2 rounded-sm text-xs font-bold uppercase">Abbrechen</button>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map(v => (
            <div key={v.id} className="bg-[#1a1c23] border border-white/5 rounded-sm p-6 hover:border-blue-500/30 transition-all flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{v.model}</div>
                  <div className="text-2xl font-black text-white uppercase tracking-tighter">{v.plate}</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${v.status === 'Einsatzbereit' ? 'bg-emerald-500/10 text-emerald-500' : v.status === 'Im Einsatz' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
                  {v.status}
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-white/5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-500 uppercase">Treibstoff:</span>
                  <span className="text-slate-300">{v.fuel}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: `${v.fuel}%` }}></div>
                </div>
                <div className="text-[9px] text-slate-600 pt-2 italic">Zuletzt geführt von: {v.lastDriver || 'N/A'}</div>
              </div>

              <button onClick={() => toggleStatus(v)} className="w-full mt-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest py-3 rounded-sm transition-all border border-white/5">Status ändern</button>
            </div>
          ))}
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default FleetPage;
