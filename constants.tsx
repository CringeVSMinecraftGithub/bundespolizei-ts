
import React from 'react';

// Permanenter Link für das Logo (Postimages)
export const POLICE_LOGO_RAW = "https://i.postimg.cc/QtKgbk3m/bpoltssternv1.png"; 

// Aktualisierte Hintergrundbilder mit permanentem Link
export const DASHBOARD_BG = "https://i.postimg.cc/J4XrLyrV/bpolintranethintergrund.jpg"; 
export const BPOL_STATION_BG = "https://i.postimg.cc/J4XrLyrV/bpolintranethintergrund.jpg"; 

export const APP_NAME = "BUNDESPOLIZEI TEAMSTADT";

export const DEFAULT_ADMIN: any = {
  id: 'admin-1',
  firstName: 'Thomas',
  lastName: 'Mueller',
  rank: 'Bundespolizeipräsident',
  badgeNumber: 'Adler 51/01',
  role: 'Leitungsstab',
  isAdmin: true,
  permissions: [
    'view_reports',
    'create_reports',
    'edit_reports',
    'delete_reports',
    'manage_users',
    'view_warrants',
    'manage_warrants',
    'admin_access',
    'view_tips',
    'manage_tips',
    'view_applications',
    'manage_applications',
    'view_calendar',
    'manage_calendar'
  ]
};
