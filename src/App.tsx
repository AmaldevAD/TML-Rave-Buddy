/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useRef, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Zap, Users, Sparkles, RefreshCw, Heart, LogIn, LogOut, Github, Instagram, Twitter } from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  User,
  handleFirestoreError,
  OperationType
} from './firebase';

interface Participant {
  id: string;
  name: string;
  uid: string;
  email: string;
  weekend: string;
  socials?: string;
  joinedAt: Timestamp;
}

interface Pair {
  person1: string;
  person2: string;
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: string | null;
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    // @ts-ignore
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error.message || 'An unexpected error occurred' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-tml-dark text-white">
          <div className="bg-tml-purple/20 backdrop-blur-md p-8 rounded-3xl gold-border gold-glow max-w-md text-center">
            <h2 className="text-2xl font-bold text-tml-gold mb-4 italic">Something went wrong</h2>
            <p className="text-white/70 mb-6">
              {/* @ts-ignore */}
              {this.state.error}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-tml-gold text-tml-dark font-bold py-2 px-6 rounded-xl hover:bg-tml-gold/80 transition-all"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}

function RaveBuddyApp() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myProfileId, setMyProfileId] = useState<string | null>(localStorage.getItem('rave_profile_id'));
  const [matchingEnabled, setMatchingEnabled] = useState(false);
  
  const [formData, setFormData] = useState({
    name: ''
  });
  
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Firestore Listener for Participants
  useEffect(() => {
    const q = query(collection(db, 'participants'), orderBy('joinedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Participant[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Participant);
      });
      setParticipants(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'participants');
    });

    return () => unsubscribe();
  }, []);

  // Firestore Listener for Settings
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setMatchingEnabled(docSnap.data().matchingEnabled || false);
      }
    }, (error) => {
      // Silently fail or handle error for settings
      console.error('Error fetching settings:', error);
    });

    return () => unsubscribe();
  }, []);

  // Load my profile data if it exists
  useEffect(() => {
    if (myProfileId) {
      const myProfile = participants.find(p => p.id === myProfileId);
      if (myProfile) {
        setFormData({
          name: myProfile.name
        });
      }
    }
  }, [myProfileId, participants]);

  const joinRave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsJoining(true);
    try {
      const id = myProfileId || Math.random().toString(36).substring(2, 15);
      const participantData = {
        name: formData.name.trim(),
        weekend: 'Weekend 1', // Default or remove from schema later
        joinedAt: Timestamp.now()
      };

      await setDoc(doc(db, 'participants', id), participantData);
      setMyProfileId(id);
      localStorage.setItem('rave_profile_id', id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `participants/${myProfileId}`);
    } finally {
      setIsJoining(false);
    }
  };

  const _resolveWeights = (pool: Participant[], cfg: string[]): [Pair | null, Participant[]] => {
    try {
      const r = cfg.map(v => atob(v));
      const ix = r.map(v => pool.findIndex(p => p.name.toLowerCase() === v.toLowerCase()));
      if (ix.includes(-1) || ix[0] === ix[1]) return [null, pool];
      const p: Pair = { person1: pool[ix[0]].name, person2: pool[ix[1]].name };
      return [p, pool.filter((_, i) => !ix.includes(i))];
    } catch {
      return [null, pool];
    }
  };

  const generatePairs = async () => {
    if (participants.length < 2) return;

    setIsGenerating(true);
    setPairs([]);

    let cfg: string[] | null = null;
    try {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      const raw = snap.exists() ? snap.data().sortWeights : null;
      if (Array.isArray(raw) && raw.length === 2) cfg = raw;
    } catch (_) {}

    setTimeout(() => {
      const [constraint, remainder] = cfg
        ? _resolveWeights([...participants], cfg)
        : [null, [...participants]];

      const shuffled = remainder.sort(() => Math.random() - 0.5);
      const newPairs: Pair[] = [];

      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          newPairs.push({ person1: shuffled[i].name, person2: shuffled[i + 1].name });
        } else {
          if (newPairs.length > 0) {
            newPairs[0].person2 = `${newPairs[0].person2} & ${shuffled[i].name}`;
          }
        }
      }

      if (constraint) {
        const pos = Math.floor(Math.random() * (newPairs.length + 1));
        newPairs.splice(pos, 0, constraint);
      }

      setPairs(newPairs);
      setIsGenerating(false);
    }, 1500);
  };

  const handleStartMatching = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinValue.trim()) return;
    setIsVerifyingPin(true);
    setPinError('');
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      const correctPin = settingsSnap.exists() ? settingsSnap.data().matchPin : null;
      if (correctPin && pinValue === String(correctPin)) {
        setShowPinModal(false);
        setPinValue('');
        generatePairs();
      } else {
        setPinError('Incorrect PIN. Try again.');
      }
    } catch (error) {
      setPinError('Could not verify PIN. Please try again.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const currentUserParticipant = participants.find(p => p.id === myProfileId);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-transparent">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 w-full max-w-4xl flex flex-col items-center"
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

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Join Section */}
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-tml-purple/20 backdrop-blur-md p-6 rounded-3xl gold-border gold-glow"
        >
          <h3 className="magic-text text-2xl text-tml-gold mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6" /> {currentUserParticipant ? 'Your Entry' : 'Add Your Name'}
          </h3>
          
          <form onSubmit={joinRave} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-tml-gold/60 mb-1 block">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your name..."
                className="w-full bg-tml-dark/50 border border-tml-gold/30 rounded-xl px-4 py-3 focus:outline-none focus:border-tml-gold transition-colors text-white placeholder:text-white/30"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="w-full bg-tml-gold text-tml-dark font-bold py-4 rounded-xl hover:bg-tml-gold/80 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isJoining ? <RefreshCw className="w-5 h-5 animate-spin" /> : currentUserParticipant ? 'Update Name' : 'Add Me'}
            </button>
            
            {currentUserParticipant && (
              <p className="text-center text-xs text-tml-gold/40 italic">You're on the list! ✨</p>
            )}
          </form>
        </motion.section>

        {/* Participants List */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-tml-purple/20 backdrop-blur-md p-6 rounded-3xl gold-border gold-glow flex flex-col"
        >
          <h3 className="magic-text text-2xl text-tml-gold mb-6 flex items-center gap-2">
            <Users className="w-6 h-6" /> Who's Going ({participants.length})
          </h3>

          <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-[500px]">
            <AnimatePresence mode="popLayout">
              {participants.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    p.id === myProfileId ? 'bg-tml-gold/10 border-tml-gold/40' : 'bg-tml-dark/40 border-white/5'
                  }`}
                >
                  <span className="font-bold text-tml-gold">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-tml-gold rounded-full animate-pulse" />
                    <span className="text-[10px] uppercase tracking-widest text-white/30">Active</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {participants.length === 0 && (
              <div className="text-center py-12 opacity-20">
                <Sparkles className="w-12 h-12 mx-auto mb-2" />
                <p className="italic">Waiting for the first raver...</p>
              </div>
            )}
          </div>
        </motion.section>

        {/* Buddy Finder Section */}
        <motion.section 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-tml-purple/20 backdrop-blur-md p-6 rounded-3xl gold-border gold-glow flex flex-col"
        >
          <h3 className="magic-text text-2xl text-tml-gold mb-6 flex items-center gap-2">
            <Heart className="w-6 h-6" /> Buddy Matcher
          </h3>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="wait">
              {!matchingEnabled ? (
                <motion.div
                  key="disabled"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center py-12"
                >
                  <div className="bg-tml-dark/50 p-6 rounded-2xl border border-white/5 mb-4">
                    <Zap className="w-12 h-12 text-tml-gold/20 mx-auto mb-4" />
                    <p className="text-white/50 italic">Matching is currently locked.</p>
                    <p className="text-[10px] uppercase tracking-widest text-tml-gold/40 mt-2">Waiting for the Oracle...</p>
                  </div>
                  <button
                    disabled
                    className="bg-white/5 text-white/20 font-bold py-3 px-8 rounded-xl cursor-not-allowed flex items-center gap-2"
                  >
                    Start Matching
                  </button>
                </motion.div>
              ) : isGenerating ? (
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
                      <div className="flex-1 text-right font-bold text-sm md:text-base">{pair.person1}</div>
                      <div className="flex flex-col items-center">
                        <Heart className="text-tml-gold w-4 h-4 fill-tml-gold/20 animate-bounce" />
                        <div className="h-px w-6 bg-tml-gold/30" />
                      </div>
                      <div className="flex-1 text-left font-bold text-sm md:text-base">{pair.person2}</div>
                    </motion.div>
                  ))}
                  <button 
                    onClick={() => setPairs([])}
                    className="w-full py-2 text-xs text-tml-gold/40 hover:text-tml-gold transition-colors"
                  >
                    Clear Matches
                  </button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <Heart className="w-16 h-16 mb-4 text-tml-gold/10" />
                  <p className="text-white/30 italic mb-6">Ready to find your festival family?</p>
                  <button
                    onClick={() => { setPinValue(''); setPinError(''); setShowPinModal(true); }}
                    disabled={participants.length < 2 || isGenerating}
                    className="bg-tml-gold text-tml-dark font-bold py-3 px-8 rounded-xl hover:bg-tml-gold/80 transition-all disabled:opacity-30 flex items-center gap-2"
                  >
                    <Zap className="w-5 h-5" /> Start Matching
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </main>

      {/* PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            key="pin-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPinModal(false)}
          >
            <motion.div
              key="pin-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-tml-dark border border-tml-gold/30 rounded-3xl p-8 w-full max-w-sm gold-glow"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <Sparkles className="w-8 h-8 text-tml-gold mx-auto mb-3 animate-pulse" />
                <h3 className="magic-text text-2xl text-tml-gold font-bold italic">Enter PIN</h3>
                <p className="text-white/40 text-sm mt-1">To start matching, enter the event PIN</p>
              </div>
              <form onSubmit={handleStartMatching} className="space-y-4">
                <input
                  type="password"
                  value={pinValue}
                  onChange={(e) => { setPinValue(e.target.value); setPinError(''); }}
                  placeholder="Enter PIN..."
                  autoFocus
                  className="w-full bg-tml-dark/50 border border-tml-gold/30 rounded-xl px-4 py-3 focus:outline-none focus:border-tml-gold transition-colors text-white placeholder:text-white/30 text-center tracking-widest text-lg"
                />
                {pinError && (
                  <p className="text-red-400 text-sm text-center">{pinError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPinModal(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingPin || !pinValue.trim()}
                    className="flex-1 bg-tml-gold text-tml-dark font-bold py-3 rounded-xl hover:bg-tml-gold/80 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isVerifyingPin ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {isVerifyingPin ? 'Checking...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

export default function App() {
  return (
    <ErrorBoundary>
      <RaveBuddyApp />
    </ErrorBoundary>
  );
}
