const COVALENT_API_KEY = import.meta.env.VITE_GOLDRUSH_API_KEY;
const COVALENT_BASE_URL = 'https://api.covalenthq.com/v1';

export const SUPPORTED_CHAINS = {
  ETHEREUM: '1',
  BSC: '56',
  ARBITRUM: '42161',
  OPTIMISM: '10',
  POLYGON: '137',
  // Add more chains as needed
};

const CHAIN_ID_TO_NAME_MAP = {
  '1': 'eth-mainnet',
  '56': 'bsc-mainnet',
  '137': 'matic-mainnet',
  '42161': 'arbitrum-mainnet',
  '10': 'optimism-mainnet',
  // Add other mappings as you support more chains
};

const chainIdToGoldRushChainName = (chainId) => {
  return CHAIN_ID_TO_NAME_MAP[chainId] || chainId; // Fallback to chainId if no name mapping
};

export const getChainNameFromId = (chainId) => {
  for (const name in SUPPORTED_CHAINS) {
    if (SUPPORTED_CHAINS[name] === chainId) {
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
  }
  const goldRushName = chainIdToGoldRushChainName(chainId);
  if (goldRushName.includes('-')) { // e.g. eth-mainnet -> Eth Mainnet
    return goldRushName.split('-')[0].toUpperCase() + ' ' + goldRushName.split('-')[1].charAt(0).toUpperCase() + goldRushName.split('-')[1].slice(1);
  }
  return 'Unknown Chain';
};

export const getChainExplorer = (chainId) => {
  switch (chainId) {
    case SUPPORTED_CHAINS.ETHEREUM: return 'https://etherscan.io';
    case SUPPORTED_CHAINS.BSC: return 'https://bscscan.com';
    case SUPPORTED_CHAINS.POLYGON: return 'https://polygonscan.com';
    case SUPPORTED_CHAINS.ARBITRUM: return 'https://arbiscan.io';
    case SUPPORTED_CHAINS.OPTIMISM: return 'https://optimistic.etherscan.io';
    default: return 'https://blockscan.com/';
  }
};

async function fetchFromCovalent(endpointPath, params = {}) {
  const goldRushChainName = endpointPath.split('/')[0]; // e.g. "eth-mainnet" from "eth-mainnet/address/..."
  if (!CHAIN_ID_TO_NAME_MAP[Object.keys(CHAIN_ID_TO_NAME_MAP).find(key => CHAIN_ID_TO_NAME_MAP[key] === goldRushChainName)]) {
    console.warn(`Chain name ${goldRushChainName} might not be directly supported or mapped for GoldRush. Ensure endpoint is correct.`);
  }

  // Construct URL with query parameters
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    queryParams.append(key, value);
  });
  
  const queryString = queryParams.toString();
  const url = `${COVALENT_BASE_URL}/${endpointPath}${queryString ? `?${queryString}` : ''}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${COVALENT_API_KEY}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Covalent API Error Response:', errorData);
      throw new Error(`API request failed: ${errorData.error_message || response.statusText} (Status: ${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fetch error details:', error);
    throw error; // Re-throw to be caught by calling function
  }
}

export async function getTokenBalances(chainId, walletAddress) {
  if (!walletAddress) throw new Error('Wallet address is required for getTokenBalances.');
  if (!chainId) throw new Error('Chain ID is required for getTokenBalances.');

  const goldrushChainName = chainIdToGoldRushChainName(chainId);
  if (!goldrushChainName) throw new Error(`Unsupported chain ID: ${chainId}`);

  const endpoint = `${goldrushChainName}/address/${walletAddress}/balances_v2/`;
  const params = {
    'quote-currency': 'USD',
    'nft': 'false',
    'no-nft-fetch': 'true'
  };
  
  const data = await fetchFromCovalent(endpoint, params);
  return (data.data.items || []).map(item => ({
    ...item,
    chain_id: chainId,
    chain_name: getChainNameFromId(chainId)
  }));
}

export async function getTransactionHistory(chainId, walletAddress, { pageNumber = 0, pageSize = 10 } = {}) {
  if (!walletAddress) throw new Error('Wallet address is required for getTransactionHistory.');
  if (!chainId) throw new Error('Chain ID is required for getTransactionHistory.');

  const goldrushChainName = chainIdToGoldRushChainName(chainId);
  if (!goldrushChainName) throw new Error(`Unsupported chain ID: ${chainId}`);

  const endpoint = `${goldrushChainName}/address/${walletAddress}/transactions_v3/`;
  const params = {
    'quote-currency': 'USD',
    'page-size': pageSize,
    'page-number': pageNumber,
    'no-logs': 'false'
  };
  
  const data = await fetchFromCovalent(endpoint, params);
  return {
    transactions: (data.data.items || []).map(tx => ({
      ...tx,
      chain_id: chainId,
      chain_name: getChainNameFromId(chainId)
    })),
    pagination: data.data.pagination,
  };
}

// New API methods for additional functionality

export async function getAllChainsBalances(walletAddress) {
  if (!walletAddress) throw new Error('Wallet address is required for getAllChainsBalances.');
  
  const endpoint = `address/${walletAddress}/balances_v2/`;
  const params = {
    'quote-currency': 'USD',
    'nft': 'false'
  };
  
  const data = await fetchFromCovalent(endpoint, params);
  return data.data;
}

export async function getCrossChainTransactions(walletAddress) {
  if (!walletAddress) throw new Error('Wallet address is required for getCrossChainTransactions.');
  
  const endpoint = `address/${walletAddress}/transactions_v3/`;
  const params = {
    'quote-currency': 'USD'
  };
  
  const data = await fetchFromCovalent(endpoint, params);
  return data.data;
}

export async function getHistoricalPortfolioValue(walletAddress, days = 30) {
  if (!walletAddress) throw new Error('Wallet address is required for getHistoricalPortfolioValue.');
  
  const endpoint = `address/${walletAddress}/portfolio_v2/`;
  const params = {
    'days': days,
    'quote-currency': 'USD'
  };
  
  const data = await fetchFromCovalent(endpoint, params);
  return data.data;
}

export async function getERC20Transfers(chainId, walletAddress, tokenAddress) {
  if (!walletAddress) throw new Error('Wallet address is required for getERC20Transfers.');
  if (!chainId) throw new Error('Chain ID is required for getERC20Transfers.');
  if (!tokenAddress) throw new Error('Token address is required for getERC20Transfers.');
  
  const goldrushChainName = chainIdToGoldRushChainName(chainId);
  if (!goldrushChainName) throw new Error(`Unsupported chain ID: ${chainId}`);
  
  const endpoint = `${goldrushChainName}/address/${walletAddress}/transfers_v2/`;
  const params = {
    'contract-address': tokenAddress,
    'quote-currency': 'USD'
  };
  
  const data = await fetchFromCovalent(endpoint, params);
  return data.data;
}

export async function getNativeTokenBalance(chainId, walletAddress) {
  if (!walletAddress) throw new Error('Wallet address is required for getNativeTokenBalance.');
  if (!chainId) throw new Error('Chain ID is required for getNativeTokenBalance.');
  
  const goldrushChainName = chainIdToGoldRushChainName(chainId);
  if (!goldrushChainName) throw new Error(`Unsupported chain ID: ${chainId}`);
  
  const endpoint = `${goldrushChainName}/address/${walletAddress}/balances_native/`;
  const params = {
    'quote-currency': 'USD'
  };
  
  const data = await fetchFromCovalent(endpoint, params);
  return data.data;
}

export async function getWalletActivity(walletAddress, days = 30) {
  if (!walletAddress) throw new Error('Wallet address is required for getWalletActivity.');
  
  const endpoint = `address/${walletAddress}/activity/`;
  const params = {
    'days': days
  };
  
  const data = await fetchFromCovalent(endpoint, params);
  return data.data;
}

export async function trackWalletClick(address, connectedWallet) {
  console.log('Simulating POST: Tracking wallet interaction.', {
    trackedAddress: address,
    userWallet: connectedWallet,
    timestamp: new Date().toISOString()
  });
  // In a real app:
  // await fetch('/api/track-interaction', { method: 'POST', body: JSON.stringify(...) });
  return { success: true, message: 'Interaction tracked (simulated).' };
}

export function generateReferralLink(connectedWalletAddress) {
  if (!connectedWalletAddress) return '';
  const baseUrl = window.location.origin;
  return `${baseUrl}/?ref=${connectedWalletAddress}`;
}

export function getReferrerFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref');
}

export async function logReferralConnection(referrerAddress, newConnectedWallet) {
  console.log('Simulating POST: Logging referral connection.', {
    referrerAddress,
    newConnectedWallet,
    timestamp: new Date().toISOString()
  });
  // Example using localStorage:
  let referrals = JSON.parse(localStorage.getItem('referralsData')) || {};
  if (!referrals[referrerAddress]) {
    referrals[referrerAddress] = [];
  }
  if (!referrals[referrerAddress].includes(newConnectedWallet)) {
    referrals[referrerAddress].push(newConnectedWallet);
  }
  localStorage.setItem('referralsData', JSON.stringify(referrals));
  return { success: true, message: 'Referral logged (simulated).' };
}

export function getReferredUsersCount(referrerAddress) {
  if (!referrerAddress) return 0;
  const referrals = JSON.parse(localStorage.getItem('referralsData')) || {};
  return referrals[referrerAddress] ? referrals[referrerAddress].length : 0;
}

export const getNativeTokenSymbolForChain = (chainId) => {
  if (chainId === SUPPORTED_CHAINS.ETHEREUM) return 'ETH';
  if (chainId === SUPPORTED_CHAINS.BSC) return 'BNB';
  if (chainId === SUPPORTED_CHAINS.POLYGON) return 'MATIC';
  if (chainId === SUPPORTED_CHAINS.ARBITRUM) return 'ETH';
  if (chainId === SUPPORTED_CHAINS.OPTIMISM) return 'ETH';
  return 'NATIVE';
};

export async function calculatePortfolioPnL(chainId, walletAddress, timeframe = '30d') {
  if (!walletAddress) throw new Error('Wallet address is required for PnL calculation.');
  if (!chainId) throw new Error('Chain ID is required for PnL calculation.');

  const goldrushChainName = chainIdToGoldRushChainName(chainId);
  if (!goldrushChainName) throw new Error(`Unsupported chain ID: ${chainId}`);

  // Get current balances for the end value
  const currentBalances = await getTokenBalances(chainId, walletAddress);
  
  // Calculate current portfolio total value
  const currentPortfolioValue = currentBalances.reduce((total, token) => {
    return total + (token.quote || 0);
  }, 0);

  // Get historical data based on timeframe
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
  
  // Start date for comparison (days ago)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Historical token balances require token addresses, so we'll loop through major tokens
  const significantTokens = currentBalances
    .filter(token => token.quote > 50) // Only tokens with value over $50
    .slice(0, 10); // Limit to top 10 tokens by value
  
  let historicalPortfolioValue = 0;
  
  // For each significant token, get its historical balance
  for (const token of significantTokens) {
    try {
      // Get historical data for this token
      const endpoint = `${goldrushChainName}/address/${walletAddress}/historical_balances/`;
      const params = {
        'contract-address': token.contract_address,
        'from-timestamp': startDate.toISOString(),
        'quote-currency': 'USD'
      };
      
      const historicalData = await fetchFromCovalent(endpoint, params);
      
      // If we have historical data for this token
      if (historicalData?.data?.items?.length > 0) {
        // Get the oldest record within our timeframe
        const oldestRecord = historicalData.data.items[0];
        historicalPortfolioValue += oldestRecord.quote || 0;
      }
    } catch (error) {
      console.warn(`Failed to get historical data for token ${token.contract_ticker_symbol}:`, error);
    }
  }
  
  // Calculate PnL metrics
  const absolutePnL = currentPortfolioValue - historicalPortfolioValue;
  const percentagePnL = historicalPortfolioValue > 0 
    ? (absolutePnL / historicalPortfolioValue) * 100 
    : 0;
    
  return {
    startValue: historicalPortfolioValue,
    currentValue: currentPortfolioValue,
    absolutePnL,
    percentagePnL,
    timeframe
  };
}

// For multi-chain PnL calculation
export async function calculateMultiChainPortfolioPnL(walletAddress, timeframe = '30d') {
  if (!walletAddress) throw new Error('Wallet address is required for multi-chain PnL calculation.');
  
  // Calculate PnL across all supported chains
  const results = {};
  let totalStartValue = 0;
  let totalCurrentValue = 0;
  
  for (const chainId of Object.values(SUPPORTED_CHAINS)) {
    try {
      const pnl = await calculatePortfolioPnL(chainId, walletAddress, timeframe);
      results[chainId] = pnl;
      
      totalStartValue += pnl.startValue;
      totalCurrentValue += pnl.currentValue;
    } catch (error) {
      console.warn(`Failed to calculate PnL for chain ${getChainNameFromId(chainId)}:`, error);
    }
  }
  
  const totalAbsolutePnL = totalCurrentValue - totalStartValue;
  const totalPercentagePnL = totalStartValue > 0 
    ? (totalAbsolutePnL / totalStartValue) * 100 
    : 0;
    
  return {
    chainResults: results,
    totalStartValue,
    totalCurrentValue,
    totalAbsolutePnL,
    totalPercentagePnL,
    timeframe
  };
}