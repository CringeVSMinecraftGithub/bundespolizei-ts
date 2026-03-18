
import React from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useDesktops } from '../contexts/DesktopContext';
import { Permission } from '../types';

// Import all pages
import Dashboard from '../pages/Dashboard';
import IncidentReportPage from '../pages/IncidentReportPage';
import CriminalComplaintPage from '../pages/CriminalComplaintPage';
import AdminPanel from '../pages/AdminPanel';
import FleetPage from '../pages/FleetPage';
import EvidencePage from '../pages/EvidencePage';
import WarrantPage from '../pages/WarrantPage';
import CaseSearchPage from '../pages/CaseSearchPage';
import ApplicationsPage from '../pages/ApplicationsPage';
import TipsPage from '../pages/TipsPage';
import CalendarPage from '../pages/CalendarPage';
import PressPage from '../pages/PressPage';
import OrgChartPage from '../pages/OrgChartPage';
import JobsPage from '../pages/JobsPage';
import LawsPage from '../pages/LawsPage';
import CommunicationPage from '../pages/CommunicationPage';
import CareerPage from '../pages/CareerPage';
import AppointmentsPage from '../pages/AppointmentsPage';
import NotesPage from '../pages/NotesPage';
import InpasPage from '../pages/InpasPage';
import ProfilePage from '../pages/ProfilePage';

import Header from './Header';
import Footer from './Footer';
import SettingsModal from './SettingsModal';

import PoliceOSWindow from './PoliceOSWindow';

const DesktopView: React.FC<{ desktopId: string; isActive: boolean }> = ({ desktopId, isActive }) => {
  const { user, hasPermission } = useAuth();

  return (
    <div className={`absolute inset-0 ${isActive ? 'z-10 visible' : 'z-0 invisible pointer-events-none'}`}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <div className="h-full w-full flex flex-col overflow-hidden">
          {user && <Header />}
          <main className="flex-1 relative overflow-hidden">
            <Routes>
              <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
              
              {/* App Routes wrapped in PoliceOSWindow Layout */}
              <Route element={<PoliceOSWindow />}>
                <Route path="/incident-report" element={user && hasPermission(Permission.VIEW_REPORTS) ? <IncidentReportPage /> : <Navigate to="/dashboard" />} />
                <Route path="/criminal-complaint" element={user && hasPermission(Permission.CREATE_REPORTS) ? <CriminalComplaintPage /> : <Navigate to="/dashboard" />} />
                <Route path="/fleet" element={user && hasPermission(Permission.MANAGE_FLEET) ? <FleetPage /> : <Navigate to="/dashboard" />} />
                <Route path="/evidence" element={user && hasPermission(Permission.MANAGE_EVIDENCE) ? <EvidencePage /> : <Navigate to="/dashboard" />} />
                <Route path="/warrants" element={user && hasPermission(Permission.VIEW_WARRANTS) ? <WarrantPage /> : <Navigate to="/dashboard" />} />
                <Route path="/cases" element={user && hasPermission(Permission.VIEW_REPORTS) ? <CaseSearchPage /> : <Navigate to="/dashboard" />} />
                <Route path="/calendar" element={user && hasPermission(Permission.VIEW_CALENDAR) ? <CalendarPage /> : <Navigate to="/dashboard" />} />
                <Route path="/press" element={user && hasPermission(Permission.MANAGE_NEWS) ? <PressPage /> : <Navigate to="/dashboard" />} />
                <Route path="/applications" element={user && (hasPermission(Permission.VIEW_APPLICATIONS) || hasPermission(Permission.MANAGE_JOBS)) ? <ApplicationsPage /> : <Navigate to="/dashboard" />} />
                <Route path="/tips" element={user && hasPermission(Permission.VIEW_TIPS) ? <TipsPage /> : <Navigate to="/dashboard" />} />
                <Route path="/org-chart" element={user ? <OrgChartPage /> : <Navigate to="/dashboard" />} />
                <Route path="/jobs" element={user ? <JobsPage /> : <Navigate to="/dashboard" />} />
                <Route path="/laws" element={user ? <LawsPage /> : <Navigate to="/dashboard" />} />
                <Route path="/communication" element={user ? <CommunicationPage /> : <Navigate to="/dashboard" />} />
                <Route path="/career" element={user ? <CareerPage /> : <Navigate to="/dashboard" />} />
                <Route path="/appointments" element={user ? <AppointmentsPage /> : <Navigate to="/dashboard" />} />
                <Route path="/notes" element={user ? <NotesPage /> : <Navigate to="/dashboard" />} />
                <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/dashboard" />} />
                <Route path="/inpas" element={user ? <InpasPage /> : <Navigate to="/dashboard" />} />
                <Route path="/admin" element={user && (user.isAdmin || hasPermission(Permission.MANAGE_USERS)) ? <AdminPanel /> : <Navigate to="/dashboard" />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </main>
          {user && <Footer />}
          <SettingsModal />
        </div>
      </MemoryRouter>
    </div>
  );
};

const DesktopManager: React.FC = () => {
  const { desktops, activeDesktopId } = useDesktops();

  return (
    <div className="relative h-full w-full">
      {desktops.map(desktop => (
        <DesktopView 
          key={desktop.id} 
          desktopId={desktop.id} 
          isActive={desktop.id === activeDesktopId} 
        />
      ))}
    </div>
  );
};

export default DesktopManager;
