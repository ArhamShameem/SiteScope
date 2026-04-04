const express = require('express');

const {
  analyzeWebsite,
  analysisValidation,
  getHistory,
  deleteHistoryItem,
  deleteAllHistory,
} = require('../controllers/analysisController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(protect);

router.post('/', analysisValidation, validateRequest, analyzeWebsite);
router.get('/history', getHistory);
router.delete('/history', deleteAllHistory);
router.delete('/history/:id', deleteHistoryItem);

module.exports = router;
