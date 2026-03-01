
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inpasService } from '../src/services/inpasService';
import { InpasCitizen, InpasVehicle, InpasWeapon } from '../types';
import { motion, AnimatePresence } from 'motion/react';

type InpasMode = 'START' | 'CITIZEN' | 'VEHICLE' | 'WEAPON';

const InpasPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<InpasMode>('START');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [citizenResults, setCitizenResults] = useState<InpasCitizen[]>([]);
  const [vehicleResults, setVehicleResults] = useState<InpasVehicle[]>([]);
  const [weaponResults, setWeaponResults] = useState<InpasWeapon[]>([]);
  
  const [selectedCitizen, setSelectedCitizen] = useState<InpasCitizen | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<InpasVehicle | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<InpasWeapon | null>(null);
  const [stats, setStats] = useState({ citizens: 0, vehicles: 0, weapons: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const citizens = await inpasService.searchCitizens('');
        const vehicles = await inpasService.searchVehicles('');
        const weapons = await inpasService.searchWeapons('');
        setStats({
          citizens: citizens.length,
          vehicles: vehicles.length,
          weapons: weapons.length
        });
      } catch (error) {
        console.error("Stats fetch error:", error);
      }
    };
    fetchStats();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      if (mode === 'CITIZEN') {
        const results = await inpasService.searchCitizens(searchQuery);
        setCitizenResults(results);
      } else if (mode === 'VEHICLE') {
        const results = await inpasService.searchVehicles(searchQuery);
        setVehicleResults(results);
      } else if (mode === 'WEAPON') {
        const results = await inpasService.searchWeapons(searchQuery);
        setWeaponResults(results);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSearch = () => {
    setSearchQuery('');
    setHasSearched(false);
    setCitizenResults([]);
    setVehicleResults([]);
    setWeaponResults([]);
    setSelectedCitizen(null);
    setSelectedVehicle(null);
    setSelectedWeapon(null);
  };

  const renderStartView = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12">
      <button 
        onClick={() => { setMode('CITIZEN'); resetSearch(); }}
        className="group bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 hover:border-blue-500/40 p-10 rounded-[40px] transition-all hover:scale-105 flex flex-col items-center gap-6 shadow-2xl"
      >
        <div className="w-20 h-20 bg-blue-600/20 text-blue-500 rounded-3xl flex items-center justify-center text-4xl group-hover:bg-blue-600 group-hover:text-white transition-all">👤</div>
        <div className="text-center">
          <div className="text-lg font-black text-white uppercase tracking-widest mb-2">Bürger</div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Personenabfrage</div>
        </div>
      </button>

      <button 
        onClick={() => { setMode('VEHICLE'); resetSearch(); }}
        className="group bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 hover:border-amber-500/40 p-10 rounded-[40px] transition-all hover:scale-105 flex flex-col items-center gap-6 shadow-2xl"
      >
        <div className="w-20 h-20 bg-amber-600/20 text-amber-500 rounded-3xl flex items-center justify-center text-4xl group-hover:bg-amber-600 group-hover:text-white transition-all">🚓</div>
        <div className="text-center">
          <div className="text-lg font-black text-white uppercase tracking-widest mb-2">Fahrzeuge</div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Registerabfrage</div>
        </div>
      </button>

      <button 
        onClick={() => { setMode('WEAPON'); resetSearch(); }}
        className="group bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 hover:border-red-500/40 p-10 rounded-[40px] transition-all hover:scale-105 flex flex-col items-center gap-6 shadow-2xl"
      >
        <div className="w-20 h-20 bg-red-600/20 text-red-500 rounded-3xl flex items-center justify-center text-4xl group-hover:bg-red-600 group-hover:text-white transition-all">🔫</div>
        <div className="text-center">
          <div className="text-lg font-black text-white uppercase tracking-widest mb-2">Waffen</div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Seriennummern</div>
        </div>
      </button>
    </div>
  );

  const handleCaseClick = (record: string) => {
    // Extract case number like ANZ-123456-2026
    const match = record.match(/ANZ-\d+-\d+/);
    if (match) {
      const reportNumber = match[0];
      navigate('/cases', { state: { selectedReportNumber: reportNumber } });
    }
  };

  const handleOwnerClick = async (ownerName: string) => {
    setMode('CITIZEN');
    setSearchQuery(ownerName);
    setIsLoading(true);
    setHasSearched(true);
    setSelectedVehicle(null);
    try {
      const results = await inpasService.searchCitizens(ownerName);
      setCitizenResults(results);
      // If exactly one result, select it automatically
      if (results.length === 1) {
        setSelectedCitizen(results[0]);
      }
    } catch (error) {
      console.error("Owner search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSearchView = () => {
    const placeholders = {
      CITIZEN: 'Name eingeben...',
      VEHICLE: 'Kennzeichen, Halter oder Typ (z.B. PKW)...',
      WEAPON: 'Seriennummer eingeben...'
    };

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMode('START')}
            className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all"
          >
            ⬅️
          </button>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
            {mode === 'CITIZEN' ? 'Bürgerabfrage' : mode === 'VEHICLE' ? 'Fahrzeugregister' : 'Waffenregister'}
          </h2>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <input 
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholders[mode as keyof typeof placeholders]}
            className="w-full h-16 bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-3xl px-8 text-white text-lg font-medium outline-none focus:border-blue-500/50 transition-all shadow-2xl"
          />
          <button 
            type="submit"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 px-6 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"
          >
            Suchen
          </button>
        </form>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}

        {!isLoading && searchQuery && (
          <div className="space-y-4">
            {mode === 'CITIZEN' && citizenResults.length > 0 && citizenResults.map(c => (
              <button 
                key={c.id} 
                onClick={() => setSelectedCitizen(c)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/5 p-6 rounded-3xl flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center text-xl">👤</div>
                  <div className="text-left">
                    <div className="text-sm font-black text-white uppercase tracking-tight">{c.firstName} {c.lastName}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{c.birthDate} • {c.nationality}</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest group-hover:text-blue-500 transition-colors">Details ➔</div>
              </button>
            ))}

            {mode === 'VEHICLE' && vehicleResults.length > 0 && vehicleResults.map(v => (
              <button 
                key={v.id} 
                onClick={() => setSelectedVehicle(v)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/5 p-6 rounded-3xl flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-amber-600/10 text-amber-500 rounded-2xl flex items-center justify-center text-xl">🚓</div>
                  <div className="text-left">
                    <div className="text-sm font-black text-white uppercase tracking-tight">{v.plate}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{v.brand} {v.model} • Halter: {v.ownerName}</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest group-hover:text-amber-500 transition-colors">Details ➔</div>
              </button>
            ))}

            {mode === 'WEAPON' && weaponResults.length > 0 && weaponResults.map(w => (
              <button 
                key={w.id} 
                onClick={() => setSelectedWeapon(w)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/5 p-6 rounded-3xl flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-red-600/10 text-red-500 rounded-2xl flex items-center justify-center text-xl">🔫</div>
                  <div className="text-left">
                    <div className="text-sm font-black text-white uppercase tracking-tight">{w.serialNumber}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{w.type} • Besitzer: {w.ownerName}</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest group-hover:text-red-500 transition-colors">Details ➔</div>
              </button>
            ))}

            {hasSearched && ((mode === 'CITIZEN' && citizenResults.length === 0) || 
              (mode === 'VEHICLE' && vehicleResults.length === 0) || 
              (mode === 'WEAPON' && weaponResults.length === 0)) && (
              <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <div className="text-4xl mb-4">🔍</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Keine Treffer gefunden</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDetailView = () => {
    if (selectedCitizen) {
      return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedCitizen(null)}
              className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all"
            >
              ⬅️
            </button>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Bürger-Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600/20 text-blue-500 rounded-3xl flex items-center justify-center text-4xl">👤</div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">{selectedCitizen.firstName} {selectedCitizen.lastName}</h3>
                      <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1">ID: {selectedCitizen.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {selectedCitizen.criminalRecord.length > 0 && (
                      <div className="bg-red-600 text-white text-[8px] font-black uppercase px-3 py-1 rounded-full shadow-lg shadow-red-900/20 animate-pulse">Vorbestraft</div>
                    )}
                    {selectedCitizen.openCases.length > 0 && (
                      <div className="bg-amber-500 text-black text-[8px] font-black uppercase px-3 py-1 rounded-full shadow-lg shadow-amber-900/20">Offene Verfahren</div>
                    )}
                    {selectedCitizen.criminalRecord.length === 0 && selectedCitizen.openCases.length === 0 && (
                      <div className="bg-emerald-600 text-white text-[8px] font-black uppercase px-3 py-1 rounded-full shadow-lg shadow-emerald-900/20">Keine Einträge</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-8">
                  <div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Geburtsdatum</div>
                    <div className="text-sm font-bold text-white uppercase">{selectedCitizen.birthDate}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Geschlecht</div>
                    <div className="text-sm font-bold text-white uppercase">{selectedCitizen.gender}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Staatsangehörigkeit</div>
                    <div className="text-sm font-bold text-white uppercase">{selectedCitizen.nationality}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Wohnort</div>
                    <div className="text-sm font-bold text-white uppercase">{selectedCitizen.residence}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Anschrift</div>
                    <div className="text-sm font-bold text-white uppercase">{selectedCitizen.address}</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-red-500 mb-8 flex items-center gap-3">
                  <span className="w-8 h-8 bg-red-600/10 rounded-lg flex items-center justify-center text-xs">⚖️</span>
                  Strafregister & Verfahren
                </h3>
                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Vorstrafen</div>
                      <div className="text-[8px] font-black text-red-500 uppercase bg-red-500/10 px-2 py-0.5 rounded">{selectedCitizen.criminalRecord.length} Einträge</div>
                    </div>
                    <div className="space-y-3">
                      {selectedCitizen.criminalRecord.length > 0 ? selectedCitizen.criminalRecord.map((r, i) => (
                        <div 
                          key={i} 
                          onClick={() => handleCaseClick(r)}
                          className="group bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 p-4 rounded-2xl transition-all cursor-pointer"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-6 h-6 bg-red-500/20 text-red-500 rounded-lg flex items-center justify-center text-[10px] shrink-0 mt-0.5">📜</div>
                            <div className="flex-1">
                              <div className="text-[11px] font-bold text-red-400 uppercase tracking-tight leading-relaxed">{r}</div>
                              {r.includes('ANZ-') && (
                                <div className="text-[8px] text-red-500/60 font-black uppercase tracking-widest mt-1">Akte öffnen ➔</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8 bg-white/5 rounded-2xl border border-dashed border-white/5">
                          <div className="text-[10px] text-slate-600 uppercase font-black italic">Keine Vorstrafen bekannt</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Offene Verfahren</div>
                      <div className="text-[8px] font-black text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded">{selectedCitizen.openCases.length} Aktiv</div>
                    </div>
                    <div className="space-y-3">
                      {selectedCitizen.openCases.length > 0 ? selectedCitizen.openCases.map((r, i) => (
                        <div 
                          key={i} 
                          onClick={() => handleCaseClick(r)}
                          className="group bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 p-4 rounded-2xl transition-all cursor-pointer"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-6 h-6 bg-amber-500/20 text-amber-500 rounded-lg flex items-center justify-center text-[10px] shrink-0 mt-0.5">⏳</div>
                            <div className="flex-1">
                              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-tight leading-relaxed">{r}</div>
                              {r.includes('ANZ-') && (
                                <div className="text-[8px] text-amber-500/60 font-black uppercase tracking-widest mt-1">Akte öffnen ➔</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8 bg-white/5 rounded-2xl border border-dashed border-white/5">
                          <div className="text-[10px] text-slate-600 uppercase font-black italic">Keine laufenden Verfahren</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6">Status</h3>
                <div className="space-y-6">
                  <div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Führerschein</div>
                    <div className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl border ${selectedCitizen.licenseStatus === 'Gültig' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                      {selectedCitizen.licenseStatus}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Hinweise</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  {selectedCitizen.notes || 'Keine zusätzlichen Hinweise im System hinterlegt.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedVehicle) {
      return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedVehicle(null)}
              className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all"
            >
              ⬅️
            </button>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Fahrzeug-Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-amber-600/20 text-amber-500 rounded-3xl flex items-center justify-center text-4xl">🚓</div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">{selectedVehicle.plate}</h3>
                      <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-1">{selectedVehicle.brand} {selectedVehicle.model}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`text-[8px] font-black uppercase px-3 py-1 rounded-full shadow-lg ${selectedVehicle.wantedStatus === 'Keine Fahndung' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white animate-pulse'}`}>
                      {selectedVehicle.wantedStatus}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-8">
                  <div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Marke</div>
                    <div className="text-sm font-bold text-white uppercase">{selectedVehicle.brand}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Modell</div>
                    <div className="text-sm font-bold text-white uppercase">{selectedVehicle.model}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Farbe</div>
                    <div className="text-sm font-bold text-white uppercase">{selectedVehicle.color}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Erstzulassung</div>
                    <div className="text-sm font-bold text-white uppercase">{selectedVehicle.firstRegistration}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Letzter bekannter Standort</div>
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-lg">📍</span>
                      <div className="text-sm font-bold text-white uppercase">{selectedVehicle.lastLocation || 'Keine Standortdaten verfügbar'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-8 flex items-center gap-3">
                  <span className="w-8 h-8 bg-emerald-600/10 rounded-lg flex items-center justify-center text-xs">🛡️</span>
                  Versicherungsinformationen
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2">
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Status</div>
                    <div className={`text-xs font-black uppercase tracking-widest px-6 py-4 rounded-2xl border ${selectedVehicle.insuranceStatus === 'Versichert' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                      {selectedVehicle.insuranceStatus}
                    </div>
                  </div>
                  {selectedVehicle.insuranceStatus === 'Versichert' && (
                    <>
                      <div>
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Versicherer</div>
                        <div className="text-sm font-bold text-white uppercase">{selectedVehicle.insuranceCompany || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Gültig bis</div>
                        <div className="text-sm font-bold text-white uppercase">{selectedVehicle.insuranceExpiry || 'N/A'}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6">Halter</h3>
                <button 
                  onClick={() => handleOwnerClick(selectedVehicle.ownerName)}
                  className="w-full text-left p-4 bg-blue-600/5 hover:bg-blue-600/10 rounded-2xl border border-blue-500/10 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center text-lg group-hover:bg-blue-600 group-hover:text-white transition-all">👤</div>
                      <div>
                        <div className="text-sm font-black text-white uppercase tracking-tight">{selectedVehicle.ownerName}</div>
                        <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">ID: {selectedVehicle.ownerId}</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-blue-500 font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Profil ➔</div>
                  </div>
                </button>
              </div>

              <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Hinweise</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  {selectedVehicle.notes || 'Keine zusätzlichen Hinweise im System hinterlegt.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedWeapon) {
      return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedWeapon(null)}
              className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all"
            >
              ⬅️
            </button>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Waffen-Details</h2>
          </div>

          <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
            <div className="flex items-center gap-6 mb-8 pb-6 border-b border-white/5">
              <div className="w-20 h-20 bg-red-600/20 text-red-500 rounded-3xl flex items-center justify-center text-4xl">🔫</div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{selectedWeapon.serialNumber}</h3>
                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-1">{selectedWeapon.type}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-y-8">
                  <div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Waffentyp</div>
                    <div className="text-sm font-bold text-white uppercase">{selectedWeapon.type}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Kaliber</div>
                    <div className="text-sm font-bold text-white uppercase">{selectedWeapon.caliber}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Registrierungsdatum</div>
                    <div className="text-sm font-bold text-white uppercase">{selectedWeapon.registrationDate}</div>
                  </div>
                </div>

                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Eingetragener Besitzer</div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center text-lg">👤</div>
                    <div>
                      <div className="text-sm font-black text-white uppercase tracking-tight">{selectedWeapon.ownerName}</div>
                      <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">ID: {selectedWeapon.ownerId}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Status</div>
                  <div className={`text-xs font-black uppercase tracking-widest px-6 py-4 rounded-2xl border ${
                    selectedWeapon.status === 'Legal' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                    selectedWeapon.status === 'Gestohlen' ? 'bg-red-600/20 border-red-500/40 text-red-500 animate-pulse' :
                    'bg-amber-500/10 border-amber-500/20 text-amber-500'
                  }`}>
                    {selectedWeapon.status}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Hinweise</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    {selectedWeapon.notes || 'Keine zusätzlichen Hinweise im System hinterlegt.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderSidebar = () => (
    <div className="w-64 bg-[#0f172a]/80 backdrop-blur-2xl border-r border-white/5 flex flex-col h-full">
      <div className="p-8 border-b border-white/5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
          <h1 className="text-xl font-black text-white uppercase tracking-tighter">INPAS</h1>
        </div>
        <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.3em]">Polizei-Abfrage-System</p>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-8 overflow-y-auto custom-scrollbar">
        <div>
          <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Abfragen</h3>
          <div className="space-y-1">
            <button 
              onClick={() => { setMode('CITIZEN'); resetSearch(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${mode === 'CITIZEN' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <span className="text-lg">👤</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">Bürger</span>
            </button>
            <button 
              onClick={() => { setMode('VEHICLE'); resetSearch(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${mode === 'VEHICLE' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <span className="text-lg">🚓</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">Fahrzeuge</span>
            </button>
            <button 
              onClick={() => { setMode('WEAPON'); resetSearch(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${mode === 'WEAPON' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <span className="text-lg">🔫</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">Waffen</span>
            </button>
          </div>
        </div>

        <div>
          <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">System</h3>
          <div className="space-y-1">
            <button 
              onClick={() => setMode('START')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${mode === 'START' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <span className="text-lg">🏠</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-white/5">
        <div className="bg-white/5 rounded-2xl p-4">
          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">System Online</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full bg-[#020617] overflow-hidden">
      {renderSidebar()}
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-10 lg:p-14">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {mode === 'START' && (
              <motion.div 
                key="start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Willkommen im INPAS</h2>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Wählen Sie eine Kategorie aus der Seitenleiste oder unten aus.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-white/5 border border-white/5 px-6 py-3 rounded-2xl">
                      <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Datenbank</div>
                      <div className="flex gap-4">
                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-tight">{stats.citizens} Bürger</div>
                        <div className="text-[10px] font-bold text-amber-500 uppercase tracking-tight">{stats.vehicles} Fzg.</div>
                        <div className="text-[10px] font-bold text-red-500 uppercase tracking-tight">{stats.weapons} Waffen</div>
                      </div>
                    </div>
                  </div>
                </div>
                {renderStartView()}
              </motion.div>
            )}

            {mode !== 'START' && !selectedCitizen && !selectedVehicle && !selectedWeapon && (
              <motion.div 
                key="search"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {renderSearchView()}
              </motion.div>
            )}

            {(selectedCitizen || selectedVehicle || selectedWeapon) && (
              <motion.div 
                key="detail"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                {renderDetailView()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default InpasPage;
