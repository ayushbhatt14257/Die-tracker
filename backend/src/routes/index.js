const express = require('express');
const { login, loginValidation, getMe } = require('../controllers/authController');
const {
  getDies, getDie, createDie, advancePart, completePartToolroom,
  sendToMoulding, receiveAtGR1, reportIssue, resolveIssue, getMouldingDies, getStats,
  getHistory, getMyHistory,
} = require('../controllers/dieController');
const {
  getUsers, createUser, updateUser, getMonthlyReport,
  getHolidays, addHoliday, deleteHoliday,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// ── AUTH ─────────────────────────────────────────────────
router.post('/auth/login', loginValidation, validate, login);
router.get('/auth/me', protect, getMe);

// ── DIES ─────────────────────────────────────────────────
router.get('/dies/stats', protect, getStats);
router.get('/dies/moulding', protect, getMouldingDies);
router.get('/dies/history', protect, getHistory);
router.get('/dies/my-history', protect, getMyHistory);
router.get('/dies', protect, getDies);
router.get('/dies/:id', protect, getDie);

router.post('/dies', protect,
  authorize('designer', 'admin', 'owner'),
  createDie
);

router.post('/dies/:id/parts/:partId/advance', protect,
  authorize('designer', 'programmer', 'vmc_operator', 'wirecut_operator', 'toolroom_head', 'admin', 'owner'),
  advancePart
);

router.post('/dies/:id/parts/:partId/complete-toolroom', protect,
  authorize('toolroom_head', 'admin', 'owner'),
  completePartToolroom
);

// Tool room sends die to GR1 (in_transit)
router.post('/dies/:id/send-to-moulding', protect,
  authorize('toolroom_head', 'admin', 'owner'),
  sendToMoulding
);

// GR1 receiver marks die as received (completed)
router.post('/dies/:id/receive-gr1', protect,
  authorize('gr1_receiver', 'admin', 'owner'),
  receiveAtGR1
);

router.post('/dies/:id/parts/:partId/issues', protect, reportIssue);

router.patch('/dies/:id/parts/:partId/issues/:issueId/resolve', protect,
  authorize('owner', 'admin'),
  resolveIssue
);

// ── ADMIN ─────────────────────────────────────────────────
router.get('/admin/users', protect, authorize('owner', 'admin'), getUsers);
router.post('/admin/users', protect, authorize('owner', 'admin'), createUser);
router.put('/admin/users/:id', protect, authorize('owner', 'admin'), updateUser);
router.get('/admin/report', protect, authorize('owner', 'admin'), getMonthlyReport);

// Holidays
router.get('/admin/holidays', protect, getHolidays);
router.post('/admin/holidays', protect, authorize('owner', 'admin'), addHoliday);
router.delete('/admin/holidays/:id', protect, authorize('owner', 'admin'), deleteHoliday);

module.exports = router;
