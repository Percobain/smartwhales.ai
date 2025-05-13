import React, { useState, useEffect, useMemo } from 'react';
import { getTransactionHistory, getChainLogo, getChainExplorer, SUPPORTED_CHAINS, getChainNameFromId, getNativeTokenSymbolForChain } from '../../services/api';
import { format } from "date-fns";
import { FaSpinner, FaArrowDown, FaArrowUp, FaCircleInfo } from 'react-icons/fa6';
import { FaExternalLinkAlt } from 'react-icons/fa'; // Changed from fa6 to fa
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import Pagination from './Pagination';
import { cn } from "@/lib/utils";

const TransactionsList = ({ 
  walletAddress, 
  selectedChains, 
  timeFilter, 
  txTypeFilter,
  currentPage,
  itemsPerPage,
  handlePageChange,
  setErrorApp 
}) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch transaction data
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!walletAddress || selectedChains.length === 0) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const allTxs = [];
        
        for (const chainId of selectedChains) {
          try {
            const result = await getTransactionHistory(chainId, walletAddress, { pageSize: 100 });
            allTxs.push(...result.transactions);
          } catch (err) {
            console.error(`Error fetching transactions for ${getChainNameFromId(chainId)}:`, err);
          }
        }
        
        setTransactions(allTxs.sort((a, b) => 
          new Date(b.block_signed_at) - new Date(a.block_signed_at)
        ));
      } catch (err) {
        setError("Failed to load transactions");
        if (setErrorApp) setErrorApp("Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [walletAddress, selectedChains, setErrorApp]);

  // Apply filters to transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Time filter
      if (timeFilter !== 'all') {
        const txDate = new Date(tx.block_signed_at);
        const now = new Date();
        let cutoff = now;
        
        if (timeFilter === '24h') cutoff.setDate(now.getDate() - 1);
        else if (timeFilter === '7d') cutoff.setDate(now.getDate() - 7);
        else if (timeFilter === '30d') cutoff.setDate(now.getDate() - 30);
        
        if (txDate < cutoff) return false;
      }

      // Type filter
      if (txTypeFilter !== 'all') {
        const from = tx.from_address?.toLowerCase();
        const to = tx.to_address?.toLowerCase();
        const wallet = walletAddress?.toLowerCase();
        
        if (txTypeFilter === 'send' && from !== wallet) return false;
        if (txTypeFilter === 'receive' && to !== wallet) return false;
        // Other filter logic as needed
      }
      
      return true;
    });
  }, [transactions, timeFilter, txTypeFilter, walletAddress]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups = {};
    
    filteredTransactions.forEach(tx => {
      const date = format(new Date(tx.block_signed_at), 'MMMM d, yyyy');
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    });
    
    return Object.entries(groups)
      .map(([date, txs]) => ({ date, transactions: txs }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredTransactions]);

  // Pagination logic
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    let count = 0;
    const result = [];
    
    for (const group of groupedByDate) {
      const txsInPage = [];
      
      for (const tx of group.transactions) {
        if (count >= startIndex && count < endIndex) {
          txsInPage.push(tx);
        }
        count++;
        if (count >= endIndex) break;
      }
      
      if (txsInPage.length > 0) {
        result.push({
          date: group.date,
          transactions: txsInPage
        });
      }
      
      if (count >= endIndex) break;
    }
    
    return result;
  }, [groupedByDate, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Add this helper function
  const isBitcoinChain = (chainId) => chainId === SUPPORTED_CHAINS.BITCOIN;

  // Function to get token symbol from tx - update this function to always provide chainId
  const getTokenInfo = (tx) => {
    // Special handling for Bitcoin transactions
    if (isBitcoinChain(tx.chain_id)) {
      return {
        symbol: 'BTC',
        logo: '/BTC.svg',
        amount: parseFloat(tx.value) / 1e8, // BTC uses 8 decimals
        address: null,
        chainId: tx.chain_id
      };
    }

    // Check if this is a token transfer
    const transferEvent = tx.log_events?.find(event => 
      event.decoded?.name === 'Transfer' && event.sender_contract_ticker_symbol
    );
    
    if (transferEvent) {
      return {
        symbol: transferEvent.sender_contract_ticker_symbol,
        logo: transferEvent.sender_logo_url || null,
        amount: parseFloat(transferEvent.decoded.params.find(p => p.name === 'value')?.value || '0') / 10 ** transferEvent.sender_contract_decimals,
        address: transferEvent.sender_address,
        chainId: tx.chain_id // Always include chainId for fallback logo
      };
    }
    
    // For native token transfers
    if (BigInt(tx.value || '0') > 0n) {
      const symbol = getNativeTokenSymbolForChain(tx.chain_id);
      return {
        symbol,
        logo: null, // Set to null to trigger fallback 
        amount: parseFloat(tx.value) / 10 ** 18,
        address: null,
        chainId: tx.chain_id // Always include chainId for fallback logo
      };
    }
    
    // Even for unknown transactions, return an object with chainId
    return {
      symbol: 'Unknown',
      logo: null,
      amount: 0,
      address: null,
      chainId: tx.chain_id // Always include chainId for fallback logo
    };
  };
  
  // Determine if tx is a receive or send
  const getTxDirection = (tx) => {
    const wallet = walletAddress?.toLowerCase();
    
    // Special handling for Bitcoin transactions
    if (isBitcoinChain(tx.chain_id)) {
      const from = tx.from_address?.toLowerCase();
      const to = tx.to_address?.toLowerCase();
      
      if (from === wallet) return 'send';
      if (to === wallet) return 'receive';
      return 'interaction';
    }

    const from = tx.from_address?.toLowerCase();
    const to = tx.to_address?.toLowerCase();
    
    if (from === wallet && to !== wallet) return 'send';
    if (to === wallet && from !== wallet) return 'receive';
    
    // Check token transfers
    const transfers = tx.log_events?.filter(event => event.decoded?.name === 'Transfer') || [];
    for (const transfer of transfers) {
      const fromAddr = transfer.decoded.params.find(p => p.name === 'from')?.value.toLowerCase();
      const toAddr = transfer.decoded.params.find(p => p.name === 'to')?.value.toLowerCase();
      
      if (fromAddr === wallet && toAddr !== wallet) return 'send';
      if (toAddr === wallet && fromAddr !== wallet) return 'receive';
    }
    
    return 'interaction';
  };

  // Loading state with improved styling
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-24 px-4">
        <div className="relative">
          <div className="absolute inset-0 bg-purple-900/30 blur-xl rounded-full"></div>
          <FaSpinner className="animate-spin text-5xl text-white relative z-10" />
        </div>
        <p className="mt-4 text-white/70 text-lg">Loading your transactions...</p>
      </div>
    );
  }

  // Error state with Hero.jsx styling
  if (error) {
    return (
      <div className="py-12 px-4 text-center">
        <div className="inline-block bg-red-900/20 border border-red-700/30 rounded-lg p-6 max-w-xl">
          <p className="text-red-300 text-lg font-medium">{error}</p>
          <p className="text-gray-400 mt-2">Please try refreshing the page or check your connection.</p>
        </div>
      </div>
    );
  }

  // Empty state with Hero.jsx styling
  if (filteredTransactions.length === 0) {
    return (
      <div className="py-16 px-4 text-center">
        <div className="inline-block bg-zinc-900 border border-gray-800 rounded-lg p-8 max-w-xl">
          <p className="text-white text-lg font-medium">No transactions found</p>
          <p className="text-gray-400 mt-2">Try adjusting your filters or selecting different chains.</p>
        </div>
      </div>
    );
  }

  // Styled transaction list
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="h-[calc(100vh-300px)]">
        {paginatedGroups.map(group => (
          <div key={group.date} className="mb-8 last:mb-0">
            {/* Date header with purple accent */}
            <div className="flex items-center mb-4">
              <div className="w-2 h-2 bg-[#8A2BE2] rounded-full mr-2"></div>
              <h3 className="text-sm font-medium text-white">
                {group.date}
              </h3>
            </div>
            
            <div className="space-y-4">
              {group.transactions.map(tx => {
                const tokenInfo = getTokenInfo(tx);
                const direction = getTxDirection(tx);
                const time = format(new Date(tx.block_signed_at), 'hh:mm a');
                // Use getChainExplorer for proper chain explorer URL
                const explorerUrl = `${getChainExplorer(tx.chain_id)}/tx/${tx.tx_hash}`;
                
                // Set colors based on direction
                const directionColors = direction === 'receive' 
                  ? "bg-emerald-900/20 border-emerald-700/30 text-emerald-300" 
                  : "bg-rose-900/20 border-rose-700/30 text-rose-300";
                  
                const amountColor = direction === 'receive' ? "text-emerald-400" : "text-rose-400";
                const icon = direction === 'receive' ? 
                  <FaArrowDown className="text-emerald-400" /> :
                  <FaArrowUp className="text-rose-400" />;
                
                return (
                  <div 
                    key={tx.tx_hash} 
                    className="relative bg-zinc-900/70 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/80 transition-all backdrop-blur-sm shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      {/* Token Icon with improved styling and chain logo fallback */}
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className={cn("absolute inset-0 blur-sm rounded-full opacity-70", 
                            direction === 'receive' ? "bg-emerald-900/50" : "bg-rose-900/50"
                          )}></div>
                          <Avatar className="w-12 h-12 bg-zinc-800 border border-zinc-700 relative z-10 flex items-center justify-center">
                            {tokenInfo?.logo ? (
                              <img src={tokenInfo.logo} alt={tokenInfo.symbol}
                                   className="w-full h-full object-cover rounded-full" />
                            ) : getChainLogo(tokenInfo.chainId) ? (
                              <img src={getChainLogo(tokenInfo.chainId)} alt={getChainNameFromId(tokenInfo.chainId)}
                                   className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full text-lg font-bold uppercase">
                                {tokenInfo?.symbol?.slice(0, 3) || 'N/A'}
                              </div>
                            )}
                          </Avatar>
                        </div>
                      </div>
                      
                      {/* Transaction Details with better spacing and contrast */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {icon}
                            <span className="font-medium text-white ml-2">
                              {direction === 'receive' ? 'Received' : 'Sent'}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn("ml-3 text-xs", directionColors)}
                            >
                              {time}
                            </Badge>
                          </div>
                          
                          <Badge 
                            variant="outline" 
                            className="text-xs px-2 py-1 bg-zinc-800/80 border-zinc-700 text-gray-300"
                          >
                            {getChainNameFromId(tx.chain_id)}
                          </Badge>
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex items-center gap-1">
                            <span className={`text-lg font-medium ${amountColor}`}>
                              {direction === 'receive' ? '+' : '-'}{tokenInfo?.amount.toFixed(4) || '0'} {tokenInfo?.symbol || 'N/A'}
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <FaCircleInfo className="text-gray-500 text-xs ml-2" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-black border border-gray-800">
                                  <div className="text-xs p-2">
                                    <p className="mb-1">Chain: {getChainNameFromId(tx.chain_id)}</p>
                                    <p className="truncate max-w-60 mb-1">Tx: {tx.tx_hash}</p>
                                    <p>Value: ${Number(tx.value_quote || 0).toFixed(2)}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          
                          {tx.value_quote && (
                            <div className="text-sm text-gray-400 mt-1">
                              ${Number(tx.value_quote).toFixed(2)}
                            </div>
                          )}
                          
                          <a 
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs flex items-center mt-3 text-[#8A2BE2] hover:text-purple-400 transition-colors w-fit"
                          >
                            <span className="mr-1">View transaction</span>
                            <FaExternalLinkAlt size={10} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </ScrollArea>
      
      {/* Pagination outside scroll area */}
      {totalPages > 1 && (
        <div className="pt-6 mt-2 border-t border-gray-800">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default TransactionsList;