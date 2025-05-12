import React from 'react';
import { getChainNameFromId } from '../../services/api';
import { FaSpinner } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TokenDisplay = ({ loading, tokens }) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-400 uppercase tracking-wider">Top Tokens</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <FaSpinner className="animate-spin text-lg text-gray-500" />
          </div>
        ) : tokens.length > 0 ? (
          <div className="space-y-3">
            {tokens.slice(0, 3).map((token) => (
              <div 
                key={`${token.chain_id}-${token.contract_address}`} 
                className={cn(
                  "flex justify-between items-center p-2 rounded-lg",
                  "hover:bg-gray-700/50 transition-colors duration-200"
                )}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3 shadow-md">
                    {token.logo_url ? (
                      <img 
                        src={token.logo_url} 
                        alt={token.contract_ticker_symbol} 
                        className="w-8 h-8 rounded-full" 
                      />
                    ) : (
                      <span className="text-xs font-bold">{token.contract_ticker_symbol?.slice(0, 3)}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-white text-base">{token.contract_ticker_symbol}</div>
                    <div className="text-xs text-gray-400">{getChainNameFromId(token.chain_id)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-white">
                    ${(token.quote || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-400">
                    {parseFloat(token.balance) / Math.pow(10, token.contract_decimals) > 0.001
                      ? (parseFloat(token.balance) / Math.pow(10, token.contract_decimals)).toFixed(4)
                      : "<0.001"} {token.contract_ticker_symbol}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-2 text-sm text-gray-500">No tokens found</div>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenDisplay;