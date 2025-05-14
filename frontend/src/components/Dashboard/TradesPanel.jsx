import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getTransactionHistory, SUPPORTED_CHAINS, getChainNameFromId, getNativeTokenSymbolForChain } from '../../services/api';
import { FaSpinner, FaExchangeAlt, FaExternalLinkAlt } from 'react-icons/fa';
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Pagination from './Pagination';

const TradesPanel = ({ 
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
  
  // Reset local errors
  const resetLocalErrors = () => {
    setError(null);
    if (setErrorApp) setErrorApp('');
  };
  
  // Fetch transaction data
  const fetchTransactionData = useCallback(async (walletAddr, chainsToFetch) => {
    if (!walletAddr) return;
    resetLocalErrors();
    setLoading(true);
    
    const initialTransactions = [];

    for (const chainId of chainsToFetch) {
      try {
        const txData = await getTransactionHistory(chainId, walletAddr, { pageNumber: 0, pageSize: 50 });
        initialTransactions.push(...txData.transactions);
      } catch (e) {
        console.error(`Trades Error (Chain ${chainId}):`, e);
        setError(`Failed to load trades for ${getChainNameFromId(chainId)}. ${e.message}`);
        
        toast.error(`Failed to load ${getChainNameFromId(chainId)} trades`, {
          description: (
            <span style={{ color: "black" }}>
              We couldn't fetch the trading history. Please try again later.
            </span>
          )
        });
      }
    }
    
    setTransactions(initialTransactions.sort((a, b) => 
      new Date(b.block_signed_at).getTime() - new Date(a.block_signed_at).getTime()
    ));
    setLoading(false);
  }, [setErrorApp]);

  // Fetch data on wallet or chain changes
  useEffect(() => {
    if (walletAddress && selectedChains.length > 0) {
      fetchTransactionData(walletAddress, selectedChains);
    } else if (!walletAddress) {
      setTransactions([]);
    }
  }, [walletAddress, selectedChains.join(','), fetchTransactionData]);

  // Extract trade information for display
  const getTradeDisplayInfo = useCallback((tx, currentWalletAddr) => {
    const wallet = currentWalletAddr?.toLowerCase();
    const sentAssets = [];
    const receivedAssets = [];

    const relevantTransfers = tx.log_events?.filter(log => log.decoded?.name === 'Transfer' && log.sender_contract_ticker_symbol) || [];
    
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

    return { 
      sentAssets, 
      receivedAssets, 
      valueQuote: tx.value_quote 
    };
  }, []);

  // Filter for swap/trade transactions only
  const filteredTrades = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.block_signed_at);
      const now = new Date();
      
      // First check if it's a swap/trade
      const isSwap = tx.log_events?.some(log => log.decoded?.name?.toLowerCase().includes('swap'));
      const isTrade = (() => {
        const wallet = walletAddress?.toLowerCase();
        const relevantTransfers = tx.log_events?.filter(log => log.decoded?.name === 'Transfer' && log.sender_contract_ticker_symbol) || [];
        
        let sentAssets = false;
        let receivedAssets = false;
        
        for (const log of relevantTransfers) {
          if (log.decoded.params.find(p => p.name === 'from')?.value?.toLowerCase() === wallet) {
            sentAssets = true;
          }
          if (log.decoded.params.find(p => p.name === 'to')?.value?.toLowerCase() === wallet) {
            receivedAssets = true;
          }
        }
        
        return sentAssets && receivedAssets;
      })();
      
      if (!isSwap && !isTrade) return false;
      
      // Then apply time filter
      if (timeFilter !== 'all') {
        let hours = 0;
        if (timeFilter === '24h') hours = 24;
        else if (timeFilter === '7d') hours = 24 * 7;
        else if (timeFilter === '30d') hours = 24 * 30;
        if (now.getTime() - txDate.getTime() > hours * 60 * 60 * 1000) return false;
      }
      
      return true;
    });
  }, [transactions, timeFilter, walletAddress]);

  // Paginate trades
  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTrades.slice(startIndex, endIndex);
  }, [filteredTrades, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredTrades.length / itemsPerPage);
  }, [filteredTrades, itemsPerPage]);

  return (
    <>
      {error && (
        <Alert variant="destructive" className="bg-red-900/30 border-red-800 text-red-300 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading trades</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl">Trades</CardTitle>
          <CardDescription>
            Swaps between different tokens and coins
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <FaSpinner className="animate-spin text-3xl text-[#8A2BE2] mb-2" />
                <p className="text-gray-400">Loading trade history...</p>
              </div>
            </div>
          ) : paginatedTrades.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No trades found with your current filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedTrades.map(tx => {
                const { sentAssets, receivedAssets, valueQuote } = getTradeDisplayInfo(tx, walletAddress);
                const date = new Date(tx.block_signed_at);
                const explorerUrl = tx.chain_id === SUPPORTED_CHAINS.BSC 
                  ? `https://bscscan.com/tx/${tx.tx_hash}` 
                  : `https://etherscan.io/tx/${tx.tx_hash}`;
                  
                return (
                  <Card 
                    key={tx.tx_hash} 
                    className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors transform hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/10"
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
                            <div className="text-gray-500 italic">Unknown</div>
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
                            <div className="text-gray-500 italic">Unknown</div>
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
                          className="text-xs text-[#8A2BE2] hover:text-purple-400 flex items-center cursor-pointer"
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
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              className="mt-6"
            />
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default TradesPanel;