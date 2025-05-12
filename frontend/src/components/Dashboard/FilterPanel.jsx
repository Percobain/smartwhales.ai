import React from 'react';
import { SUPPORTED_CHAINS, getChainNameFromId } from '../../services/api';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// FilterButton component with purple accent from Hero.jsx
const FilterButton = ({ label, onClick, isActive, className = '' }) => (
  <Button
    variant={isActive ? "default" : "secondary"}
    onClick={onClick}
    className={cn(
      "text-xs px-3 py-1 h-8 rounded-full transition-all",
      isActive 
        ? "bg-[#8A2BE2] hover:bg-purple-700 text-white shadow-md shadow-purple-900/20" 
        : "bg-black border border-gray-800 hover:bg-gray-900 hover:border-gray-700 text-gray-400",
      className
    )}
  >
    {label}
  </Button>
);

const FilterPanel = ({ 
  selectedChains, 
  timeFilter, 
  txTypeFilter,
  toggleChainFilter,
  updateTimeFilter,
  updateTxTypeFilter,
  itemsPerPage,
  handleItemsPerPageChange
}) => {
  return (
    <Card className="bg-black border border-gray-800 shadow-lg">
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chain Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#8A2BE2] rounded-full"></div>
              <h3 className="text-xs font-medium text-white uppercase tracking-wider">Chains</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SUPPORTED_CHAINS).map(([name, id]) => (
                <FilterButton 
                  key={id} 
                  label={getChainNameFromId(id)} 
                  onClick={() => toggleChainFilter(id)} 
                  isActive={selectedChains.includes(id)} 
                />
              ))}
            </div>
          </div>
          
          {/* Time Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#8A2BE2] rounded-full"></div>
              <h3 className="text-xs font-medium text-white uppercase tracking-wider">Time Period</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                {p: 'all', l: 'All Time'}, 
                {p: '24h', l: '24h'}, 
                {p: '7d', l: '7d'}, 
                {p: '30d', l: '30d'}
              ].map(tf => (
                <FilterButton 
                  key={tf.p} 
                  label={tf.l} 
                  onClick={() => updateTimeFilter(tf.p)} 
                  isActive={timeFilter === tf.p} 
                />
              ))}
            </div>
          </div>
          
          {/* Type Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#8A2BE2] rounded-full"></div>
              <h3 className="text-xs font-medium text-white uppercase tracking-wider">Transaction Type</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                {t: 'all', l: 'All'}, 
                {t: 'receive', l: 'Received'}, 
                {t: 'send', l: 'Sent'}, 
                {t: 'trade', l: 'Trades'}
              ].map(ttf => (
                <FilterButton 
                  key={ttf.t} 
                  label={ttf.l} 
                  onClick={() => updateTxTypeFilter(ttf.t)} 
                  isActive={txTypeFilter === ttf.t} 
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Items per page selector */}
        <div className="flex items-center justify-end mt-5 border-t border-gray-800 pt-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Items per page</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="w-16 h-8 bg-black border border-gray-800 text-white text-xs rounded-md focus:ring-[#8A2BE2] focus:ring-offset-black">
                <SelectValue placeholder="5" />
              </SelectTrigger>
              <SelectContent className="bg-black border border-gray-800 text-white">
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterPanel;