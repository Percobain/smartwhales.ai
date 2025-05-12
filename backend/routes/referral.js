const express = require('express');
const router = express.Router();
const { 
  logReferral, 
  getReferralCount, 
  verifyReferralConnection 
} = require('../controllers/referral');
const { verifyWallet } = require('../middleware/auth');

// Log a new referral connection
router.post('/log', verifyWallet, logReferral);

// Get referral count for a wallet
router.get('/count/:walletAddress', getReferralCount);

// Verify a referral connection
router.post('/verify', verifyWallet, verifyReferralConnection);

module.exports = router;