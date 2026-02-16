
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PublicHome from './pages/PublicHome';
import Dashboard from './pages/Dashboard';
import IncidentReportPage from './pages/IncidentReportPage';
import CriminalComplaintPage from './pages/CriminalComplaintPage';
import AdminPanel from './pages/AdminPanel';
import FleetPage from './pages/FleetPage';
import EvidencePage from './pages/EvidencePage';
import WarrantPage from './pages/WarrantPage';
import CaseSearchPage from './pages/CaseSearchPage';
import Header from './components/Header';
import { User, Permission, Role } from './types';
import { DEFAULT_ADMIN } from './constants';
import { db, dbCollections, getDocs, setDoc, doc, updateDoc, onSnapshot } from './firebase';

interface AuthContextType {
  user: User | null;
  login: (badgeNumber: string, password?: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (perm: Permission) => boolean;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-x-hidden flex flex-col relative">
      {user && !isDashboard && <Header />}
      <main className="flex-1">
        {children}
      </main>
      {!isDashboard && (
        <footer className="bg-slate-900/50 p-2 text-[10px] text-slate-500 flex justify-between px-6 border-t border-slate-800 z-50">
          <div>© 2024 Bundesrepublik Deutschland | Internes Netzwerk</div>
          <div>Dienst: {user ? `${user.rank} ${user.lastName}` : 'Nicht angemeldet'}</div>
        </footer>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('bpol_active_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Permission[]>>({});

  useEffect(() => {
    const initDatabase = async () => {
      try {
        const userSnap = await getDocs(dbCollections.users);
        const allUsers = userSnap.docs.map(d => d.data() as User);
        const adminExists = allUsers.some(u => u.badgeNumber === DEFAULT_ADMIN.badgeNumber);

        if (!adminExists) {
          await setDoc(doc(db, "users", DEFAULT_ADMIN.id), DEFAULT_ADMIN);
        }
      } catch (e) {
        console.error("Firebase Init Error:", e);
      }
    };
    initDatabase();

    // Live sync for role permissions
    const unsubRoles = onSnapshot(doc(db, "settings", "permissions"), (snap) => {
      if (snap.exists()) {
        setRolePermissions(snap.data() as Record<string, Permission[]>);
      }
    });

    return () => unsubRoles();
  }, []);

  useEffect(() => {
    if (user) sessionStorage.setItem('bpol_active_user', JSON.stringify(user));
    else sessionStorage.removeItem('bpol_active_user');
  }, [user]);

  const login = async (badgeNumber: string, password?: string) => {
    try {
      const snap = await getDocs(dbCollections.users);
      const allUsers = snap.docs.map(d => d.data() as User);
      const found = allUsers.find(u => u.badgeNumber.toLowerCase() === badgeNumber.toLowerCase());
      
      if (found) {
        if (!found.password && password) {
          await updateDoc(doc(db, "users", found.id), { password });
          const updatedUser = { ...found, password };
          setUser(updatedUser);
          return true;
        }

        if (found.password === password) {
          setUser(found);
          return true;
        }
      }
    } catch (e) {
      console.error("Login Error:", e);
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setSidebarOpen(false);
  };

  const hasPermission = (perm: Permission) => {
    if (!user) return false;
    if (user.isAdmin) return true;
    
    const userExplicitPerms = user.permissions || [];
    const roleBasedPerms = rolePermissions[user.role] || [];
    
    return userExplicitPerms.includes(perm) || roleBasedPerms.includes(perm);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, isSidebarOpen, setSidebarOpen }}>
      <Router>
        <AppLayout>
            <Routes>
              <Route path="/" element={<PublicHome />} />
              <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
              <Route path="/incident-report" element={user ? <IncidentReportPage /> : <Navigate to="/" />} />
              <Route path="/criminal-complaint" element={user ? <CriminalComplaintPage /> : <Navigate to="/" />} />
              <Route path="/fleet" element={user ? <FleetPage /> : <Navigate to="/" />} />
              <Route path="/evidence" element={user ? <EvidencePage /> : <Navigate to="/" />} />
              <Route path="/warrants" element={user ? <WarrantPage /> : <Navigate to="/" />} />
              <Route path="/cases" element={user ? <CaseSearchPage /> : <Navigate to="/" />} />
              <Route path="/admin" element={user?.isAdmin ? <AdminPanel /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </AppLayout>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;
