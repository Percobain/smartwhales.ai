import React, { useState, useRef, useEffect } from 'react';
import { FaCopy, FaSignOutAlt } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar = ({ connectedWallet, onConnectWallet }) => {
    const [copied, setCopied] = useState(false);
    const menuRef = useRef(null);

    const copyWalletAddress = () => {
        if (connectedWallet) {
            navigator.clipboard.writeText(connectedWallet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDisconnect = () => {
        // Call external disconnect function if available
        if (window.ethereum && window.ethereum._handleDisconnect) {
            window.ethereum._handleDisconnect();
        }
        
        // Manual disconnect approach - reset local state
        if (typeof onConnectWallet === 'function') {
            // You'd need to modify your App.jsx to handle a disconnect event
            // For now, we'll just simulate a page refresh which will reset the connection state
            window.location.reload();
        }
    };

    return (
        <nav className="flex flex-wrap justify-between items-center py-4 px-4 sm:px-8 bg-black text-white sticky top-0 z-50 shadow-lg">
            <div className="cursor-pointer" onClick={() => window.location.href='/'}>
                <img src="/Logo.svg" alt="smartwhales.ai logo" className="h-8" />
            </div>
            
            <div className="relative">
                {connectedWallet ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="secondary"
                                size="default"
                            >
                                {`${connectedWallet.substring(0, 6)}...${connectedWallet.substring(connectedWallet.length - 4)}`}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
                            <DropdownMenuItem 
                                onClick={copyWalletAddress}
                                className="flex items-center text-white hover:bg-gray-700 focus:bg-gray-700 focus:text-white"
                            >
                                <FaCopy className="mr-2" />
                                {copied ? 'Copied!' : 'Copy Address'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={handleDisconnect}
                                className="flex items-center text-white hover:bg-gray-700 focus:bg-gray-700 focus:text-white"
                            >
                                <FaSignOutAlt className="mr-2" />
                                Disconnect Wallet
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button
                        onClick={onConnectWallet}
                        variant="secondary"
                        size="default"
                    >
                        Connect Wallet
                    </Button>
                )}
            </div>
        </nav>
    );
}