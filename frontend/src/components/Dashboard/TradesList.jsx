import React, { useState, useEffect, useMemo } from 'react';
import { getTransactionHistory, getChainLogo, SUPPORTED_CHAINS, getChainNameFromId, getChainExplorer } from '../../services/api';
import { format } from "date-fns";
import { FaSpinner, FaArrowRight, FaCircleInfo } from 'react-icons/fa6';
import { FaExternalLinkAlt, FaExchangeAlt } from 'react-icons/fa'; // Changed from fa6 to fa
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Pagination from './Pagination';



// Enhanced helper function for token logos with chain logo fallback
const getTokenLogo = (token, chainId) => {
  // Attempt to use the logo from the API
  if (token.logo || token.logo_url) {
    return token.logo || token.logo_url;
  }
  
  // If no logo, try to get well-known token logos for common tokens
  const symbol = (token.symbol || token.contract_ticker_symbol || '').toLowerCase();
  
  if (symbol === 'eth' || symbol === 'weth') return '/ETH.svg';
  if (symbol === 'bnb' || symbol === 'wbnb') return '/BNB.svg';
  if (symbol === 'matic' || symbol === 'wmatic') return '/MATIC.svg';
  if (symbol === 'op') return '/OP.svg';
  if (symbol === 'arb') return '/ARB.svg';
  
  // If still no match, use the chain logo
  return getChainLogo(chainId);
};

const TradesList = ({ 
  walletAddress, 
  selectedChains, 
  timeFilter,
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

  // Filter only trade transactions
  const tradeTransactions = useMemo(() => {
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
      
      // Only include trades (swaps)
      const isSwap = tx.log_events?.some(log => 
        log.decoded?.name?.toLowerCase().includes('swap') || 
        (log.raw_log_topics?.some(topic => topic?.toLowerCase().includes('swap')))
      );
      
      // Also include transactions with multiple token transfers (likely a swap)
      const tokenTransfers = tx.log_events?.filter(log => log.decoded?.name === 'Transfer') || [];
      const uniqueTokens = new Set(tokenTransfers.map(t => t.sender_address));
      const hasMultipleTokens = uniqueTokens.size > 1;
      
      const wallet = walletAddress?.toLowerCase();
      let sentAssets = false;
      let receivedAssets = false;
      
      // Check if wallet sent and received tokens in the same tx (swap)
      for (const log of tokenTransfers) {
        if (log.decoded.params.find(p => p.name === 'from')?.value?.toLowerCase() === wallet) {
          sentAssets = true;
        }
        if (log.decoded.params.find(p => p.name === 'to')?.value?.toLowerCase() === wallet) {
          receivedAssets = true;
        }
      }
      
      return isSwap || (hasMultipleTokens && sentAssets && receivedAssets);
    });
  }, [transactions, timeFilter, walletAddress]);
  
  // Group trades by date
  const groupedByDate = useMemo(() => {
    const groups = {};
    
    tradeTransactions.forEach(tx => {
      const date = format(new Date(tx.block_signed_at), 'MMMM d, yyyy');
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    });
    
    return Object.entries(groups)
      .map(([date, txs]) => ({ date, transactions: txs }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [tradeTransactions]);
  
  // Paginate trades
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
  
  const totalPages = Math.ceil(tradeTransactions.length / itemsPerPage);

  // Extract trade information
  const getTradeInfo = (tx) => {
    const wallet = walletAddress?.toLowerCase();
    const transfers = tx.log_events?.filter(log => log.decoded?.name === 'Transfer') || [];
    const chainId = tx.chain_id; // Store chainId for fallback logo
    
    // Tokens sent by user
    const sentTokens = transfers.filter(t => {
      const from = t.decoded.params.find(p => p.name === 'from')?.value?.toLowerCase();
      return from === wallet;
    }).map(t => ({
      symbol: t.sender_contract_ticker_symbol || 'Unknown',
      logo: t.sender_logo_url,
      amount: parseFloat(t.decoded.params.find(p => p.name === 'value')?.value || '0') / 10 ** t.sender_contract_decimals,
      value: parseFloat(t.decoded.params.find(p => p.name === 'value')?.quote_value || '0'),
      decimals: t.sender_contract_decimals,
      chainId: chainId // Add chainId for fallback logo
    }));
    
    // Tokens received by user
    const receivedTokens = transfers.filter(t => {
      const to = t.decoded.params.find(p => p.name === 'to')?.value?.toLowerCase();
      return to === wallet;
    }).map(t => ({
      symbol: t.sender_contract_ticker_symbol || 'Unknown',
      logo: t.sender_logo_url,
      amount: parseFloat(t.decoded.params.find(p => p.name === 'value')?.value || '0') / 10 ** t.sender_contract_decimals,
      value: parseFloat(t.decoded.params.find(p => p.name === 'value')?.quote_value || '0'),
      decimals: t.sender_contract_decimals,
      chainId: chainId // Add chainId for fallback logo
    }));
    
    return { 
      sentTokens, 
      receivedTokens,
      valueQuote: tx.value_quote,
      chainId // Add chainId for fallback logo
    };
  };

  // Loading state with improved styling
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-24 px-4">
        <div className="relative">
          <div className="absolute inset-0 bg-purple-900/30 blur-xl rounded-full"></div>
          <FaSpinner className="animate-spin text-5xl text-white relative z-10" />
        </div>
        <p className="mt-4 text-white/70 text-lg">Loading your trades...</p>
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
  if (tradeTransactions.length === 0) {
    return (
      <div className="py-16 px-4 text-center">
        <div className="inline-block bg-zinc-900 border border-gray-800 rounded-lg p-8 max-w-xl">
          <p className="text-white text-lg font-medium">No trades found</p>
          <p className="text-gray-400 mt-2">We couldn't find any trades or swaps for this wallet.</p>
        </div>
      </div>
    );
  }

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
                const { sentTokens, receivedTokens, chainId } = getTradeInfo(tx);
                const date = new Date(tx.block_signed_at);
                // Use the proper explorer for the current chain
                const explorerUrl = `${getChainExplorer(tx.chain_id)}/tx/${tx.tx_hash}`;

                return (
                  <div 
                    key={tx.tx_hash} 
                    className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/80 transition-all backdrop-blur-sm shadow-lg"
                  >
                    {/* Header with chain and time */}
                    <div className="flex justify-between items-center mb-4">
                      <Badge variant="outline" className="bg-indigo-900/20 text-indigo-300 border-indigo-700/30">
                        <FaExchangeAlt className="mr-1" /> Swap
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="text-xs px-2 py-1 bg-zinc-800/80 border-zinc-700 text-gray-300"
                        >
                          {getChainNameFromId(tx.chain_id)}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {format(date, 'h:mm a')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Trade visualization with improved aesthetics */}
                    <div className="relative bg-black/30 rounded-lg p-4 border border-zinc-800/80 backdrop-blur-sm">
                      {/* Purple glow effect */}
                      <div className="absolute inset-0 bg-[#8A2BE2]/5 rounded-lg"></div>
                      
                      <div className="relative z-10 flex items-center justify-between">
                        {/* Sent tokens with chain logo fallback */}
                        <div className="flex-1">
                          {sentTokens.length > 0 ? (
                            <div>
                              {sentTokens.map((token, i) => (
                                <div key={i} className="mb-2 last:mb-0 flex items-center">
                                  <Avatar className="w-10 h-10 mr-3 bg-zinc-800 border border-zinc-700">
                                    {getTokenLogo(token, token.chainId) ? (
                                      <img src={getTokenLogo(token, token.chainId)} alt={token.symbol} className="rounded-full" />
                                    ) : (
                                      <div className="flex items-center justify-center w-full h-full text-xs font-bold">
                                        {token.symbol?.slice(0, 3)}
                                      </div>
                                    )}
                                  </Avatar>
                                  <div>
                                    <div className="text-rose-400 font-medium">
                                      -{token.amount.toFixed(6)} {token.symbol}
                                    </div>
                                    {token.value > 0 && (
                                      <div className="text-gray-400 text-sm">
                                        ${token.value.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-500 italic flex items-center">
                              <Avatar className="w-10 h-10 mr-3 bg-zinc-800/50 border border-zinc-700/50">
                                {getChainLogo(chainId) ? (
                                  <img src={getChainLogo(chainId)} alt={getChainNameFromId(chainId)} className="rounded-full opacity-50" />
                                ) : (
                                  <div className="text-gray-500 text-xs">?</div>
                                )}
                              </Avatar>
                              <div>ETH</div>
                            </div>
                          )}
                        </div>
                        
                        {/* Arrow with gradient */}
                        <div className="flex-shrink-0 mx-4">
                          <div className="relative px-3 py-1">
                            <div className="absolute inset-0 bg-indigo-900/20 rounded-full blur-sm"></div>
                            <FaArrowRight className="text-[#8A2BE2] text-xl relative z-10" />
                          </div>
                        </div>
                        
                        {/* Received tokens with chain logo fallback */}
                        <div className="flex-1 text-right">
                          {receivedTokens.length > 0 ? (
                            <div>
                              {receivedTokens.map((token, i) => (
                                <div key={i} className="mb-2 last:mb-0 flex items-center justify-end">
                                  <div className="text-right mr-3">
                                    <div className="text-emerald-400 font-medium">
                                      +{token.amount.toFixed(6)} {token.symbol}
                                    </div>
                                    {token.value > 0 && (
                                      <div className="text-gray-400 text-sm">
                                        ${token.value.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                  <Avatar className="w-10 h-10 bg-zinc-800 border border-zinc-700">
                                    {getTokenLogo(token, token.chainId) ? (
                                      <img src={getTokenLogo(token, token.chainId)} alt={token.symbol} className="rounded-full" />
                                    ) : (
                                      <div className="flex items-center justify-center w-full h-full text-xs font-bold">
                                        {token.symbol?.slice(0, 3)}
                                      </div>
                                    )}
                                  </Avatar>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-500 italic flex items-center justify-end">
                              <div>Unknown</div>
                              <Avatar className="w-10 h-10 ml-3 bg-zinc-800/50 border border-zinc-700/50">
                                {getChainLogo(chainId) ? (
                                  <img src={getChainLogo(chainId)} alt={getChainNameFromId(chainId)} className="rounded-full opacity-50" />
                                ) : (
                                  <div className="text-gray-500 text-xs">?</div>
                                )}
                              </Avatar>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer with additional info */}
                    <div className="flex justify-between items-center mt-4 pt-2 border-t border-zinc-800/50">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center text-gray-400 hover:text-gray-300">
                            <FaCircleInfo className="mr-1 text-xs" />
                            <span className="text-sm">Transaction Details</span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-black border border-gray-800">
                            <div className="text-xs p-2">
                              <p className="mb-1">Chain: {getChainNameFromId(tx.chain_id)}</p>
                              <p className="truncate max-w-60 mb-1">Tx: {tx.tx_hash}</p>
                              <p>Time: {format(date, 'MMM d, yyyy h:mm:ss a')}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <a 
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center text-[#8A2BE2] hover:text-purple-400 transition-colors"
                      >
                        <span className="mr-1">View transaction</span>
                        <FaExternalLinkAlt size={10} />
                      </a>
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

export default TradesList;