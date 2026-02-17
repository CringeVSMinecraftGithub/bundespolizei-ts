
import { GoogleGenAI } from "@google/genai";
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
import ApplicationsPage from './pages/ApplicationsPage';
import TipsPage from './pages/TipsPage';
import CalendarPage from './pages/CalendarPage';
import PressPage from './pages/PressPage';
import Header from './components/Header';
import Footer from './components/Footer';
import SettingsModal from './components/SettingsModal';
import { User, Permission, UserRole } from './types';
import { DEFAULT_ADMIN } from './constants';
import { db, dbCollections, getDocs, setDoc, doc, updateDoc, onSnapshot } from './firebase';

interface AuthContextType {
  user: User | null;
  login: (badgeNumber: string, password?: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (perm: Permission) => boolean;
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  roles: UserRole[];
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
  const isPublicHome = location.pathname === '/';
  
  if (isPublicHome) return <>{children}</>;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#020617] overflow-hidden">
      {user && <Header />}
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>
      {user && <Footer />}
      <SettingsModal />
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('bpol_active_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [roles, setRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    const unsubRoles = onSnapshot(dbCollections.roles, (snap) => {
      setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRole)));
    });

    const initDatabase = async () => {
      try {
        // Initialisiere Standard-Rollen
        const rolesSnap = await getDocs(dbCollections.roles);
        if (rolesSnap.empty) {
          const defaultRoles: UserRole[] = [
            { id: 'LS', name: 'Leitungsstab', isSpecial: false, permissions: Object.values(Permission) },
            { id: 'HD', name: 'Höherer Dienst', isSpecial: false, permissions: Object.values(Permission).filter(p => p !== Permission.ADMIN_ACCESS) },
            { id: 'DSL', name: 'Dienststellenleitung', isSpecial: false, permissions: [Permission.VIEW_REPORTS, Permission.CREATE_REPORTS, Permission.VIEW_WARRANTS, Permission.VIEW_APPLICATIONS, Permission.VIEW_TIPS, Permission.VIEW_CALENDAR] },
            { id: 'DGL', name: 'Dienstgruppenleitung', isSpecial: false, permissions: [Permission.VIEW_REPORTS, Permission.CREATE_REPORTS, Permission.VIEW_WARRANTS, Permission.VIEW_TIPS, Permission.VIEW_CALENDAR] },
            { id: 'DIR_K', name: 'Direktion K', isSpecial: false, permissions: [Permission.VIEW_REPORTS, Permission.CREATE_REPORTS, Permission.VIEW_WARRANTS, Permission.MANAGE_WARRANTS, Permission.VIEW_TIPS, Permission.MANAGE_TIPS] },
            { id: 'DIR_GE', name: 'Direktion GE', isSpecial: false, permissions: [Permission.VIEW_REPORTS, Permission.CREATE_REPORTS, Permission.VIEW_WARRANTS, Permission.MANAGE_FLEET, Permission.VIEW_CALENDAR] },
            { id: 'PR', name: 'Presseabteilung', isSpecial: true, permissions: [Permission.MANAGE_NEWS] }
          ];

          for (const r of defaultRoles) {
            await setDoc(doc(db, "roles", r.id), r);
          }
        }

        const userSnap = await getDocs(dbCollections.users);
        const allUsers = userSnap.docs.map(d => d.data() as User);
        const adminExists = allUsers.some(u => u.badgeNumber === DEFAULT_ADMIN.badgeNumber);

        if (!adminExists) {
          await setDoc(doc(db, "users", DEFAULT_ADMIN.id), {
             ...DEFAULT_ADMIN,
             role: 'LS',
             specialRoles: []
          });
        }
      } catch (e) {
        console.error("Firebase Init Error:", e);
      }
    };
    initDatabase();

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
          setUser({ ...found, password });
          return true;
        }
        if (found.password === password) {
          setUser(found);
          return true;
        }
      }
    } catch (e) { console.error("Login Error:", e); }
    return false;
  };

  const hasPermission = (perm: Permission) => {
    if (!user) return false;
    if (user.isAdmin) return true;
    
    const userRoleIds = [user.role, ...(user.specialRoles || [])];
    const assignedRoles = roles.filter(r => userRoleIds.includes(r.id));
    const allPerms = new Set([
      ...(user.permissions || []),
      ...assignedRoles.flatMap(r => r.permissions || [])
    ]);
    
    return allPerms.has(perm);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout: () => setUser(null), hasPermission, isSettingsOpen, setSettingsOpen, roles }}>
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
              <Route path="/calendar" element={user ? <CalendarPage /> : <Navigate to="/" />} />
              <Route path="/press" element={user && hasPermission(Permission.MANAGE_NEWS) ? <PressPage /> : <Navigate to="/" />} />
              <Route path="/applications" element={user && hasPermission(Permission.VIEW_APPLICATIONS) ? <ApplicationsPage /> : <Navigate to="/" />} />
              <Route path="/tips" element={user && hasPermission(Permission.VIEW_TIPS) ? <TipsPage /> : <Navigate to="/" />} />
              <Route path="/admin" element={user?.isAdmin ? <AdminPanel /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </AppLayout>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;
