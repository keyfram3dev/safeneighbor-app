// src/components/Disclaimer.js
// Reusable disclaimer component with scroll-aware opacity
// Full opacity on hover (desktop) and when in middle of viewport (mobile)

import React, { useState, useEffect, useRef } from 'react';
import { Warning } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

const Disclaimer = ({ children }) => {
  const { t } = useTranslation();
  const [inViewCenter, setInViewCenter] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Trigger when element enters the middle ~30% of the viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInViewCenter(entry.isIntersecting);
      },
      { rootMargin: '-35% 0px -35% 0px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`text-center transition-opacity duration-500 ${
        inViewCenter ? 'opacity-100' : 'opacity-50 hover:opacity-100'
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <Warning size={16} weight="bold" className="text-amber-500" />
        <h3 className="text-amber-400 font-medium text-sm tracking-wider">{t('disclaimer.title')}</h3>
      </div>
      <p className="text-slate-400 text-xs leading-relaxed">
        {children}
      </p>
    </div>
  );
};

export default Disclaimer;
