
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { Message, User } from '../types';
import { dbCollections, onSnapshot, query, orderBy, addDoc, updateDoc, doc, db, where, getDocs } from '../firebase';
import PoliceOSWindow from '../components/PoliceOSWindow';
import DataModal from '../components/DataModal';

const CommunicationPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentFolder, setCurrentFolder] = useState<'Inbox' | 'Sent' | 'Archive' | 'Important' | 'Spam'>('Inbox');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'archive' | 'spam', msg: Message } | null>(null);
  const [loading, setLoading] = useState(true);

  // New message form state
  const [receiverId, setReceiverId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listen for messages where user is sender or receiver
    const q = query(
      dbCollections.messages,
      orderBy("timestamp", "desc")
    );

    const unsubMessages = onSnapshot(q, (snap) => {
      const allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      // Filter client-side to avoid complex composite indexes for every combination of folder/user
      const filtered = allMsgs.filter(m => m.senderId === user.id || m.receiverId === user.id);
      setMessages(filtered);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(query(dbCollections.users), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)).filter(u => !u.isLocked));
    });

    return () => {
      unsubMessages();
      unsubUsers();
    };
  }, [user]);

  const showStatus = (text: string, type: 'error' | 'success' = 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const folderMessages = useMemo(() => {
    if (!user) return [];
    switch (currentFolder) {
      case 'Inbox':
        return messages.filter(m => m.receiverId === user.id && !m.archivedByReceiver && !m.isImportant && !m.isSpam);
      case 'Sent':
        return messages.filter(m => m.senderId === user.id && !m.archivedBySender);
      case 'Archive':
        return messages.filter(m => 
          ((m.receiverId === user.id && m.archivedByReceiver) || 
          (m.senderId === user.id && m.archivedBySender)) && !m.isSpam
        );
      case 'Important':
        return messages.filter(m => m.receiverId === user.id && m.isImportant && !m.archivedByReceiver && !m.isSpam);
      case 'Spam':
        return messages.filter(m => m.receiverId === user.id && m.isSpam && !m.archivedByReceiver);
      default:
        return [];
    }
  }, [messages, currentFolder, user]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return messages.filter(m => m.receiverId === user.id && !m.read && !m.archivedByReceiver && !m.isImportant && !m.isSpam).length;
  }, [messages, user]);

  const sendMessage = async () => {
    if (!user) return;
    if (!receiverId || !subject.trim() || !content.trim()) {
      showStatus("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }

    const receiver = users.find(u => u.id === receiverId);
    if (!receiver) return;

    try {
      const newMessage: Omit<Message, 'id'> = {
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        senderRank: user.rank,
        receiverId: receiver.id,
        receiverName: `${receiver.firstName} ${receiver.lastName}`,
        receiverRank: receiver.rank,
        subject,
        content,
        timestamp: new Date().toISOString(),
        read: false,
        archivedBySender: false,
        archivedByReceiver: false
      };

      await addDoc(dbCollections.messages, newMessage);
      setIsNewMessageModalOpen(false);
      setReceiverId('');
      setSubject('');
      setContent('');
      setUserSearch('');
      showStatus("Nachricht versendet.", "success");
    } catch (e) {
      showStatus("Fehler beim Senden.");
    }
  };

  const markAsRead = async (msg: Message) => {
    if (!user || msg.receiverId !== user.id || msg.read) return;
    try {
      await updateDoc(doc(db, "messages", msg.id), { read: true });
    } catch (e) {
      console.error("Error marking as read:", e);
    }
  };

  const archiveMessage = async (msg: Message) => {
    if (!user) return;
    try {
      const update: any = {};
      if (msg.senderId === user.id) update.archivedBySender = true;
      if (msg.receiverId === user.id) update.archivedByReceiver = true;
      
      await updateDoc(doc(db, "messages", msg.id), update);
      if (selectedMessage?.id === msg.id) setSelectedMessage(null);
      setConfirmAction(null);
      showStatus("Nachricht archiviert.", "success");
    } catch (e) {
      showStatus("Fehler beim Archivieren.");
    }
  };

  const toggleImportant = async (msg: Message) => {
    if (!user) return;
    try {
      const newStatus = !msg.isImportant;
      await updateDoc(doc(db, "messages", msg.id), { isImportant: newStatus });
      showStatus(newStatus ? "Als wichtig markiert." : "Markierung entfernt.", "success");
    } catch (e) {
      showStatus("Fehler.");
    }
  };

  const toggleSpam = async (msg: Message) => {
    if (!user) return;
    try {
      const newStatus = !msg.isSpam;
      await updateDoc(doc(db, "messages", msg.id), { isSpam: newStatus });
      if (newStatus && selectedMessage?.id === msg.id) setSelectedMessage(null);
      setConfirmAction(null);
      showStatus(newStatus ? "Als Spam markiert." : "Kein Spam mehr.", "success");
    } catch (e) {
      showStatus("Fehler.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.id !== user?.id && (
      u.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.lastName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.badgeNumber.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.rank.toLowerCase().includes(userSearch.toLowerCase())
    )
  );

  return (
    <PoliceOSWindow title="Interne Kommunikation">
      <div className="h-full flex flex-col gap-6 overflow-hidden">
        
        {statusMsg && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-top-4 duration-300">
            <div className={`px-8 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 backdrop-blur-xl ${statusMsg.type === 'error' ? 'bg-red-600/20 border-red-500 text-red-500' : 'bg-emerald-600/20 border-emerald-500 text-emerald-500'}`}>
              <span className="text-lg">{statusMsg.type === 'error' ? '⚠️' : '✅'}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{statusMsg.text}</span>
            </div>
          </div>
        )}

        <div className="flex flex-1 gap-6 overflow-hidden">
          {/* Sidebar Folders */}
          <div className="w-64 shrink-0 flex flex-col gap-4">
            <button 
              onClick={() => setIsNewMessageModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 mb-4"
            >
              Neue Nachricht
            </button>

            <div className="bg-[#1a1c23]/50 border border-white/5 rounded-[32px] p-4 space-y-2">
              <button 
                onClick={() => setCurrentFolder('Inbox')}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${currentFolder === 'Inbox' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-xl">📥</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Posteingang</span>
                </div>
                {unreadCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${currentFolder === 'Inbox' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                    {unreadCount}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setCurrentFolder('Sent')}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${currentFolder === 'Sent' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <span className="text-xl">📤</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Gesendet</span>
              </button>

              <button 
                onClick={() => setCurrentFolder('Archive')}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${currentFolder === 'Archive' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <span className="text-xl">📦</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Archiviert</span>
              </button>

              <button 
                onClick={() => setCurrentFolder('Important')}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${currentFolder === 'Important' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <span className="text-xl">⭐</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Wichtig</span>
              </button>

              <button 
                onClick={() => setCurrentFolder('Spam')}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${currentFolder === 'Spam' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <span className="text-xl">🚫</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Spam</span>
              </button>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="bg-[#1a1c23]/50 border border-white/5 rounded-[32px] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-black text-white uppercase tracking-widest">
                  {currentFolder === 'Inbox' ? 'Posteingang' : currentFolder === 'Sent' ? 'Gesendet' : 'Archiviert'}
                </h2>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{folderMessages.length} Nachrichten</span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {folderMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                    <div className="text-6xl mb-4">✉️</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.4em]">Keine Nachrichten</div>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {folderMessages.map(msg => (
                      <div 
                        key={msg.id}
                        onClick={() => { setSelectedMessage(msg); markAsRead(msg); }}
                        className={`p-6 cursor-pointer transition-all hover:bg-white/[0.02] flex items-center gap-6 ${selectedMessage?.id === msg.id ? 'bg-blue-600/10 border-l-4 border-blue-500' : ''} ${!msg.read && msg.receiverId === user?.id ? 'bg-blue-600/5' : ''}`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center text-xl shrink-0 border border-white/5">
                          {msg.senderId === user?.id ? '👤' : '✉️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest truncate">
                                {msg.senderId === user?.id ? `An: ${msg.receiverName}` : `Von: ${msg.senderName}`}
                              </span>
                              {msg.isImportant && <span className="text-amber-500 text-[10px]">⭐</span>}
                            </div>
                            <span className="text-[8px] font-mono text-slate-600 shrink-0">
                              {new Date(msg.timestamp).toLocaleString('de-DE')}
                            </span>
                          </div>
                          <h3 className={`text-xs uppercase tracking-tight truncate ${!msg.read && msg.receiverId === user?.id ? 'font-black text-white' : 'font-bold text-slate-300'}`}>
                            {msg.subject}
                          </h3>
                          <p className="text-[10px] text-slate-500 truncate mt-1">{msg.content}</p>
                        </div>
                        {!msg.read && msg.receiverId === user?.id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Message Detail View */}
          <div className="w-[500px] shrink-0 flex flex-col gap-4 overflow-hidden">
            {selectedMessage ? (
              <div className="bg-[#1a1c23] border border-white/5 rounded-[32px] flex flex-col h-full shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-300">
                <div className="p-8 border-b border-white/5 bg-black/20">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center text-2xl border border-blue-500/20 shadow-inner">
                        👤
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">
                          {selectedMessage.senderId === user?.id ? 'Empfänger' : 'Absender'}
                        </div>
                        <div className="text-sm font-black text-white uppercase tracking-tight">
                          {selectedMessage.senderId === user?.id ? selectedMessage.receiverName : selectedMessage.senderName}
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          {selectedMessage.senderId === user?.id ? selectedMessage.receiverRank : selectedMessage.senderRank}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => toggleImportant(selectedMessage)}
                        className={`p-3 rounded-xl transition-all border border-white/5 ${selectedMessage.isImportant ? 'bg-amber-500/20 text-amber-500' : 'bg-white/5 text-slate-500 hover:text-amber-500'}`}
                        title="Als wichtig markieren"
                      >
                        ⭐
                      </button>
                      <button 
                        onClick={() => setConfirmAction({ type: 'spam', msg: selectedMessage })}
                        className={`p-3 rounded-xl transition-all border border-white/5 ${selectedMessage.isSpam ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-slate-500 hover:text-red-500'}`}
                        title="Als Spam markieren"
                      >
                        🚫
                      </button>
                      <button 
                        onClick={() => setConfirmAction({ type: 'archive', msg: selectedMessage })}
                        className="p-3 bg-white/5 hover:bg-red-600/20 text-slate-500 hover:text-red-500 rounded-xl transition-all border border-white/5"
                        title="Archivieren"
                      >
                        📦
                      </button>
                    </div>
                  </div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-tight mb-2">{selectedMessage.subject}</h2>
                  <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                    Gesendet am {new Date(selectedMessage.timestamp).toLocaleString('de-DE')}
                  </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-black/10">
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedMessage.content}
                  </div>
                </div>

                <div className="p-6 bg-black/30 border-t border-white/5 flex gap-3">
                  {selectedMessage.receiverId === user?.id && (
                    <button 
                      onClick={() => {
                        setReceiverId(selectedMessage.senderId);
                        setSubject(`Re: ${selectedMessage.subject}`);
                        setIsNewMessageModalOpen(true);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20"
                    >
                      Antworten
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setSubject(`Fwd: ${selectedMessage.subject}`);
                      setContent(`\n\n---------- Weitergeleitete Nachricht ----------\nVon: ${selectedMessage.senderName}\nDatum: ${new Date(selectedMessage.timestamp).toLocaleString('de-DE')}\nBetreff: ${selectedMessage.subject}\n\n${selectedMessage.content}`);
                      setIsNewMessageModalOpen(true);
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
                  >
                    Weiterleiten
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#1a1c23]/30 border border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center h-full opacity-20">
                <div className="text-6xl mb-4">📄</div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em]">Nachricht auswählen</div>
              </div>
            )}
          </div>
        </div>

        {/* Action Confirmation Modal */}
        <DataModal
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          title="Aktion bestätigen"
          subtitle="Sicherheitsabfrage"
          icon="⚠️"
          maxWidth="max-w-md"
        >
          <div className="space-y-6">
            <p className="text-slate-400 text-xs text-center leading-relaxed">
              {confirmAction?.type === 'archive' 
                ? "Möchten Sie diese Nachricht wirklich archivieren? Sie wird aus Ihrem Posteingang entfernt."
                : "Möchten Sie diese Nachricht als Spam markieren? Sie wird in den Spam-Ordner verschoben."}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => {
                  if (confirmAction?.type === 'archive') archiveMessage(confirmAction.msg);
                  else if (confirmAction?.type === 'spam') toggleSpam(confirmAction.msg);
                }}
                className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl ${confirmAction?.type === 'archive' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20'} text-white`}
              >
                Bestätigen
              </button>
            </div>
          </div>
        </DataModal>

        {/* New Message Modal */}
        <DataModal
          isOpen={isNewMessageModalOpen}
          onClose={() => setIsNewMessageModalOpen(false)}
          title="Neue Nachricht verfassen"
          subtitle="Interne Kommunikation der Bundespolizei"
          icon="✉️"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Empfänger auswählen</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Name, Dienstgrad oder Dienstnummer suchen..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                />
                {userSearch && filteredUsers.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredUsers.map(u => (
                      <div 
                        key={u.id}
                        onClick={() => {
                          setReceiverId(u.id);
                          setUserSearch(`${u.rank} ${u.firstName} ${u.lastName} (${u.badgeNumber})`);
                        }}
                        className="p-4 hover:bg-white/5 cursor-pointer flex items-center justify-between border-b border-white/5 last:border-0"
                      >
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-white uppercase">{u.firstName} {u.lastName}</span>
                          <span className="text-[8px] font-bold text-slate-500 uppercase">{u.rank} • {u.badgeNumber}</span>
                        </div>
                        {receiverId === u.id && <span className="text-blue-500 text-xs">✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Betreff</label>
              <input 
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Betreff der Nachricht..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Inhalt</label>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ihre Nachricht an den Kollegen..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white h-64 outline-none focus:border-blue-500 transition-all resize-none"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => setIsNewMessageModalOpen(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
              >
                Abbrechen
              </button>
              <button 
                onClick={sendMessage}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20"
              >
                Nachricht senden
              </button>
            </div>
          </div>
        </DataModal>
      </div>
    </PoliceOSWindow>
  );
};

export default CommunicationPage;
