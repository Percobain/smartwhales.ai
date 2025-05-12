import React, { useState, useEffect } from 'react';
import { calculateMultiChainPortfolioPnL, getHistoricalPricePoints } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FaChartLine, FaSpinner } from 'react-icons/fa';
import { cn } from "@/lib/utils";

// Simple line chart component
const LineChart = ({ data, height = 80, width = '100%', color = '#8A2BE2' }) => {
  if (!data || data.length < 2) return <div className="text-center text-gray-500">Insufficient data</div>;
  
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  const normalizedPoints = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - (((d.value - min) / range) * 100)
  }));
  
  const points = normalizedPoints.map(p => `${p.x},${p.y}`).join(' ');
  
  return (
    <svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Gradient area under the line */}
      <polyline
        points={`0,100 ${points} 100,100`}
        fill={`url(#gradient)`}
        opacity="0.2"
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const PnLDisplay = ({ walletAddress, selectedChains, setErrorApp }) => {
  const [pnlData, setPnlData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [timeframe, setTimeframe] = useState('30d');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;
    
    const fetchPnLData = async () => {
      setLoading(true);
      try {
        const [pnlResults, pricePoints] = await Promise.all([
          calculateMultiChainPortfolioPnL(walletAddress, timeframe),
          getHistoricalPricePoints(walletAddress, timeframe)
        ]);
        
        setPnlData(pnlResults);
        setHistoricalData(pricePoints);
      } catch (error) {
        console.error('Error fetching PnL data:', error);
        if (setErrorApp) setErrorApp('Failed to load PnL data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPnLData();
  }, [walletAddress, timeframe, setErrorApp]);

  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <FaChartLine className="text-[#8A2BE2]" />
            Portfolio Performance
          </CardTitle>
          <div className="flex space-x-1">
            {['7d', '30d', '90d', '365d'].map(period => (
              <Button
                key={period}
                size="sm"
                variant={period === timeframe ? "default" : "outline"}
                onClick={() => handleTimeframeChange(period)}
                className={cn(
                  "text-xs",
                  period === timeframe 
                    ? "bg-[#8A2BE2] hover:bg-purple-700" 
                    : "bg-transparent text-gray-400 hover:text-white"
                )}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
        <CardDescription>
          Performance over {timeframe === '7d' ? '7 days' : 
                           timeframe === '30d' ? '30 days' : 
                           timeframe === '90d' ? '3 months' : '1 year'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <FaSpinner className="animate-spin text-2xl text-[#8A2BE2]" />
          </div>
        ) : !pnlData ? (
          <div className="text-center py-10 text-gray-500">
            No performance data available
          </div>
        ) : (
          <div className="space-y-6">
            {/* Performance Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className={cn(
                "bg-gray-800 rounded-lg p-4 border-l-4",
                pnlData.totalAbsolutePnL >= 0 
                  ? "border-green-500" 
                  : "border-red-500"
              )}>
                <div className="text-sm text-gray-400">Total PnL</div>
                <div className={cn(
                  "text-2xl font-bold", 
                  pnlData.totalAbsolutePnL >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {pnlData.totalAbsolutePnL >= 0 ? '+' : ''}
                  ${pnlData.totalAbsolutePnL.toFixed(2)}
                </div>
              </div>
              
              <div className={cn(
                "bg-gray-800 rounded-lg p-4 border-l-4",
                pnlData.totalPercentagePnL >= 0 
                  ? "border-green-500" 
                  : "border-red-500"
              )}>
                <div className="text-sm text-gray-400">% Change</div>
                <div className={cn(
                  "text-2xl font-bold", 
                  pnlData.totalPercentagePnL >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {pnlData.totalPercentagePnL >= 0 ? '+' : ''}
                  {pnlData.totalPercentagePnL.toFixed(2)}%
                </div>
              </div>
            </div>
            
            {/* Chart */}
            <div className="pt-2 pb-4">
              <LineChart 
                data={historicalData} 
                height={120}
                color={pnlData.totalPercentagePnL >= 0 ? '#10B981' : '#EF4444'} 
              />
            </div>
            
            {/* Chain Breakdown */}
            <div>
              <h4 className="text-sm text-gray-400 mb-3">Chain Breakdown</h4>
              <div className="space-y-2">
                {Object.entries(pnlData.chainResults).map(([chainId, data]) => (
                  <div 
                    key={chainId} 
                    className="flex justify-between items-center p-2 rounded hover:bg-gray-800"
                  >
                    <div className="flex items-center">
                      <Badge className="mr-2 bg-gray-700 text-white">
                        {chainId}
                      </Badge>
                      <span className="text-gray-300">
                        {data.currentValue.toFixed(2)} USD
                      </span>
                    </div>
                    <span className={cn(
                      "font-medium",
                      data.absolutePnL >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {data.absolutePnL >= 0 ? '+' : ''}
                      {data.absolutePnL.toFixed(2)} ({data.percentagePnL.toFixed(2)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PnLDisplay;