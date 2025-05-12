import React from 'react';
import { FaTwitter, FaDiscord, FaTelegramPlane, FaGithub } from 'react-icons/fa'; // Example icons

export const Footer = () => {
    const socialLinks = [
        { icon: <FaTwitter />, href: "#", label: "Twitter" },
        { icon: <FaDiscord />, href: "#", label: "Discord" },
        { icon: <FaTelegramPlane />, href: "#", label: "Telegram" },
        { icon: <FaGithub />, href: "#", label: "GitHub" },
    ];

    return (
        <footer className="bg-black text-white py-6 sm:py-8 px-4 sm:px-8 mt-auto">
            <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
                <div className="cursor-pointer mb-4 md:mb-0" onClick={() => window.location.href='/'}>
                    <img src="/Logo.svg" alt="smartwhales.ai logo" className="h-8" />
                </div>
                <div className="flex space-x-4 sm:space-x-5">
                    {socialLinks.map(link => (
                        <a key={link.label} href={link.href} aria-label={link.label} target="_blank" rel="noopener noreferrer"
                           className="text-gray-400 hover:text-[#8A2BE2] transition-colors text-lg sm:text-xl">
                            {link.icon}
                        </a>
                    ))}
                </div>
            </div>
            <div className="text-center text-gray-500 mt-4 sm:mt-6 text-xs sm:text-sm">
                © {new Date().getFullYear()} smartwhales.ai. All rights reserved.
            </div>
        </footer>
    );
}