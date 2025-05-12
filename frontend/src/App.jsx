import React, { useState, useEffect, useCallback } from 'react';
import './App.css'; // Your global styles
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Footer } from './components/Footer';
import { Toaster } from "@/components/ui/sonner";
import { getReferrerFromUrl, logReferralConnection, generateReferralLink, getReferredUsersCount, trackWalletClick } from './services/api';

function App() {
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [trackedAddress, setTrackedAddress] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [referredUsers, setReferredUsers] = useState(0);
  const [currentChainId, setCurrentChainId] = useState(null);
  const [error, setError] = useState('');

  const handleConnectWallet = useCallback(async () => {
    setError('');
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          const account = accounts[0];
          setConnectedWallet(account);
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
          setCurrentChainId(parseInt(chainIdHex, 16).toString());

          const referrer = getReferrerFromUrl();
          if (referrer && referrer.toLowerCase() !== account.toLowerCase()) {
            await logReferralConnection(referrer, account);
            // Update referred users count for the referrer if they are the current user
            if (referrer.toLowerCase() === connectedWallet?.toLowerCase()) {
                 setReferredUsers(getReferredUsersCount(referrer));
            }
          }
        }
      } catch (err) {
        console.error("Error connecting wallet:", err);
        setError(err.message || "Failed to connect wallet. User rejected request or an error occurred.");
      }
    } else {
      setError('MetaMask not detected. Please install MetaMask extension!');
    }
  }, [connectedWallet]);

  useEffect(() => {
    const init = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    setConnectedWallet(accounts[0]);
                    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                    setCurrentChainId(parseInt(chainIdHex, 16).toString());
                }
            } catch (err) {
                console.warn("Could not automatically connect to wallet on load:", err.message);
            }

            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setConnectedWallet(accounts[0]);
                } else {
                    setConnectedWallet(null);
                    setCurrentChainId(null);
                }
            });
            window.ethereum.on('chainChanged', (chainIdHex) => {
                setCurrentChainId(parseInt(chainIdHex, 16).toString());
            });
        }
    };
    init();

    return () => {
        if (window.ethereum) {
            window.ethereum.removeAllListeners('accountsChanged');
            window.ethereum.removeAllListeners('chainChanged');
        }
    };
  }, []);

  useEffect(() => {
    if (connectedWallet) {
      setReferralLink(generateReferralLink(connectedWallet));
      setReferredUsers(getReferredUsersCount(connectedWallet));
    } else {
      setReferralLink('');
      setReferredUsers(0);
    }
  }, [connectedWallet]);

  const handleTrackAddress = async (address) => {
    setError('');
    if (address && address.trim() !== "") {
        // Basic address validation (Ethereum addresses are 42 chars long, starting with 0x)
        const isValidEthAddress = /^0x[a-fA-F0-9]{40}$/.test(address.trim());
        const isValidENS = /^([a-zA-Z0-9]+([-._][a-zA-Z0-9]+)*\.)+eth$/.test(address.trim());
        
        if (!isValidEthAddress && !isValidENS) {
            setError("Invalid address format. Please enter a valid wallet address.");
            return;
        }
        
        setTrackedAddress(address.trim());
        await trackWalletClick(address.trim(), connectedWallet);
    } else {
        setError("Please enter a valid wallet address to track.");
    }
  };
  
  const displayAddress = trackedAddress || connectedWallet;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Navbar connectedWallet={connectedWallet} onConnectWallet={handleConnectWallet} />
      {/* Add a white line between Navbar and Hero */}
      <div className="border-t border-white/20"></div>
      <main>
        {error && <div className="bg-red-800/70 text-white p-3 rounded-md text-center mb-4 mx-auto max-w-2xl">{error}</div>}
        <Hero onTrackWallet={handleTrackAddress} />
        {displayAddress && (
          <Dashboard
            key={displayAddress} // Re-mount dashboard if tracked/connected address changes
            walletAddress={displayAddress}
            connectedWalletAddress={connectedWallet}
            referralLink={referralLink}
            referredUsersCount={referredUsers}
            currentConnectedChainId={currentChainId}
            setErrorApp={setError}
          />
        )}
      </main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
