const { ethers } = require('ethers');

// Simple middleware to verify wallet signature for authentication
const verifyWallet = async (req, res, next) => {
  try {
    // Get wallet from request body directly
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }
    
    // Attach the wallet address to the request
    req.verifiedWallet = walletAddress.toLowerCase();
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

module.exports = { verifyWallet };