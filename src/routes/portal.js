// Everything the dashboards use. All routes need a login; some need the admin role.
const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { docUpload } = require('../middleware/upload');
const dashboard = require('../controllers/dashboardController');
const clients = require('../controllers/clientController');
const works = require('../controllers/workController');
const employees = require('../controllers/employeeController');
const documents = require('../controllers/documentController');
const invoices = require('../controllers/invoiceController');
const notices = require('../controllers/noticeController');
const activity = require('../controllers/activityController');
const reports = require('../controllers/reportController');
const chat = require('../controllers/chatController');
const superAdmin = require('../middleware/superAdmin');

const admin = role('admin');
router.use(auth);

router.get('/dashboard', dashboard.get);

router.get('/clients', clients.list);
router.post('/clients', admin, clients.create);
router.patch('/clients/:id', admin, clients.update);

router.get('/works', works.list);
router.post('/works', admin, works.create);
router.patch('/works/:id', admin, works.edit);
router.post('/works/:id/update', works.update);

router.get('/employees', admin, employees.list);
router.post('/employees', admin, employees.create);
router.patch('/employees/:id', admin, employees.update);
router.delete('/employees/:id', admin, employees.remove);

router.get('/documents', documents.list);
router.post('/documents', docUpload, documents.create);
router.get('/documents/:id/download', documents.download);

router.get('/invoices', admin, invoices.list);
router.post('/invoices', admin, invoices.create);
router.patch('/invoices/:id', admin, invoices.setStatus);

router.get('/notices', notices.list);
router.post('/notices', admin, notices.create);
router.delete('/notices/:id', admin, notices.remove);

// Full attributed change history — only the one main admin can see or clear it.
router.get('/activity', admin, superAdmin, activity.list);
router.delete('/activity', admin, superAdmin, activity.removeMany);

// Daily work reports — anyone logged in can add their own; admins can read everyone's.
router.get('/work-reports', reports.list);
router.post('/work-reports', reports.create);

// Chat: one team chat for everyone, plus a conversation per client. Unread counts feed the popups and bell.
router.get('/chat/summary', chat.summary);
router.post('/chat/read', chat.read);
router.post('/chat/read-all', chat.readAll);
router.get('/chat/team', chat.teamList);
router.post('/chat/team', chat.teamSend);
router.get('/chat/clients', chat.clientList);
router.get('/chat/clients/:id', chat.clientThread);
router.post('/chat/clients/:id', chat.clientSend);
router.patch('/chat/messages/:id', chat.edit);

module.exports = router;
