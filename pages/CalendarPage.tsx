
import React, { useState, useEffect, useMemo } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, db } from '../firebase';
import { CalendarEvent, Permission } from '../types';
import { useAuth } from '../App';

const CalendarPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isAdding, setIsAdding] = useState(false);
  
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    startTime: '08:00',
    type: 'Personal',
    isPublic: false
  });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(query(dbCollections.calendar, orderBy("startTime", "asc")), (snap) => {
      const allEvents = snap.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
      // Filter: Eigene Termine ODER öffentliche Termine
      const visibleEvents = allEvents.filter(e => e.isPublic || e.createdBy === user.id);
      setEvents(visibleEvents);
    });
    return unsub;
  }, [user]);

  // Kalender-Logik
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Anpassung auf Montag als Wochenstart
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month);
    
    const prevMonthDays = daysInMonth(year, month - 1);
    const grid = [];

    // Tage des Vormonats
    for (let i = startOffset - 1; i >= 0; i--) {
      grid.push({ day: prevMonthDays - i, month: month - 1, year, isCurrentMonth: false });
    }
    // Tage des aktuellen Monats
    for (let i = 1; i <= totalDays; i++) {
      grid.push({ day: i, month: month, year, isCurrentMonth: true });
    }
    // Tage des Folgemonats (Auffüllen bis 42 Zellen für konstantes Layout)
    const remainingCells = 42 - grid.length;
    for (let i = 1; i <= remainingCells; i++) {
      grid.push({ day: i, month: month + 1, year, isCurrentMonth: false });
    }
    return grid;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(nextDate);
  };

  const getEventsForDate = (day: number, month: number, year: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const handleAdd = async () => {
    if (!user || !newEvent.title || !selectedDate) return;
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    
    try {
      await addDoc(dbCollections.calendar, {
        ...newEvent,
        date: dateStr,
        createdBy: user.id,
        creatorName: `${user.rank} ${user.lastName}`,
        timestamp: new Date().toISOString()
      });
      setIsAdding(false);
      setNewEvent({ title: '', description: '', startTime: '08:00', type: 'Personal', isPublic: false });
    } catch (e) {
      console.error(e);
      alert("Fehler beim Speichern des Termins.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Termin wirklich löschen?")) {
      await deleteDoc(doc(db, "calendar", id));
    }
  };

  const selectedDateEvents = selectedDate 
    ? getEventsForDate(selectedDate.getDate(), selectedDate.getMonth(), selectedDate.getFullYear())
    : [];

  return (
    <PoliceOSWindow title="Dienstkalender">
      <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden">
        
        {/* Header Section */}
        <div className="flex justify-between items-center shrink-0 border-b border-white/5 pb-4">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Monats <span className="text-blue-500">Planer</span></h1>
            <div className="flex items-center bg-[#1a1c23] rounded-2xl p-1 border border-white/10">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-all">◀</button>
              <span className="px-6 text-[10px] font-black uppercase tracking-[0.3em] text-white">
                {currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/5 rounded-xl transition-all">▶</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-600/5 border border-blue-500/20 rounded-xl text-[9px] font-black text-blue-500 uppercase tracking-widest">
               <div className="w-2 h-2 bg-blue-500 rounded-full"></div> Persönlich
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-amber-600/5 border border-amber-500/20 rounded-xl text-[9px] font-black text-amber-500 uppercase tracking-widest">
               <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div> Dienstlich
            </div>
          </div>
        </div>

        {/* Main Content: Calendar Grid and Side Panel */}
        <div className="flex-1 flex gap-6 min-h-0">
          
          {/* Calendar Grid */}
          <div className="flex-1 flex flex-col bg-[#1a1c23]/40 border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
            <div className="grid grid-cols-7 bg-black/40 border-b border-white/5 py-3">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                <div key={d} className="text-center text-[9px] font-black uppercase text-slate-500 tracking-widest">{d}</div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-6">
              {calendarDays.map((dayObj, i) => {
                const dayEvents = getEventsForDate(dayObj.day, dayObj.month, dayObj.year);
                const hasPublic = dayEvents.some(e => e.isPublic);
                const isToday = new Date().toDateString() === new Date(dayObj.year, dayObj.month, dayObj.day).toDateString();
                const isSelected = selectedDate?.getDate() === dayObj.day && selectedDate?.getMonth() === dayObj.month && selectedDate?.getFullYear() === dayObj.year;

                return (
                  <button 
                    key={i} 
                    onClick={() => setSelectedDate(new Date(dayObj.year, dayObj.month, dayObj.day))}
                    className={`relative p-3 border-r border-b border-white/5 flex flex-col items-start gap-1 transition-all hover:bg-white/[0.03] 
                      ${!dayObj.isCurrentMonth ? 'opacity-20' : 'opacity-100'} 
                      ${isSelected ? 'bg-blue-600/10 border-blue-500/30' : ''}`}
                  >
                    <span className={`text-[10px] font-black ${isToday ? 'bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-lg shadow-lg' : 'text-slate-400'}`}>
                      {dayObj.day}
                    </span>
                    <div className="mt-auto flex flex-wrap gap-1">
                      {dayEvents.slice(0, 4).map(e => (
                        <div key={e.id} className={`w-1.5 h-1.5 rounded-full ${e.isPublic ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                      ))}
                      {dayEvents.length > 4 && <span className="text-[7px] text-slate-600 font-black">+{dayEvents.length - 4}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side Panel: Selected Day View */}
          <div className="w-96 flex flex-col gap-6 animate-in slide-in-from-right-4">
             <div className="bg-[#1a1c23] border border-white/5 p-8 rounded-[40px] flex-1 flex flex-col shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 text-6xl opacity-[0.03] select-none font-black">{selectedDate?.getDate()}</div>
                
                <div className="relative z-10 border-b border-white/5 pb-6 mb-6">
                  <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Tagesübersicht</h2>
                  <div className="text-2xl font-black text-white uppercase tracking-tighter">
                    {selectedDate?.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                   {selectedDateEvents.length > 0 ? (
                     selectedDateEvents.map(e => (
                       <div key={e.id} className={`group p-5 rounded-3xl border transition-all ${e.isPublic ? 'bg-amber-600/5 border-amber-500/20' : 'bg-black/30 border-white/5 hover:bg-black/50'}`}>
                          <div className="flex justify-between items-start mb-2">
                             <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{e.startTime} Uhr</span>
                             <div className="flex items-center gap-2">
                               {e.isPublic && <span className="text-[7px] font-black bg-amber-500 text-black px-1.5 rounded uppercase leading-none py-0.5">Dienstlich</span>}
                               {(e.createdBy === user?.id || user?.isAdmin) && (
                                 <button onClick={() => handleDelete(e.id)} className="text-slate-600 hover:text-red-500 transition-colors">✕</button>
                               )}
                             </div>
                          </div>
                          <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">{e.title}</h3>
                          {e.description && <p className="text-[10px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">{e.description}</p>}
                          <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                             <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{e.creatorName}</span>
                          </div>
                       </div>
                     ))
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                        <div className="text-4xl mb-4">📅</div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Keine Termine für diesen Tag</p>
                     </div>
                   )}
                </div>

                <button 
                  onClick={() => setIsAdding(true)} 
                  className="mt-8 bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-950/20 active:scale-95"
                >
                  Termin hinzufügen
                </button>
             </div>
          </div>
        </div>

        {/* Add Modal */}
        {isAdding && (
          <div className="fixed inset-0 z-[500] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in">
            <div className="bg-[#0f172a] border border-white/10 p-10 rounded-[60px] w-full max-w-xl space-y-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Termin <span className="text-blue-500">planen</span></h2>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Für den {selectedDate?.toLocaleDateString('de-DE')}</p>
                  </div>
                  <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white text-2xl">✕</button>
               </div>
               
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Bezeichnung</label>
                    <input autoFocus placeholder="z.B. Besprechung GE" className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-sm text-white outline-none focus:border-blue-600 transition-all" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Uhrzeit</label>
                      <input type="time" className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-sm text-white outline-none [color-scheme:dark]" value={newEvent.startTime} onChange={e => setNewEvent({...newEvent, startTime: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Kategorie</label>
                      <select className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-sm text-white outline-none" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}>
                        <option className="bg-slate-900" value="Personal">Persönlich</option>
                        <option className="bg-slate-900" value="Besprechung">Besprechung</option>
                        <option className="bg-slate-900" value="Ausbildung">Ausbildung</option>
                        <option className="bg-slate-900" value="Sonstiges">Sonstiges</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Details (Optional)</label>
                    <textarea placeholder="Zusatzinformationen..." className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-sm text-white outline-none resize-none h-24" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                  </div>

                  {hasPermission(Permission.MANAGE_CALENDAR) && (
                    <div className="flex items-center gap-4 p-5 bg-amber-600/5 border border-amber-500/20 rounded-2xl">
                       <input 
                        type="checkbox" 
                        id="isPublic" 
                        checked={newEvent.isPublic} 
                        onChange={e => setNewEvent({...newEvent, isPublic: e.target.checked})} 
                        className="w-5 h-5 rounded-lg bg-slate-800 border-white/10 text-amber-500 focus:ring-amber-500/30"
                       />
                       <label htmlFor="isPublic" className="text-[10px] font-black text-amber-500 uppercase tracking-widest cursor-pointer select-none">Öffentlicher Diensttermin für alle Beamten</label>
                    </div>
                  )}
               </div>

               <div className="flex gap-4 pt-4">
                  <button onClick={handleAdd} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-3xl font-black uppercase text-[11px] tracking-widest transition-all shadow-2xl active:scale-95">Eintragen</button>
                  <button onClick={() => setIsAdding(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-500 py-6 rounded-3xl font-black uppercase text-[11px] tracking-widest">Abbrechen</button>
               </div>
            </div>
          </div>
        )}

      </div>
    </PoliceOSWindow>
  );
};

export default CalendarPage;
