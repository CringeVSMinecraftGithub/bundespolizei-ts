
export enum Permission {
  VIEW_REPORTS = 'Berichte einsehen',
  CREATE_REPORTS = 'Berichte erstellen',
  EDIT_REPORTS = 'Berichte bearbeiten',
  DELETE_REPORTS = 'Berichte löschen',
  MANAGE_USERS = 'Nutzer verwalten',
  VIEW_WARRANTS = 'Fahndungen einsehen',
  MANAGE_WARRANTS = 'Fahndungen verwalten',
  ADMIN_ACCESS = 'Administrator-Zugriff',
  MANAGE_LAWS = 'Gesetze verwalten',
  MANAGE_FLEET = 'Fuhrpark verwalten',
  MANAGE_EVIDENCE = 'Asservaten verwalten',
  VIEW_APPLICATIONS = 'Bewerbungen einsehen',
  MANAGE_APPLICATIONS = 'Bewerbungen verwalten',
  VIEW_TIPS = 'Hinweise einsehen',
  MANAGE_TIPS = 'Hinweise verwalten',
  VIEW_CALENDAR = 'Kalender einsehen',
  MANAGE_CALENDAR = 'Kalender verwalten',
  MANAGE_NEWS = 'Presse verwalten',
  MANAGE_ORG = 'Organigramm verwalten'
}

export interface UserRole {
  id: string;
  name: string;
  permissions: Permission[];
  isSpecial: boolean;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  rank: string;
  badgeNumber: string;
  role: string;
  specialRoles: string[];
  isAdmin: boolean;
  permissions: Permission[];
  password?: string;
  isLocked?: boolean;
}

export interface PressRelease {
  id: string;
  title: string;
  content: string;
  author: string;
  timestamp: string;
  category: 'Einsatz' | 'Personal' | 'Allgemein';
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime?: string;
  createdBy: string;
  creatorName: string;
  isPublic: boolean;
  type: 'Personal' | 'Besprechung' | 'Ausbildung' | 'Einsatz' | 'Sonstiges';
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  status: 'Einsatzbereit' | 'Im Einsatz' | 'Defekt';
  lastDriver?: string;
  fuel: number;
}

export interface Evidence {
  id: string;
  caseNumber: string;
  itemName: string;
  description: string;
  seizedBy: string;
  timestamp: string;
  location: string;
}

export interface Warrant {
  id: string;
  targetName: string;
  reason: string;
  dangerLevel: 'Niedrig' | 'Mittel' | 'Hoch' | 'Extrem';
  lastSeen: string;
  timestamp: string;
  active: boolean;
  age?: string;
  height?: string;
  weight?: string;
  hairColor?: string;
  eyeColor?: string;
  features?: string;
  caseNumber?: string;
}

export interface Law {
  id: string;
  paragraph: string;
  title: string;
  category: string;
  description?: string;
}

export interface Reminder {
  id: string;
  text: string;
  dueDate: string;
  completed: boolean;
}

export interface IncidentReport {
  id: string;
  type: 'Einsatzbericht' | 'Strafanzeige';
  status: 'Offen' | 'In Bearbeitung' | 'Abgeschlossen' | 'Unbearbeitet' | 'In Prüfung' | 'Neu';
  reportNumber: string;
  date: string;
  officerName: string;
  officerBadge: string;
  location: string;
  description?: string;
  title?: string;
  content?: string;
  involvedOfficers?: string;
  involvedUnits?: string;
  applicant?: string;
  suspect?: string;
  suspectDescription?: string;
  violation?: string;
  incidentDetails?: string;
  notes?: string;
  securityLevel?: string;
  timestamp: string;
  reminders?: Reminder[];
  isOnlineSubmission?: boolean;
  contactData?: string;
  incidentTime?: string;
  incidentEnd?: string;
  witnesses?: string;
  measures?: string;
  result?: string;
  evidenceList?: string;
  propertyValue?: string;
}

export interface CitizenSubmission {
  id: string;
  type: 'Hinweis' | 'Strafanzeige' | 'Bürgerservice';
  title: string;
  content: string;
  timestamp: string;
  status: 'Neu' | 'Gelesen' | 'Archiviert';
  anonymous: boolean;
  location?: string;
  incidentTime?: string;
  suspectInfo?: string;
  contactName?: string;
  contactBirthdate?: string;
  contactAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface JobApplication {
  id: string;
  name: string;
  careerPath: 'Mittlerer Dienst' | 'Gehobener Dienst';
  position: string;
  status: 'Eingegangen' | 'Prüfung' | 'Eingeladen' | 'Abgelehnt';
  timestamp: string;
  motivation: string;
  cv: string;
  discordId?: string;
  oocAge?: string;
  icBirthDate?: string;
  icPhone?: string;
  gender?: string;
  education?: string;
  experience?: string;
}

export interface OrgNode {
  id: string;
  shortName: string;
  fullName: string;
  parentId: string | null;
  rankGroup: 'Top' | 'Middle' | 'Operational';
  assignedUserId: string | null;
  specialFunction?: string;
}
