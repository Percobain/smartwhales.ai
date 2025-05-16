import axios from 'axios';

const COVALENT_API_KEY = import.meta.env.VITE_GOLDRUSH_API_KEY;
const COVALENT_BASE_URL = 'https://api.covalenthq.com/v1';
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_URL; // Define your backend base URL

export const SUPPORTED_CHAINS = {
  ETHEREUM: '1',
  BSC: '56',
  POLYGON: '137',
  ARBITRUM: '42161',
  OPTIMISM: '10',
  BASE: '8453',
  // BITCOIN: 'btc-mainnet'
};

export const chainIdToGoldRushChainName = (chainId) => {
  // if (chainId === SUPPORTED_CHAINS.BITCOIN) return 'btc-mainnet';
  
  const chainMap = {
    '1': 'eth-mainnet',
    '56': 'bsc-mainnet',
    '137': 'matic-mainnet',
    '42161': 'arbitrum-mainnet',
    '10': 'optimism-mainnet',
    '8453': 'base-mainnet'
  };
  return chainMap[chainId] || chainId;
};

// ... (getChainNameFromId, getChainExplorer, fetchFromCovalent, and other Covalent-related functions remain the same) ...
// ...existing code...
export const getChainNameFromId = (chainId) => {
  // if (chainId === SUPPORTED_CHAINS.BITCOIN) return 'Bitcoin';
  
  const chainNames = {
    [SUPPORTED_CHAINS.ETHEREUM]: 'Ethereum',
    [SUPPORTED_CHAINS.BSC]: 'BSC',
    [SUPPORTED_CHAINS.POLYGON]: 'Polygon',
    [SUPPORTED_CHAINS.ARBITRUM]: 'Arbitrum',
    [SUPPORTED_CHAINS.OPTIMISM]: 'Optimism',
    [SUPPORTED_CHAINS.BASE]: 'Base',
  };
  return chainNames[chainId] || 'Unknown';
};

export const getChainExplorer = (chainId) => {
  switch (chainId) {
    case SUPPORTED_CHAINS.ETHEREUM: return 'https://etherscan.io';
    case SUPPORTED_CHAINS.BSC: return 'https://bscscan.com';
    case SUPPORTED_CHAINS.POLYGON: return 'https://polygonscan.com';
    case SUPPORTED_CHAINS.ARBITRUM: return 'https://arbiscan.io';
    case SUPPORTED_CHAINS.OPTIMISM: return 'https://optimistic.etherscan.io';
    case SUPPORTED_CHAINS.BASE: return 'https://basescan.org';
    // case SUPPORTED_CHAINS.BITCOIN: return 'https://mempool.space';
    default: return 'https://blockscan.com';
  }
};

async function fetchFromCovalent(endpointPath, params = {}) {
  const goldRushChainName = endpointPath.split('/')[0];
  if (!Object.values(SUPPORTED_CHAINS).includes(goldRushChainName) && !['eth-mainnet', 'bsc-mainnet', 'matic-mainnet', 'arbitrum-mainnet', 'optimism-mainnet'].includes(goldRushChainName)) {
    // Allow direct goldrush names if they are not in SUPPORTED_CHAINS values (e.g. for cross-chain endpoints)
    if (endpointPath.includes('/address/')) { // Only warn if it's a chain-specific endpoint that looks unrecognized
        console.warn(`Chain name ${goldRushChainName} might not be directly supported or mapped for GoldRush. Ensure endpoint is correct.`);
    }
  }

  const url = `${COVALENT_BASE_URL}/${endpointPath}`;
  
  try {
    const response = await axios.get(url, {
      params, // Axios handles query parameter construction
      headers: {
        'Authorization': `Bearer ${COVALENT_API_KEY}`,
      },
    });
    return response.data; // Axios automatically parses JSON
  } catch (error) {
    console.error('Covalent API Error Response:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error_message || error.message || `Request failed (Status: ${error.response?.status})`;
    throw new Error(`API request failed: ${errorMessage}`);
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
    pagination: data.data.pagination
  };
}

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

export async function trackWalletClick(trackedAddress, connectedUserWallet, currentChainId) {
  try {
    // Check local storage to see if this wallet has already been tracked
    const trackedKey = `tracked_${connectedUserWallet}_${trackedAddress}`.toLowerCase();
    if (localStorage.getItem(trackedKey)) {
      console.log('This wallet has already been tracked, skipping API call');
      return { success: true, message: 'Already tracked' };
    }
    
    const payload = {
      walletAddress: connectedUserWallet,
      trackedAddress: trackedAddress,
      // Remove signature and message fields
      metadata: {
        chainId: currentChainId || '',
        userAgent: navigator.userAgent
      }
    };

    const response = await axios.post(`${BACKEND_API_BASE_URL}/api/tracking/click`, payload);
    
    // Store in localStorage that this wallet has been tracked
    localStorage.setItem(trackedKey, 'true');
    
    return response.data;
  } catch (error) {
    console.error('Error in trackWalletClick:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to track click interaction.';
    return { success: false, message: errorMessage };
  }
}

export function generateReferralLink(connectedWalletAddress) {
  if (!connectedWalletAddress) return '';
  const baseUrl = window.location.origin; // This is fine, as it's for the link displayed to the user
  return `${baseUrl}/?ref=${connectedWalletAddress}`;
}

export function getReferrerFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref');
}

export async function logReferralConnection(referrerAddress, newConnectedWallet, signature, message) {
  if (!referrerAddress || !newConnectedWallet || !signature || !message) {
    console.error('Missing parameters for logReferralConnection');
    return { success: false, message: 'Missing parameters for logging referral.' };
  }
  try {
    const response = await axios.post(`${BACKEND_API_BASE_URL}/api/referral/log`, { // Use absolute URL
      referrerAddress,
      walletAddress: newConnectedWallet,
      signature,
      message
    });
    return response.data;
  } catch (error) {
    console.error('Error in logReferralConnection:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to log referral.';
    return { success: false, message: errorMessage };
  }
}

export async function getReferredUsersCount(referrerAddress) {
  if (!referrerAddress) return Promise.resolve(0);
  try {
    const response = await axios.get(`${BACKEND_API_BASE_URL}/api/referral/count/${referrerAddress}`); // Use absolute URL
    if (response.data && response.data.success && response.data.data && typeof response.data.data.count === 'number') {
      return response.data.data.count;
    }
    console.warn('Unexpected data structure for referral count:', response.data);
    return 0;
  } catch (error) {
    console.error('Error in getReferredUsersCount:', error.response?.data || error.message);
    if (error.response && typeof error.response.data === 'string' && error.response.data.startsWith("<!doctype html")) {
        console.error("Received HTML response instead of JSON. This often indicates a 404 or server-side error not returning JSON.");
    }
    return 0;
  }
}

// ... (getNativeTokenSymbolForChain, calculatePortfolioPnL, etc. remain the same) ...
// ...existing code...
export const getNativeTokenSymbolForChain = (chainId) => {
  if (chainId === SUPPORTED_CHAINS.ETHEREUM) return 'ETH';
  if (chainId === SUPPORTED_CHAINS.BSC) return 'BNB';
  if (chainId === SUPPORTED_CHAINS.POLYGON) return 'MATIC';
  if (chainId === SUPPORTED_CHAINS.ARBITRUM) return 'ETH';
  if (chainId === SUPPORTED_CHAINS.OPTIMISM) return 'ETH';
  // if (chainId === SUPPORTED_CHAINS.BITCOIN) return 'BTC';
  return 'NATIVE';
};

export async function calculatePortfolioPnL(chainId, walletAddress, timeframe = '30d') {
  if (!walletAddress) throw new Error('Wallet address is required for PnL calculation.');
  if (!chainId) throw new Error('Chain ID is required for PnL calculation.');

  const goldrushChainName = chainIdToGoldRushChainName(chainId);
  if (!goldrushChainName) throw new Error(`Unsupported chain ID: ${chainId}`);

  const currentBalances = await getTokenBalances(chainId, walletAddress);
  
  const currentPortfolioValue = currentBalances.reduce((total, token) => {
    return total + (token.quote || 0);
  }, 0);

  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const significantTokens = currentBalances
    .filter(token => token.quote > 50) 
    .slice(0, 10); 
  
  let historicalPortfolioValue = 0;
  
  for (const token of significantTokens) {
    try {
      const endpoint = `${goldrushChainName}/address/${walletAddress}/historical_balances/`;
      const params = {
        'contract-address': token.contract_address,
        'from-timestamp': startDate.toISOString(),
        'quote-currency': 'USD'
      };
      
      const historicalData = await fetchFromCovalent(endpoint, params);
      
      if (historicalData?.data?.items?.length > 0) {
        const oldestRecord = historicalData.data.items[0];
        historicalPortfolioValue += oldestRecord.quote || 0;
      }
    } catch (error) {
      console.warn(`Failed to get historical data for token ${token.contract_ticker_symbol}:`, error);
    }
  }
  
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

export async function calculateMultiChainPortfolioPnL(walletAddress, timeframe = '30d') {
  if (!walletAddress) throw new Error('Wallet address is required for multi-chain PnL calculation.');
  
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

export async function checkAirdropEligibility(walletAddress) {
  if (!walletAddress) throw new Error('Wallet address is required for checkAirdropEligibility');
  
  try {
    let hasRecentActivity = false;

    for (const chainId of Object.values(SUPPORTED_CHAINS)) {
      try {
        const txHistory = await getTransactionHistory(chainId, walletAddress, { pageSize: 10 });
        const now = new Date();
        const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
        
        const hasRecentTx = txHistory.transactions.some(tx => 
          new Date(tx.block_signed_at) >= thirtyDaysAgo
        );
        
        if (hasRecentTx) {
          hasRecentActivity = true;
          break;
        }
      } catch (error) {
        console.error(`Failed to check transaction history on chain ${chainId}:`, error);
      }
    }
    
    const referredUsersCount = await getReferredUsersCount(walletAddress);
    const hasEnoughReferrals = referredUsersCount >= 3;

    const isEligible = hasRecentActivity && hasEnoughReferrals;

    const reasons = [];
    if (hasRecentActivity) {
      reasons.push("Active wallet in the last 30 days");
    }
    if (hasEnoughReferrals) {
      reasons.push(`Referred ${referredUsersCount} users (minimum 3 required)`);
    }
    
    return {
      eligible: isEligible,
      reasons: isEligible ? reasons : [],
      missingCriteria: isEligible ? [] : [
        !hasRecentActivity ? "Wallet must be active in the last 30 days" : null,
        !hasEnoughReferrals ? `Need ${3 - referredUsersCount} more referrals (you have ${referredUsersCount})` : null
      ].filter(Boolean)
    };
  } catch (error) {
    console.error("Error checking airdrop eligibility:", error);
    return { 
      eligible: false, 
      reasons: [],
      missingCriteria: ["Error checking eligibility"],
      error: error.message
    };
  }
}

export async function getFilteredMultiChainTransactions(walletAddress, filters = {}) {
  if (!walletAddress) throw new Error('Wallet address is required for getFilteredMultiChainTransactions');
  
  const { 
    chains = Object.values(SUPPORTED_CHAINS),
    timeRange = null, 
    txTypes = [], 
    pageNumber = 0,
    pageSize = 20
  } = filters;
  
  let allTransactions = [];
  let hasMoreItems = false;
  
  for (const chainId of chains) {
    try {
      const { transactions, pagination } = await getTransactionHistory(
        chainId, 
        walletAddress, 
        { pageNumber, pageSize }
      );
      
      if (pagination?.has_more) {
        hasMoreItems = true;
      }
      
      allTransactions = [...allTransactions, ...transactions];
    } catch (error) {
      console.error(`Error fetching transactions for chain ${chainId}:`, error);
    }
  }

  if (timeRange && (timeRange.startDate || timeRange.endDate)) {
    allTransactions = allTransactions.filter(tx => {
      const txDate = new Date(tx.block_signed_at);
      let passesFilter = true;
      
      if (timeRange.startDate) {
        passesFilter = passesFilter && txDate >= new Date(timeRange.startDate);
      }
      
      if (timeRange.endDate) {
        passesFilter = passesFilter && txDate <= new Date(timeRange.endDate);
      }
      
      return passesFilter;
    });
  }
  
  if (txTypes && txTypes.length > 0) {
    allTransactions = allTransactions.filter(tx => {
      const from = tx.from_address?.toLowerCase();
      const to = tx.to_address?.toLowerCase();
      const wallet = walletAddress?.toLowerCase();
      
      let txType = '';
      
      if (from === wallet && to !== wallet) {
        txType = 'send';
      } else if (to === wallet && from !== wallet) {
        txType = 'receive';
      } else if (tx.log_events?.some(log => 
        log.decoded?.name?.toLowerCase().includes('swap') || 
        (log.decoded?.name === 'Transfer' && 
         log.decoded.params.find(p => p.name === 'from')?.value?.toLowerCase() === wallet &&
         log.decoded.params.find(p => p.name === 'to')?.value?.toLowerCase() !== wallet &&
         tx.log_events.some(otherLog => otherLog.decoded?.name === 'Transfer' && otherLog.decoded.params.find(p => p.name === 'to')?.value?.toLowerCase() === wallet)
        )
      )) {
        txType = 'swap';
      } else if (tx.log_events?.some(log => log.decoded?.name?.toLowerCase().includes('approval'))) {
        txType = 'approval';
      } else if (from === wallet && to === wallet) {
        txType = 'self';
      } else {
        txType = 'contract_interaction';
      }
      
      return txTypes.includes(txType);
    });
  }
  
  allTransactions.sort((a, b) => new Date(b.block_signed_at) - new Date(a.block_signed_at));
  
  return {
    transactions: allTransactions,
    pagination: { has_more: hasMoreItems }
  };
}

export const getChainLogo = (chainId) => {
  switch (chainId) {
    case SUPPORTED_CHAINS.ETHEREUM: return '/ETH.svg';
    case SUPPORTED_CHAINS.BSC: return '/BNB.svg';
    case SUPPORTED_CHAINS.POLYGON: return '/POLYGON.svg';
    case SUPPORTED_CHAINS.ARBITRUM: return '/ARB.svg';
    case SUPPORTED_CHAINS.OPTIMISM: return '/OP.svg';
    case SUPPORTED_CHAINS.BASE: return '/BASE.svg';
    // case SUPPORTED_CHAINS.BITCOIN: return '/BTC.svg';
    default: return null;
  }
};

export async function getTrackingStats(walletAddress) {
  if (!walletAddress) {
    throw new Error('Wallet address is required for getTrackingStats.');
  }
  try {
    const response = await axios.get(
      `${BACKEND_API_BASE_URL}/api/tracking/stats/${walletAddress}`
    );
    return response.data;
  } catch (error) {
    console.error('Error in getTrackingStats:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to fetch tracking stats.'
    };
  }
}