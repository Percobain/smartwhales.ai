import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getTransactionHistory, SUPPORTED_CHAINS, getChainNameFromId, getNativeTokenSymbolForChain } from '../../services/api';
import { FaSpinner, FaArrowDown, FaArrowUp, FaExchangeAlt, FaCheckCircle, FaExternalLinkAlt } from 'react-icons/fa';
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Pagination from './Pagination';

const TransactionsPanel = ({ 
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
  const [txPagination, setTxPagination] = useState({});
  
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
    const newTxPagination = {};

    for (const chainId of chainsToFetch) {
      newTxPagination[chainId] = { currentPage: 0, hasMore: true };
      try {
        const txData = await getTransactionHistory(chainId, walletAddr, { pageNumber: 0, pageSize: 50 });
        initialTransactions.push(...txData.transactions);
        newTxPagination[chainId].hasMore = txData.pagination?.has_more ?? false;
      } catch (e) {
        console.error(`Transactions Error (Chain ${chainId}):`, e);
        setError(`Failed to load transactions for ${getChainNameFromId(chainId)}. ${e.message}`);
        
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
    setTxPagination(newTxPagination);
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
        const { type } = getTransactionDisplayInfo(tx, walletAddress);
        if (txTypeFilter === 'send' && type.toLowerCase() !== 'send') return false;
        if (txTypeFilter === 'receive' && type.toLowerCase() !== 'receive') return false;
        if (txTypeFilter === 'trade' && type.toLowerCase() !== 'trade' && type.toLowerCase() !== 'swap') return false;
      }
      
      return true;
    });
  }, [transactions, timeFilter, txTypeFilter, walletAddress, getTransactionDisplayInfo]);

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

  // Paginate transactions
  const paginatedGroupedTransactions = useMemo(() => {
    // Calculate total number of transactions to show based on current page and items per page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    let count = 0;
    const result = [];
    
    for (const group of groupedTransactions) {
      const transactionsInCurrentPage = [];
      
      for (const tx of group.transactions) {
        if (count >= startIndex && count < endIndex) {
          transactionsInCurrentPage.push(tx);
        }
        count++;
        
        if (count >= endIndex) break;
      }
      
      if (transactionsInCurrentPage.length > 0) {
        result.push({
          date: group.date,
          transactions: transactionsInCurrentPage
        });
      }
      
      if (count >= endIndex) break;
    }
    
    return result;
  }, [groupedTransactions, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    const totalTransactions = filteredTransactions.length;
    return Math.ceil(totalTransactions / itemsPerPage);
  }, [filteredTransactions, itemsPerPage]);

  return (
    <>
      {error && (
        <Alert variant="destructive" className="bg-red-900/30 border-red-800 text-red-300 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading transactions</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl">Transaction History</CardTitle>
          <CardDescription>
            Latest activity on your wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <FaSpinner className="animate-spin text-3xl text-[#8A2BE2] mb-2" />
                <p className="text-gray-400">Loading transaction history...</p>
              </div>
            </div>
          )}
          
          {/* No transactions */}
          {!loading && filteredTransactions.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500">No transactions matching your filters.</p>
            </div>
          )}
          
          {/* Transactions grouped by date */}
          {!loading && paginatedGroupedTransactions.map(group => (
            <div key={group.date} className="mb-8 last:mb-0">
              <div className="sticky top-0 bg-gray-900 py-2 z-10">
                <h3 className="text-sm font-medium text-white bg-gray-800 inline-block px-3 py-1 rounded-full">
                  {group.date}
                </h3>
              </div>
              <div className="space-y-4 mt-4">
                {group.transactions.map(tx => {
                  const { type, icon, details, valueQuote } = getTransactionDisplayInfo(tx, walletAddress);
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
                      className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors transform hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/10"
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
                              className="text-xs text-[#8A2BE2] hover:text-purple-400 flex items-center justify-end mt-1 cursor-pointer"
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

export default TransactionsPanel;