import React, { useState } from 'react';

// Placeholder for actual SVGs or image components
const IconPlaceholder = ({ name, color = 'bg-gray-500' }) => (
    <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md`}>
        {name}
    </div>
);

export const Hero = ({ onTrackWallet }) => {
    const [address, setAddress] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (address.trim()) {
            onTrackWallet(address.trim());
        }
    };

    return (
        <section 
            className="text-center py-12 md:py-16 px-4 bg-cover bg-center relative" 
            // You can add a grid background image here if you have one
            // style={{ backgroundImage: "url('/path/to/your/grid-background.png')" }}
        >
            {/* Optional: Dark overlay for better text readability if using a background image */}
            {/* <div className="absolute inset-0 bg-black opacity-50"></div> */}
            
            <div className="relative z-10">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-shadow-md">
                    Copy-trade most <br /> successful crypto whales.
                </h1>
                <p className="text-md sm:text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
                    Invest together with Binance Labs, Pantera Capital, and a16z.
                </p>
                <div className="flex justify-center items-center space-x-3 sm:space-x-4 mb-12">
                    <IconPlaceholder name="OP" color="bg-red-500" />
                    <IconPlaceholder name="ARB" color="bg-blue-600" /> {/* Arbitrum-like color */}
                    <IconPlaceholder name="BNB" color="bg-yellow-400" />
                    <IconPlaceholder name="OPT" color="bg-sky-500" /> {/* Optimism-like color */}
                    <IconPlaceholder name="ETH" color="bg-slate-500" />
                </div>
                <form onSubmit={handleSubmit} className="max-w-xl mx-auto flex shadow-xl">
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter Wallet Address to Track (e.g., 0x... or ENS)"
                        className="flex-grow p-3 rounded-l-md text-gray-900 bg-white focus:ring-2 focus:ring-[#8A2BE2] focus:outline-none text-sm sm:text-base"
                        aria-label="Wallet Address Input"
                    />
                    <button
                        type="submit"
                        className="bg-[#8A2BE2] text-white p-3 rounded-r-md hover:bg-purple-700 active:bg-purple-800 transition-colors duration-150 text-sm sm:text-base font-semibold"
                    >
                        Track
                    </button>
                </form>
            </div>
        </section>
    );
}