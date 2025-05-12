import React from 'react';

export const Navbar = () => {
    return (
        <nav className="flex justify-between items-center py-4 px-8 bg-black text-white">
            <div className="text-2xl font-bold">
                smartwhales<span className="text-[#8A2BE2]">.ai</span>
            </div>
            <button className="py-2 px-4 text-base text-black bg-gray-300 border-none rounded cursor-pointer">
                Connect Wallet
            </button>
        </nav>
    );
}