import React, { useEffect, useState } from 'react';
import type { ConsolePage } from '../context/ConsoleContext.tsx';

export type LandingSheetTopic =
  | 'docs'
  | 'roadmap'
  | 'scope';

interface LandingDocsSheetProps {
  topic: LandingSheetTopic | null;
  onClose: () => void;
  onOpenConsole: (page?: ConsolePage) => void;
}

const QUICKSTART_CMD = `npm install
npm run dev

# Production build
npm run build && npm start`;

export const LandingDocsSheet: React.FC<LandingDocsSheetProps> = ({
  topic,
  onClose,
  onOpenConsole,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!topic) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [topic, onClose]);

  if (!topic) return null;

  const copyQuickstart = async () => {
    try {
      await navigator.clipboard.writeText(QUICKSTART_CMD);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable
    }
  };

  return (
    <div
      className="ds-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="ds-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ds-sheet-bar">
          <span className="ds-sheet-tag">
            {topic === 'docs' && 'LOCAL QUICKSTART'}
            {topic === 'roadmap' && 'ROADMAP'}
            {topic === 'scope' && 'SCOPE & HONEST LIMITS'}
          </span>
          <button
            type="button"
            className="ds-sheet-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {topic === 'docs' && (
          <div className="ds-sheet-body">
            <h3>Quickstart &amp; Zero-Card Setup</h3>
            <p>
              DefySwarm starts immediately with an out-of-band Express control plane, a built-in
              versioned object store, and an isolated WORM vault—100% free with zero accounts or
              credit cards needed.
            </p>
            <div className="ds-sheet-code">
              <div className="ds-sheet-code-top">
                <span>Run locally (Node 20+)</span>
                <button type="button" onClick={() => void copyQuickstart()}>
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <pre>
                <code>{QUICKSTART_CMD}</code>
              </pre>
            </div>
            <p>
              The control plane and WebSocket stream run on <code>http://localhost:3000</code>.
              All secrets are optional at boot and can also be configured at runtime via{' '}
              <strong>Setup &amp; Settings</strong> (held strictly in server memory):
            </p>
            <ul className="ds-sheet-list">
              <li><code>GROQ_API_KEY</code> — Optional Groq free-tier key for adaptive AI canaries (<code>openai/gpt-oss-120b</code>)</li>
              <li><code>DEFYSWARM_INGEST_TOKEN</code> — Optional webhook auth &amp; upload token</li>
              <li><code>S3_ACCESS_KEY_ID</code> / <code>S3_SECRET_ACCESS_KEY</code> — Optional credentials for Backblaze B2, Supabase S3, or MinIO</li>
              <li><code>S3_VAULT_ACCESS_KEY_ID</code> / <code>S3_VAULT_SECRET_ACCESS_KEY</code> — Optional external WORM vault credentials</li>
            </ul>
            <div className="ds-sheet-actions">
              <button
                type="button"
                className="ds-btn-primary"
                onClick={() => {
                  onClose();
                  onOpenConsole('setup');
                }}
              >
                <span className="ds-btn-chev">›</span> Open Storage Settings
              </button>
              <button
                type="button"
                className="ds-btn-secondary"
                onClick={() => {
                  onClose();
                  onOpenConsole('war-room');
                }}
              >
                Open Console
              </button>
            </div>
          </div>
        )}

        {topic === 'roadmap' && (
          <div className="ds-sheet-body">
            <h3>Completed Progress &amp; Roadmap</h3>
            <p>
              DefySwarm delivers an out-of-band security control plane for cloud object storage with
              zero credit card requirements across all layers.
            </p>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-ink-1)', marginTop: 16 }}>Completed</h4>
            <ul className="ds-sheet-list">
              <li>
                <strong>Real Cryptographic &amp; Storage Engine</strong> — Real versioned object store,
                64 KB Shannon entropy &amp; magic-byte checks, WORM vault, HTTP 403 principal lockout,
                and SHA-256 1-Click Restore.
              </li>
              <li>
                <strong>4-Signal Behavioral Detection Engine</strong> — Adaptive Canaries, Control-Plane
                Hard Triggers (versioning/purge), Content/KMS/SSE-C inspection, and Distributed AI Swarm Correlation.
              </li>
              <li>
                <strong>Groq Free-Tier BYOK Integration</strong> — <code>openai/gpt-oss-120b</code> adaptive
                decoy synthesis and blind adversarial classifier audits.
              </li>
              <li>
                <strong>30-Run Statistical Benchmark Harness</strong> — Automated MTTD/MTTC measurement,
                false-positive verification, and JSON export.
              </li>
              <li>
                <strong>Institutional Dark Console</strong> — 34px enterprise tables, global Command Palette (⌘K),
                and slide-over Forensic Drawer.
              </li>
            </ul>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-ink-1)', marginTop: 16 }}>In Progress</h4>
            <ul className="ds-sheet-list">
              <li>
                <strong>Real AWS SDK Connectors</strong> — Range-read polling, canary deployment, and WORM
                restore across Backblaze B2, Supabase Storage S3, and self-hosted MinIO.
              </li>
              <li>
                <strong>Authenticated Webhooks &amp; Quota-Safe Poller</strong> — <code>POST /api/ingest/s3-event</code> and
                adaptive 64 KB header sampling inside free API caps.
              </li>
              <li>
                <strong>Zero-Card Alerts &amp; Containment</strong> — Free ntfy.sh / Discord alerts and
                signed HMAC-SHA256 containment webhook dispatch.
              </li>
            </ul>
            <div className="ds-sheet-actions">
              <button
                type="button"
                className="ds-btn-primary"
                onClick={() => {
                  onClose();
                  onOpenConsole('war-room');
                }}
              >
                <span className="ds-btn-chev">›</span> Open Console
              </button>
            </div>
          </div>
        )}

        {topic === 'scope' && (
          <div className="ds-sheet-body">
            <h3>Out-of-Band Architecture &amp; Scope</h3>
            <p>
              DefySwarm operates completely out-of-band without ever running inline on the storage
              data path, eliminating latency overhead and ensuring zero storage performance penalty:
            </p>
            <div className="ds-sheet-code">
              <pre style={{ fontSize: 11, lineHeight: 1.45, overflowX: 'auto' }}>
{`STORAGE SOURCES: Backblaze B2 (10GB) · Supabase S3 (1GB) · MinIO ($0) · Browser API
       │                      │                              │
       ▼ Range Reads          ▼ Authenticated Webhook        ▼ Binary Uploads
CONTROL PLANE (:3000): Ingest Layer ──▶ 4-Signal Detection Engine
       │                                       │
       ▼                                       ▼
ISOLATED WORM VAULT (SHA-256)        ZERO-CARD CONTAINMENT (HTTP 403 & Webhooks)`}
              </pre>
            </div>
            <p>
              <strong>100% Free, Zero-Card Operation</strong>: Compatible with Backblaze B2 (10 GB free),
              Supabase Storage S3 (1 GB free), self-hosted MinIO ($0 forever), Groq API free tier,
              and ntfy.sh alerts.
            </p>
            <p>
              <strong>Containment Scope</strong>: HTTP 403 principal lockout runs on the built-in
              store and application storage path; signed HMAC-SHA256 containment webhooks trigger
              external MinIO <code>mc admin policy</code> revocation. Direct cloud provider IAM
              revocation for out-of-band raw-key writes is tracked on the roadmap.
            </p>
            <div className="ds-sheet-actions">
              <button
                type="button"
                className="ds-btn-primary"
                onClick={() => {
                  onClose();
                  onOpenConsole('simulator');
                }}
              >
                <span className="ds-btn-chev">›</span> Verify in Test Lab
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
