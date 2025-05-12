import React from 'react';
import { FaSpinner } from 'react-icons/fa';
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SUPPORTED_CHAINS, getChainLogo, getChainNameFromId } from '../../services/api';

const TokenDisplay = ({ loading, tokens = [] }) => {
  // Helper function to get the appropriate logo
  const getTokenLogoOrFallback = (token) => {
    // Try to get token logo first
    if (token.logo_url && token.logo_url.startsWith('http')) {
      return {
        src: token.logo_url,
        alt: token.contract_ticker_symbol,
        isChainLogo: false
      };
    }

    // Fallback to chain logo
    const chainLogo = getChainLogo(token.chain_id);
    if (chainLogo) {
      return {
        src: chainLogo,
        alt: getChainNameFromId(token.chain_id),
        isChainLogo: true
      };
    }

    // If no logos available, return null
    return <ETH className="svg"></ETH>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <FaSpinner className="animate-spin text-2xl text-[#8A2BE2]" />
      </div>
    );
  }

  if (!tokens.length) {
    return (
      <div className="text-center py-10 text-gray-500">
        No tokens found in this wallet
      </div>
    );
  }

  // Take top tokens by value
  const topTokens = tokens.slice(0, 8);
  
  return (
    <div>
      <h3 className="text-lg font-medium text-white mb-4">Top Assets</h3>
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3">
          {topTokens.map((token) => {
            const logo = getTokenLogoOrFallback(token);
            
            return (
              <div 
                key={`${token.chain_id}-${token.contract_address}`}
                className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-all"
              >
                {/* Token Icon & Name with chain logo fallback */}
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3 bg-zinc-800 border border-zinc-700">
                    {logo ? (
                      <img 
                        src={logo.src} 
                        alt={logo.alt} 
                        className={logo.isChainLogo ? "rounded-full opacity-75" : ""}
                        onError={(e) => {
                          // If token logo fails, try to show chain logo
                          const chainLogo = getChainLogo(token.chain_id);
                          if (chainLogo) {
                            e.target.src = chainLogo;
                            e.target.className = "rounded-full opacity-75";
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                        {token.contract_ticker_symbol?.slice(0, 2)}
                      </div>
                    )}
                  </Avatar>
                  <div>
                    <div className="font-medium text-white">{token.contract_ticker_symbol}</div>
                    <div className="text-xs text-gray-400 flex items-center mt-1">
                      <Badge className="text-[10px] bg-transparent border border-gray-700 text-gray-400 mr-1">
                        {token.chain_name}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Token Value */}
                <div className="text-right">
                  <div className="font-medium text-white">${token.quote?.toFixed(2) || '0.00'}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {parseFloat(token.balance) / 10 ** token.contract_decimals < 0.0001 
                      ? '<0.0001' 
                      : (parseFloat(token.balance) / 10 ** token.contract_decimals).toFixed(4)
                    } {token.contract_ticker_symbol}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TokenDisplay;