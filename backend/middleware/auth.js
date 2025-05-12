const { ethers } = require('ethers');

// Simple middleware to verify wallet signature for authentication
const verifyWallet = async (req, res, next) => {
  console.log('=== Auth Middleware: Verifying wallet signature ===');
  console.log('Request body keys:', Object.keys(req.body));

  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      console.log('Auth failed: Missing parameters', { 
        walletAddress: !!walletAddress, 
        signature: !!signature, 
        message: !!message 
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication failed: Missing required parameters (walletAddress, signature, message)' 
      });
    }

    console.log('Verifying signature for wallet:', walletAddress);
    console.log('Message to verify:', message);
    console.log('Signature:', signature);
    
    // Proper signature verification
    // The message signed on the frontend must be exactly what's passed here.
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      console.log('Auth failed: Signature verification failed. Recovered:', recoveredAddress, 'Expected:', walletAddress);
      return res.status(401).json({ success: false, message: 'Authentication failed: Invalid signature' });
    }
    
    console.log('Signature verified successfully for wallet:', walletAddress);
    req.verifiedWallet = recoveredAddress.toLowerCase(); // Attach the verified wallet address to the request
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    // Check if the error is due to invalid signature format from ethers
    if (error.code === 'INVALID_ARGUMENT' && error.argument === 'signature') {
        return res.status(401).json({
            success: false,
            message: 'Authentication failed: Invalid signature format. Ensure it is a valid hex string.'
        });
    }
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed: ' + error.message 
    });
  }
};

module.exports = { verifyWallet };