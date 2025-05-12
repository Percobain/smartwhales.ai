import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Crypto icons component
const CryptoIcon = ({ name, className }) => (
    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-lg overflow-hidden", className)}>
        {name === "OP" && (
                <img src="/OP.svg" alt="OP Logo" className="w-full h-full object-contain" />
        )}
        {name === "ARB" && (
            <img src="/ARB.svg" alt="ARB Logo" className="w-full h-full object-contain" />
        )}
        {name === "BNB" && (
            <img src="/BNB.svg" alt="BNB Logo" className="w-full h-full object-contain" />
        )}
        {name === "OPT" && (
            <img src="/ROSE.svg" alt="ROSE Logo" className="w-full h-full object-contain" />
        )}
        {name === "ETH" && (
            <img src="/ETH.svg" alt="ETH Logo" className="w-full h-full object-contain" />
        )}
    </div>
)

export const Hero = ({ onTrackWallet }) => {
  const [address, setAddress] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!address.trim()) {
      toast.error("Please enter a wallet address")
      return
    }

    // Basic address validation
    const isValidEthAddress = /^0x[a-fA-F0-9]{40}$/.test(address.trim())
    const isValidENS = /^([a-zA-Z0-9]+([-._][a-zA-Z0-9]+)*\.)+eth$/.test(address.trim())
    
    if (!isValidEthAddress && !isValidENS) {
      toast.error("Malformed address provided", {
        description: (
          <span style={{ color: "black" }}>
            Please enter a valid Ethereum address or ENS name
          </span>
        ),
      });
      return;
    }

    onTrackWallet(address.trim());
  }

  return (
    <section className="relative h-screen w-full flex flex-col items-center justify-center bg-black -mt-8">
      {/* Grid Background - pure black with subtle grid lines */}
      <div
        className={cn(
          "absolute inset-0",
          "[background-size:40px_40px]",
          // Dark grid lines on black background
          "[background-image:linear-gradient(to_right,rgba(75,75,75,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(75,75,75,0.2)_1px,transparent_1px)]",
        )}
      />

      {/* Subtle purple glow in center */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]">
        <div className="absolute w-[40%] h-[40%] bg-purple-900/30 blur-3xl rounded-full"></div>
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-[36px] font-semibold leading-[44px] text-transparent lg:text-[60px] lg:leading-[72px]">
          Copy-trade most <br /> successful crypto whales.
        </h1>
        <p className="text-md sm:text-lg text-gray-400 mt-3 mb-10 max-w-2xl mx-auto">
          Invest together with Binance Labs, Pantera Capital, and a16z.
        </p>

        <div className="flex justify-center items-center space-x-4 mb-12">
          <CryptoIcon name="OP" color="bg-red-600" className="" />
          <CryptoIcon name="ARB" color="bg-blue-600" className="" />
          <CryptoIcon name="BNB" color="bg-yellow-400" className="" />
          <CryptoIcon name="OPT" color="bg-sky-500" className="" />
          <CryptoIcon name="ETH" color="bg-slate-600" className="" />
        </div>

        <form onSubmit={handleSubmit} className="max-w-xl mx-auto flex shadow-xl">
          <Input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter Wallet Address to Track (e.g., 0x... or ENS)"
            className="rounded-r-none focus-visible:ring-[#8A2BE2] border-r-0 bg-white/90 text-black"
            aria-label="Wallet Address Input"
          />
          <Button type="submit" className="rounded-l-none bg-[#8A2BE2] hover:bg-purple-700 text-white">
            Track
          </Button>
        </form>
      </div>

      {/* Scroll down arrow */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center animate-bounce">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-white/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  )
}