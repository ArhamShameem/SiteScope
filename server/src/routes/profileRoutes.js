const express = require('express');

const { uploadAvatar } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);
router.post('/avatar', upload.single('avatar'), uploadAvatar);

module.exports = router;
