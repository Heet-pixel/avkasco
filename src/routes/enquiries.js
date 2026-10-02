const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const rateLimit = require('../middleware/rateLimit');
const { create, list, setStatus } = require('../controllers/enquiryController');

router.post('/', rateLimit(), create);
router.get('/', auth, role('admin'), list);
router.patch('/:id', auth, role('admin'), setStatus);
module.exports = router;
