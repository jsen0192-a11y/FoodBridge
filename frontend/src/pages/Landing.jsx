import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeartHandshake, Sparkles, Building, ChevronRight, Apple } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[91vh] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-emerald-950 text-white relative px-4 overflow-hidden">
      {/* Decorative Blur Background Bulbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>

      {/* Title Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12 max-w-2xl relative z-10"
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles size={12} className="animate-spin-slow" /> surplus food sharing platform
        </span>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
          Food<span className="text-emerald-400">Bridge</span>
        </h1>
        <p className="text-slate-300 mt-4 text-base md:text-lg font-light">
          Connecting local surplus food donations directly with NGOs and community feeding networks in real-time. Select an option below to begin.
        </p>
      </motion.div>

      {/* Cards Section */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full relative z-10">
        
        {/* Card 1: Donate Food */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          whileHover={{ y: -8, scale: 1.02 }}
          className="flex flex-col justify-between p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hover:border-emerald-500/40 transition-colors duration-300 group"
        >
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/25 transition-all">
              <Apple size={32} />
            </div>
            <h2 className="text-2xl font-bold group-hover:text-emerald-400 transition-colors">🍱 Donate Food</h2>
            <p className="text-slate-300 font-light leading-relaxed">
              "I have extra food and want to donate it." Share cooked meals, ingredients, or fresh groceries with nearby welfare distribution channels instantly.
            </p>
          </div>
          <button 
            onClick={() => navigate('/dashboard/donor')}
            className="mt-8 w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
          >
            <span>Donate Food</span>
            <ChevronRight size={18} />
          </button>
        </motion.div>

        {/* Card 2: NGO Dashboard */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          whileHover={{ y: -8, scale: 1.02 }}
          className="flex flex-col justify-between p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hover:border-indigo-500/40 transition-colors duration-300 group"
        >
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/25 transition-all">
              <Building size={32} />
            </div>
            <h2 className="text-2xl font-bold group-hover:text-indigo-400 transition-colors">🏢 NGO Dashboard</h2>
            <p className="text-slate-300 font-light leading-relaxed">
              "I want to receive food donations." Claim active surplus food listings, manage pickup locations, track maps routing, and feed people in need.
            </p>
          </div>
          <button 
            onClick={() => navigate('/dashboard/ngo')}
            className="mt-8 w-full py-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
          >
            <span>Open NGO Dashboard</span>
            <ChevronRight size={18} />
          </button>
        </motion.div>

      </div>

      {/* Footer Branding */}
      <div className="mt-16 text-slate-500 text-xs flex items-center gap-1.5 relative z-10">
        <HeartHandshake size={14} className="text-emerald-500" />
        <span>FoodBridge Foundation © 2026. Made with Care.</span>
      </div>
    </div>
  );
}
