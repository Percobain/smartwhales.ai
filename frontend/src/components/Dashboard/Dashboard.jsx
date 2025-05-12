import React, { useState, useEffect, useCallback } from 'react';
import { SUPPORTED_CHAINS, checkAirdropEligibility } from '../../services/api';
import PortfolioOverview from './PortfolioOverview';
import TransactionsList from './TransactionsList'; // We'll create this new component
import TradesList from './TradesList'; // We'll create this new component
import FilterPanel from './FilterPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export const Dashboard = ({ 
  walletAddress, 
  connectedWalletAddress, 
  referralLink, 
  referredUsersCount, 
  currentConnectedChainId, 
  setErrorApp 
}) => {
  const [selectedChains, setSelectedChains] = useState([SUPPORTED_CHAINS.ETHEREUM, SUPPORTED_CHAINS.BSC]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('transactions');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isAirdropEligible, setIsAirdropEligible] = useState(false);
  const [eligibilityReasons, setEligibilityReasons] = useState([]);

  // Existing code for airdrop eligibility check
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

  // Existing filter functions
  const toggleChainFilter = (chainId) => {
    setSelectedChains(prev =>
      prev.includes(chainId) ? prev.filter(c => c !== chainId) : [...prev, chainId]
    );
    setCurrentPage(1);
  };

  const updateTimeFilter = (value) => {
    setTimeFilter(value);
    setCurrentPage(1);
  };

  const updateTxTypeFilter = (value) => {
    setTxTypeFilter(value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto p-4 space-y-6 bg-black text-white">
      {/* Top Section with Portfolio Overview */}
      <div className="grid grid-cols-1 gap-6">
        <PortfolioOverview
          walletAddress={walletAddress}
          selectedChains={selectedChains}
          referralLink={referralLink}
          referredUsersCount={referredUsersCount}
          isAirdropEligible={isAirdropEligible}
          eligibilityReasons={eligibilityReasons}
          setErrorApp={setErrorApp}
        />
      </div>

      {/* Activity Section with Filters and Tabs */}
      <Card className="bg-black border border-gray-800">
        <CardContent className="p-6">
          {/* Filter Bar */}
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
          
          {/* Tabs for Transactions/Trades */}
          <Tabs defaultValue="transactions" value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            <TabsList className="grid grid-cols-2 mb-6 bg-zinc-900 p-1 rounded-full overflow-hidden">
              <TabsTrigger 
                value="transactions" 
                className="rounded-full px-6 py-3 text-sm font-medium transition-all"
              >
                <span className={activeTab === "transactions" ? "bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent" : "text-gray-400"}>
                  Receive or Send
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="trades" 
                className="rounded-full px-6 py-3 text-sm font-medium transition-all"
              >
                <span className={activeTab === "trades" ? "bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent" : "text-gray-400"}>
                  Traded
                </span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="transactions" className="mt-0">
              <TransactionsList
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
              <TradesList
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;