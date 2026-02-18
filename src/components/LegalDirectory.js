// src/components/LegalDirectory.js
// Searchable directory of immigration legal aid organizations, hotlines,
// know-your-rights programs, and online directories.

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  MagnifyingGlass,
  CaretRight,
  Globe,
  MapPin,
  BookOpen,
  Scales,
  UsersThree,
  ListBullets,
  Clock,
  ArrowSquareOut,
  Translate,
  CaretDown,
} from '@phosphor-icons/react';
import {
  RESOURCE_CATEGORIES,
  NATIONAL_RESOURCES,
  STATE_RESOURCES,
  ALL_STATES,
  LAST_VERIFIED,
} from '../data/legalResourceData';
import Disclaimer from './Disclaimer';

const CATEGORY_ICONS = {
  all: ListBullets,
  hotline: Phone,
  'legal-aid': Scales,
  'know-your-rights': BookOpen,
  directory: MagnifyingGlass,
  community: UsersThree,
};

const CATEGORY_COLORS = {
  hotline: 'text-red-400 bg-red-950/40 border-red-800/30',
  'legal-aid': 'text-blue-400 bg-blue-950/40 border-blue-800/30',
  'know-your-rights': 'text-amber-400 bg-amber-950/40 border-amber-800/30',
  directory: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/30',
  community: 'text-purple-400 bg-purple-950/40 border-purple-800/30',
};

function LegalDirectory() {
  const { t } = useTranslation();
  const [selectedState, setSelectedState] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState(new Set());

  // Combine national + state resources and apply filters
  const filteredResources = useMemo(() => {
    const all = [];

    // Flatten national resources
    const nationalFlat = [
      ...NATIONAL_RESOURCES.hotlines,
      ...NATIONAL_RESOURCES.organizations,
      ...NATIONAL_RESOURCES.directories,
      ...NATIONAL_RESOURCES.knowYourRights,
    ];
    nationalFlat.forEach((r) => all.push({ ...r, isNational: true }));

    // Add state resources if selected
    if (selectedState && STATE_RESOURCES[selectedState]) {
      STATE_RESOURCES[selectedState].organizations.forEach((r) =>
        all.push({ ...r, isNational: false, stateName: STATE_RESOURCES[selectedState].name })
      );
    }

    // Filter by category
    let filtered = all;
    if (activeCategory !== 'all') {
      filtered = filtered.filter((r) => r.category === activeCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.city && r.city.toLowerCase().includes(q)) ||
          (r.services && r.services.some((s) => s.toLowerCase().includes(q)))
      );
    }

    return filtered;
  }, [selectedState, activeCategory, searchQuery]);

  const toggleCard = (id) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stripPhone = (phone) => phone?.replace(/[^0-9]/g, '') || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-black text-white mb-2">{t('legalDirectory.title')}</h2>
        <p className="text-slate-400 text-sm">
          {t('legalDirectory.subtitle')}
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlass
          size={18}
          weight="bold"
          className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('legalDirectory.searchPlaceholder')}
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl ps-11 pe-4 py-3.5 text-white text-sm placeholder-slate-600 focus:border-emerald-500 outline-none transition-colors"
        />
      </div>

      {/* State Selector */}
      <div>
        <label className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-2">
          {t('legalDirectory.selectState')}
        </label>
        <div className="relative">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors appearance-none cursor-pointer"
          >
            <option value="">{t('legalDirectory.allStates')}</option>
            {ALL_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <CaretDown
            size={16}
            weight="bold"
            className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {RESOURCE_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id];
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <Icon size={13} weight="bold" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <div className="text-slate-500 text-xs">
        {t('legalDirectory.resourceCount', { count: filteredResources.length })}
        {selectedState && STATE_RESOURCES[selectedState]
          ? t('legalDirectory.inState', { state: STATE_RESOURCES[selectedState].name })
          : ''}
      </div>

      {/* Resource Cards */}
      <div className="space-y-3">
        {filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <MagnifyingGlass size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t('legalDirectory.noResults')}</p>
            <p className="text-slate-600 text-xs mt-1">{t('legalDirectory.noResultsHint')}</p>
          </div>
        ) : (
          filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              expanded={expandedCards.has(resource.id)}
              onToggle={() => toggleCard(resource.id)}
              stripPhone={stripPhone}
              t={t}
            />
          ))
        )}
      </div>

      {/* Online Directories callout */}
      {activeCategory === 'all' || activeCategory === 'directory' ? (
        <div className="bg-gradient-to-br from-emerald-950/30 to-emerald-900/20 backdrop-blur-sm border border-emerald-800/30 rounded-2xl p-5">
          <h3 className="text-emerald-400 font-black uppercase tracking-wider text-sm mb-3">
            {t('legalDirectory.searchDirectories')}
          </h3>
          <p className="text-slate-400 text-xs mb-4 leading-relaxed">
            {t('legalDirectory.searchDirectoriesDesc')}
          </p>
          <div className="space-y-2">
            {NATIONAL_RESOURCES.directories.map((d) => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-800/30 rounded-xl px-4 py-3 text-sm active:scale-95 transition-all hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <ArrowSquareOut size={16} weight="bold" className="text-emerald-400 shrink-0" />
                <span className="text-white font-semibold flex-1 min-w-0 truncate">{d.name}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {/* Last verified date */}
      <p className="text-center text-slate-600 text-xs">
        {t('legalDirectory.lastVerified', { date: LAST_VERIFIED })}
      </p>

      {/* Disclaimer */}
      <Disclaimer>
        {t('legalDirectory.disclaimerText')}
      </Disclaimer>
    </div>
  );
}

// ─── Resource Card ─────────────────────────────────────────────

function ResourceCard({ resource, expanded, onToggle, stripPhone, t }) {
  const categoryColor = CATEGORY_COLORS[resource.category] || 'text-slate-400 bg-slate-800/40 border-slate-700/30';
  const CategoryIcon = CATEGORY_ICONS[resource.category] || ListBullets;

  return (
    <div className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
      <button
        onClick={onToggle}
        className="w-full text-start px-4 py-3.5 flex items-start gap-3 active:scale-[0.99] transition-transform"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${categoryColor}`}>
              <CategoryIcon size={10} weight="bold" />
              {resource.category === 'legal-aid' ? t('legalDirectory.categoryLegalAid') : resource.category === 'know-your-rights' ? t('legalDirectory.categoryKYR') : resource.category.charAt(0).toUpperCase() + resource.category.slice(1)}
            </span>
            {resource.isNational && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{t('legalDirectory.national')}</span>
            )}
            {resource.city && !resource.isNational && (
              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                <MapPin size={9} weight="bold" />
                {resource.city}
              </span>
            )}
          </div>
          <h4 className="text-white font-bold text-sm leading-tight group-hover:text-emerald-100 transition-colors">{resource.name}</h4>
          {!expanded && (
            <p className="text-slate-400 text-xs mt-1 line-clamp-1">{resource.description}</p>
          )}
        </div>
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="mt-1 shrink-0"
        >
          <CaretRight size={14} weight="bold" className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <p className="text-slate-300 text-xs leading-relaxed">{resource.description}</p>

              {/* Phone */}
              {resource.phone && (
                <a
                  href={`tel:${stripPhone(resource.phone)}`}
                  className="flex items-center gap-3 bg-red-950/30 border border-red-700/30 rounded-xl px-4 py-3 text-sm active:scale-95 transition-all hover:-translate-y-0.5 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5"
                >
                  <Phone size={16} weight="bold" className="text-red-400 shrink-0" />
                  <span className="text-white font-semibold flex-1 min-w-0">{resource.name}</span>
                  <span className="text-red-400 font-bold shrink-0 text-xs">{resource.phone}</span>
                </a>
              )}

              {/* Website */}
              {resource.url && (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-colors"
                >
                  <Globe size={14} weight="bold" />
                  {t('legalDirectory.visitWebsite')}
                  <ArrowSquareOut size={12} weight="bold" />
                </a>
              )}

              {/* Hours */}
              {resource.hours && (
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <Clock size={13} weight="bold" className="shrink-0" />
                  <span>{resource.hours}</span>
                </div>
              )}

              {/* Languages */}
              {resource.languages && resource.languages.length > 0 && (
                <div className="flex items-start gap-2 text-slate-500 text-xs">
                  <Translate size={13} weight="bold" className="shrink-0 mt-0.5" />
                  <span>{resource.languages.join(', ')}</span>
                </div>
              )}

              {/* Services */}
              {resource.services && resource.services.length > 0 && (
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">{t('legalDirectory.services')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {resource.services.map((s, i) => (
                      <span
                        key={i}
                        className="bg-slate-800/60 border border-slate-700/40 text-slate-400 text-[10px] px-2 py-0.5 rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LegalDirectory;
