
import React from 'react';
import { Permission } from './types';

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
  role: 'LS',
  isAdmin: true,
  permissions: [
    Permission.VIEW_REPORTS,
    Permission.CREATE_REPORTS,
    Permission.EDIT_REPORTS,
    Permission.DELETE_REPORTS,
    Permission.MANAGE_USERS,
    Permission.VIEW_WARRANTS,
    Permission.MANAGE_WARRANTS,
    Permission.ADMIN_ACCESS,
    Permission.VIEW_TIPS,
    Permission.MANAGE_TIPS,
    Permission.VIEW_APPLICATIONS,
    Permission.MANAGE_APPLICATIONS,
    Permission.VIEW_CALENDAR,
    Permission.MANAGE_CALENDAR,
    Permission.MANAGE_NEWS
  ]
};
