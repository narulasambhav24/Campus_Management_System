const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const posterUpload = require('../middleware/eventPosterUploadMiddleware');

router.use(requireAuth);

router.get('/', eventController.getEvents);
router.get('/registrations/logs', requireRole('admin'), eventController.getRegistrationLogs);
router.post('/', requireRole('admin'), eventController.createEvent);
router.put('/:id', requireRole('admin'), eventController.updateEvent);
router.delete('/:id', requireRole('admin'), eventController.deleteEvent);
router.post('/:id/poster', requireRole('admin'), posterUpload.single('poster'), eventController.uploadEventPoster);
router.post('/:id/register', requireRole('student'), eventController.registerForEvent);
router.get('/:id/attendees/export', requireRole('admin'), eventController.exportAttendance);

module.exports = router;
