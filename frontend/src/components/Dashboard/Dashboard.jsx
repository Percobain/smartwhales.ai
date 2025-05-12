import React, { useState, useEffect, useCallback } from 'react';
import { SUPPORTED_CHAINS, checkAirdropEligibility } from '../../services/api';
import PortfolioOverview from './PortfolioOverview';
import PnLDisplay from './PnLDisplay'; // Import the new component
import TransactionsPanel from './TransactionsPanel';
import TradesPanel from './TradesPanel';
import FilterPanel from './FilterPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Dashboard = ({ 
  walletAddress, 
  connectedWalletAddress, 
  referralLink, 
  referredUsersCount, 
  currentConnectedChainId, 
  setErrorApp 
}) => {
  const [selectedChains, setSelectedChains] = useState([SUPPORTED_CHAINS.ETHEREUM, SUPPORTED_CHAINS.BSC]);
  const [timeFilter, setTimeFilter] = useState('all'); // '24h', '7d', '30d', 'all'
  const [txTypeFilter, setTxTypeFilter] = useState('all'); // 'all', 'send', 'receive', 'trade'
  const [activeTab, setActiveTab] = useState('transactions');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isAirdropEligible, setIsAirdropEligible] = useState(false);
  const [eligibilityReasons, setEligibilityReasons] = useState([]);

  // Check airdrop eligibility
  useEffect(() => {
    const checkEligibility = async () => {
      if (walletAddress) {
        try {
          const { eligible, reasons } = await checkAirdropEligibility(walletAddress);
          setIsAirdropEligible(eligible);
          setEligibilityReasons(reasons);
        } catch (error) {
          console.error("Error checking airdrop eligibility:", error);
        }
      }
    };
    
    checkEligibility();
  }, [walletAddress]);

  // Toggle chain filter
  const toggleChainFilter = (chainId) => {
    setSelectedChains(prev =>
      prev.includes(chainId) ? prev.filter(c => c !== chainId) : [...prev, chainId]
    );
    // Reset to first page when changing filters
    setCurrentPage(1);
  };

  // Update filters
  const updateTimeFilter = (value) => {
    setTimeFilter(value);
    setCurrentPage(1);
  };

  const updateTxTypeFilter = (value) => {
    setTxTypeFilter(value);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <PortfolioOverview
        walletAddress={walletAddress}
        selectedChains={selectedChains}
        referralLink={referralLink}
        referredUsersCount={referredUsersCount}
        isAirdropEligible={isAirdropEligible}
        eligibilityReasons={eligibilityReasons}
        setErrorApp={setErrorApp}
      />
      
      {/* Add PnL Display Component */}
      <PnLDisplay 
        walletAddress={walletAddress}
        selectedChains={selectedChains}
        setErrorApp={setErrorApp}
      />
      
      <FilterPanel
        selectedChains={selectedChains}
        timeFilter={timeFilter}
        txTypeFilter={txTypeFilter}
        toggleChainFilter={toggleChainFilter}
        updateTimeFilter={updateTimeFilter}
        updateTxTypeFilter={updateTxTypeFilter}
        itemsPerPage={itemsPerPage}
        handleItemsPerPageChange={handleItemsPerPageChange}
      />
      
      <Tabs defaultValue="transactions" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger 
            value="transactions" 
            className="data-[state=active]:bg-[#8A2BE2] cursor-pointer"
          >
            Transactions
          </TabsTrigger>
          <TabsTrigger 
            value="trades" 
            className="data-[state=active]:bg-[#8A2BE2] cursor-pointer"
          >
            Trades
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions" className="mt-0">
          <TransactionsPanel
            walletAddress={walletAddress}
            selectedChains={selectedChains}
            timeFilter={timeFilter}
            txTypeFilter={txTypeFilter}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            handlePageChange={handlePageChange}
            setErrorApp={setErrorApp}
          />
        </TabsContent>
        
        <TabsContent value="trades" className="mt-0">
          <TradesPanel
            walletAddress={walletAddress}
            selectedChains={selectedChains}
            timeFilter={timeFilter}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            handlePageChange={handlePageChange}
            setErrorApp={setErrorApp}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;