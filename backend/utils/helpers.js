const ethers = require('ethers');

// Validate Ethereum address
const isValidEthereumAddress = (address) => {
  return ethers.utils.isAddress(address);
};

// Generate a message for wallet signatures
const generateSignatureMessage = (walletAddress) => {
  return `I am signing this message to authenticate with SmartWhales.ai as ${walletAddress}. Timestamp: ${Date.now()}`;
};

// Parse user agent for analytics
const parseUserAgent = (userAgent) => {
  // Simple parsing, you can use a more comprehensive library if needed
  const browser = userAgent.match(/(chrome|safari|firefox|msie|trident)/i);
  const version = userAgent.match(/version\/(\d+)/i);
  const mobile = /mobile|android|iphone|ipad/i.test(userAgent);
  
  return {
    browser: browser ? browser[0].toLowerCase() : 'unknown',
    version: version ? version[1] : 'unknown',
    mobile
  };
};

module.exports = {
  isValidEthereumAddress,
  generateSignatureMessage,
  parseUserAgent
};