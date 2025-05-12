const COVALENT_API_KEY = import.meta.env.VITE_GOLDRUSH_API_KEY;
const COVALENT_BASE_URL = 'https://api.covalenthq.com/v1';

export const SUPPORTED_CHAINS = {
  ETHEREUM: '1',
  BSC: '56',
  // Add more chains as needed, e.g., POLYGON: '137'
};

const CHAIN_ID_TO_NAME_MAP = {
  '1': 'eth-mainnet',
  '56': 'bsc-mainnet',
  '137': 'matic-mainnet', // Example for Polygon
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


async function fetchFromCovalent(endpointPath) {
  const goldRushChainName = endpointPath.split('/')[0]; // e.g. "eth-mainnet" from "eth-mainnet/address/..."
  if (!CHAIN_ID_TO_NAME_MAP[Object.keys(CHAIN_ID_TO_NAME_MAP).find(key => CHAIN_ID_TO_NAME_MAP[key] === goldRushChainName)]) {
      console.warn(`Chain name ${goldRushChainName} might not be directly supported or mapped for GoldRush. Ensure endpoint is correct.`);
  }

  const url = `${COVALENT_BASE_URL}/${endpointPath}`;
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

  const endpoint = `${goldrushChainName}/address/${walletAddress}/balances_v2/?quote-currency=USD&nft=false`;
  const data = await fetchFromCovalent(endpoint);
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

  const endpoint = `${goldrushChainName}/address/${walletAddress}/transactions_v3/?quote-currency=USD&page-size=${pageSize}&page-number=${pageNumber}&no-logs=false`;
  const data = await fetchFromCovalent(endpoint);
  return {
    transactions: (data.data.items || []).map(tx => ({
        ...tx,
        chain_id: chainId,
        chain_name: getChainNameFromId(chainId)
    })),
    pagination: data.data.pagination,
  };
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
    return 'NATIVE';
};