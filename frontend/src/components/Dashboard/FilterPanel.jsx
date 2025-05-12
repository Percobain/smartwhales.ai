import React from 'react';
import { SUPPORTED_CHAINS, getChainNameFromId } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// FilterButton component using shadcn Button
const FilterButton = ({ label, onClick, isActive, className = '' }) => (
  <Button
    variant={isActive ? "default" : "secondary"}
    size="sm"
    onClick={onClick}
    className={cn(
      "text-xs sm:text-sm whitespace-nowrap cursor-pointer",
      isActive ? "bg-[#8A2BE2] hover:bg-purple-700" : "bg-gray-700 hover:bg-gray-600 text-gray-300",
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
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-400 uppercase tracking-wider">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Chain Filter */}
          <div>
            <div className="text-xs font-medium text-gray-400 mb-2">Chains</div>
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
          <div>
            <div className="text-xs font-medium text-gray-400 mb-2">Time Period</div>
            <div className="flex flex-wrap gap-2">
              {[
                {p: 'all', l: 'All Time'}, 
                {p: '24h', l: '24 Hours'}, 
                {p: '7d', l: '7 Days'}, 
                {p: '30d', l: '30 Days'}
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
          <div>
            <div className="text-xs font-medium text-gray-400 mb-2">Transaction Type</div>
            <div className="flex flex-wrap gap-2">
              {[
                {t: 'all', l: 'All Types'}, 
                {t: 'receive', l: 'Received'}, 
                {t: 'send', l: 'Sent'}, 
                {t: 'trade', l: 'Swaps/Trades'}
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
        <div className="flex items-center justify-end space-x-2">
          <span className="text-xs text-gray-400">Items per page:</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-20 bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="5" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterPanel;