import React, { useState, useEffect, useMemo } from 'react';
import { dbCollections, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, db } from '../firebase';
import { CalendarEvent, Permission } from '../types';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';

export default function CalendarPage() {
  const { user, hasPermission } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [eventIdToDelete, setEventIdToDelete] = useState<string | null>(null);
  
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
      const allEvents = snap.docs.map(d => ({ ...d.data(), id: d.id } as CalendarEvent));
      const visibleEvents = allEvents.filter(e => e.isPublic || e.createdBy === user.id);
      setEvents(visibleEvents);
    });
    return unsub;
  }, [user]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month);
    
    const prevMonthDays = daysInMonth(year, month - 1);
    const grid = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      grid.push({ day: prevMonthDays - i, month: month - 1, year, isCurrentMonth: false });
    }
    for (let i = 1; i <= totalDays; i++) {
      grid.push({ day: i, month: month, year, isCurrentMonth: true });
    }
    const remainingCells = 42 - grid.length;
    for (let i = 1; i <= remainingCells; i++) {
      grid.push({ day: i, month: month + 1, year, isCurrentMonth: false });
    }
    return grid;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const getEventsForDate = (day: number, month: number, year: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const handleAdd = async () => {
    if (!user || !newEvent.title || !selectedDate) return;

    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    
    setIsSaving(true);
    try {
      const canManage = hasPermission(Permission.MANAGE_CALENDAR);
      await addDoc(dbCollections.calendar, {
        title: newEvent.title.trim(),
        description: newEvent.description?.trim() || '',
        startTime: newEvent.startTime || '08:00',
        type: newEvent.type || 'Personal',
        isPublic: canManage ? (newEvent.isPublic || false) : false,
        date: dateStr,
        createdBy: user.id,
        creatorName: `${user.rank} ${user.lastName}`,
        timestamp: new Date().toISOString()
      });
      setIsAdding(false);
      setNewEvent({ title: '', description: '', startTime: '08:00', type: 'Personal', isPublic: false });
    } catch (e) {
      alert("Fehler beim Speichern des Termins.");
    } finally {
      setIsSaving(false);
    }
  };

  const triggerDelete = (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation(); 
    setEventIdToDelete(eventId);
  };

  const confirmDelete = async () => {
    if (!eventIdToDelete) return;
    try {
      await deleteDoc(doc(db, "calendar", eventIdToDelete));
      setEventIdToDelete(null);
    } catch (err) {
      alert("Fehler beim Löschen des Termins.");
    }
  };

  const selectedDateEvents = selectedDate 
    ? getEventsForDate(selectedDate.getDate(), selectedDate.getMonth(), selectedDate.getFullYear())
    : [];

  return (
    <div className="flex h-full overflow-hidden bg-slate-50">
      {/* Sidebar Navigation */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-8 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Monatsplaner</h2>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Behörden-Kalender</p>
        </div>

        <div className="flex-1 p-4 space-y-2">
            <div className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
            </div>
            <div className="flex justify-between px-4">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">◀</button>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">▶</button>
            </div>
        </div>

        <div className="p-6 border-t border-slate-200">
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all"
          >
            + Termin hinzufügen
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-20 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
            <h1 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Kalenderübersicht</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 py-3">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold uppercase text-slate-500 tracking-wider">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 grid-rows-6 h-[600px]">
                    {calendarDays.map((dayObj, i) => {
                        const dayEvents = getEventsForDate(dayObj.day, dayObj.month, dayObj.year);
                        const isToday = new Date().toDateString() === new Date(dayObj.year, dayObj.month, dayObj.day).toDateString();
                        const isSelected = selectedDate?.getDate() === dayObj.day && selectedDate?.getMonth() === dayObj.month && selectedDate?.getFullYear() === dayObj.year;

                        return (
                        <button 
                            key={i} 
                            onClick={() => setSelectedDate(new Date(dayObj.year, dayObj.month, dayObj.day))}
                            className={`relative p-3 border-r border-b border-slate-100 flex flex-col items-start gap-1 transition-all hover:bg-slate-50 
                            ${!dayObj.isCurrentMonth ? 'bg-slate-50 text-slate-300' : 'text-slate-900'} 
                            ${isSelected ? 'bg-blue-50' : ''}`}
                        >
                            <span className={`text-[10px] font-bold ${isToday ? 'bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-lg shadow-sm' : ''}`}>
                                {dayObj.day}
                            </span>
                            <div className="mt-auto flex flex-wrap gap-1">
                                {dayEvents.slice(0, 3).map(e => (
                                    <div key={e.id} className={`w-1.5 h-1.5 rounded-full ${e.isPublic ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                ))}
                            </div>
                        </button>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div 
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="w-[400px] bg-white border-l border-slate-200 flex flex-col shadow-xl z-20"
          >
            <div className="p-8 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                    {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-4">
                {selectedDateEvents.length > 0 ? (
                    selectedDateEvents.map(e => (
                        <div key={e.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{e.startTime} Uhr</span>
                                {(e.createdBy === user?.id || user?.isAdmin) && (
                                    <button onClick={(event) => triggerDelete(event, e.id)} className="text-slate-400 hover:text-red-500">✕</button>
                                )}
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{e.title}</h4>
                            {e.description && <p className="text-[10px] text-slate-600">{e.description}</p>}
                        </div>
                    ))
                ) : (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center py-10">Keine Termine</p>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-10 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight mb-8">Termin hinzufügen</h2>
            <form className="space-y-6">
                <input placeholder="Titel" className="w-full border border-slate-200 rounded-lg p-4 text-sm outline-none focus:border-blue-500" value={newEvent.title || ''} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="time" className="w-full border border-slate-200 rounded-lg p-4 text-sm outline-none focus:border-blue-500" value={newEvent.startTime || ''} onChange={e => setNewEvent({...newEvent, startTime: e.target.value})} />
                    <select className="w-full border border-slate-200 rounded-lg p-4 text-sm outline-none focus:border-blue-500" value={newEvent.type || ''} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}>
                        <option value="Personal">Persönlich</option>
                        <option value="Besprechung">Besprechung</option>
                    </select>
                </div>
                <textarea placeholder="Beschreibung" className="w-full border border-slate-200 rounded-lg p-4 text-sm outline-none focus:border-blue-500 h-24" value={newEvent.description || ''} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                <div className="flex gap-4">
                    <button type="button" onClick={handleAdd} className="flex-1 bg-slate-900 text-white py-4 rounded-lg font-bold text-[10px] uppercase tracking-wider">Speichern</button>
                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-lg font-bold text-[10px] uppercase tracking-wider">Abbrechen</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
