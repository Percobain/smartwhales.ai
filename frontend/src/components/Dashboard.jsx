import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getTokenBalances, getTransactionHistory, SUPPORTED_CHAINS, getChainNameFromId, getNativeTokenSymbolForChain } from '../services/api';
import { FaCopy, FaCheckCircle, FaExternalLinkAlt, FaArrowDown, FaArrowUp, FaExchangeAlt, FaWallet, FaSpinner, FaExclamationCircle } from 'react-icons/fa';

const StatCard = ({ title, value, subValue, icon, valueColor = "text-white" }) => (
    <div className="bg-gray-800 p-4 sm:p-5 rounded-lg shadow-md flex items-start">
        {icon && <div className="mr-3 text-xl text-[#8A2BE2] mt-1">{icon}</div>}
        <div>
            <h3 className="text-gray-400 text-xs sm:text-sm mb-1 uppercase tracking-wider">{title}</h3>
            <p className={`text-xl sm:text-2xl font-semibold ${valueColor}`}>{value}</p>
            {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
        </div>
    </div>
);

const FilterButton = ({ label, onClick, isActive, className = '' }) => (
    <button
        onClick={onClick}
        className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded text-xs sm:text-sm font-medium transition-colors whitespace-nowrap
            ${isActive ? 'bg-[#8A2BE2] text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'} ${className}`}
    >
        {label}
    </button>
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
    
    const [txPagination, setTxPagination] = useState({}); // { [chainId]: { currentPage: 0, hasMore: true } }

    const activeWalletToDisplay = walletAddress;

    const resetLocalErrors = () => {
        setError({ balances: null, transactions: null });
        if (setErrorApp) setErrorApp(''); // Clear app-level error too
    };
    
    const fetchDashboardData = useCallback(async (walletAddr, chainsToFetch) => {
        if (!walletAddr) return;
        resetLocalErrors();
        setLoading(prev => ({ ...prev, balances: true, transactions: true }));
        
        let cumulativeTotalValue = 0;
        const allBalances = [];
        const initialTransactions = [];
        const newTxPagination = {};

        for (const chainId of chainsToFetch) {
            newTxPagination[chainId] = { currentPage: 0, hasMore: true }; // Reset pagination for each chain
            try {
                const balanceItems = await getTokenBalances(chainId, walletAddr);
                balanceItems.forEach(bal => {
                    cumulativeTotalValue += bal.quote || 0;
                    allBalances.push(bal);
                });
            } catch (e) {
                console.error(`Balances Error (Chain ${chainId}):`, e);
                setError(prev => ({ ...prev, balances: `Failed to load balances for ${getChainNameFromId(chainId)}. ${e.message}` }));
            }
            try {
                const txData = await getTransactionHistory(chainId, walletAddr, { pageNumber: 0, pageSize: 10 });
                initialTransactions.push(...txData.transactions);
                newTxPagination[chainId].hasMore = txData.pagination?.has_more ?? false;
            } catch (e) {
                console.error(`Transactions Error (Chain ${chainId}):`, e);
                setError(prev => ({ ...prev, transactions: `Failed to load transactions for ${getChainNameFromId(chainId)}. ${e.message}` }));
            }
        }
        setPortfolioData({ totalValue: cumulativeTotalValue, balances: allBalances.sort((a, b) => (b.quote || 0) - (a.quote || 0)) });
        setTransactions(initialTransactions.sort((a, b) => new Date(b.block_signed_at).getTime() - new Date(a.block_signed_at).getTime()));
        setTxPagination(newTxPagination);
        setLoading({ balances: false, transactions: false });

    }, [setErrorApp]);

    useEffect(() => {
        if (activeWalletToDisplay && selectedChains.length > 0) {
            fetchDashboardData(activeWalletToDisplay, selectedChains);
        } else if (!activeWalletToDisplay) {
            setPortfolioData({ totalValue: 0, balances: [] });
            setTransactions([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeWalletToDisplay, selectedChains.join(',')]); // Re-fetch if wallet or selected chains change

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
                    const txData = await getTransactionHistory(chainId, activeWalletToDisplay, { pageNumber: nextPage, pageSize: 10 });
                    newTransactions.push(...txData.transactions);
                    updatedTxPagination[chainId] = {
                        currentPage: nextPage,
                        hasMore: txData.pagination?.has_more ?? false,
                    };
                    if (txData.pagination?.has_more) anyChainHadMore = true;
                } catch (e) {
                    console.error(`Load More Txs Error (Chain ${chainId}):`, e);
                    setError(prev => ({ ...prev, transactions: `Failed to load more txs for ${getChainNameFromId(chainId)}. ${e.message}` }));
                    updatedTxPagination[chainId].hasMore = false; // Stop trying for this chain on error
                }
            }
        }
        setTransactions(prev => [...prev, ...newTransactions].sort((a, b) => new Date(b.block_signed_at).getTime() - new Date(a.block_signed_at).getTime()));
        setTxPagination(updatedTxPagination);
        setLoading(prev => ({ ...prev, transactions: false }));
        if (!anyChainHadMore && newTransactions.length === 0) {
            // If no chain reported having more and we fetched nothing, effectively no more overall
        }
    }, [activeWalletToDisplay, selectedChains, txPagination]);
    
    const canLoadMore = useMemo(() => Object.values(txPagination).some(p => p.hasMore), [txPagination]);

    const getTransactionDisplayInfo = useCallback((tx, currentWalletAddr) => {
        const from = tx.from_address?.toLowerCase();
        const to = tx.to_address?.toLowerCase();
        const wallet = currentWalletAddr?.toLowerCase();

        let type = 'Interaction';
        let icon = <FaExchangeAlt className="text-yellow-400" />;
        let details = `Value: ${tx.value_quote ? `$${parseFloat(tx.value_quote).toFixed(2)}` : 'N/A'}`;
        const nativeSymbol = getNativeTokenSymbolForChain(tx.chain_id);

        if (tx.value && BigInt(tx.value) > 0n && !tx.log_events?.some(log => log.decoded?.name === 'Transfer')) { // Native transfer
            const nativeValue = parseFloat(tx.value) / (10 ** (tx.gas_metadata?.contract_decimals || 18));
             details = `${nativeValue.toFixed(4)} ${nativeSymbol}`;
        }

        // Parse log events for ERC20/721 transfers to determine assets
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
            // Fallback details if specific assets not parsed well
            if (sentAssets.length > 0) details = `- ${sentAssets.join('/')} ...`;
            else if (receivedAssets.length > 0) details = `... for + ${receivedAssets.join('/')}`;
            else details = "Swap involving multiple assets";
        }
        // Approval, other contract interactions
        else if (tx.log_events?.some(log => log.decoded?.name === 'Approval')) {
            type = 'Approve'; icon = <FaCheckCircle className="text-purple-400" />;
            const approvedToken = tx.log_events.find(log => log.decoded?.name === 'Approval')?.sender_contract_ticker_symbol;
            details = `Approved ${approvedToken || 'token'}`;
        }

        return { type, icon, details, valueQuote: tx.value_quote };
    }, []);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const txDate = new Date(tx.block_signed_at);
            const now = new Date();
            if (timeFilter !== 'all') {
                let hours = 0;
                if (timeFilter === '24h') hours = 24;
                else if (timeFilter === '7d') hours = 24 * 7;
                else if (timeFilter === '30d') hours = 24 * 30;
                if (now.getTime() - txDate.getTime() > hours * 60 * 60 * 1000) return false;
            }

            if (txTypeFilter !== 'all') {
                const { type } = getTransactionDisplayInfo(tx, activeWalletToDisplay);
                if (txTypeFilter === 'send' && type.toLowerCase() !== 'send') return false;
                if (txTypeFilter === 'receive' && type.toLowerCase() !== 'receive') return false;
                if (txTypeFilter === 'trade' && type.toLowerCase() !== 'trade' && type.toLowerCase() !== 'swap') return false;
            }
            return true;
        });
    }, [transactions, timeFilter, txTypeFilter, activeWalletToDisplay, getTransactionDisplayInfo]);

    const handleCopyReferral = () => {
        if (!referralLink) return;
        navigator.clipboard.writeText(referralLink);
        setCopiedReferral(true);
        setTimeout(() => setCopiedReferral(false), 2000);
    };

    const toggleChainFilter = (chainId) => {
        setSelectedChains(prev =>
            prev.includes(chainId) ? prev.filter(c => c !== chainId) : [...prev, chainId]
        );
    };

    const renderError = (errMessage, context) => {
        if (!errMessage) return null;
        return (
            <div className="bg-red-800/30 text-red-300 p-3 rounded-md text-sm my-2 flex items-center">
                <FaExclamationCircle className="mr-2 text-red-400" />
                <span>Error loading {context}: {typeof errMessage === 'string' ? errMessage : 'An unknown error occurred.'}</span>
            </div>
        );
    };

    return (
        <div className="mt-6 sm:mt-8 space-y-6 sm:space-y-8">
            {/* Stats Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatCard title="Portfolio Value" value={loading.balances ? <FaSpinner className="animate-spin"/> : `$${portfolioData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<FaWallet />} />
                <StatCard title="Tracked Wallets" value="1" subValue="(Current View)" />
                <StatCard title="Airdrop Eligible" value="Yes!" subValue="(Simulated)" valueColor="text-green-400" />
                 <div className="bg-gray-800 p-4 sm:p-5 rounded-lg shadow-md md:col-span-2 lg:col-span-1">
                    <h3 className="text-gray-400 text-xs sm:text-sm mb-1 uppercase tracking-wider">Your Referral Link</h3>
                    {referralLink ? (
                        <div className="flex items-center mt-1">
                            <input type="text" readOnly value={referralLink} className="bg-gray-700 text-xs p-2 rounded-l-md w-full focus:outline-none truncate"/>
                            <button onClick={handleCopyReferral} title="Copy referral link" className="bg-[#8A2BE2] p-2.5 rounded-r-md hover:bg-purple-700 text-sm">
                                {copiedReferral ? <FaCheckCircle /> : <FaCopy />}
                            </button>
                        </div>
                    ) : <p className="text-gray-500 text-xs mt-1">Connect wallet to get link.</p>}
                    <p className="text-gray-400 text-xs mt-1.5">Referred Users: <span className="font-semibold text-white">{referredUsersCount}</span></p>
                </div>
            </section>
            {renderError(error.balances, 'portfolio balances')}

            {/* Wallet Overview & Balances (Simplified) */}
            <section className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-3 sm:mb-4">
                    <FaWallet className="text-2xl sm:text-3xl text-purple-400 mr-3 sm:mr-4" />
                    <div>
                        <h2 className="text-lg sm:text-xl font-semibold truncate" title={activeWalletToDisplay}>
                            {activeWalletToDisplay.substring(0, 8)}...{activeWalletToDisplay.substring(activeWalletToDisplay.length - 6)}
                        </h2>
                        <p className="text-xs text-gray-400">Currently viewing this address</p>
                    </div>
                </div>
                 {/* Optional: Display top balances here if needed, or in a separate tab/modal */}
            </section>

            {/* Filters Section */}
            <section className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                    <span className="text-xs font-medium text-gray-400 mr-2 mb-1 sm:mb-0">Chains:</span>
                    <div className="flex flex-wrap gap-1.5">
                        {Object.entries(SUPPORTED_CHAINS).map(([name, id]) => (
                            <FilterButton key={id} label={getChainNameFromId(id)} onClick={() => toggleChainFilter(id)} isActive={selectedChains.includes(id)} />
                        ))}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                    <span className="text-xs font-medium text-gray-400 mr-2 mb-1 sm:mb-0">Time:</span>
                    <div className="flex flex-wrap gap-1.5">
                        {[{p: 'all', l: 'All'}, {p: '24h', l: '24H'}, {p: '7d', l: '7D'}, {p: '30d', l: '30D'}].map(tf => (
                            <FilterButton key={tf.p} label={tf.l} onClick={() => setTimeFilter(tf.p)} isActive={timeFilter === tf.p} />
                        ))}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                    <span className="text-xs font-medium text-gray-400 mr-2 mb-1 sm:mb-0">Type:</span>
                    <div className="flex flex-wrap gap-1.5">
                         {[{t: 'all', l: 'All'}, {t: 'receive', l: 'Received'}, {t: 'send', l: 'Sent'}, {t: 'trade', l: 'Swaps/Trades'}].map(ttf => (
                            <FilterButton key={ttf.t} label={ttf.l} onClick={() => setTxTypeFilter(ttf.t)} isActive={txTypeFilter === ttf.t} />
                        ))}
                    </div>
                </div>
            </section>
            {renderError(error.transactions, 'transactions')}

            {/* Transactions List */}
            <section>
                <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Transaction History</h3>
                {(loading.transactions && transactions.length === 0) && <div className="text-center py-6"><FaSpinner className="animate-spin text-2xl mx-auto text-gray-500"/></div>}
                {(!loading.transactions && filteredTransactions.length === 0 && !error.transactions) && <p className="text-center py-6 text-gray-500">No transactions match your filters.</p>}
                
                {filteredTransactions.length > 0 && (
                    <ul className="space-y-2.5 sm:space-y-3">
                        {filteredTransactions.map(tx => {
                            const { type, icon, details, valueQuote } = getTransactionDisplayInfo(tx, activeWalletToDisplay);
                            const date = new Date(tx.block_signed_at);
                            const explorerUrl = tx.chain_id === SUPPORTED_CHAINS.BSC ? `https://bscscan.com/tx/${tx.tx_hash}` : `https://etherscan.io/tx/${tx.tx_hash}`;

                            return (
                                <li key={tx.tx_hash} className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow hover:bg-gray-700/70 transition-colors">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-1.5 sm:mb-2">
                                        <div className="flex items-center mb-1 sm:mb-0">
                                            <span className="mr-2 text-lg">{icon}</span>
                                            <span className={`font-semibold text-sm sm:text-base`}>{type} on {getChainNameFromId(tx.chain_id)}</span>
                                        </div>
                                        <span className="text-xs text-gray-400 self-end sm:self-center">{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-300 mb-1 truncate" title={details}>{details}</p>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400">Value: {valueQuote ? `$${parseFloat(valueQuote).toFixed(2)}` : 'N/A'}</span>
                                        <a href={explorerUrl} target="_blank" rel="noopener noreferrer" title="View on explorer"
                                           className="text-purple-400 hover:text-purple-300 hover:underline flex items-center">
                                            {tx.tx_hash.substring(0,6)}...{tx.tx_hash.substring(tx.tx_hash.length - 4)}
                                            <FaExternalLinkAlt className="ml-1.5 text-xs" />
                                        </a>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {canLoadMore && !loading.transactions && filteredTransactions.length > 0 && (
                    <div className="text-center mt-6">
                        <button onClick={loadMoreTransactions} className="bg-[#8A2BE2] hover:bg-purple-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors text-sm" disabled={loading.transactions}>
                            {loading.transactions ? <FaSpinner className="animate-spin inline mr-2"/> : null} Load More
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
};