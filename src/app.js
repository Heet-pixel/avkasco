const path = require('path');
const express = require('express');
const cors = require('cors');
const dbReady = require('./middleware/dbReady');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const root = path.join(__dirname, '..');

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '50kb' }));

app.use('/api', dbReady);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/enquiries', require('./routes/enquiries'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api', require('./routes/portal'));
app.use('/api', notFound);

// old /contact links now open Get in Touch
app.get(['/contact', '/contact.html'], (req, res) => res.redirect(301, '/get-in-touch' + req.url.slice(req.path.length)));

app.use('/login', express.static(path.join(root, 'login')));
app.use('/admin', express.static(path.join(root, 'admin')));
app.use('/employee', express.static(path.join(root, 'employee')));
app.use('/shared', express.static(path.join(root, 'shared')));
app.use(express.static(path.join(root, 'website'), { extensions: ['html'] }));

app.use(errorHandler);
module.exports = app;
