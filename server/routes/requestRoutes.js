const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(requireAuth);

// GET /api/requests/dashboard/student
router.get('/dashboard/student', requestController.getStudentDashboard);

// GET /api/requests/dashboard/admin
router.get('/dashboard/admin', requireRole('admin'), requestController.getAdminDashboard);

// POST /api/requests/escalation/run
router.post('/escalation/run', requireRole('admin'), requestController.runEscalationSweep);

// GET /api/requests
router.get('/', requireRole('admin'), requestController.getAllRequests);

// GET /api/requests/user/:studentId
router.get('/user/:studentId', requestController.getUserRequests);

// GET /api/requests/:id
router.get('/:id', requestController.getRequestById);

// POST /api/requests
router.post('/', requestController.createRequest);

// POST /api/requests/:id/attachments
router.post('/:id/attachments', upload.array('files', 5), requestController.addAttachments);

// PUT /api/requests/:id
router.put('/:id', requireRole('admin'), requestController.updateRequest);

module.exports = router;
