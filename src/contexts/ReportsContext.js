// src/contexts/ReportsContext.js
// Shared Firestore reports subscription so multiple consumers
// (CommunityReports, proximity alerts, route checker) don't create duplicate listeners.

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { decryptReport, decryptDescription } from '../utils/reportEncryption';

// 12-hour marker/feed window
const EXPIRATION_MS = 12 * 60 * 60 * 1000;
// 7-day heat-map window
const HEAT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

const ReportsContext = createContext({
  reports: [],
  heatReports: [],
});

/**
 * Provider that subscribes to Firestore `iceReports` once and shares
 * the decrypted result with all consumers via context.
 */
export function ReportsProvider({ children }) {
  const [reports, setReports] = useState([]);
  const [heatReports, setHeatReports] = useState([]);
  const sessionReportsRef = useRef(new Map());

  useEffect(() => {
    const reportsRef = collection(db, 'iceReports');
    const q = query(reportsRef, orderBy('timestamp', 'desc'));

    const processSnapshot = async (snapshot) => {
      const allDocs = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const reportAge = Date.now() - new Date(data.timestamp || 0).getTime();
        if (reportAge <= HEAT_EXPIRATION_MS) {
          allDocs.push({ id: docSnap.id, data });
        }
      });

      const decrypted = await Promise.all(
        allDocs.map(async ({ id, data }) => {
          let fields;
          if (data.encryptedPayload) {
            try {
              fields = await decryptReport(data.encryptedPayload);
            } catch {
              fields = { description: '[Unable to decrypt]' };
            }
          } else {
            fields = {
              lat: data.lat,
              lng: data.lng,
              city: data.city || '',
              state: data.state || '',
              location: data.location,
              description: data.description,
              agents: data.agents,
              vehicles: data.vehicles,
              activity: data.activity,
            };
            if (data.encryptedDescription) {
              try {
                fields.description = await decryptDescription(data.encryptedDescription);
              } catch {
                fields.description =
                  fields.description === '[encrypted]' ? '[Unable to decrypt]' : fields.description;
              }
            }
          }
          return {
            id,
            ...fields,
            timestamp: data.timestamp,
            verified: data.verified || false,
            verifiers: data.verifiers || [],
          };
        })
      );

      const heatEligible = [];

      // Merge-and-prune: update existing map rather than wiping it.
      // This prevents reports from disappearing mid-session during async decryption.
      decrypted.forEach((report) => {
        const age = Date.now() - new Date(report.timestamp || 0).getTime();
        if (age <= EXPIRATION_MS) {
          sessionReportsRef.current.set(report.id, report); // add or update
        } else {
          sessionReportsRef.current.delete(report.id);       // prune if now expired
        }
        if (report.lat && report.lng) {
          heatEligible.push(report);
        }
      });
      // Remove any report that was deleted from Firestore server-side
      const snapshotIds = new Set(decrypted.map((r) => r.id));
      for (const id of sessionReportsRef.current.keys()) {
        if (!snapshotIds.has(id)) sessionReportsRef.current.delete(id);
      }

      setReports([...sessionReportsRef.current.values()]);
      setHeatReports(heatEligible);
    };

    let unsubscribe = onSnapshot(q, processSnapshot, (error) => {
      console.error('ReportsContext: Error fetching reports:', error);
    });

    // Re-subscribe when tab becomes visible (Firebase WebSocket can drop when backgrounded)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        unsubscribe();
        unsubscribe = onSnapshot(q, processSnapshot, (error) => {
          console.error('ReportsContext: Error fetching reports:', error);
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Sweep expired reports from the cache every 60 seconds so markers disappear
    // promptly at 12 hours without waiting for the next Firestore snapshot.
    const expiryTimer = setInterval(() => {
      let changed = false;
      for (const [id, report] of sessionReportsRef.current) {
        const age = Date.now() - new Date(report.timestamp || 0).getTime();
        if (age > EXPIRATION_MS) {
          sessionReportsRef.current.delete(id);
          changed = true;
        }
      }
      if (changed) setReports([...sessionReportsRef.current.values()]);
    }, 60_000);

    return () => {
      unsubscribe();
      clearInterval(expiryTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <ReportsContext.Provider value={{ reports, heatReports }}>
      {children}
    </ReportsContext.Provider>
  );
}

/** Hook to consume shared reports data. */
export function useReports() {
  return useContext(ReportsContext);
}
