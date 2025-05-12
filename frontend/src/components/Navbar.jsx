import React, { useState, useRef, useEffect } from 'react';
import { FaCopy, FaSignOutAlt } from 'react-icons/fa';

export const Navbar = ({ connectedWallet, onConnectWallet }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuRef = useRef(null);

    const copyWalletAddress = () => {
        if (connectedWallet) {
            navigator.clipboard.writeText(connectedWallet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        setShowMenu(false);
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
        setShowMenu(false);
    };

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <nav className="flex flex-wrap justify-between items-center py-4 px-4 sm:px-8 bg-black text-white sticky top-0 z-50 shadow-lg">
            <div className="text-2xl font-bold cursor-pointer" onClick={() => window.location.href='/'}>
                smartwhales<span className="text-[#8A2BE2]">.ai</span>
            </div>
            
            <div className="relative" ref={menuRef}>
                <button
                    onClick={connectedWallet ? () => setShowMenu(!showMenu) : onConnectWallet}
                    className="py-2 px-4 text-sm sm:text-base text-black bg-gray-300 hover:bg-gray-400 active:bg-gray-500 border-none rounded cursor-pointer transition-colors duration-150"
                >
                    {connectedWallet
                        ? `${connectedWallet.substring(0, 6)}...${connectedWallet.substring(connectedWallet.length - 4)}`
                        : 'Connect Wallet'}
                </button>
                
                {showMenu && connectedWallet && (
                    <div className="absolute right-0 mt-1 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50">
                        <button 
                            onClick={copyWalletAddress}
                            className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                        >
                            <FaCopy className="mr-2" /> 
                            {copied ? 'Copied!' : 'Copy Address'}
                        </button>
                        <button 
                            onClick={handleDisconnect}
                            className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                        >
                            <FaSignOutAlt className="mr-2" /> 
                            Disconnect Wallet
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}