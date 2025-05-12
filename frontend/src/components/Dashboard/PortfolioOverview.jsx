import React, { useState, useEffect } from 'react';
import { getTokenBalances, getHistoricalPricePoints } from '../../services/api';
import { FaWallet, FaCopy, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { AlertCircle } from "lucide-react";
import TokenDisplay from './TokenDisplay';

const PortfolioOverview = ({ 
  walletAddress, 
  selectedChains, 
  referralLink, 
  referredUsersCount, 
  isAirdropEligible, 
  eligibilityReasons, 
  setErrorApp 
}) => {
  const [portfolioData, setPortfolioData] = useState({
    totalValue: 0,
    balances: [],
    percentChange: 0,
    valueChange: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedReferral, setCopiedReferral] = useState(false);
  
  // Shorten wallet address for display
  const shortWalletAddress = walletAddress 
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` 
    : 'Connect Wallet';

  // Reset local errors
  const resetLocalErrors = React.useCallback(() => {
    setError(null);
    if (setErrorApp) setErrorApp('');
  }, [setErrorApp]);

  // Fetch portfolio data
  useEffect(() => {
    const fetchData = async () => {
      if (!walletAddress || selectedChains.length === 0) {
        return;
      }

      resetLocalErrors();
      setLoading(true);
      
      try {
        let allBalances = [];
        let totalValue = 0;
        
        // Get current token balances
        for (const chainId of selectedChains) {
          try {
            const balances = await getTokenBalances(chainId, walletAddress);
            allBalances = [...allBalances, ...balances];
            totalValue += balances.reduce((sum, token) => sum + (token.quote || 0), 0);
          } catch (e) {
            console.error(`Error fetching balances for chain ${chainId}:`, e);
          }
        }
        
        // Sort balances by value (highest first)
        allBalances.sort((a, b) => (b.quote || 0) - (a.quote || 0));
        
        // Get historical value from 24h ago for comparison
        let percentChange = 0;
        let valueChange = 0;
        
        try {
          // Get historical data points for the past 7 days
          const historicalData = await getHistoricalPricePoints(walletAddress, '7d');
          
          if (historicalData.length >= 2) {
            // Get yesterday's value (or closest data point)
            const yesterday = historicalData[historicalData.length - 2];
            const today = historicalData[historicalData.length - 1];
            
            if (yesterday && yesterday.value > 0) {
              valueChange = today.value - yesterday.value;
              percentChange = (valueChange / yesterday.value) * 100;
            }
          }
        } catch (historyError) {
          console.warn('Could not fetch historical portfolio data:', historyError);
          // Continue without historical comparison, just don't show the percentage badge
        }
        
        setPortfolioData({
          totalValue,
          balances: allBalances,
          percentChange,
          valueChange
        });
      } catch (e) {
        console.error('Portfolio fetch error:', e);
        setError(`Failed to load portfolio data: ${e.message}`);
        if (setErrorApp) setErrorApp(`Failed to load portfolio data: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [walletAddress, selectedChains, setErrorApp, resetLocalErrors]);

  // Handle copy referral link
  const handleCopyReferral = () => {
    if (!referralLink) return;
    
    navigator.clipboard.writeText(referralLink)
      .then(() => {
        setCopiedReferral(true);
        setTimeout(() => setCopiedReferral(false), 2000);
      })
      .catch(err => console.error('Failed to copy:', err));
  };

  return (
    <>
      {error && (
        <Alert variant="destructive" className="bg-red-900/30 border-red-800 text-red-300 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading portfolio data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card className="bg-black border border-gray-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Avatar className="h-10 w-10 rounded bg-[#8A2BE2]/20 border border-[#8A2BE2]/30">
                  <FaWallet className="text-[#8A2BE2]" />
                </Avatar>
                <span>{shortWalletAddress}</span>
              </CardTitle>
            </div>
            <div className="flex gap-3">
              <div className="text-center px-4 py-2 bg-zinc-900 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">Tracked Wallets</div>
                <div className="text-xl font-bold text-white">66</div>
              </div>
              <div className="text-center px-4 py-2 bg-zinc-900 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">Referred Users</div>
                <div className="text-xl font-bold text-white">{referredUsersCount || 0}</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Portfolio Value */}
            <div className="md:col-span-1 bg-zinc-900 rounded-lg p-6">
              <div className="flex items-center gap-2">
                <div className="text-4xl font-bold text-white">
                  {loading ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <>
                      ${portfolioData.totalValue.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </>
                  )}
                </div>
                {!loading && portfolioData.totalValue > 0 && portfolioData.percentChange !== 0 && (
                  <Badge className={`
                    ${portfolioData.percentChange >= 0 
                      ? "bg-green-500/20 text-green-400 border-green-500/30" 
                      : "bg-red-500/20 text-red-400 border-red-500/30"}
                  `}>
                    {portfolioData.percentChange >= 0 ? '+' : ''}
                    {portfolioData.percentChange.toFixed(2)}% 
                    (${Math.abs(portfolioData.valueChange).toFixed(2)})
                  </Badge>
                )}
              </div>
              <div className="text-gray-400 text-sm mt-1">Total Portfolio Value</div>
              {/* Airdrop Eligibility */}
              <div className="mt-4 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                <div className="text-xs uppercase text-gray-400">Airdrop Eligible</div>
                <div className="text-lg font-bold text-green-400 animate-pulse">
                  {isAirdropEligible ? 'Yes!' : 'No'}
                </div>
                {isAirdropEligible && eligibilityReasons.length > 0 && (
                  <div className="mt-1">
                    {eligibilityReasons.map((reason, index) => (
                      <div key={index} className="text-xs text-gray-400">• {reason}</div>
                    ))}
                  </div>
                )}
              </div>
              {/* Referral Link */}
              <div className="mt-4">
                <div className="text-xs uppercase text-gray-400 mb-1">Your Referral Link</div>
                <div className="flex">
                  <Input 
                    type="text" 
                    readOnly 
                    value={referralLink || 'Connect wallet to get referral link'} 
                    className="rounded-r-none bg-zinc-800 border-zinc-700 text-white" 
                  />
                  <Button
                    onClick={handleCopyReferral}
                    variant="secondary"
                    className="rounded-l-none bg-[#8A2BE2] hover:bg-purple-700 text-white cursor-pointer"
                    size="icon"
                    disabled={!referralLink}
                  >
                    {copiedReferral ? <FaCheckCircle /> : <FaCopy />}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Top Tokens */}
            <div className="md:col-span-2">
              <TokenDisplay 
                loading={loading} 
                tokens={portfolioData.balances} 
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default PortfolioOverview;