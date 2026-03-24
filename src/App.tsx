/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Zap, Users, Sparkles, RefreshCw, Heart } from 'lucide-react';

interface Pair {
  person1: string;
  person2: string;
}

export default function App() {
  const [names, setNames] = useState<string[]>([]);
  const [currentName, setCurrentName] = useState('');
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addName = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = currentName.trim();
    if (trimmed && !names.includes(trimmed)) {
      setNames([...names, trimmed]);
      setCurrentName('');
      inputRef.current?.focus();
    }
  };

  const removeName = (index: number) => {
    setNames(names.filter((_, i) => i !== index));
    setPairs([]);
  };

  const generatePairs = () => {
    if (names.length < 2) return;
    
    setIsGenerating(true);
    setPairs([]);

    // Simulate "finding" buddies with a delay
    setTimeout(() => {
      const shuffled = [...names].sort(() => Math.random() - 0.5);
      const newPairs: Pair[] = [];
      
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          newPairs.push({
            person1: shuffled[i],
            person2: shuffled[i + 1]
          });
        } else {
          // Odd one out gets a special "Solo Hero" or "Trio" status
          // Let's just pair them with the first pair to make a trio for now
          if (newPairs.length > 0) {
            newPairs[0].person2 = `${newPairs[0].person2} & ${shuffled[i]}`;
          } else {
            // Only 1 person? Should be handled by names.length < 2
          }
        }
      }
      
      setPairs(newPairs);
      setIsGenerating(false);
    }, 1500);
  };

  const reset = () => {
    setNames([]);
    setPairs([]);
    setCurrentName('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-transparent">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="text-tml-gold w-6 h-6 animate-pulse" />
          <span className="text-tml-gold tracking-[0.3em] text-xs font-bold uppercase">The Magic Land</span>
          <Sparkles className="text-tml-gold w-6 h-6 animate-pulse" />
        </div>
        <h1 className="text-4xl md:text-6xl magic-text font-bold gold-text-glow text-tml-gold mb-2 italic">
          TML - Not a cult
        </h1>
        <h2 className="text-xl md:text-2xl font-light tracking-widest uppercase text-purple-200 opacity-80">
          Rave Buddy Finder
        </h2>
      </motion.header>

      <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-tml-purple/20 backdrop-blur-md p-6 rounded-3xl gold-border gold-glow"
        >
          <h3 className="magic-text text-2xl text-tml-gold mb-6 flex items-center gap-2">
            <Users className="w-6 h-6" /> Add People
          </h3>
          
          <form onSubmit={addName} className="flex gap-2 mb-6">
            <input
              ref={inputRef}
              type="text"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              placeholder="Enter name..."
              className="flex-1 bg-tml-dark/50 border border-tml-gold/30 rounded-xl px-4 py-3 focus:outline-none focus:border-tml-gold transition-colors text-white placeholder:text-white/30"
            />
            <button
              type="submit"
              className="bg-tml-gold text-tml-dark p-3 rounded-xl hover:bg-tml-gold/80 transition-all active:scale-95 flex items-center justify-center"
            >
              <Plus className="w-6 h-6" />
            </button>
          </form>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {names.map((name, index) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  layout
                  className="flex items-center justify-between bg-tml-dark/40 p-3 rounded-xl border border-white/5 group hover:border-tml-gold/30 transition-all"
                >
                  <span className="font-medium">{name}</span>
                  <button
                    onClick={() => removeName(index)}
                    className="text-white/30 hover:text-red-400 p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {names.length === 0 && (
              <p className="text-center text-white/30 py-8 italic">No ravers added yet...</p>
            )}
          </div>

          {names.length > 0 && (
            <div className="mt-6 flex gap-2">
              <button
                onClick={generatePairs}
                disabled={names.length < 2 || isGenerating}
                className="flex-1 bg-tml-gold text-tml-dark font-bold py-3 rounded-xl hover:bg-tml-gold/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" /> Finding Buddies...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" /> Find Rave Buddies
                  </>
                )}
              </button>
              <button
                onClick={reset}
                className="p-3 rounded-xl border border-tml-gold/30 text-tml-gold hover:bg-tml-gold/10 transition-all"
                title="Reset All"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          )}
        </motion.section>

        {/* Results Section */}
        <motion.section 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-tml-purple/20 backdrop-blur-md p-6 rounded-3xl gold-border gold-glow flex flex-col"
        >
          <h3 className="magic-text text-2xl text-tml-gold mb-6 flex items-center gap-2">
            <Heart className="w-6 h-6" /> Rave Buddies
          </h3>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center py-12"
                >
                  <div className="relative w-24 h-24 mb-4">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-4 border-tml-gold border-t-transparent rounded-full"
                    />
                    <Sparkles className="absolute inset-0 m-auto text-tml-gold w-8 h-8 animate-pulse" />
                  </div>
                  <p className="magic-text text-xl text-tml-gold italic">Consulting the Oracle...</p>
                </motion.div>
              ) : pairs.length > 0 ? (
                <div className="space-y-4">
                  {pairs.map((pair, index) => (
                    <motion.div
                      key={`${pair.person1}-${pair.person2}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-r from-tml-purple/40 to-tml-accent/40 p-4 rounded-2xl border border-tml-gold/20 flex items-center justify-center gap-4 relative overflow-hidden group"
                    >
                      <div className="absolute top-0 left-0 w-full h-full bg-tml-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex-1 text-right font-bold text-lg">{pair.person1}</div>
                      <div className="flex flex-col items-center">
                        <Heart className="text-tml-gold w-6 h-6 fill-tml-gold/20 animate-bounce" />
                        <div className="h-px w-8 bg-tml-gold/30" />
                      </div>
                      <div className="flex-1 text-left font-bold text-lg">{pair.person2}</div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center py-12 opacity-30"
                >
                  <Users className="w-16 h-16 mb-4" />
                  <p className="italic">Add at least 2 people to find buddies</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </main>

      <footer className="mt-auto py-8 text-center text-white/30 text-sm">
        <p>Live Today, Love Tomorrow, Unite Forever</p>
        <p className="mt-2">All rights to amaldev</p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.4);
        }
      `}</style>
    </div>
  );
}
