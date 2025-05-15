const Tracking = require('../models/Tracking');
const User = require('../models/User');

// Record when user inputs a wallet address
const trackWalletInput = async (req, res) => {
  try {
    const { trackedAddress, metadata } = req.body;
    const walletAddress = req.verifiedWallet;

    // Validate inputs
    if (!trackedAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tracked address is required' 
      });
    }

    // Create or update user record
    await User.findOneAndUpdate(
      { walletAddress },
      { lastSeen: Date.now() },
      { upsert: true, new: true }
    );

    // Create tracking record
    const tracking = new Tracking({
      walletAddress,
      trackedAddress,
      eventType: 'input',
      metadata: metadata || {}
    });

    await tracking.save();

    res.status(201).json({
      success: true,
      message: 'Wallet input tracked successfully',
      data: { trackingId: tracking._id }
    });

  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track wallet input',
      error: error.message
    });
  }
};

// Record when user clicks the "Track" button
const trackWalletClick = async (req, res) => {
  try {
    const { trackedAddress, metadata } = req.body;
    const walletAddress = req.verifiedWallet;

    // Validate inputs
    if (!trackedAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tracked address is required' 
      });
    }

    // Check if this wallet-tracked pair already exists
    const existingTracking = await Tracking.findOne({
      walletAddress: walletAddress.toLowerCase(),
      trackedAddress: trackedAddress.toLowerCase(),
      eventType: 'track'
    });

    // If already tracked, just return success
    if (existingTracking) {
      return res.status(200).json({
        success: true,
        message: 'Wallet already tracked',
        data: { trackingId: existingTracking._id }
      });
    }

    // Create or update user record
    await User.findOneAndUpdate(
      { walletAddress },
      { lastSeen: Date.now() },
      { upsert: true, new: true }
    );

    // Create tracking record
    const tracking = new Tracking({
      walletAddress,
      trackedAddress,
      eventType: 'track',
      metadata: metadata || {}
    });

    await tracking.save();

    res.status(201).json({
      success: true,
      message: 'Wallet track click recorded successfully',
      data: { trackingId: tracking._id }
    });

  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track wallet click',
      error: error.message
    });
  }
};

// Get tracking statistics for a wallet
const getTrackingStats = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }
    
    // Count total inputs
    const inputCount = await Tracking.countDocuments({
      walletAddress: walletAddress.toLowerCase(),
      eventType: 'input'
    });
    
    // Count total tracks/clicks
    const trackCount = await Tracking.countDocuments({
      walletAddress: walletAddress.toLowerCase(),
      eventType: 'track'
    });
    
    // Count unique wallets tracked (distinct trackedAddress values)
    const uniqueWallets = await Tracking.distinct('trackedAddress', {
      walletAddress: walletAddress.toLowerCase()
    });
    
    const uniqueWalletsTracked = uniqueWallets.length;
    
    res.status(200).json({
      success: true,
      data: {
        inputCount,
        trackCount,
        uniqueWalletsTracked
      }
    });
  } catch (error) {
    console.error('Error getting tracking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tracking statistics',
      error: error.message
    });
  }
};

module.exports = {
  trackWalletInput,
  trackWalletClick,
  getTrackingStats
};