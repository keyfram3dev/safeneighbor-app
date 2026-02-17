import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Copy, Play, Download } from 'lucide-react';

const VideoCard = ({ recording, onPlay, onDelete, onCopy }) => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);

  // Create blob URL from stored blob
  useEffect(() => {
    if (recording?.blob) {
      const url = URL.createObjectURL(recording.blob);
      setBlobUrl(url);

      // Cleanup
      return () => URL.revokeObjectURL(url);
    }
  }, [recording?.blob]);

  const handleDelete = async () => {
    if (!recording?.id) return;

    if (window.confirm(t('record.confirmDelete'))) {
      setIsDeleting(true);
      await onDelete(recording.id);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return t('record.unknownDate');

    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('record.justNow');
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex gap-4">
        {/* Thumbnail/Preview */}
        <div className="relative flex-shrink-0">
          <div className="w-32 h-20 bg-slate-900 rounded overflow-hidden flex items-center justify-center">
            {recording?.thumbnailUrl ? (
              <img
                src={recording.thumbnailUrl}
                alt="Recording thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-slate-600">
                <Play size={24} />
              </div>
            )}
          </div>
          {recording?.duration && (
            <div className="absolute bottom-1 end-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
              {formatDuration(recording.duration)}
            </div>
          )}
        </div>

        {/* Info and Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate">
                {recording?.title || t('record.untitledRecording')}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <span>{formatDate(recording?.createdAt)}</span>
                {recording?.location && (
                  <>
                    <span>•</span>
                    <span className="truncate">{recording.location?.address || t('record.locationRecorded')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onPlay(recording, blobUrl)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              <Play size={14} />
              <span>{t('record.play')}</span>
            </button>

            <button
              onClick={() => onCopy(blobUrl)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
              title={t('record.copyLink')}
            >
              <Copy size={14} />
            </button>

            <button
              onClick={() => {
                if (blobUrl) {
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = `recording-${recording.id || 'unknown'}.webm`;
                  a.click();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
              title={t('record.download')}
            >
              <Download size={14} />
            </button>

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded transition-colors disabled:opacity-50"
              title={t('record.delete')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
