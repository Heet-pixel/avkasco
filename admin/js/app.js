import { mountShell } from '/shared/shell.js';
import dashboard from './dashboard.js';
import employees from './employees.js';
import invoices from './invoices.js';
import reports from './reports.js';
import inbox from './inbox.js';
import history from './history.js';
import clients from '/shared/pages/clients.js';
import work from '/shared/pages/work.js';
import calendar from '/shared/pages/calendar.js';
import documents from '/shared/pages/documents.js';
import settings from '/shared/pages/settings.js';
import gst from '/shared/pages/gst.js';
import teamChat from '/shared/pages/teamChat.js';
import clientChat from '/shared/pages/clientChat.js';
import workReports from '/shared/pages/workReports.js';

mountShell({
  role: 'admin',
  routes: { dashboard, clients, work, calendar, employees, documents, invoices, reports, communication: inbox, gst, teamchat: teamChat, clientchat: clientChat, workreports: workReports, history, settings },
  nav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', to: '#/dashboard' },
    { id: 'clients', label: 'Clients', icon: 'clients', to: '#/clients' },
    { id: 'work', label: 'Work Management', icon: 'work', to: '#/work' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar', to: '#/calendar' },
    { id: 'employees', label: 'Employees', icon: 'employees', to: '#/employees' },
    { id: 'documents', label: 'Documents', icon: 'documents', to: '#/documents' },
    { id: 'invoices', label: 'Invoices & Payments', icon: 'invoices', to: '#/invoices' },
    { id: 'reports', label: 'Reports', icon: 'reports', to: '#/reports' },
    { id: 'workreports', label: 'Work Reports', icon: 'book', to: '#/workreports' },
    { id: 'communication', label: 'Communication', icon: 'message', to: '#/communication' },
    { id: 'teamchat', label: 'Team Chat', icon: 'message', to: '#/teamchat' },
    { id: 'clientchat', label: 'Client Chat', icon: 'clients', to: '#/clientchat' },
    { id: 'gst', label: 'GST Calculator', icon: 'gst', to: '#/gst' },
    { id: 'history', label: 'Activity History', icon: 'clock', to: '#/history', superAdminOnly: true },
    { section: 'SERVICES' },
    { label: 'Income Tax', icon: 'tax', to: '#/work?service=Income Tax' },
    { label: 'GST', icon: 'gst', to: '#/work?service=GST' },
    { label: 'TDS', icon: 'documents', to: '#/work?service=TDS' },
    { label: 'Audit', icon: 'audit', to: '#/work?service=Audit' },
    { label: 'Company Compliance', icon: 'company', to: '#/work?service=ROC Compliance' },
    { label: 'Accounting & Bookkeeping', icon: 'book', to: '#/work?service=Accounting %26 Bookkeeping' },
    { label: 'Advisory', icon: 'compass', to: '#/work?service=Advisory' },
  ],
});
