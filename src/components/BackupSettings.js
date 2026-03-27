// src/components/BackupSettings.js
// Settings UI for configuring encrypted cloud backup to Cloudflare R2

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  CloudOff,
  Key,
  UserPlus,
  Shield,
  X,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  HelpCircle,
  Mail,
} from 'lucide-react';
import { getBackupStats } from '../utils/localStorageDB';
import { generateKey, exportKey, importKey } from '../utils/crypto';
import { createS3Client } from '../utils/backup/s3Client';
import { createDriveClient } from '../utils/backup/driveClient';
import { getUploadQueue } from '../utils/backup/uploadQueue';
import {
  signIn as googleSignIn,
  signOut as googleSignOut,
  isSignedIn as isGoogleSignedIn,
  getGoogleUserInfo,
} from '../utils/backup/googleAuth';
import {
  getTrustedContacts,
  addTrustedContact,
  removeTrustedContact,
  AccessGrantManager,
} from '../utils/backup/accessGrants';
import { readEncrypted, writeEncrypted } from '../utils/encryptedStorage';

// LocalStorage key for backup settings
const SETTINGS_KEY = 'safeneighbor_backup_settings';

function BackupSettings({ onClose }) {
  const { t } = useTranslation();

  // Configuration state
  const [isConfigured, setIsConfigured] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [credentials, setCredentials] = useState({
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucket: '',
  });

  // Encryption key state
  const [encryptionKeyString, setEncryptionKeyString] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Trusted contacts state
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', relationship: '' });

  // Status state
  const [backupStats, setBackupStats] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'success' | 'error'
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Access package state
  const [selectedContactForAccess, setSelectedContactForAccess] = useState(null);
  const [accessPackage, setAccessPackage] = useState(null);

  // Setup guide state
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Provider tab state
  const [activeProviderTab, setActiveProviderTab] = useState('r2');

  // Google Drive state
  const [googleSignedIn, setGoogleSignedIn] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
  const [googleConnectionStatus, setGoogleConnectionStatus] = useState(null);
  const [isTestingDrive, setIsTestingDrive] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadStats();
    (async () => {
      setTrustedContacts(await getTrustedContacts());
    })();
    // Check Google sign-in status
    if (isGoogleSignedIn()) {
      setGoogleSignedIn(true);
      const info = getGoogleUserInfo();
      setGoogleEmail(info?.email || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await readEncrypted(SETTINGS_KEY, null);
      if (settings) {
        setIsConfigured(settings.isConfigured || false);
        setAutoBackup(settings.autoBackup || false);
        setCredentials(settings.credentials || { accountId: '', accessKeyId: '', secretAccessKey: '', bucket: '' });
        setEncryptionKeyString(settings.encryptionKey || '');
        // Google Drive settings
        if (settings.googleDrive?.isConfigured) {
          setGoogleEmail(settings.googleDrive.email || '');
        }
      }
    } catch (error) {
      console.error('Failed to load backup settings:', error);
    }
  };

  const loadStats = async () => {
    try {
      const stats = await getBackupStats();
      setBackupStats(stats);
    } catch (error) {
      console.error('Failed to load backup stats:', error);
    }
  };

  const saveSettings = async ({ closeOnSuccess = true } = {}) => {
    setIsSaving(true);
    try {
      // Generate encryption key if not exists
      let keyString = encryptionKeyString;
      if (!keyString) {
        const newKey = await generateKey();
        keyString = await exportKey(newKey);
        setEncryptionKeyString(keyString);
      }

      // Build active providers list
      const activeProviders = [];
      if (credentials.accessKeyId) activeProviders.push('r2');
      if (googleSignedIn) activeProviders.push('google_drive');

      const settings = {
        isConfigured: true,
        autoBackup,
        activeProviders,
        credentials,
        googleDrive: googleSignedIn ? { isConfigured: true, email: googleEmail } : { isConfigured: false },
        encryptionKey: keyString,
      };

      const didWrite = await writeEncrypted(SETTINGS_KEY, settings);
      if (!didWrite) {
        throw new Error('Encrypted backup settings are unavailable until the device is unlocked.');
      }
      setIsConfigured(true);

      // Initialize upload queue if auto-backup is enabled
      if (autoBackup && activeProviders.length > 0) {
        const key = await importKey(keyString);
        const queue = getUploadQueue();
        const providerConfigs = {};
        if (credentials.accessKeyId) providerConfigs.r2 = credentials;
        if (googleSignedIn) providerConfigs.google_drive = true;
        await queue.initialize(key, providerConfigs);
      }

      // Close the settings modal after successful save
      if (onClose && closeOnSuccess) onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(t('backup.failedSaveSettings') + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);

    try {
      const client = createS3Client(credentials);
      const success = await client.testConnection();
      setConnectionStatus(success ? 'success' : 'error');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const generateNewEncryptionKey = async () => {
    if (encryptionKeyString) {
      const confirmed = window.confirm(
        t('backup.regenerateKeyConfirm')
      );
      if (!confirmed) return;
    }

    const newKey = await generateKey();
    const keyString = await exportKey(newKey);
    setEncryptionKeyString(keyString);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(encryptionKeyString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddContact = async () => {
    if (newContact.name && newContact.email) {
      try {
        const added = await addTrustedContact(newContact);
        setTrustedContacts([...trustedContacts, added]);
        setNewContact({ name: '', email: '', relationship: '' });
        setShowAddContact(false);
      } catch (error) {
        alert(t('backup.failedAccessPackage') + error.message);
      }
    }
  };

  const handleRemoveContact = async (id) => {
    if (window.confirm(t('backup.removeContactConfirm'))) {
      try {
        await removeTrustedContact(id);
        setTrustedContacts(trustedContacts.filter(c => c.id !== id));
      } catch (error) {
        alert(t('backup.failedAccessPackage') + error.message);
      }
    }
  };

  const generateAccessForContact = async (contact) => {
    if (!encryptionKeyString || !credentials.accessKeyId) {
      alert(t('backup.configureFirst'));
      return;
    }

    try {
      const key = await importKey(encryptionKeyString);
      const manager = new AccessGrantManager(key, credentials);
      const pkg = await manager.generateAccessPackage(contact);
      setAccessPackage(pkg);
      setSelectedContactForAccess(contact);
    } catch (error) {
      console.error('Failed to generate access package:', error);
      alert(t('backup.failedAccessPackage') + error.message);
    }
  };

  const copyAccessPackage = () => {
    if (accessPackage) {
      const textToCopy = `
${t('backup.accessPackageTitle', { name: accessPackage.contact.name })}
${t('backup.generated')}: ${accessPackage.createdAt}

═══ ${t('backup.r2CredentialsHeader')} ═══
${t('backup.endpoint')}: ${accessPackage.r2.endpoint}
${t('backup.accountIdLabel')}: ${accessPackage.r2.accountId}
${t('backup.bucketLabel')}: ${accessPackage.r2.bucket}
${t('backup.accessKeyIdLabel')}: ${accessPackage.r2.accessKeyId}
${t('backup.secretAccessKeyLabel')}: ${accessPackage.r2.secretAccessKey}

═══ ${t('backup.encryptionKeyHeader')} ═══
${t('backup.algorithm')}: ${accessPackage.encryption.algorithm}
${t('backup.key')}: ${accessPackage.encryption.key}

═══ ${t('backup.instructionsHeader')} ═══
${accessPackage.instructions}
      `.trim();

      navigator.clipboard.writeText(textToCopy);
      alert(t('backup.accessPackageCopied', { name: accessPackage.contact.name }));
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleConnecting(true);
    setGoogleConnectionStatus(null);
    try {
      const tokenData = await googleSignIn();
      setGoogleSignedIn(true);
      setGoogleEmail(tokenData.email || '');
      setGoogleConnectionStatus('success');
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setGoogleConnectionStatus('error');
    } finally {
      setIsGoogleConnecting(false);
    }
  };

  const handleGoogleSignOut = () => {
    googleSignOut();
    setGoogleSignedIn(false);
    setGoogleEmail('');
    setGoogleConnectionStatus(null);
  };

  const [driveError, setDriveError] = useState('');

  const testDriveConnection = async () => {
    setIsTestingDrive(true);
    setGoogleConnectionStatus(null);
    setDriveError('');
    try {
      const client = createDriveClient();
      await client.testConnection();
      setGoogleConnectionStatus('success');
      await saveSettings({ closeOnSuccess: false });
    } catch (error) {
      console.error('Drive connection test failed:', error);
      setGoogleConnectionStatus('error');
      // Extract useful error info
      const msg = error.message || '';
      if (msg.includes('401') || msg.includes('Invalid Credentials')) {
        setDriveError(t('backup.driveTokenExpired'));
      } else if (msg.includes('403')) {
        setDriveError(t('backup.driveAccessDenied'));
      } else if (msg.includes('not authenticated')) {
        setDriveError(t('backup.driveNotAuthenticated'));
      } else {
        setDriveError(msg);
      }
    } finally {
      setIsTestingDrive(false);
    }
  };

  const hasAnyProvider = credentials.accessKeyId || googleSignedIn;

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-hidden safe-modal-frame">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="safe-modal-panel relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-slate-700/60 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.9)]"
      >
        {/* Header */}
        <div className="safe-modal-header flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield size={24} className="text-blue-400" />
            {t('backup.secureBackup')}
          </h2>
          <button
            onClick={onClose}
            className="safe-modal-close inline-flex items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close backup settings"
          >
            <X size={24} />
          </button>
        </div>

        <div className="safe-modal-scroll flex-1 overflow-y-auto px-4 pb-32 pt-4">

        {/* Status Banner */}
        <div className={`rounded-xl p-4 mb-6 ${
          isConfigured
            ? 'bg-green-950/50 border border-green-800'
            : 'bg-amber-950/50 border border-amber-800'
        }`}>
          <div className="flex items-center gap-3">
            {isConfigured ? (
              <>
                <Cloud size={24} className="text-green-400" />
                <div>
                  <p className="text-green-400 font-bold">{t('backup.backupConfigured')}</p>
                  <p className="text-slate-400 text-sm">
                    {t('backup.backupStats', { backedUp: backupStats?.backedUp || 0, total: backupStats?.total || 0 })}
                    {backupStats?.pending > 0 && ` (${t('backup.pendingCount', { count: backupStats.pending })})`}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">{t('backup.encounterLogsSynced')}</p>
                </div>
              </>
            ) : (
              <>
                <CloudOff size={24} className="text-amber-400" />
                <div>
                  <p className="text-amber-400 font-bold">{t('backup.backupNotConfigured')}</p>
                  <p className="text-slate-400 text-sm">{t('backup.setupProviderBelow')}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Provider Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveProviderTab('r2')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeProviderTab === 'r2'
                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400 backdrop-blur-sm'
                : 'bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Cloud size={16} />
            {t('backup.cloudflareR2')}
          </button>
          <button
            onClick={() => setActiveProviderTab('google_drive')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeProviderTab === 'google_drive'
                ? 'bg-green-600/20 border border-green-500/30 text-green-400 backdrop-blur-sm'
                : 'bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:text-slate-300'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 19.5h20L12 2z" />
              <path d="M2 19.5h20" />
              <path d="M15.5 9.5H22l-7 10" />
            </svg>
            {t('backup.googleDrive')}
          </button>
        </div>

        {/* Cloudflare R2 Credentials Section */}
        {activeProviderTab === 'r2' && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Key size={18} />
              {t('backup.r2Credentials')}
            </h3>
            <button
              onClick={() => setShowSetupGuide(true)}
              className="text-cyan-400 bg-cyan-600/20 border border-cyan-500/30 p-1.5 rounded-lg hover:bg-cyan-600/30 backdrop-blur-sm transition-colors"
              title={t('backup.setupGuide')}
            >
              <HelpCircle size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1">{t('backup.accountId')}</label>
              <input
                type="text"
                value={credentials.accountId}
                onChange={(e) => setCredentials({ ...credentials, accountId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder="abc123def456..."
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">{t('backup.accessKeyId')}</label>
              <input
                type="text"
                value={credentials.accessKeyId}
                onChange={(e) => setCredentials({ ...credentials, accessKeyId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder="jv5abc123..."
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">{t('backup.secretAccessKey')}</label>
              <input
                type="password"
                value={credentials.secretAccessKey}
                onChange={(e) => setCredentials({ ...credentials, secretAccessKey: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">{t('backup.bucketName')}</label>
              <input
                type="text"
                value={credentials.bucket}
                onChange={(e) => setCredentials({ ...credentials, bucket: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder="safeneighbor-evidence"
              />
            </div>
          </div>

          {/* Test Connection Button */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={!credentials.accountId || !credentials.accessKeyId || !credentials.bucket || isTestingConnection}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
            >
              {isTestingConnection ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Cloud size={16} />
              )}
              {t('backup.testConnection')}
            </button>
            {connectionStatus === 'success' && (
              <span className="text-green-400 text-sm flex items-center gap-1">
                <Check size={16} /> {t('backup.connected')}
              </span>
            )}
            {connectionStatus === 'error' && (
              <span className="text-red-400 text-sm flex items-center gap-1">
                <AlertTriangle size={16} /> {t('backup.failed')}
              </span>
            )}
          </div>

          <p className="text-slate-500 text-xs mt-3 flex items-center gap-1">
            {t('backup.getFreeCredentials')}
            <a
              href="https://dash.cloudflare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline inline-flex items-center gap-1"
            >
              dash.cloudflare.com <ExternalLink size={12} />
            </a>
            {t('backup.freeStorageNote')}
          </p>
        </div>
        )}

        {/* Google Drive Section */}
        {activeProviderTab === 'google_drive' && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 19.5h20L12 2z" />
              <path d="M2 19.5h20" />
              <path d="M15.5 9.5H22l-7 10" />
            </svg>
            {t('backup.googleDrive')}
          </h3>

          {googleSignedIn ? (
            <div className="space-y-4">
              {/* Connected Status */}
              <div className="flex items-center justify-between bg-green-950/30 border border-green-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-green-400" />
                  <div>
                    <p className="text-green-400 text-sm font-bold">{t('backup.connected')}</p>
                    <p className="text-slate-400 text-xs">{googleEmail}</p>
                  </div>
                </div>
                <button
                  onClick={handleGoogleSignOut}
                  className="text-red-400 hover:text-red-300 text-xs px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-lg"
                >
                  {t('backup.signOut')}
                </button>
              </div>

              {/* Test Connection */}
              <div className="flex items-center gap-3">
                <button
                  onClick={testDriveConnection}
                  disabled={isTestingDrive}
                  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  {isTestingDrive ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Cloud size={16} />
                  )}
                  {t('backup.testConnection')}
                </button>
                {googleConnectionStatus === 'success' && (
                  <span className="text-green-400 text-sm flex items-center gap-1">
                    <Check size={16} /> {t('backup.connected')}
                  </span>
                )}
                {googleConnectionStatus === 'error' && (
                  <span className="text-red-400 text-sm flex items-center gap-1">
                    <AlertTriangle size={16} /> {t('backup.failed')}
                  </span>
                )}
              </div>

              {/* Drive error details */}
              {driveError && (
                <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3">
                  <p className="text-red-400 text-xs">{driveError}</p>
                </div>
              )}

              {/* Info */}
              <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
                <p className="text-slate-300 text-sm">
                  {t('backup.driveStorageInfo')}
                </p>
                <p className="text-slate-400 text-xs">
                  {t('backup.driveEncryptionInfo')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm">
                {t('backup.driveDescription')}
              </p>

              <button
                onClick={handleGoogleSignIn}
                disabled={isGoogleConnecting}
                className="w-full bg-white hover:bg-gray-100 text-gray-800 font-bold py-3 rounded-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
              >
                {isGoogleConnecting ? (
                  <RefreshCw size={18} className="animate-spin text-gray-600" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {isGoogleConnecting ? t('backup.connecting') : t('backup.signInWithGoogle')}
              </button>

              {googleConnectionStatus === 'error' && (
                <p className="text-red-400 text-xs text-center">
                  {t('backup.signInFailed')}
                </p>
              )}

              <p className="text-slate-500 text-xs">
                {t('backup.driveScopeInfo')}
              </p>
            </div>
          )}
        </div>
        )}

        {/* Encryption Key Section */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Shield size={18} />
            {t('backup.encryptionKey')}
          </h3>

          <p className="text-slate-400 text-sm mb-3">
            {t('backup.encryptionKeyDesc')}
          </p>

          {encryptionKeyString ? (
            <div className="space-y-3">
              <div className="bg-slate-900 rounded-lg p-3 break-all">
                <code className="text-green-400 text-xs">
                  {showKey ? encryptionKeyString : '••••••••••••••••••••••••••••••••'}
                </code>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="bg-slate-700 text-white px-3 py-1 rounded text-sm"
                >
                  {showKey ? t('backup.hide') : t('backup.show')}
                </button>
                <button
                  onClick={copyKey}
                  className="bg-slate-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? t('backup.copied') : t('backup.copy')}
                </button>
                <button
                  onClick={() => {
                    const subject = encodeURIComponent(t('backup.emailKeySubject'));
                    const body = encodeURIComponent(
                      `${t('backup.emailKeyTitle')}\n` +
                      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                      `${encryptionKeyString}\n\n` +
                      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                      `${t('backup.emailKeyWarning')}\n` +
                      `${t('backup.algorithm')}: AES-256-GCM\n` +
                      `${t('backup.emailKeyGenerated')}`
                    );
                    window.location.href = `mailto:?subject=${subject}&body=${body}`;
                  }}
                  className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                >
                  <Mail size={14} />
                  {t('backup.emailKey')}
                </button>
                <button
                  onClick={generateNewEncryptionKey}
                  className="bg-slate-700 text-white px-3 py-1 rounded text-sm"
                >
                  {t('backup.regenerate')}
                </button>
              </div>

              {/* Email Key explanation */}
              <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-3 mt-2">
                <p className="text-amber-400 text-xs font-bold mb-1">{t('backup.saveKeyWarningTitle')}</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {t('backup.saveKeyWarningDesc')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={generateNewEncryptionKey}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                {t('backup.generateEncryptionKey')}
              </button>
              <p className="text-slate-500 text-xs">
                {t('backup.generateKeyDesc')}
              </p>
            </div>
          )}
        </div>

        {/* Auto Backup Toggle */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold">{t('backup.autoBackup')}</h3>
              <p className="text-slate-400 text-sm">{t('backup.autoBackupDesc')}</p>
            </div>
            <button
              onClick={() => setAutoBackup(!autoBackup)}
              className={`w-14 h-8 rounded-full transition-colors relative ${
                autoBackup ? 'bg-blue-600' : 'bg-slate-600'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  autoBackup ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Trusted Contacts Section */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <UserPlus size={18} />
            {t('backup.trustedContacts')}
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            {t('backup.trustedContactsDesc')}
          </p>

          {/* Contact List */}
          {trustedContacts.length > 0 ? (
            <div className="space-y-2 mb-4">
              {trustedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3"
                >
                  <div>
                    <p className="text-white font-medium">{contact.name}</p>
                    <p className="text-slate-400 text-sm">{contact.email}</p>
                    {contact.relationship && (
                      <p className="text-slate-500 text-xs">{contact.relationship}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => generateAccessForContact(contact)}
                      className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 bg-blue-600/20 rounded"
                    >
                      {t('backup.shareAccess')}
                    </button>
                    <button
                      onClick={() => handleRemoveContact(contact.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm mb-4 italic">{t('backup.noTrustedContacts')}</p>
          )}

          {/* Add Contact Form */}
          {showAddContact ? (
            <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
              <input
                type="text"
                placeholder={t('backup.namePlaceholder')}
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              />
              <input
                type="email"
                placeholder={t('backup.emailPlaceholder')}
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              />
              <input
                type="text"
                placeholder={t('backup.relationshipPlaceholder')}
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddContact(false)}
                  className="flex-1 bg-slate-700 text-white py-2 rounded"
                >
                  {t('backup.cancel')}
                </button>
                <button
                  onClick={handleAddContact}
                  disabled={!newContact.name || !newContact.email}
                  className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-2 rounded"
                >
                  {t('backup.addContact')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddContact(true)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg"
            >
              {t('backup.addTrustedContact')}
            </button>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={saveSettings}
          disabled={isSaving || !hasAnyProvider}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl mb-6 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              {t('backup.saving')}
            </>
          ) : (
            <>
              <Check size={18} />
              {t('backup.saveBackupSettings')}
            </>
          )}
        </button>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-slate-500 text-xs flex items-center justify-center gap-1">
            <Shield size={14} />
            {t('backup.securityNotice')}
          </p>
        </div>
        </div>

        {/* Cloudflare R2 Setup Guide Modal */}
        <AnimatePresence>
          {showSetupGuide && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 safe-modal-frame">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setShowSetupGuide(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="safe-modal-panel w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/50 flex flex-col relative"
              >
                {/* Header */}
                <div className="safe-modal-header flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
                  <div className="flex items-center gap-2">
                    <Cloud size={20} className="text-cyan-400" />
                    <h2 className="text-lg font-bold text-white">{t('backup.r2SetupGuide')}</h2>
                  </div>
                  <button
                    onClick={() => setShowSetupGuide(false)}
                    className="safe-modal-close p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="safe-modal-scroll p-5 overflow-y-auto flex-1 min-h-0 space-y-4">

                  {/* Section 1: Create Account */}
                  <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-3">
                    <h4 className="text-blue-400 font-bold text-xs uppercase tracking-wider mb-2.5">
                      {t('backup.guideStep1Title')}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep1_1')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep1_2')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep1_3')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Enable R2 */}
                  <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-lg p-3">
                    <h4 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2.5">
                      {t('backup.guideStep2Title')}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <span className="bg-indigo-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep2_1')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-indigo-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep2_2')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-indigo-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep2_3')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-indigo-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep2_4')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: API Credentials */}
                  <div className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-3">
                    <h4 className="text-purple-400 font-bold text-xs uppercase tracking-wider mb-2.5">
                      {t('backup.guideStep3Title')}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <span className="bg-purple-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep3_1')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-purple-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep3_2')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-purple-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep3_3')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-purple-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep3_4')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Enter in App */}
                  <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-lg p-3">
                    <h4 className="text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2.5">
                      {t('backup.guideStep4Title')}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <span className="bg-cyan-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep4_1')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-cyan-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep4_2')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-cyan-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep4_3')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-cyan-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep4_4')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Using Backup */}
                  <div className="bg-green-950/30 border border-green-800/50 rounded-lg p-3">
                    <h4 className="text-green-400 font-bold text-xs uppercase tracking-wider mb-2.5">
                      {t('backup.guideStep5Title')}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep5_1')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep5_2')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep5_3')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep5_4')}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">5</span>
                        <p className="text-slate-300 text-sm">{t('backup.guideStep5_5')}</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 shrink-0">
                  <button
                    onClick={() => setShowSetupGuide(false)}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
                  >
                    {t('backup.gotIt')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Access Package Modal */}
        {accessPackage && selectedContactForAccess && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 safe-modal-frame">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => {
                setAccessPackage(null);
                setSelectedContactForAccess(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="safe-modal-panel relative w-full max-w-md overflow-y-auto rounded-xl border border-slate-600 p-6"
            >
              <button
                onClick={() => {
                  setAccessPackage(null);
                  setSelectedContactForAccess(null);
                }}
                className="safe-modal-close absolute right-4 top-4 inline-flex items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Close access package"
              >
                <X size={20} />
              </button>
              <h3 className="text-xl font-bold text-white mb-4">
                {t('backup.accessPackageFor', { name: selectedContactForAccess.name })}
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                {t('backup.accessPackageDesc', { name: selectedContactForAccess.name })}
              </p>

              <div className="bg-slate-900 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
                <pre className="text-green-400 text-xs whitespace-pre-wrap">
                  {accessPackage.instructions.slice(0, 500)}...
                </pre>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setAccessPackage(null);
                    setSelectedContactForAccess(null);
                  }}
                  className="flex-1 bg-slate-700 text-white py-2 rounded-lg"
                >
                  {t('backup.close')}
                </button>
                <button
                  onClick={copyAccessPackage}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  {t('backup.copyFullPackage')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default BackupSettings;
