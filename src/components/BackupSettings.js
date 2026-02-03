// src/components/BackupSettings.js
// Settings UI for configuring encrypted cloud backup to Cloudflare R2

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { getBackupStats } from '../utils/localStorageDB';
import { generateKey, exportKey, importKey } from '../utils/crypto';
import { createS3Client } from '../utils/backup/s3Client';
import { getUploadQueue } from '../utils/backup/uploadQueue';
import {
  getTrustedContacts,
  addTrustedContact,
  removeTrustedContact,
  AccessGrantManager,
} from '../utils/backup/accessGrants';

// LocalStorage key for backup settings
const SETTINGS_KEY = 'safeneighbor_backup_settings';

function BackupSettings({ onClose }) {
  // Configuration state
  const [isConfigured, setIsConfigured] = useState(false);
  const [autoBackup, setAutoBackup] = useState(false);
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

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadStats();
    setTrustedContacts(getTrustedContacts());
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        setIsConfigured(settings.isConfigured || false);
        setAutoBackup(settings.autoBackup || false);
        setCredentials(settings.credentials || { accountId: '', accessKeyId: '', secretAccessKey: '', bucket: '' });
        setEncryptionKeyString(settings.encryptionKey || '');
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

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Generate encryption key if not exists
      let keyString = encryptionKeyString;
      if (!keyString) {
        const newKey = await generateKey();
        keyString = await exportKey(newKey);
        setEncryptionKeyString(keyString);
      }

      const settings = {
        isConfigured: true,
        autoBackup,
        credentials,
        encryptionKey: keyString,
      };

      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setIsConfigured(true);

      // Initialize upload queue if auto-backup is enabled
      if (autoBackup && credentials.accessKeyId) {
        const key = await importKey(keyString);
        const queue = getUploadQueue();
        await queue.initialize(key, credentials);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings: ' + error.message);
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
        'This will generate a new encryption key. Previously backed up files will need the old key to decrypt. Continue?'
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

  const handleAddContact = () => {
    if (newContact.name && newContact.email) {
      const added = addTrustedContact(newContact);
      setTrustedContacts([...trustedContacts, added]);
      setNewContact({ name: '', email: '', relationship: '' });
      setShowAddContact(false);
    }
  };

  const handleRemoveContact = (id) => {
    if (window.confirm('Remove this trusted contact?')) {
      removeTrustedContact(id);
      setTrustedContacts(trustedContacts.filter(c => c.id !== id));
    }
  };

  const generateAccessForContact = async (contact) => {
    if (!encryptionKeyString || !credentials.accessKeyId) {
      alert('Please configure backup settings first');
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
      alert('Failed to generate access package: ' + error.message);
    }
  };

  const copyAccessPackage = () => {
    if (accessPackage) {
      const textToCopy = `
SafeNeighbor Emergency Access Package for ${accessPackage.contact.name}
Generated: ${accessPackage.createdAt}

═══ CLOUDFLARE R2 CREDENTIALS ═══
Endpoint: ${accessPackage.r2.endpoint}
Account ID: ${accessPackage.r2.accountId}
Bucket: ${accessPackage.r2.bucket}
Access Key ID: ${accessPackage.r2.accessKeyId}
Secret Access Key: ${accessPackage.r2.secretAccessKey}

═══ ENCRYPTION KEY ═══
Algorithm: ${accessPackage.encryption.algorithm}
Key: ${accessPackage.encryption.key}

═══ INSTRUCTIONS ═══
${accessPackage.instructions}
      `.trim();

      navigator.clipboard.writeText(textToCopy);
      alert('Access package copied to clipboard. Share securely with ' + accessPackage.contact.name);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield size={24} className="text-blue-400" />
            Secure Backup
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2"
          >
            <X size={24} />
          </button>
        </div>

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
                  <p className="text-green-400 font-bold">Backup Configured</p>
                  <p className="text-slate-400 text-sm">
                    {backupStats?.backedUp || 0} of {backupStats?.total || 0} recordings backed up
                    {backupStats?.pending > 0 && ` (${backupStats.pending} pending)`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <CloudOff size={24} className="text-amber-400" />
                <div>
                  <p className="text-amber-400 font-bold">Backup Not Configured</p>
                  <p className="text-slate-400 text-sm">Set up Cloudflare R2 credentials below</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cloudflare R2 Credentials Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Key size={18} />
            Cloudflare R2 Credentials
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Account ID</label>
              <input
                type="text"
                value={credentials.accountId}
                onChange={(e) => setCredentials({ ...credentials, accountId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder="abc123def456..."
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Access Key ID</label>
              <input
                type="text"
                value={credentials.accessKeyId}
                onChange={(e) => setCredentials({ ...credentials, accessKeyId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder="jv5abc123..."
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Secret Access Key</label>
              <input
                type="password"
                value={credentials.secretAccessKey}
                onChange={(e) => setCredentials({ ...credentials, secretAccessKey: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Bucket Name</label>
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
              Test Connection
            </button>
            {connectionStatus === 'success' && (
              <span className="text-green-400 text-sm flex items-center gap-1">
                <Check size={16} /> Connected
              </span>
            )}
            {connectionStatus === 'error' && (
              <span className="text-red-400 text-sm flex items-center gap-1">
                <AlertTriangle size={16} /> Failed
              </span>
            )}
          </div>

          <p className="text-slate-500 text-xs mt-3 flex items-center gap-1">
            Get free credentials at
            <a
              href="https://dash.cloudflare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline inline-flex items-center gap-1"
            >
              dash.cloudflare.com <ExternalLink size={12} />
            </a>
            (10GB free, zero egress fees)
          </p>
        </div>

        {/* Encryption Key Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Shield size={18} />
            Encryption Key
          </h3>

          <p className="text-slate-400 text-sm mb-3">
            Files are encrypted locally before upload. Save this key securely - it's needed to decrypt your backups.
          </p>

          {encryptionKeyString ? (
            <div className="space-y-3">
              <div className="bg-slate-900 rounded-lg p-3 break-all">
                <code className="text-green-400 text-xs">
                  {showKey ? encryptionKeyString : '••••••••••••••••••••••••••••••••'}
                </code>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="bg-slate-700 text-white px-3 py-1 rounded text-sm"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={copyKey}
                  className="bg-slate-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={generateNewEncryptionKey}
                  className="bg-slate-700 text-white px-3 py-1 rounded text-sm"
                >
                  Regenerate
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={generateNewEncryptionKey}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Generate Encryption Key
            </button>
          )}
        </div>

        {/* Auto Backup Toggle */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold">Auto-Backup</h3>
              <p className="text-slate-400 text-sm">Automatically backup marked recordings</p>
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
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <UserPlus size={18} />
            Trusted Contacts
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Share access with people who can retrieve your recordings in an emergency.
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
                      Share Access
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
            <p className="text-slate-500 text-sm mb-4 italic">No trusted contacts added yet</p>
          )}

          {/* Add Contact Form */}
          {showAddContact ? (
            <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
              <input
                type="text"
                placeholder="Name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              />
              <input
                type="text"
                placeholder="Relationship (e.g., Attorney, Family)"
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddContact(false)}
                  className="flex-1 bg-slate-700 text-white py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddContact}
                  disabled={!newContact.name || !newContact.email}
                  className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-2 rounded"
                >
                  Add Contact
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddContact(true)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg"
            >
              + Add Trusted Contact
            </button>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={saveSettings}
          disabled={isSaving || !credentials.accountId || !credentials.accessKeyId || !credentials.bucket}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl mb-6 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check size={18} />
              Save Backup Settings
            </>
          )}
        </button>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-slate-500 text-xs flex items-center justify-center gap-1">
            <Shield size={14} />
            All files encrypted locally before upload. Only you and your trusted contacts can decrypt.
          </p>
        </div>

        {/* Access Package Modal */}
        {accessPackage && selectedContactForAccess && (
          <div className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">
                Access Package for {selectedContactForAccess.name}
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                This package contains everything needed to access and decrypt your recordings.
                Share it securely with {selectedContactForAccess.name}.
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
                  Close
                </button>
                <button
                  onClick={copyAccessPackage}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  Copy Full Package
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BackupSettings;
