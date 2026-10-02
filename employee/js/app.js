import { mountShell } from '/shared/shell.js';
import dashboard from './dashboard.js';
import clients from '/shared/pages/clients.js';
import calendar from '/shared/pages/calendar.js';
import documents from '/shared/pages/documents.js';
import notices from '/shared/pages/notices.js';
import settings from '/shared/pages/settings.js';
import gst from '/shared/pages/gst.js';
import teamChat from '/shared/pages/teamChat.js';
import clientChat from '/shared/pages/clientChat.js';
import workReports from '/shared/pages/workReports.js';

mountShell({
  role: 'employee',
  routes: { dashboard, calendar, clients, documents, communication: notices, gst, teamchat: teamChat, clientchat: clientChat, workreports: workReports, settings },
  nav: [
    { id: 'dashboard', label: 'My Work', icon: 'dashboard', to: '#/dashboard' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar', to: '#/calendar' },
    { id: 'clients', label: 'Clients', icon: 'clients', to: '#/clients' },
    { id: 'documents', label: 'Documents', icon: 'documents', to: '#/documents' },
    { id: 'workreports', label: 'My Reports', icon: 'book', to: '#/workreports' },
    { id: 'communication', label: 'Communication', icon: 'message', to: '#/communication' },
    { id: 'teamchat', label: 'Team Chat', icon: 'message', to: '#/teamchat' },
    { id: 'clientchat', label: 'Client Chat', icon: 'clients', to: '#/clientchat' },
    { id: 'gst', label: 'GST Calculator', icon: 'gst', to: '#/gst' },
  ],
});
