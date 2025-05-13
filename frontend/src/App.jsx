import React, { useState, useEffect, useCallback } from 'react';
import './App.css'; // Your global styles
import { Navbar } from './components/Navbar';
import { ethers } from 'ethers';
import { Hero } from './components/Hero';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Footer } from './components/Footer';
import { Toaster } from "@/components/ui/sonner";
import { getReferrerFromUrl, logReferralConnection, generateReferralLink, getReferredUsersCount, trackWalletClick } from './services/api';
import Clarity from '@microsoft/clarity';
import { toast } from "sonner"; // Add this import at the top with other imports

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID;

Clarity.init(projectId);

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
            try {
              // 1) Build the exact message your backend expects
              const messageToSign = 
                `I am signing this message to authenticate with SmartWhales.ai as ${account}. Timestamp: ${Date.now()}`;
              // 2) Ask MetaMask to sign it
              const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [messageToSign, account]
              });
              // 3) Send the signed payload
              const referralRes = await logReferralConnection(
                referrer,
                account,
                signature,
                messageToSign
              );
              if (!referralRes.success) {
                console.error('Referral log failed:', referralRes.message);
              }
              // 4) Fetch and update the new referred‐users count
              const count = await getReferredUsersCount(referrer);
              setReferredUsers(count);
            } catch (err) {
              console.error('Error logging referral connection:', err);
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

  const handleTrackAddress = async (addressToTrack) => {
    setError('');
    const trimmed = addressToTrack.trim();
    
    if (!connectedWallet) {
      toast.error("Please connect your wallet first", {
        description: (
          <span style={{ color: "black" }}>
            Connect your wallet to start tracking addresses
          </span>
        )
      });
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed) && !/^([a-zA-Z0-9]+([-._][a-zA-Z0-9]+)*\.)+eth$/.test(trimmed)) {
      toast.error("Invalid address format", {
        description: (
          <span style={{ color: "black" }}>
            Please enter a valid Ethereum address or ENS name
          </span>
        )
      });
      return;
    }

    try {
      // Locally generate the exact same format your backend expects
      const messageToSign =
        `I am signing this message to authenticate with SmartWhales.ai as ${connectedWallet}. Timestamp: ${Date.now()}`;

      // Sign via MetaMask RPC directly
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [messageToSign, connectedWallet]
      });

      // Call tracking endpoint
      const result = await trackWalletClick(
        trimmed,
        connectedWallet,
        signature,
        messageToSign,
        currentChainId
      );

      if (result.success) {
        setTrackedAddress(trimmed);
        // Optionally refresh stats…
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('trackWalletClick error:', err);
      toast.error("Failed to track address", {
        description: (
          <span style={{ color: "black" }}>
            { "Failed to track address. Please try again later." }
          </span>
        )
      });
    }
  };
  
  const displayAddress = trackedAddress || connectedWallet;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Navbar connectedWallet={connectedWallet} onConnectWallet={handleConnectWallet} />
      <div className="border-t border-white/20"></div>
      <main className='bg-black'>
        <Hero onTrackWallet={handleTrackAddress} />
        {displayAddress && (
          <Dashboard
            key={displayAddress}
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
      <Toaster />
    </div>
  );
}

export default App;