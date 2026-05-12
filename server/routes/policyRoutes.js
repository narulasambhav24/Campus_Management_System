const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(requireAuth);

router.get('/', policyController.getPolicies);
router.get('/:id', policyController.getPolicyById);
router.post('/', requireRole('admin'), policyController.createPolicy);
router.post('/:id/circulars', requireRole('admin'), upload.single('file'), policyController.uploadPolicyCircular);
router.put('/:id', requireRole('admin'), policyController.updatePolicy);

module.exports = router;
