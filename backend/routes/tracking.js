const express = require('express');
const router = express.Router();
const { trackWalletInput, trackWalletClick, getTrackingStats } = require('../controllers/tracking');
const { verifyWallet } = require('../middleware/auth');

// Track when a user inputs a wallet address
router.post('/input', verifyWallet, trackWalletInput);

// Track when a user clicks the "Track" button
router.post('/click', verifyWallet, trackWalletClick);

// Get tracking statistics for a wallet
router.get('/stats/:walletAddress', getTrackingStats);

module.exports = router;