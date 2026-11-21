import React from 'react';
import { Activity, ChevronDown, Database, HardDrive, Radar, ShieldCheck, Workflow } from 'lucide-react';
import type { ConsoleBootstrapState } from '../shared/types.ts';

export function SystemFlow({ state }: { state: ConsoleBootstrapState }) {
  const external = state.storage.activeAdapter === 'minio' && state.storage.minioConnected;
  const flagged = state.events.filter(event => event.signals.length > 0).length;
  return <section className="analytics-flow" aria-label="Storage protection flow">
    <div className="panel-title"><h2>Protection pipeline</h2><span>Current configuration</span></div>
    <div className="flow-canvas">
      <div className="flow-column flow-inputs">
        <details className="flow-node"><summary><HardDrive size={16} /><strong>Storage</strong><span>{state.buckets.length}</span><ChevronDown size={14} /></summary><div className="flow-details">{state.buckets.map(bucket => <p key={bucket.name}>{bucket.name}</p>)}</div></details>
        <details className="flow-node"><summary><Activity size={16} /><strong>Event records</strong><span>{state.events.length}</span><ChevronDown size={14} /></summary><div className="flow-details"><p>{flagged} flagged records</p><p>{state.events.filter(event => event.httpStatus === 403).length} blocked requests recorded</p></div></details>
        <details className="flow-node"><summary><Radar size={16} /><strong>Canaries</strong><span>{state.canaries.length}</span><ChevronDown size={14} /></summary><div className="flow-details"><p>Read trips raise a watchlist signal.</p><p>Write trips trigger containment rules.</p></div></details>
      </div>
      <div className="flow-engine flow-node">
        <div className="flow-engine-title"><span className="flow-engine-icon"><Workflow size={19} /></span><div><strong>DefySwarm</strong><small>Detection engine</small></div></div>
        <dl><div><dt>Enforcement</dt><dd>{state.policy.mode === 'active' ? 'Active' : 'Dry-run'}</dd></div><div><dt>Watchlist score</dt><dd>{state.policy.detection.score.watchlist}</dd></div><div><dt>Containment score</dt><dd>{state.policy.detection.score.contain}</dd></div></dl>
      </div>
      <div className="flow-column flow-outputs">
        <details className="flow-node"><summary><ShieldCheck size={16} /><strong>Incidents</strong><span>{state.incidents.length}</span><ChevronDown size={14} /></summary><div className="flow-details"><p>{state.incidents.filter(incident => incident.status === 'RESTORED').length} restored</p><p>{state.principals.filter(principal => principal.status === 'REVOKED').length} principals revoked locally</p></div></details>
        <details className="flow-node"><summary><Database size={16} /><strong>Recovery vault</strong><ChevronDown size={14} /></summary><div className="flow-details"><p>{external ? state.storage.vaultBucket || 'External vault not configured' : state.vault.vaultBucket}</p><p>{state.vault.manifestCount} local clean snapshots</p><p>Replication {state.vault.replicationPaused ? 'paused' : 'running'}</p></div></details>
      </div>
    </div>
    <div className="flow-caption"><span>{external ? state.storage.provider : 'Local storage'}</span><span>{external ? state.storage.productionBucket : 'Built-in object store'}</span></div>
  </section>;
}
