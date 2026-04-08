import { useEffect, useMemo, useState } from 'react'
import type { PlayerProfileSnapshot } from '../lib/playerProfiles'
import { buildSharedProfileUrl } from '../lib/sharedProfiles'

type ShareProfileModalProps = {
  isOpen: boolean
  snapshot: PlayerProfileSnapshot | null
  onClose: () => void
}

const ShareProfileModal = ({
  isOpen,
  snapshot,
  onClose,
}: ShareProfileModalProps) => {
  const [copied, setCopied] = useState(false)
  const shareUrl = useMemo(() => {
    if (!isOpen || !snapshot || typeof window === 'undefined') return ''
    return buildSharedProfileUrl(snapshot)
  }, [isOpen, snapshot])
  const shareMessage = useMemo(() => {
    if (!shareUrl || !snapshot) return ''
    return `Poker Tracker profile for ${snapshot.name}: ${shareUrl}`
  }, [shareUrl, snapshot])

  useEffect(() => {
    if (!isOpen) {
      setCopied(false)
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !snapshot) return null

  const handleCopyLink = async () => {
    if (!shareMessage) return

    try {
      await navigator.clipboard.writeText(shareMessage)
      setCopied(true)
    } catch {
      window.prompt('Copy this profile message', shareMessage)
    }
  }

  const handleWhatsappShare = () => {
    if (!shareMessage) return

    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareMessage)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <div
      className="share-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="share-modal glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="share-modal-header">
          <div>
            <p className="eyebrow">Share profile</p>
            <h3 id="share-modal-title">{snapshot.name}</h3>
            <p className="subtitle">
              Send a read-only player link with copy or WhatsApp.
            </p>
          </div>
          <button
            type="button"
            className="ghost-button share-modal-close"
            onClick={onClose}
            aria-label="Close share dialog"
          >
            Close
          </button>
        </div>

        <label className="share-modal-field">
          Share link
          <input type="text" value={shareUrl} readOnly />
        </label>

        <div className="share-modal-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => void handleCopyLink()}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={handleWhatsappShare}
          >
            Send on WhatsApp
          </button>
        </div>
      </section>
    </div>
  )
}

export default ShareProfileModal
