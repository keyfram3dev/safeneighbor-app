// src/components/Welcome.js
// Welcome modal shown on first visit, with app purpose and Stoic quotes

import React from 'react';
import { X, Shield } from '@phosphor-icons/react';
import { Scale } from 'lucide-react';

const Welcome = ({ onClose }) => {
  const quotes = [
    {
      text: "You are a citizen of the world, and a part of it; not a subordinate, but a principal part. For the powers of organizing the whole are in you.",
      author: "Epictetus",
      source: "Discourses, 2.10"
    },
    {
      text: "No one can live happily who has regard to himself alone and transforms everything into a question of his own utility; you must live for your neighbor, if you would live for yourself.",
      author: "Seneca",
      source: "Letters, 48.2"
    },
    {
      text: "That which is not good for the bee-hive, cannot be good for the bee.",
      author: "Marcus Aurelius",
      source: "Meditations, 6.54"
    },
    {
      text: "We were born to work together like feet, hands and eyes, like the two rows of teeth, upper and lower. To obstruct each other is unnatural.",
      author: "Marcus Aurelius",
      source: "Meditations, 2.1"
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-slate-700/50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={20} weight="bold" className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">Welcome to SafeNeighbor</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Main Welcome Message */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Scale size={22} className="text-blue-400" />
              Knowledge is Protection
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              SafeNeighbor empowers you with the knowledge to protect yourself and your community with education on your rights, scripts for ICE encounters, and legal crowd-sourced reporting of ICE and DHS encounters. This app was built with your safety as the highest priority—your data stays on your device, encrypted by default, and never shared without your explicit consent.
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              We believe that informed communities are safer communities. By knowing your rights and supporting one another, we can create a network of mutual aid and protection.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700 my-6"></div>

          {/* Stoic Quotes Section */}
          <div className="mb-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
              Wisdom from the Stoics
            </h4>
            <div className="space-y-4">
              {quotes.map((quote, index) => (
                <div
                  key={index}
                  className="bg-slate-900/50 border border-slate-700 rounded-xl p-4"
                >
                  <p className="text-slate-300 text-sm italic leading-relaxed mb-3">
                    "{quote.text}"
                  </p>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      — {quote.author}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {quote.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700 my-6"></div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-4">
              SafeNeighbor Security
            </p>
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
