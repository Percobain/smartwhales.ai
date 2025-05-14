import React, { useState, useEffect, useCallback } from 'react';
import { getTokenBalances, getTrackingStats, checkAirdropEligibility } from '../../services/api';
import { FaWallet, FaCopy, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"; // Removed CardDescription as it wasn't used
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// import { Avatar } from "@/components/ui/avatar";
import { AlertCircle } from "lucide-react";
import { Loader2 } from "lucide-react";
import TokenDisplay from './TokenDisplay';

const PortfolioOverview = ({
  walletAddress,
  selectedChains = [],
  referralLink,
  referredUsersCount = 0,
  isAirdropEligible,
  eligibilityReasons = [],
  setErrorApp,
  connectedWalletAddress,
  setIsAirdropEligible,
  setEligibilityReasons
}) => {
  const [portfolioData, setPortfolioData] = useState({
    totalValue: 0,
    balances: [],
    percentChange: 0, // Kept for state structure, but not used for display
    valueChange: 0    // Kept for state structure, but not used for display
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [trackedWallets, setTrackedWallets] = useState(0); // Added state for tracked wallets
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [missingCriteria, setMissingCriteria] = useState([]);
  const [eligibilityError, setEligibilityError] = useState(null);

  const shortWalletAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : 'Connect Wallet';

  const resetLocalErrors = useCallback(() => {
    setError(null);
    if (setErrorApp) setErrorApp('');
  }, [setErrorApp]);

  useEffect(() => {
    const fetchData = async () => {
      if (!walletAddress || selectedChains.length === 0) {
        setPortfolioData({
          totalValue: 0,
          balances: [],
          percentChange: 0,
          valueChange: 0
        });
        return;
      }

      resetLocalErrors();
      setLoading(true);

      try {
        let allBalances = [];
        let currentTotalValue = 0;

        for (const chainId of selectedChains) {
          try {
            const balances = await getTokenBalances(chainId, walletAddress);
            allBalances = [...allBalances, ...balances];
            currentTotalValue += balances.reduce((sum, token) => sum + (token.quote || 0), 0);
          } catch (e) {
            console.error(`Error fetching balances for chain ${chainId}:`, e);
          }
        }

        allBalances.sort((a, b) => (b.quote || 0) - (a.quote || 0));

        setPortfolioData({
          totalValue: currentTotalValue,
          balances: allBalances,
          percentChange: 0, // Resetting as it's not calculated
          valueChange: 0    // Resetting as it's not calculated
        });

      } catch (e) {
        console.error('Portfolio fetch error:', e);
        const errorMessage = `Failed to load portfolio data: ${e.message}`;
        setError(errorMessage);
        if (setErrorApp) setErrorApp(errorMessage);
        setPortfolioData(prevState => ({
          ...prevState,
          totalValue: 0,
          balances: [], // Clear balances on error or keep previous, depending on desired UX
          percentChange: 0,
          valueChange: 0,
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [walletAddress, selectedChains, resetLocalErrors, setErrorApp]);

 useEffect(() => {
   if (!connectedWalletAddress) {
     setTrackedWallets(0);
     return;
   }
   getTrackingStats(connectedWalletAddress)
     .then(res => {
       if (res.success && typeof res.data.uniqueWalletsTracked === 'number') {
         setTrackedWallets(res.data.uniqueWalletsTracked);
       }
     })
     .catch(err => {
       console.error('Error fetching tracked wallets count:', err);
     });
}, [connectedWalletAddress]);

  useEffect(() => {
    const checkEligibility = async () => {
      if (!walletAddress) return;
      
      setCheckingEligibility(true);
      setEligibilityError(null);
      
      try {
        const result = await checkAirdropEligibility(walletAddress);
        if (result.eligible !== undefined) {
          // Update parent component state through props
          if (typeof setIsAirdropEligible === 'function') {
            setIsAirdropEligible(result.eligible);
          }
          if (typeof setEligibilityReasons === 'function') {
            setEligibilityReasons(result.reasons || []);
          }
          setMissingCriteria(result.missingCriteria || []);
        }
      } catch (error) {
        console.error("Error checking airdrop eligibility:", error);
        setEligibilityError(error.message);
      } finally {
        setCheckingEligibility(false);
      }
    };
    
    checkEligibility();
  }, [walletAddress]);

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
        <Alert variant="destructive" className="mb-4 bg-red-900/30 border-red-800 text-red-300">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-black border border-gray-800 shadow-xl">
        <CardHeader className="border-b border-gray-800 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <FaWallet className="text-3xl text-[#8A2BE2]" />
              <div>
                <CardTitle className="text-2xl font-bold text-white">
                  {shortWalletAddress}
                </CardTitle>
                {walletAddress && (
                  <div className="text-xs text-gray-400">
                    {walletAddress}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-center px-4 py-2 bg-zinc-900 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">Tracked Wallets</div>
                <div className="text-xl font-bold text-white">{trackedWallets}</div>
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
            <div className="md:col-span-1 bg-zinc-900 rounded-lg p-6 flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-4xl font-bold text-white">
                    {loading ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      `$${portfolioData.totalValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    )}
                  </div>
                </div>
                <div className="text-gray-400 text-sm mt-1">Total Portfolio Value</div>
              </div>

              <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                <div className="text-xs uppercase text-gray-400">Airdrop Eligible</div>
                
                {checkingEligibility ? (
                  <div className="flex items-center gap-2 my-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-gray-300 text-sm">Checking...</span>
                  </div>
                ) : eligibilityError ? (
                  <div className="text-red-400 text-sm my-1">Unable to check right now</div>
                ) : (
                  <>
                    <div className={`text-lg font-bold ${isAirdropEligible ? 'text-green-400' : 'text-red-400'}`}>
                      {isAirdropEligible ? 'Yes!' : 'No'}
                    </div>
                    
                    {isAirdropEligible && (
                      <div className="mt-1 text-xs text-gray-300">
                        <div>✓ Active wallet in the last 30 days</div>
                        <div>✓ Referred 2+ users</div>
                      </div>
                    )}
                    
                    {!isAirdropEligible && missingCriteria.length > 0 && (
                      <div className="mt-1 text-xs">
                        {missingCriteria.includes("Wallet must be active in the last 30 days") ? (
                          <div className="text-red-400">○ Wallet not active recently</div>
                        ) : (
                          <div className="text-gray-300">✓ Active wallet in the last 30 days</div>
                        )}
                        
                        {missingCriteria.some(criteria => criteria.includes("more referrals")) ? (
                          <div className="text-red-400">○ Need 2+ referrals</div>
                        ) : (
                          <div className="text-gray-300">✓ Referred 2+ users</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <div className="text-xs uppercase text-gray-400 mb-1">Your Referral Link</div>
                <div className="flex">
                  <Input
                    type="text"
                    readOnly
                    value={referralLink || (walletAddress ? 'Generating link...' : 'Connect wallet to get referral link')}
                    className="rounded-r-none bg-zinc-800 border-zinc-700 text-white focus-visible:ring-offset-0 focus-visible:ring-0"
                  />
                  <Button
                    onClick={handleCopyReferral}
                    variant="secondary"
                    className="rounded-l-none bg-[#8A2BE2] hover:bg-purple-700 text-white cursor-pointer"
                    size="icon"
                    disabled={!referralLink || loading}
                  >
                    {copiedReferral ? <FaCheckCircle /> : <FaCopy />}
                  </Button>
                </div>
              </div>
            </div>

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