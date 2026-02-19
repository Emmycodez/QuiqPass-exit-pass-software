import React from 'react'

const Loader = () => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "radial-gradient(125% 125% at 50% 10%, #fff 40%, #6366f1 100%)"
      }}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          {/* Track */}
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          {/* Animated arc */}
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
            style={{
              borderTopColor: '#6366f1',
              borderRightColor: '#a78bfa',
              animationDuration: '0.9s',
            }}
          />
          {/* Center glow */}
          <div className="absolute inset-[10px] rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 opacity-15 animate-pulse" />
        </div>

        {/* Brand */}
        <p className="text-2xl font-semibold tracking-tight text-gray-700">
          quiq<span className="text-indigo-500">Pass</span>
        </p>

        {/* Bouncing dots */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
        </div>
      </div>
    </div>
  )
}

export default Loader