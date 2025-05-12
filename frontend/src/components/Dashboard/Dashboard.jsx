import React, { useState, useEffect, useCallback } from 'react';
import { SUPPORTED_CHAINS, checkAirdropEligibility } from '../../services/api';
import PortfolioOverview from './PortfolioOverview';
import TransactionsList from './TransactionsList'; // We'll create this new component
import TradesList from './TradesList'; // We'll create this new component
import FilterPanel from './FilterPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';

export const Dashboard = ({ 
  walletAddress, 
  connectedWalletAddress, 
  referralLink, 
  referredUsersCount, 
  trackedWalletsCount, // Add this prop
  currentConnectedChainId, 
  setErrorApp 
}) => {
  const [selectedChains, setSelectedChains] = useState([
    SUPPORTED_CHAINS.ETHEREUM
  ]);
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

  // Add this validation to toggleChainFilter
  const toggleChainFilter = useCallback((chainId) => {
    setSelectedChains(prev => {
      if (prev.includes(chainId)) {
        // Don't allow deselecting if it's the last chain
        if (prev.length === 1) return prev;
        return prev.filter(c => c !== chainId);
      }
      return [...prev, chainId];
    });
    setCurrentPage(1);
  }, []);

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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <PortfolioOverview
          walletAddress={walletAddress}
          connectedWalletAddress={connectedWalletAddress}
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

          <Tabs defaultValue="transactions" value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            <TabsList
            className="mb-6 bg-zinc-900 p-1 px-2 rounded-full overflow-hidden flex justify-between w-fit mx-auto"
          >

              <TabsTrigger
                value="transactions"
                className={cn(
                  "rounded-full px-6 py-3 text-sm font-medium transition-all",
                  activeTab === "transactions"
                    ? "bg-white"
                    : "bg-transparent"
                )}
              >
                <span className={cn(
                  "transition-colors",
                  activeTab === "transactions"
                    ? "bg-gradient-to-b from-black to-zinc-800 bg-clip-text text-transparent"
                    : "text-gray-400"
                )}>
                  Receive or Send
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="trades"
                className={cn(
                  "rounded-full px-6 py-3 text-sm font-medium transition-all",
                  activeTab === "trades"
                    ? "bg-white"
                    : "bg-transparent"
                )}
              >
                <span className={cn(
                  "transition-colors",
                  activeTab === "trades"
                    ? "bg-gradient-to-b from-black to-zinc-800 bg-clip-text text-transparent"
                    : "text-gray-400"
                )}>
                  Traded
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="transactions" className="mt-7">
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