import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getTokenBalances, getTransactionHistory, SUPPORTED_CHAINS, getChainNameFromId, getNativeTokenSymbolForChain } from '../../services/api';
import { FaCopy, FaCheckCircle, FaExternalLinkAlt, FaArrowDown, FaArrowUp, FaExchangeAlt, FaWallet, FaSpinner } from 'react-icons/fa';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

// FilterButton using shadcn Button component
const FilterButton = ({ label, onClick, isActive, className = '' }) => (
  <Button
    variant={isActive ? "default" : "secondary"}
    size="sm"
    onClick={onClick}
    className={cn(
      "text-xs sm:text-sm whitespace-nowrap",
      isActive ? "bg-[#8A2BE2] hover:bg-purple-700" : "bg-gray-700 hover:bg-gray-600 text-gray-300",
      className
    )}
  >
    {label}
  </Button>
);

export const Dashboard = ({ walletAddress, connectedWalletAddress, referralLink, referredUsersCount, currentConnectedChainId, setErrorApp }) => {
  const [portfolioData, setPortfolioData] = useState({ totalValue: 0, balances: [] });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState({ balances: false, transactions: false });
  const [error, setError] = useState({ balances: null, transactions: null });
  const [copiedReferral, setCopiedReferral] = useState(false);

  const [selectedChains, setSelectedChains] = useState([SUPPORTED_CHAINS.ETHEREUM, SUPPORTED_CHAINS.BSC]);
  const [timeFilter, setTimeFilter] = useState('all'); // '24h', '7d', '30d', 'all'
  const [txTypeFilter, setTxTypeFilter] = useState('all'); // 'all', 'send', 'receive', 'trade'
  const [activeTab, setActiveTab] = useState('transactions');
  
  const [txPagination, setTxPagination] = useState({}); // { [chainId]: { currentPage: 0, hasMore: true } }

  const activeWalletToDisplay = walletAddress;
  const shortWalletAddress = walletAddress ? 
    `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : '';

  // Reset local errors
  const resetLocalErrors = () => {
    setError({ balances: null, transactions: null });
    if (setErrorApp) setErrorApp(''); 
  };
    
  // Fetch dashboard data including balances and transactions
  const fetchDashboardData = useCallback(async (walletAddr, chainsToFetch) => {
    if (!walletAddr) return;
    resetLocalErrors();
    setLoading(prev => ({ ...prev, balances: true, transactions: true }));
    
    let cumulativeTotalValue = 0;
    const allBalances = [];
    const initialTransactions = [];
    const newTxPagination = {};

    for (const chainId of chainsToFetch) {
      newTxPagination[chainId] = { currentPage: 0, hasMore: true };
      try {
        const balanceItems = await getTokenBalances(chainId, walletAddr);
        balanceItems.forEach(bal => {
          cumulativeTotalValue += bal.quote || 0;
          allBalances.push(bal);
        });
      } catch (e) {
        console.error(`Balances Error (Chain ${chainId}):`, e);
        const errorMsg = `Failed to load balances for ${getChainNameFromId(chainId)}. ${e.message}`;
        setError(prev => ({ ...prev, balances: errorMsg }));
        
        // Show toast for malformed address error
        if (e.message && e.message.includes('Malformed address')) {
          toast.error("Invalid wallet address", {
            description: "The address format is incorrect or not a valid blockchain address."
          });
        } else {
          toast.error(`${getChainNameFromId(chainId)} balance error`, {
            description: e.message || "Failed to load portfolio data"
          });
        }
      }
      try {
        const txData = await getTransactionHistory(chainId, walletAddr, { pageNumber: 0, pageSize: 15 });
        initialTransactions.push(...txData.transactions);
        newTxPagination[chainId].hasMore = txData.pagination?.has_more ?? false;
      } catch (e) {
        console.error(`Transactions Error (Chain ${chainId}):`, e);
        setError(prev => ({ ...prev, transactions: `Failed to load transactions for ${getChainNameFromId(chainId)}. ${e.message}` }));
        
        toast.error(`${getChainNameFromId(chainId)} transactions error`, {
          description: e.message || "Failed to load transaction history"
        });
      }
    }
    setPortfolioData({ 
      totalValue: cumulativeTotalValue, 
      balances: allBalances.sort((a, b) => (b.quote || 0) - (a.quote || 0)) 
    });
    setTransactions(initialTransactions.sort((a, b) => 
      new Date(b.block_signed_at).getTime() - new Date(a.block_signed_at).getTime()
    ));
    setTxPagination(newTxPagination);
    setLoading({ balances: false, transactions: false });

  }, [setErrorApp]);

  // Fetch data on wallet or chain change
  useEffect(() => {
    if (activeWalletToDisplay && selectedChains.length > 0) {
      fetchDashboardData(activeWalletToDisplay, selectedChains);
    } else if (!activeWalletToDisplay) {
      setPortfolioData({ totalValue: 0, balances: [] });
      setTransactions([]);
    }
  }, [activeWalletToDisplay, selectedChains.join(','), fetchDashboardData]);

  // Load more transactions
  const loadMoreTransactions = useCallback(async () => {
    if (!activeWalletToDisplay) return;
    setLoading(prev => ({ ...prev, transactions: true }));
    const newTransactions = [];
    const updatedTxPagination = { ...txPagination };
    let anyChainHadMore = false;

    for (const chainId of selectedChains) {
      if (updatedTxPagination[chainId]?.hasMore) {
        try {
          const nextPage = (updatedTxPagination[chainId].currentPage || 0) + 1;
          const txData = await getTransactionHistory(chainId, activeWalletToDisplay, { pageNumber: nextPage, pageSize: 15 });
          newTransactions.push(...txData.transactions);
          updatedTxPagination[chainId] = {
            currentPage: nextPage,
            hasMore: txData.pagination?.has_more ?? false,
          };
          if (txData.pagination?.has_more) anyChainHadMore = true;
        } catch (e) {
          console.error(`Load More Txs Error (Chain ${chainId}):`, e);
          toast.error(`Failed to load more transactions`, {
            description: `Error on ${getChainNameFromId(chainId)}: ${e.message}`
          });
          updatedTxPagination[chainId].hasMore = false;
        }
      }
    }
    
    setTransactions(prev => [...prev, ...newTransactions].sort((a, b) => 
      new Date(b.block_signed_at).getTime() - new Date(a.block_signed_at).getTime())
    );
    setTxPagination(updatedTxPagination);
    setLoading(prev => ({ ...prev, transactions: false }));
  }, [activeWalletToDisplay, selectedChains, txPagination]);
    
  const canLoadMore = useMemo(() => Object.values(txPagination).some(p => p.hasMore), [txPagination]);

  // Extract transaction information for display
  const getTransactionDisplayInfo = useCallback((tx, currentWalletAddr) => {
    const from = tx.from_address?.toLowerCase();
    const to = tx.to_address?.toLowerCase();
    const wallet = currentWalletAddr?.toLowerCase();

    let type = 'Interaction';
    let icon = <FaExchangeAlt className="text-yellow-400" />;
    let details = `Value: ${tx.value_quote ? `$${parseFloat(tx.value_quote).toFixed(2)}` : 'N/A'}`;
    const nativeSymbol = getNativeTokenSymbolForChain(tx.chain_id);

    if (tx.value && BigInt(tx.value) > 0n && !tx.log_events?.some(log => log.decoded?.name === 'Transfer')) {
      const nativeValue = parseFloat(tx.value) / (10 ** (tx.gas_metadata?.contract_decimals || 18));
      details = `${nativeValue.toFixed(4)} ${nativeSymbol}`;
    }

    const relevantTransfers = tx.log_events?.filter(log => log.decoded?.name === 'Transfer' && log.sender_contract_ticker_symbol) || [];
    const sentAssets = [];
    const receivedAssets = [];

    relevantTransfers.forEach(log => {
      const amount = parseFloat(log.decoded.params.find(p => p.name === 'value')?.value || '0') / (10 ** log.sender_contract_decimals);
      const symbol = log.sender_contract_ticker_symbol;
      if (log.decoded.params.find(p => p.name === 'from')?.value?.toLowerCase() === wallet) {
        sentAssets.push(`${amount.toFixed(3)} ${symbol}`);
      }
      if (log.decoded.params.find(p => p.name === 'to')?.value?.toLowerCase() === wallet) {
        receivedAssets.push(`${amount.toFixed(3)} ${symbol}`);
      }
    });
    
    if (from === wallet && to !== wallet) {
      type = 'Send'; icon = <FaArrowUp className="text-red-500" />;
      if (sentAssets.length > 0) details = `- ${sentAssets.join(', - ')}`;
      else if (nativeSymbol && parseFloat(tx.value) / (10 ** 18) > 0) details = `- ${(parseFloat(tx.value) / (10 ** 18)).toFixed(4)} ${nativeSymbol}`;
    } else if (to === wallet && from !== wallet) {
      type = 'Receive'; icon = <FaArrowDown className="text-green-500" />;
      if (receivedAssets.length > 0) details = `+ ${receivedAssets.join(', + ')}`;
      else if (nativeSymbol && parseFloat(tx.value) / (10 ** 18) > 0) details = `+ ${(parseFloat(tx.value) / (10 ** 18)).toFixed(4)} ${nativeSymbol}`;
    } else if (sentAssets.length > 0 && receivedAssets.length > 0) {
      type = 'Swap'; icon = <FaExchangeAlt className="text-blue-400" />;
      details = `- ${sentAssets.join('/')} for + ${receivedAssets.join('/')}`;
    } else if (tx.log_events?.some(log => log.decoded?.name?.toLowerCase().includes('swap'))) {
      type = 'Swap'; icon = <FaExchangeAlt className="text-blue-400" />;
      if (sentAssets.length > 0) details = `- ${sentAssets.join('/')} ...`;
      else if (receivedAssets.length > 0) details = `... for + ${receivedAssets.join('/')}`;
      else details = "Swap involving multiple assets";
    } else if (tx.log_events?.some(log => log.decoded?.name === 'Approval')) {
      type = 'Approve'; icon = <FaCheckCircle className="text-purple-400" />;
      const approvedToken = tx.log_events.find(log => log.decoded?.name === 'Approval')?.sender_contract_ticker_symbol;
      details = `Approved ${approvedToken || 'token'}`;
    }

    return { 
      type, 
      icon, 
      details, 
      valueQuote: tx.value_quote,
      sentAssets,
      receivedAssets
    };
  }, []);

  // Apply filters to transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.block_signed_at);
      const now = new Date();
      
      // Time filter
      if (timeFilter !== 'all') {
        let hours = 0;
        if (timeFilter === '24h') hours = 24;
        else if (timeFilter === '7d') hours = 24 * 7;
        else if (timeFilter === '30d') hours = 24 * 30;
        if (now.getTime() - txDate.getTime() > hours * 60 * 60 * 1000) return false;
      }

      // Type filter
      if (txTypeFilter !== 'all') {
        const { type } = getTransactionDisplayInfo(tx, activeWalletToDisplay);
        if (txTypeFilter === 'send' && type.toLowerCase() !== 'send') return false;
        if (txTypeFilter === 'receive' && type.toLowerCase() !== 'receive') return false;
        if (txTypeFilter === 'trade' && type.toLowerCase() !== 'trade' && type.toLowerCase() !== 'swap') return false;
      }
      
      return true;
    });
  }, [transactions, timeFilter, txTypeFilter, activeWalletToDisplay, getTransactionDisplayInfo]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups = {};
    
    filteredTransactions.forEach(tx => {
      const date = new Date(tx.block_signed_at);
      const dateString = format(date, 'MMMM d, yyyy');
      
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      
      groups[dateString].push(tx);
    });
    
    // Convert to array and sort by date (most recent first)
    return Object.entries(groups)
      .map(([date, txs]) => ({ date, transactions: txs }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredTransactions]);

  // Extract only swap/trade transactions
  const swapTransactions = useMemo(() => {
    return filteredTransactions.filter(tx => {
      const { type } = getTransactionDisplayInfo(tx, activeWalletToDisplay);
      return type.toLowerCase() === 'swap';
    });
  }, [filteredTransactions, getTransactionDisplayInfo, activeWalletToDisplay]);

  // Handle referral link copy
  const handleCopyReferral = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
    toast.success("Referral link copied to clipboard");
  };

  // Toggle chain filter
  const toggleChainFilter = (chainId) => {
    setSelectedChains(prev =>
      prev.includes(chainId) ? prev.filter(c => c !== chainId) : [...prev, chainId]
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Portfolio Overview Section */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <FaWallet className="text-[#8A2BE2]" />
            Portfolio Overview
          </CardTitle>
          <CardDescription className="text-gray-400">
            {shortWalletAddress}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Stats */}
            <div className="space-y-4">
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Portfolio Value</span>
                  <span className="text-xl font-bold text-white">
                    {loading.balances ? (
                      <FaSpinner className="animate-spin text-lg" />
                    ) : (
                      `$${portfolioData.totalValue.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}`
                    )}
                  </span>
                </div>
                
                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Tracked Wallets</span>
                    <div className="text-2xl font-bold text-white">1</div>
                    <span className="text-xs text-gray-500">(Current View)</span>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Airdrop Eligible</span>
                    <div className="text-2xl font-bold text-green-400">Yes!</div>
                    <span className="text-xs text-gray-500">(Simulated)</span>
                  </div>
                </div>
              </div>
              
              {/* Top Tokens */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Top Tokens</h3>
                {loading.balances ? (
                  <div className="flex justify-center py-4">
                    <FaSpinner className="animate-spin text-lg text-gray-500" />
                  </div>
                ) : portfolioData.balances.length > 0 ? (
                  <div className="space-y-3">
                    {portfolioData.balances.slice(0, 3).map((token) => (
                      <div key={`${token.chain_id}-${token.contract_address}`} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-2">
                            {token.logo_url ? (
                              <img 
                                src={token.logo_url} 
                                alt={token.contract_ticker_symbol} 
                                className="w-6 h-6 rounded-full" 
                              />
                            ) : (
                              <span className="text-xs font-bold">{token.contract_ticker_symbol?.slice(0, 3)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white">{token.contract_ticker_symbol}</div>
                            <div className="text-xs text-gray-400">{getChainNameFromId(token.chain_id)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-white">
                            ${(token.quote || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-400">
                            {parseFloat(token.balance) / Math.pow(10, token.contract_decimals) > 0.001
                              ? (parseFloat(token.balance) / Math.pow(10, token.contract_decimals)).toFixed(4)
                              : "<0.001"} {token.contract_ticker_symbol}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-sm text-gray-500">No tokens found</div>
                )}
              </div>
            </div>
            
            {/* Right Side - Referral and Filters */}
            <div className="space-y-4">
              {/* Referral Card */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 uppercase tracking-wider">Your Referral Link</CardTitle>
                </CardHeader>
                <CardContent>
                  {referralLink ? (
                    <div className="space-y-3">
                      <div className="flex">
                        <Input 
                          type="text" 
                          readOnly 
                          value={referralLink} 
                          className="rounded-r-none bg-gray-700 border-gray-600 text-white" 
                        />
                        <Button
                          onClick={handleCopyReferral}
                          variant="secondary"
                          className="rounded-l-none bg-[#8A2BE2] hover:bg-purple-700 text-white"
                          size="icon"
                        >
                          {copiedReferral ? <FaCheckCircle /> : <FaCopy />}
                        </Button>
                      </div>
                      <div className="text-sm text-gray-400">
                        Referred Users: <span className="font-bold text-white">{referredUsersCount}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Connect wallet to get your referral link.</p>
                  )}
                </CardContent>
              </Card>
              
              {/* Filters */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 uppercase tracking-wider">Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Chain Filter */}
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-1.5">Chains</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(SUPPORTED_CHAINS).map(([name, id]) => (
                        <FilterButton 
                          key={id} 
                          label={getChainNameFromId(id)} 
                          onClick={() => toggleChainFilter(id)} 
                          isActive={selectedChains.includes(id)} 
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Time Filter */}
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-1.5">Time Period</div>
                    <div className="flex flex-wrap gap-2">
                      {[{p: 'all', l: 'All Time'}, {p: '24h', l: '24 Hours'}, {p: '7d', l: '7 Days'}, {p: '30d', l: '30 Days'}].map(tf => (
                        <FilterButton 
                          key={tf.p} 
                          label={tf.l} 
                          onClick={() => setTimeFilter(tf.p)} 
                          isActive={timeFilter === tf.p} 
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Type Filter */}
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-1.5">Transaction Type</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        {t: 'all', l: 'All Types'}, 
                        {t: 'receive', l: 'Received'}, 
                        {t: 'send', l: 'Sent'}, 
                        {t: 'trade', l: 'Swaps/Trades'}
                      ].map(ttf => (
                        <FilterButton 
                          key={ttf.t} 
                          label={ttf.l} 
                          onClick={() => setTxTypeFilter(ttf.t)} 
                          isActive={txTypeFilter === ttf.t} 
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Error Alerts */}
      {error.balances && (
        <Alert variant="destructive" className="bg-red-900/30 border-red-800 text-red-300">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading portfolio data</AlertTitle>
          <AlertDescription>{error.balances}</AlertDescription>
        </Alert>
      )}
      
      {error.transactions && (
        <Alert variant="destructive" className="bg-red-900/30 border-red-800 text-red-300">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading transactions</AlertTitle>
          <AlertDescription>{error.transactions}</AlertDescription>
        </Alert>
      )}
      
      {/* Transactions and Trades Tabs */}
      <Tabs defaultValue="transactions" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-[#8A2BE2]">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="trades" className="data-[state=active]:bg-[#8A2BE2]">
            Trades
          </TabsTrigger>
        </TabsList>
        
        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-0">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-xl">Transaction History</CardTitle>
              <CardDescription>
                Latest activity on your wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Loading indicator */}
              {loading.transactions && transactions.length === 0 && (
                <div className="flex justify-center items-center py-20">
                  <div className="flex flex-col items-center">
                    <FaSpinner className="animate-spin text-3xl text-[#8A2BE2] mb-2" />
                    <p className="text-gray-400">Loading transaction history...</p>
                  </div>
                </div>
              )}
              
              {/* No transactions */}
              {!loading.transactions && filteredTransactions.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-gray-500">No transactions matching your filters.</p>
                </div>
              )}
              
              {/* Group transactions by date */}
              {groupedTransactions.map(group => (
                <div key={group.date} className="mb-8 last:mb-0">
                  <h3 className="sticky top-0 bg-gray-900 py-2 text-sm font-medium text-gray-400 border-b border-gray-800">
                    {group.date}
                  </h3>
                  <div className="space-y-4 mt-4">
                    {group.transactions.map(tx => {
                      const { type, icon, details, valueQuote } = getTransactionDisplayInfo(tx, activeWalletToDisplay);
                      const date = new Date(tx.block_signed_at);
                      const explorerUrl = tx.chain_id === SUPPORTED_CHAINS.BSC 
                        ? `https://bscscan.com/tx/${tx.tx_hash}` 
                        : `https://etherscan.io/tx/${tx.tx_hash}`;
                        
                      // Set badge color based on transaction type
                      const badgeColor = type.toLowerCase() === 'receive' 
                        ? 'bg-green-500/20 text-green-300 border-green-500/30'
                        : type.toLowerCase() === 'send'
                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                        : type.toLowerCase() === 'swap'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
                        
                      return (
                        <Card 
                          key={tx.tx_hash} 
                          className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors"
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center">
                                <div className="mr-3 text-xl">{icon}</div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{type}</span>
                                    <Badge variant="outline" className={cn("text-xs font-normal", badgeColor)}>
                                      {getChainNameFromId(tx.chain_id)}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-400 mt-1" title={details}>{details}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-400">
                                  {format(date, 'h:mm a')}
                                </p>
                                <p className="text-sm text-gray-300 mt-1">
                                  {valueQuote ? `$${parseFloat(valueQuote).toFixed(2)}` : 'N/A'}
                                </p>
                                <a 
                                  href={explorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#8A2BE2] hover:text-purple-400 flex items-center justify-end mt-1"
                                >
                                  <span className="mr-1">View</span>
                                  <FaExternalLinkAlt size={10} />
                                </a>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* Load more button */}
              {canLoadMore && !loading.transactions && filteredTransactions.length > 0 && (
                <div className="flex justify-center mt-6">
                  <Button 
                    onClick={loadMoreTransactions} 
                    disabled={loading.transactions}
                    className="bg-[#8A2BE2] hover:bg-purple-700 text-white"
                  >
                    {loading.transactions ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Trades Tab */}
        <TabsContent value="trades" className="mt-0">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-xl">Trades</CardTitle>
              <CardDescription>
                Swaps between different tokens and coins
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading.transactions && swapTransactions.length === 0 ? (
                <div className="flex justify-center items-center py-20">
                  <div className="flex flex-col items-center">
                    <FaSpinner className="animate-spin text-3xl text-[#8A2BE2] mb-2" />
                    <p className="text-gray-400">Loading trade history...</p>
                  </div>
                </div>
              ) : swapTransactions.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">No trades found with your current filters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {swapTransactions.map(tx => {
                    const { sentAssets, receivedAssets, valueQuote } = getTransactionDisplayInfo(tx, activeWalletToDisplay);
                    const date = new Date(tx.block_signed_at);
                    const explorerUrl = tx.chain_id === SUPPORTED_CHAINS.BSC 
                      ? `https://bscscan.com/tx/${tx.tx_hash}` 
                      : `https://etherscan.io/tx/${tx.tx_hash}`;
                      
                    return (
                      <Card 
                        key={tx.tx_hash} 
                        className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors"
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between mb-2">
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                              {getChainNameFromId(tx.chain_id)}
                            </Badge>
                            <span className="text-sm text-gray-400">
                              {format(date, 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 my-4">
                            {/* Sent tokens */}
                            <div className="flex-1">
                              {sentAssets.length > 0 ? (
                                sentAssets.map((asset, i) => (
                                  <div key={i} className="text-red-400 font-medium">
                                    - {asset}
                                  </div>
                                ))
                              ) : (
                                <div className="text-gray-500 italic">Unknown input</div>
                              )}
                            </div>
                            
                            {/* Arrow */}
                            <div className="flex-shrink-0">
                              <FaExchangeAlt className="text-blue-400" />
                            </div>
                            
                            {/* Received tokens */}
                            <div className="flex-1">
                              {receivedAssets.length > 0 ? (
                                receivedAssets.map((asset, i) => (
                                  <div key={i} className="text-green-400 font-medium">
                                    + {asset}
                                  </div>
                                ))
                              ) : (
                                <div className="text-gray-500 italic">Unknown output</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <div className="text-sm text-gray-400">
                              Value: {valueQuote ? `$${parseFloat(valueQuote).toFixed(2)}` : 'N/A'}
                            </div>
                            <a 
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#8A2BE2] hover:text-purple-400 flex items-center"
                            >
                              <span className="mr-1">View transaction</span>
                              <FaExternalLinkAlt size={10} />
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              
              {/* Load more button (if filtering shows trades) */}
              {canLoadMore && !loading.transactions && swapTransactions.length > 0 && (
                <div className="flex justify-center mt-6">
                  <Button 
                    onClick={loadMoreTransactions} 
                    disabled={loading.transactions}
                    className="bg-[#8A2BE2] hover:bg-purple-700 text-white"
                  >
                    {loading.transactions ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};