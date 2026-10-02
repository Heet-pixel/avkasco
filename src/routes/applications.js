const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const rateLimit = require('../middleware/rateLimit');
const { resumeUpload } = require('../middleware/upload');
const { create, list, setStatus, resume } = require('../controllers/applicationController');

router.post('/', rateLimit(), resumeUpload, create);
router.get('/', auth, role('admin'), list);
router.patch('/:id', auth, role('admin'), setStatus);
router.get('/:id/resume', auth, role('admin'), resume);
module.exports = router;
