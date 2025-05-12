import React, { useState, useEffect, useCallback } from 'react';
import { getTokenBalances, SUPPORTED_CHAINS, getChainNameFromId } from '../../services/api';
import { FaWallet, FaSpinner, FaCopy, FaCheckCircle } from 'react-icons/fa';
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import TokenDisplay from './TokenDisplay';

const PortfolioOverview = ({ walletAddress, selectedChains, referralLink, referredUsersCount, isAirdropEligible, eligibilityReasons, setErrorApp }) => {
  const [portfolioData, setPortfolioData] = useState({ totalValue: 0, balances: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedReferral, setCopiedReferral] = useState(false);
  
  const shortWalletAddress = walletAddress ? 
    `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : '';

  // Reset local errors
  const resetLocalErrors = () => {
    setError(null);
    if (setErrorApp) setErrorApp('');
  };

  // Fetch portfolio data
  const fetchPortfolioData = useCallback(async (walletAddr, chainsToFetch) => {
    if (!walletAddr) return;
    resetLocalErrors();
    setLoading(true);
    
    let cumulativeTotalValue = 0;
    const allBalances = [];

    for (const chainId of chainsToFetch) {
      try {
        const balanceItems = await getTokenBalances(chainId, walletAddr);
        balanceItems.forEach(bal => {
          cumulativeTotalValue += bal.quote || 0;
          allBalances.push(bal);
        });
      } catch (e) {
        console.error(`Balances Error (Chain ${chainId}):`, e);
        setError(`Failed to load balances for ${getChainNameFromId(chainId)}. ${e.message}`);
        
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
    }
    
    setPortfolioData({ 
      totalValue: cumulativeTotalValue, 
      balances: allBalances.sort((a, b) => (b.quote || 0) - (a.quote || 0)) 
    });
    setLoading(false);
  }, []);

  // Fetch data on wallet or chain changes
  useEffect(() => {
    if (walletAddress && selectedChains.length > 0) {
      fetchPortfolioData(walletAddress, selectedChains);
    } else if (!walletAddress) {
      setPortfolioData({ totalValue: 0, balances: [] });
    }
  }, [walletAddress, selectedChains.join(','), fetchPortfolioData]);

  // Handle referral link copy
  const handleCopyReferral = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
    toast.success("Referral link copied to clipboard");
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
                {/* Portfolio Value with animation */}
                <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-[#8A2BE2] shadow-lg transition-all hover:shadow-purple-900/20">
                  <span className="text-sm text-gray-400 uppercase tracking-wider">Portfolio Value</span>
                  <div className="mt-2 text-3xl font-bold text-white transition-all hover:scale-105 transform-gpu">
                    {loading ? (
                      <FaSpinner className="animate-spin text-lg" />
                    ) : (
                      `$${portfolioData.totalValue.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}`
                    )}
                  </div>
                </div>
                
                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-800 rounded-lg p-4 border-l-2 border-white/20 hover:border-white/40 transition-all">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Tracked Wallets</span>
                    <div className="text-2xl font-bold text-white">1</div>
                    <span className="text-xs text-gray-500">(Current View)</span>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 border-l-2 border-green-500 hover:border-green-400 transition-all">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Airdrop Eligible</span>
                    <div className="text-2xl font-bold text-green-400 animate-pulse">{isAirdropEligible ? 'Yes!' : 'No'}</div>
                    {isAirdropEligible && eligibilityReasons.length > 0 && (
                      <div className="mt-1">
                        {eligibilityReasons.map((reason, index) => (
                          <div key={index} className="text-xs text-gray-400">• {reason}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Top Tokens */}
              <TokenDisplay 
                loading={loading} 
                tokens={portfolioData.balances} 
              />
            </div>
            
            
            {/* Right Side - Referral */}
            <div>
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
                          className="rounded-l-none bg-[#8A2BE2] hover:bg-purple-700 text-white cursor-pointer"
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
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default PortfolioOverview;