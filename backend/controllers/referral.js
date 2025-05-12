const Referral = require('../models/Referral');
const User = require('../models/User');

// Log a referral connection (when a user connects via referral link)
const logReferral = async (req, res) => {
  try {
    const { referrerAddress } = req.body;
    const refereeAddress = req.verifiedWallet;
    
    // Make sure referrer and referee are different
    if (referrerAddress.toLowerCase() === refereeAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot refer yourself'
      });
    }

    // Create or update both user records
    await User.findOneAndUpdate(
      { walletAddress: referrerAddress.toLowerCase() },
      { lastSeen: Date.now() },
      { upsert: true, new: true }
    );
    
    await User.findOneAndUpdate(
      { walletAddress: refereeAddress },
      { lastSeen: Date.now() },
      { upsert: true, new: true }
    );

    // Check if this referral already exists
    const existingReferral = await Referral.findOne({
      referrer: referrerAddress.toLowerCase(),
      referee: refereeAddress
    });

    if (existingReferral) {
      return res.status(200).json({
        success: true,
        message: 'Referral already recorded',
        data: existingReferral
      });
    }

    // Create new referral record
    const referral = new Referral({
      referrer: referrerAddress.toLowerCase(),
      referee: refereeAddress,
      status: 'completed'
    });

    await referral.save();

    res.status(201).json({
      success: true,
      message: 'Referral logged successfully',
      data: referral
    });

  } catch (error) {
    console.error('Referral error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log referral',
      error: error.message
    });
  }
};

// Get the number of users referred by a wallet
const getReferralCount = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Count completed referrals
    const count = await Referral.countDocuments({
      referrer: walletAddress.toLowerCase(),
      status: 'completed'
    });
    
    // Get list of referred wallets for additional info
    const referrals = await Referral.find({
      referrer: walletAddress.toLowerCase(),
      status: 'completed'
    }).select('referee timestamp -_id');

    res.status(200).json({
      success: true,
      data: {
        count,
        referrals
      }
    });

  } catch (error) {
    console.error('Referral count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral count',
      error: error.message
    });
  }
};

// Verify that a wallet was referred by another wallet
const verifyReferralConnection = async (req, res) => {
  try {
    const { referrerAddress } = req.body;
    const refereeAddress = req.verifiedWallet;
    
    const referral = await Referral.findOne({
      referrer: referrerAddress.toLowerCase(),
      referee: refereeAddress,
      status: 'completed'
    });

    res.status(200).json({
      success: true,
      data: {
        isReferred: !!referral,
        referral: referral || null
      }
    });

  } catch (error) {
    console.error('Referral verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify referral connection',
      error: error.message
    });
  }
};

module.exports = {
  logReferral,
  getReferralCount,
  verifyReferralConnection
};