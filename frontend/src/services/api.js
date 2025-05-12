const COVALENT_API_KEY = import.meta.env.VITE_GOLDRUSH_API_KEY;
const COVALENT_BASE_URL = 'https://api.covalenthq.com/v1';

export const SUPPORTED_CHAINS = {
  ETHEREUM: '1',
  BSC: '56',
  POLYGON: '137',
  ARBITRUM: '42161',
  OPTIMISM: '10',
  BITCOIN: 'btc-mainnet'
};

export const chainIdToGoldRushChainName = (chainId) => {
  if (chainId === SUPPORTED_CHAINS.BITCOIN) return 'btc-mainnet';
  
  const chainMap = {
    '1': 'eth-mainnet',
    '56': 'bsc-mainnet',
    '137': 'matic-mainnet',
    '42161': 'arbitrum-mainnet',
    '10': 'optimism-mainnet'
  };
  return chainMap[chainId] || chainId;
};

export const getChainNameFromId = (chainId) => {
  if (chainId === SUPPORTED_CHAINS.BITCOIN) return 'Bitcoin';
  
  const chainNames = {
    [SUPPORTED_CHAINS.ETHEREUM]: 'Ethereum',
    [SUPPORTED_CHAINS.BSC]: 'BSC',
    [SUPPORTED_CHAINS.POLYGON]: 'Polygon',
    [SUPPORTED_CHAINS.ARBITRUM]: 'Arbitrum',
    [SUPPORTED_CHAINS.OPTIMISM]: 'Optimism'
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
    case SUPPORTED_CHAINS.BITCOIN: return 'https://mempool.space';
    default: return 'https://blockscan.com';
  }
};

async function fetchFromCovalent(endpointPath, params = {}) {
  const goldRushChainName = endpointPath.split('/')[0]; // e.g. "eth-mainnet" from "eth-mainnet/address/..."
  if (!Object.values(SUPPORTED_CHAINS).includes(goldRushChainName)) {
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

  // Special handling for Bitcoin, which has different endpoint/parameters
  if (chainId === SUPPORTED_CHAINS.BITCOIN) {
    const endpoint = `${goldrushChainName}/address/${walletAddress}/balances_v2/`;
    const params = {
      'quote-currency': 'USD',
      'no-nft-fetch': 'true'
    };
    
    const data = await fetchFromCovalent(endpoint, params);
    return (data.data.items || []).map(item => ({
      ...item,
      chain_id: chainId,
      chain_name: 'Bitcoin'
    }));
  }
  
  // Standard handling for EVM chains
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

  // Special handling for Bitcoin
  if (chainId === SUPPORTED_CHAINS.BITCOIN) {
    const endpoint = `${goldrushChainName}/address/${walletAddress}/transactions_v2/`;
    const params = {
      'quote-currency': 'USD',
      'page-size': pageSize,
      'page-number': pageNumber,
      'no-logs': 'false'
    };
    
    const data = await fetchFromCovalent(endpoint, params);
    
    // Transform Bitcoin transactions to match EVM format
    return {
      transactions: (data.data.items || []).map(tx => ({
        ...tx,
        chain_id: chainId,
        chain_name: 'Bitcoin',
        from_address: tx.from?.address || null,
        to_address: tx.to?.address || null,
        value: tx.value || '0',
        value_quote: tx.value_quote || 0,
        gas_quote: tx.gas_quote || 0,
        gas_metadata: {
          contract_decimals: 8  // BTC decimals
        },
        log_events: tx.transfers?.map(transfer => ({
          decoded: {
            name: 'Transfer',
            params: [
              { name: 'from', value: transfer.from?.address || '' },
              { name: 'to', value: transfer.to?.address || '' },
              { name: 'value', value: transfer.amount || '0' }
            ]
          },
          sender_contract_ticker_symbol: 'BTC',
          sender_logo_url: '/BTC.svg',
          sender_contract_decimals: 8,
          sender_address: null
        })) || []
      })),
      pagination: data.data.pagination || { has_more: false }
    };
  }

  // Standard handling for EVM chains
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
  if (chainId === SUPPORTED_CHAINS.BITCOIN) return 'BTC';
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


// Add this after the calculateMultiChainPortfolioPnL function

export async function checkAirdropEligibility(walletAddress) {
  if (!walletAddress) throw new Error('Wallet address is required for checkAirdropEligibility');
  
  try {
    // Get balances across all chains
    let totalValue = 0;
    let interactedWithQualifyingProtocols = false;
    let holdsDiverseAssets = false;
    let hasRecentActivity = false;
    
    // Check each supported chain
    for (const chainId of Object.values(SUPPORTED_CHAINS)) {
      try {
        // Check token balances
        const balances = await getTokenBalances(chainId, walletAddress);
        
        // Calculate total portfolio value
        totalValue += balances.reduce((sum, token) => sum + (token.quote || 0), 0);
        
        // Check if wallet holds a diverse set of assets (at least 3 different tokens)
        if (balances.length >= 3) {
          holdsDiverseAssets = true;
        }
        
        // Check for recent activity (transactions in the last 30 days)
        const txHistory = await getTransactionHistory(chainId, walletAddress, { pageSize: 10 });
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        
        const hasRecentTx = txHistory.transactions.some(tx => 
          new Date(tx.block_signed_at) >= thirtyDaysAgo
        );
        
        if (hasRecentTx) {
          hasRecentActivity = true;
        }
        
        // Check for interactions with specific protocols that qualify for airdrops
        // These would be real protocol addresses in a production app
        const qualifyingProtocols = [
          // '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // Uniswap example
          // '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // Aave example
          // Add more qualifying protocol addresses
        ];
        
        // Check if any transactions interact with qualifying protocols
        const hasQualifyingInteractions = txHistory.transactions.some(tx => 
          qualifyingProtocols.some(address => 
            tx.to_address?.toLowerCase() === address.toLowerCase() ||
            tx.log_events?.some(log => log.sender_address?.toLowerCase() === address.toLowerCase())
          )
        );
        
        if (hasQualifyingInteractions) {
          interactedWithQualifyingProtocols = true;
        }
      } catch (error) {
        console.error(`Failed to check airdrop eligibility on chain ${chainId}:`, error);
      }
    }
    
    // Determine eligibility based on criteria
    // In a real app, these would be specific criteria defined by the airdrop
    const valueThreshold = 500; // $500 minimum portfolio value
    const isEligible = 
      totalValue >= valueThreshold || 
      (holdsDiverseAssets && hasRecentActivity) || 
      interactedWithQualifyingProtocols;
    
    // Construct reasons for eligibility
    const reasons = [];
    if (totalValue >= valueThreshold) {
      reasons.push(`Portfolio value above $${valueThreshold}`);
    }
    if (holdsDiverseAssets) {
      reasons.push("Holds diverse assets");
    }
    if (hasRecentActivity) {
      reasons.push("Active in the last 30 days");
    }
    if (interactedWithQualifyingProtocols) {
      reasons.push("Used qualifying protocols");
    }
    
    return {
      eligible: isEligible,
      reasons: isEligible ? reasons : []
    };
  } catch (error) {
    console.error("Error checking airdrop eligibility:", error);
    return { eligible: false, reasons: [] };
  }
}

// Also add this function to get historical price points for charts
export async function getHistoricalPricePoints(walletAddress, timeframe = '30d') {
  if (!walletAddress) throw new Error('Wallet address is required for getHistoricalPricePoints');
  
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
  
  try {
    const portfolioData = await getHistoricalPortfolioValue(walletAddress, days);
    
    if (!portfolioData?.items?.length) {
      return [];
    }
    
    // Format data for visualization
    return portfolioData.items.map(item => ({
      date: new Date(item.timestamp).toISOString().split('T')[0],
      value: item.portfolio_value || 0,
    }));
  } catch (error) {
    console.error('Failed to fetch historical portfolio data:', error);
    return [];
  }
}

// Enhanced transaction filtering functionality
export async function getFilteredMultiChainTransactions(walletAddress, filters = {}) {
  if (!walletAddress) throw new Error('Wallet address is required for getFilteredMultiChainTransactions');
  
  const { 
    chains = Object.values(SUPPORTED_CHAINS),
    timeRange = null, // {startDate, endDate} or null for all time
    txTypes = [], // 'send', 'receive', 'swap', 'approval', etc.
    pageNumber = 0,
    pageSize = 20
  } = filters;
  
  let allTransactions = [];
  let hasMoreItems = false;
  
  // Fetch transactions from all selected chains
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

  // Apply time filter if specified
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
  
  // Apply transaction type filter if specified
  if (txTypes && txTypes.length > 0) {
    allTransactions = allTransactions.filter(tx => {
      const from = tx.from_address?.toLowerCase();
      const to = tx.to_address?.toLowerCase();
      const wallet = walletAddress?.toLowerCase();
      
      // Determine transaction type
      let txType = '';
      
      if (from === wallet && to !== wallet) {
        txType = 'send';
      } else if (to === wallet && from !== wallet) {
        txType = 'receive';
      } else if (tx.log_events?.some(log => 
        log.decoded?.name?.toLowerCase().includes('swap') || 
        (log.decoded?.name === 'Transfer' && 
         log.decoded.params.find(p => p.name === 'from')?.value?.toLowerCase() === wallet &&
         log.decoded.params.find(p => p.name === 'to')?.value?.toLowerCase() === wallet)
      )) {
        txType = 'swap';
      } else if (tx.log_events?.some(log => log.decoded?.name === 'Approval')) {
        txType = 'approval';
      } else {
        txType = 'other';
      }
      
      return txTypes.includes(txType);
    });
  }
  
  // Sort transactions by date (newest first)
  allTransactions.sort((a, b) => 
    new Date(b.block_signed_at) - new Date(a.block_signed_at)
  );
  
  return {
    transactions: allTransactions,
    hasMore: hasMoreItems
  };
}

export const getChainLogo = (chainId) => {
  switch (chainId) {
    case SUPPORTED_CHAINS.ETHEREUM: return '/ETH.svg';
    case SUPPORTED_CHAINS.BSC: return '/BNB.svg';
    case SUPPORTED_CHAINS.POLYGON: return '/POLYGON.svg';
    case SUPPORTED_CHAINS.ARBITRUM: return '/ARB.svg';
    case SUPPORTED_CHAINS.OPTIMISM: return '/OP.svg';
    case SUPPORTED_CHAINS.BITCOIN: return '/BTC.svg';
    default: return null;
  }
};