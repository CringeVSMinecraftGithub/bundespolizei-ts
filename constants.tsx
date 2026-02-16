
import React from 'react';

// The user provided high-resolution badge image
export const POLICE_LOGO_RAW = "https://i.ibb.co/3ykS5v3/bpol-teamstadt-logo.png"; 

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
    'admin_access'
  ]
};
