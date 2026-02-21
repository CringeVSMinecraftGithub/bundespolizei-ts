
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { Permission, OrgNode, User } from '../types';
import { POLICE_RANKS } from '../constants';
import { dbCollections, onSnapshot, query, setDoc, doc, db, deleteDoc, addDoc } from '../firebase';
import PoliceOSWindow from '../components/PoliceOSWindow';

const RANK_GROUPS = [
  { id: 'Top', label: 'Höchste Ebene', color: 'border-amber-500', glow: 'shadow-amber-500/20', accent: 'bg-amber-500' },
  { id: 'Middle', label: 'Mittlere Führung', color: 'border-blue-500', glow: 'shadow-blue-500/20', accent: 'bg-blue-500' },
  { id: 'Operational', label: 'Operative Ebene', color: 'border-emerald-500', glow: 'shadow-emerald-500/20', accent: 'bg-emerald-500' },
];

interface OrgCardProps {
  node: OrgNode & { children: any[] };
  level?: number;
  canManage: boolean;
  users: User[];
  nodes: OrgNode[];
  onEdit: (node: OrgNode) => void;
  onAddChild: (parentId: string) => void;
}

const OrgCard: React.FC<OrgCardProps> = ({ node, level = 0, canManage, users, nodes, onEdit, onAddChild }) => {
  const assignedUser = users.find(u => u.id === node.assignedUserId);
  const group = RANK_GROUPS.find(g => g.id === node.rankGroup) || RANK_GROUPS[2];

  return (
    <div className="flex flex-col items-center relative">
      {/* Connection Line from Parent */}
      {level > 0 && (
        <div className="w-px h-8 bg-white/10 mb-2"></div>
      )}

      <div 
        className={`
          w-72 bg-[#1a1c23]/80 backdrop-blur-md border ${group.color} ${group.glow} 
          p-5 rounded-2xl shadow-2xl transition-all relative group
          ${canManage ? 'hover:scale-105 cursor-pointer' : ''}
        `}
        onClick={() => canManage && onEdit(node)}
      >
        {/* Rank Group Accent */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 ${group.accent} rounded-b-full`}></div>

        <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{node.shortName}</span>
          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${assignedUser ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
            {assignedUser ? 'Besetzt' : 'Unbesetzt'}
          </span>
        </div>

        <div className="text-sm font-black text-white uppercase tracking-tight mb-4 leading-tight">
          {node.fullName}
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-white/5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${assignedUser ? 'bg-blue-600/20 text-blue-400' : 'bg-white/5 text-white/20'}`}>
            👤
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Amtsinhaber</div>
            <div className="text-[10px] font-bold text-slate-300 truncate uppercase">
              {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Vakant'}
            </div>
          </div>
          {assignedUser && (
            <div className="text-right">
              <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Kennung</div>
              <div className="text-[9px] font-mono text-blue-500 font-black">{assignedUser.badgeNumber}</div>
            </div>
          )}
        </div>

        {canManage && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
             <button 
               onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
               className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-blue-500"
               title="Untergeordneten hinzufügen"
             >
               +
             </button>
          </div>
        )}
      </div>

      {/* Children Container */}
      {node.children.length > 0 && (
        <div className="relative pt-8 flex flex-col items-center gap-8">
          {/* Vertical line to children */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-white/10"></div>
          
          {node.children.map((child) => (
            <div key={child.id} className="relative">
              <OrgCard 
                node={child} 
                level={level + 1} 
                canManage={canManage} 
                users={users} 
                nodes={nodes} 
                onEdit={onEdit} 
                onAddChild={onAddChild} 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const OrgChartPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission(Permission.MANAGE_ORG);
  
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Partial<OrgNode> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubNodes = onSnapshot(query(dbCollections.orgNodes), (snap) => {
      setNodes(snap.docs.map(d => ({ id: d.id, ...d.data() } as OrgNode)));
    });
    const unsubUsers = onSnapshot(query(dbCollections.users), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    });
    return () => { unsubNodes(); unsubUsers(); };
  }, []);

  const treeData = useMemo(() => {
    const nodeMap: Record<string, OrgNode & { children: any[] }> = {};
    nodes.forEach(node => {
      nodeMap[node.id] = { ...node, children: [] };
    });
    
    const roots: any[] = [];
    nodes.forEach(node => {
      if (node.parentId && nodeMap[node.parentId]) {
        nodeMap[node.parentId].children.push(nodeMap[node.id]);
      } else {
        roots.push(nodeMap[node.id]);
      }
    });

    const getRankLevel = (fullName: string) => {
      return POLICE_RANKS.find(r => r.name === fullName)?.level || 999;
    };

    const sortByRank = (a: any, b: any) => getRankLevel(a.fullName) - getRankLevel(b.fullName);

    const sortTree = (nodesList: any[]) => {
      nodesList.sort(sortByRank);
      nodesList.forEach(n => {
        if (n.children.length > 0) sortTree(n.children);
      });
    };

    sortTree(roots);
    return roots;
  }, [nodes]);

  const saveNode = async () => {
    if (!editingNode || !editingNode.shortName || !editingNode.fullName) return;
    try {
      if (editingNode.id) {
        await setDoc(doc(db, "orgNodes", editingNode.id), editingNode);
      } else {
        await addDoc(dbCollections.orgNodes, {
          ...editingNode,
          parentId: editingNode.parentId || null,
          assignedUserId: editingNode.assignedUserId || null,
          rankGroup: editingNode.rankGroup || 'Operational'
        });
      }
      setIsModalOpen(false);
      setEditingNode(null);
    } catch (e) {
      console.error("Error saving node:", e);
    }
  };

  const deleteNode = async (id: string) => {
    if (!confirm("Dienstgrad wirklich löschen? Alle Untergeordneten werden zu Wurzelknoten.")) return;
    try {
      // Update children to have no parent
      const children = nodes.filter(n => n.parentId === id);
      for (const child of children) {
        await setDoc(doc(db, "orgNodes", child.id), { ...child, parentId: null });
      }
      await deleteDoc(doc(db, "orgNodes", id));
      setIsModalOpen(false);
      setEditingNode(null);
    } catch (e) {
      console.error("Error deleting node:", e);
    }
  };

  const filteredUsers = users.filter(u => 
    u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PoliceOSWindow title="Organigramm">
      <div className="h-full w-full overflow-auto custom-scrollbar p-12 bg-[#0a0c10]">
        <div className="max-w-7xl mx-auto mb-12 flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Behörden <span className="text-blue-500">Struktur</span></h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">Hierarchische Rangabfolge der Bundespolizei</p>
          </div>
          {canManage && (
            <button 
              onClick={() => { setEditingNode({ rankGroup: 'Top' }); setIsModalOpen(true); }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20"
            >
              Wurzelknoten hinzufügen
            </button>
          )}
        </div>

        <div className="flex flex-col items-center min-w-max pb-32">
          {treeData.length > 0 ? (
            <div className="flex gap-24">
              {treeData.map(root => (
                <OrgCard 
                  key={root.id} 
                  node={root} 
                  canManage={canManage} 
                  users={users} 
                  nodes={nodes} 
                  onEdit={(node) => { setEditingNode(node); setIsModalOpen(true); }}
                  onAddChild={(parentId) => { setEditingNode({ parentId, rankGroup: 'Operational' }); setIsModalOpen(true); }}
                />
              ))}
            </div>
          ) : (
            <div className="py-32 text-center opacity-20 uppercase tracking-[0.5em] text-xs">Keine Strukturdaten vorhanden</div>
          )}
        </div>

        {isModalOpen && editingNode && (
          <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-[#1a1c23] border border-white/10 p-10 rounded-[40px] w-full max-w-xl space-y-8 shadow-2xl relative">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                {editingNode.id ? 'Dienstgrad bearbeiten' : 'Neuer Dienstgrad'}
              </h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Dienstgrad auswählen</label>
                  <select 
                    value={editingNode.fullName || ''} 
                    onChange={e => {
                      const selectedRank = POLICE_RANKS.find(r => r.name === e.target.value);
                      if (selectedRank) {
                        setEditingNode({
                          ...editingNode,
                          fullName: selectedRank.name,
                          shortName: selectedRank.short,
                          rankGroup: selectedRank.group === 'Höherer Dienst' ? 'Top' : selectedRank.group === 'Gehobener Dienst' ? 'Middle' : 'Operational'
                        });
                      }
                    }}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-600 uppercase font-black appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Dienstgrad wählen...</option>
                    {['Höherer Dienst', 'Gehobener Dienst', 'Mittlerer Dienst'].map(group => (
                      <optgroup key={group} label={group} className="bg-slate-950 text-blue-500 font-black">
                        {POLICE_RANKS.filter(r => r.group === group).map(rank => (
                          <option key={rank.name} value={rank.name} className="bg-slate-900 text-white font-bold">
                            {rank.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-2 space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Amtsinhaber zuweisen</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">🔍</div>
                    <input 
                      type="text"
                      placeholder="Beamten suchen..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-black border border-white/10 p-4 pl-12 rounded-xl text-white outline-none focus:border-blue-600 text-xs"
                    />
                    {searchTerm && (
                      <div className="absolute z-10 w-full mt-2 bg-[#0a0c10] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredUsers.length > 0 ? filteredUsers.map(u => (
                          <button 
                            key={u.id}
                            onClick={() => {
                              setEditingNode({...editingNode, assignedUserId: u.id});
                              setSearchTerm('');
                            }}
                            className="w-full text-left p-4 hover:bg-blue-600/10 border-b border-white/5 last:border-0 transition-colors"
                          >
                            <div className="text-[10px] font-black text-white uppercase">{u.firstName} {u.lastName}</div>
                            <div className="text-[8px] font-mono text-blue-500 uppercase">{u.badgeNumber} • {u.rank}</div>
                          </button>
                        )) : (
                          <div className="p-4 text-center text-[8px] font-black text-slate-600 uppercase">Keine Treffer</div>
                        )}
                      </div>
                    )}
                  </div>
                  {editingNode.assignedUserId && (
                    <div className="mt-3 p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl flex justify-between items-center">
                      <div>
                        <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Aktuell zugewiesen</div>
                        <div className="text-[10px] font-bold text-white uppercase">
                          {users.find(u => u.id === editingNode.assignedUserId)?.firstName} {users.find(u => u.id === editingNode.assignedUserId)?.lastName}
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingNode({...editingNode, assignedUserId: null})}
                        className="text-red-500 text-[8px] font-black uppercase hover:text-white transition-colors"
                      >
                        Entfernen
                      </button>
                    </div>
                  )}
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Übergeordneter Dienstgrad</label>
                  <select 
                    value={editingNode.parentId || ''} 
                    onChange={e => setEditingNode({...editingNode, parentId: e.target.value || null})}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-600 uppercase font-black appearance-none cursor-pointer"
                  >
                    <option value="">Keiner (Wurzel)</option>
                    {nodes.filter(n => n.id !== editingNode.id).map(n => (
                      <option key={n.id} value={n.id} className="bg-slate-900">{n.shortName} - {n.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                {editingNode.id && (
                  <button 
                    onClick={() => deleteNode(editingNode.id!)}
                    className="px-6 py-4 text-[9px] font-black uppercase text-red-500 hover:bg-red-500/10 rounded-2xl transition-colors"
                  >
                    Löschen
                  </button>
                )}
                <div className="flex-1"></div>
                <button 
                  onClick={() => { setIsModalOpen(false); setEditingNode(null); setSearchTerm(''); }}
                  className="px-8 py-4 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={saveNode}
                  className="bg-blue-600 py-4 px-10 rounded-2xl font-black uppercase text-[9px] tracking-widest text-white shadow-xl active:scale-95 transition-all"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PoliceOSWindow>
  );
};

export default OrgChartPage;
