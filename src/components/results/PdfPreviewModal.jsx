import { useState } from 'react';
import { validateBest11Data, downloadAuctionReportPDF } from '../../utils/pdfGenerator';
import { formatPrice } from '../../utils/bidUtils';

/* ── Role helpers (duplicated inline to avoid import coupling) ── */
function getBest11Role(player) {
  const raw = (
    player.normalizedCategory || player.role || player.set || player.categoryId || ''
  ).trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (raw === 'wkbatter' || raw === 'wk' || raw.includes('wicket') || raw.includes('keeper')) return 'WK-Batter';
  if (raw.includes('allround') || raw === 'ar') return 'All-Rounder';
  if (raw === 'bowler' || raw.includes('bowl')) return 'Bowler';
  return 'Batter';
}

function isUncapped(p) {
  if (p.capped === false || p.capped === 0) return true;
  if (typeof p.capped === 'string') {
    const v = p.capped.toLowerCase().trim();
    if (v === 'false' || v === 'no' || v === 'uncapped' || v === '0') return true;
  }
  return (p.set || p.categoryId || '').toLowerCase().includes('uncap');
}

const ROLE_ORDER  = ['Batter', 'WK-Batter', 'All-Rounder', 'Bowler'];
const ROLE_META   = {
  'Batter':      { label: 'BATSMEN',         color: '#14d1ff', emoji: '🏏' },
  'WK-Batter':   { label: 'WICKET KEEPERS',  color: '#00e676', emoji: '🧤' },
  'All-Rounder': { label: 'ALL-ROUNDERS',    color: '#7b61ff', emoji: '⚡' },
  'Bowler':      { label: 'BOWLERS',         color: '#ff3cac', emoji: '🎯' },
};

function getRanked(room) {
  const teams = room?.teams ? Object.entries(room.teams) : [];
  return [...teams].sort(([, a], [, b]) => {
    const diff = (b.best11Score || 0) - (a.best11Score || 0);
    if (diff !== 0) return diff;
    // Tie-breaker: sum of scores of the 4 uncapped players in Best 11
    return (b.uncappedBest11TotalScore || 0) - (a.uncappedBest11TotalScore || 0);
  });
}

/* ─────────────────────────────────────────────────────────────── */
/*  Tab components                                                 */
/* ─────────────────────────────────────────────────────────────── */

function TabAuctionSummary({ room }) {
  const teams   = room.teams ? Object.entries(room.teams) : [];
  const players = room.players ? Object.values(room.players) : [];
  const sold    = players.filter(p => p.status === 'sold');
  const unsold  = players.filter(p => p.status === 'unsold');
  const totalSpent = sold.reduce((s, p) => s + (p.soldFor || 0), 0);

  return (
    <div>
      <PreviewSectionTitle>📋 Auction Information</PreviewSectionTitle>
      <PreviewTable rows={[
        ['Auction Name',      room.meta?.name || '—'],
        ['Hosted By',         room.meta?.ownerName || '—'],
        ['Date',              room.meta?.createdAt ? new Date(room.meta.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')],
        ['Status',            '✅ Completed'],
        ['Total Teams',       String(teams.length)],
        ['Total Players',     String(players.length)],
        ['Players Sold',      String(sold.length)],
        ['Players Unsold',    String(unsold.length)],
        ['Total Amount Spent', formatPrice(totalSpent)],
      ]} />

      <PreviewSectionTitle style={{ marginTop: 20 }}>🏟️ Team Overview</PreviewSectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
            {['#', 'Team', 'Players Bought', 'Best 11 Score', 'Uncapped in B11'].map(h => (
              <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: '#aaa', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map(([uid, t], i) => (
            <tr key={uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '7px 10px', color: '#666' }}>{i + 1}</td>
              <td style={{ padding: '7px 10px', fontWeight: 700, color: '#e8f0fe' }}>{t.name}</td>
              <td style={{ padding: '7px 10px', color: '#ccc' }}>{(t.players || []).length}</td>
              <td style={{ padding: '7px 10px', color: '#7b61ff', fontWeight: 800 }}>{t.best11Score ?? '—'}</td>
              <td style={{ padding: '7px 10px', color: '#ffc107' }}>{t.best11UncappedCount ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabTeamSummary({ room }) {
  const teams = room.teams ? Object.entries(room.teams) : [];
  return (
    <div>
      <PreviewSectionTitle>💰 Purse & Spend Breakdown</PreviewSectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
            {['Team', 'Initial Purse', 'Spent', 'Remaining', 'Bought', 'Best 11 Score'].map(h => (
              <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: '#aaa', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map(([uid, t]) => {
            const bought  = t.players || [];
            const spent   = bought.reduce((s, p) => s + (p.soldFor || 0), 0);
            const initial = t.initialPurse || (t.purse || 0) + spent;
            const remaining = t.purse || (initial - spent);
            return (
              <tr key={uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '7px 10px', fontWeight: 700, color: '#e8f0fe' }}>{t.name}</td>
                <td style={{ padding: '7px 10px', color: '#ccc' }}>{formatPrice(initial)}</td>
                <td style={{ padding: '7px 10px', color: '#ff7070' }}>{formatPrice(spent)}</td>
                <td style={{ padding: '7px 10px', color: '#00e676' }}>{formatPrice(remaining)}</td>
                <td style={{ padding: '7px 10px', color: '#ccc', textAlign: 'center' }}>{bought.length}</td>
                <td style={{ padding: '7px 10px', color: '#7b61ff', fontWeight: 800 }}>{t.best11Score ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TabSquads({ room }) {
  const ranked = getRanked(room);
  const [open, setOpen] = useState(ranked[0]?.[0] || null);

  return (
    <div>
      <PreviewSectionTitle>🏏 Complete Purchased Squads</PreviewSectionTitle>
      {ranked.map(([uid, team], idx) => (
        <div key={uid} style={{ marginBottom: 8 }}>
          <button
            onClick={() => setOpen(open === uid ? null : uid)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8, padding: '10px 14px', cursor: 'pointer', color: '#e8f0fe', fontWeight: 700,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem',
            }}
          >
            <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`} {team.name} ({(team.players || []).length} players)</span>
            <span style={{ color: '#7b61ff', fontSize: '0.8rem' }}>⭐ {team.best11Score ?? '—'} {open === uid ? '▲' : '▼'}</span>
          </button>
          {open === uid && (
            <div style={{ padding: '8px 0 4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['S.No', 'Player', 'Category', 'Capped/Uncapped', 'Role', 'Price'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', color: '#777', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(team.players || []).map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                      <td style={{ padding: '5px 8px', color: '#555' }}>{i + 1}</td>
                      <td style={{ padding: '5px 8px', fontWeight: 600, color: '#ddd' }}>{p.name}</td>
                      <td style={{ padding: '5px 8px', color: '#888' }}>{p.set || p.categoryId || '—'}</td>
                      <td style={{ padding: '5px 8px', color: isUncapped(p) ? '#ffc107' : '#aaa' }}>{isUncapped(p) ? 'Uncapped' : 'Capped'}</td>
                      <td style={{ padding: '5px 8px', color: '#aaa' }}>{getBest11Role(p)}</td>
                      <td style={{ padding: '5px 8px', color: '#ffc107', fontWeight: 700 }}>{formatPrice(p.soldFor || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TabBest11({ room }) {
  const ranked = getRanked(room);
  const [open, setOpen] = useState(ranked[0]?.[0] || null);

  return (
    <div>
      <PreviewSectionTitle>⭐ Final Best 11 Selections</PreviewSectionTitle>
      {ranked.map(([uid, team], idx) => {
        const best11 = team.best11 || [];
        return (
          <div key={uid} style={{ marginBottom: 8 }}>
            <button
              onClick={() => setOpen(open === uid ? null : uid)}
              style={{
                width: '100%', background: 'rgba(255,193,7,0.05)', border: '1px solid rgba(255,193,7,0.15)',
                borderRadius: 8, padding: '10px 14px', cursor: 'pointer', color: '#e8f0fe', fontWeight: 700,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem',
              }}
            >
              <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`} {team.name}</span>
              <span style={{ color: '#ffc107' }}>⭐ {team.best11Score ?? '—'} pts · Uncapped: {team.best11UncappedCount ?? '—'} {open === uid ? '▲' : '▼'}</span>
            </button>
            {open === uid && (
              <div style={{ padding: '10px 14px', background: 'rgba(255,193,7,0.02)', border: '1px solid rgba(255,193,7,0.08)', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                {ROLE_ORDER.map(role => {
                  const rPlayers = best11.filter(p => getBest11Role(p) === role);
                  if (!rPlayers.length) return null;
                  const meta = ROLE_META[role];
                  return (
                    <div key={role} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: meta.color, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>
                        {meta.emoji} {meta.label} ({rPlayers.length})
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                        <tbody>
                          {rPlayers.map((p, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '4px 6px', color: '#666', width: 24 }}>{i + 1}</td>
                              <td style={{ padding: '4px 6px', fontWeight: 600, color: '#ddd' }}>{p.name}</td>
                              <td style={{ padding: '4px 6px', color: '#888' }}>{p.set || p.categoryId || '—'}</td>
                              <td style={{ padding: '4px 6px', color: isUncapped(p) ? '#ffc107' : '#888' }}>{isUncapped(p) ? '★ Uncapped' : 'Capped'}</td>
                              <td style={{ padding: '4px 6px', color: '#7b61ff', fontWeight: 800, textAlign: 'right' }}>
                                {p.score != null ? `⭐ ${p.score}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,193,7,0.07)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffc107', letterSpacing: '0.08em' }}>BEST 11 TOTAL SCORE</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.3rem', color: '#7b61ff' }}>{team.best11Score ?? '—'}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TabLeaderboard({ room }) {
  const ranked = getRanked(room);
  const rankIcons = ['🥇', '🥈', '🥉'];

  let isTie = false;
  if (ranked.length >= 2) {
    // COMPLETE TIE: same best11Score AND same uncappedBest11TotalScore
    isTie = (ranked[0][1].best11Score || 0) === (ranked[1][1].best11Score || 0) &&
             (ranked[0][1].uncappedBest11TotalScore || 0) === (ranked[1][1].uncappedBest11TotalScore || 0);
  }

  const tieBreakerApplied = !isTie && ranked.length >= 2 &&
    (ranked[0][1].best11Score || 0) === (ranked[1][1].best11Score || 0);

  return (
    <div>
      {/* Winner banner */}
      {!isTie && ranked.length > 0 && (
        <div style={{ marginBottom: 16, padding: '18px 20px', background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.25)', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#00e676', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>AUCTION ARENA WINNER</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', marginBottom: 6 }}>{ranked[0][1].name}</div>
          <div style={{ fontSize: '0.8rem', color: '#7b61ff', fontWeight: 700 }}>Best 11 Score: {ranked[0][1].best11Score ?? '—'}</div>
          <div style={{ fontSize: '0.75rem', color: '#14d1ff', marginTop: 3 }}>Uncapped-4 Score: {ranked[0][1].uncappedBest11TotalScore ?? '—'}</div>
          {tieBreakerApplied && (
            <div style={{ marginTop: 10, fontSize: '0.7rem', color: '#ffc107', padding: '6px 12px', background: 'rgba(255,193,7,0.07)', borderRadius: 6, display: 'inline-block' }}>
              ⚖️ Tie-breaker: Higher Uncapped-4 Score ({ranked[0][1].uncappedBest11TotalScore} vs {ranked[1]?.[1]?.uncappedBest11TotalScore})
            </div>
          )}
        </div>
      )}
      {isTie && (
        <div style={{ marginBottom: 16, padding: '16px 20px', background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.25)', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>⚖️</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#ffc107' }}>TIE — ADMIN DECISION REQUIRED</div>
          <div style={{ fontSize: '0.72rem', color: '#888', marginTop: 5 }}>Two or more teams have equal Best 11 Score and equal Uncapped-4 Score. Admin decision required.</div>
        </div>
      )}

      <PreviewSectionTitle>📊 Final Leaderboard (Best 11 Scores Only)</PreviewSectionTitle>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ranked.map(([uid, t], i) => (
          <div key={uid} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 10,
            background: i === 0 ? 'rgba(0,230,118,0.04)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${i === 0 ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.06)'}`,
          }}>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', minWidth: 32, textAlign: 'center' }}>
              {i < 3 ? rankIcons[i] : `#${i + 1}`}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e8f0fe' }}>{t.name}</div>
              <div style={{ fontSize: '0.68rem', color: '#666', marginTop: 2 }}>
                Uncapped-4 Score (tie-breaker): {t.uncappedBest11TotalScore ?? '—'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.1rem', color: '#7b61ff' }}>
                ⭐ {t.best11Score ?? '—'}
              </div>
              <div style={{ fontSize: '0.6rem', color: '#555' }}>Best 11 Score</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
        <div style={{ fontSize: '0.68rem', color: '#555', lineHeight: 1.6 }}>
          <strong style={{ color: '#777' }}>Scoring rules:</strong><br />
          • Final team score = sum of the 11 manually selected Best 11 players' scores only<br />
          • Remaining purchased squad players are NOT included in scoring<br />
          • Primary tie-breaker: sum of scores of the 4 Uncapped players in Best 11 (higher wins)<br />
          • Complete tie (both scores equal) = Admin decision required
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Shared helpers                                                 */
/* ─────────────────────────────────────────────────────────────── */

function PreviewSectionTitle({ children, style }) {
  return (
    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.07)', ...style }}>
      {children}
    </div>
  );
}

function PreviewTable({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
            <td style={{ padding: '7px 10px', color: '#777', fontWeight: 600, width: '45%' }}>{label}</td>
            <td style={{ padding: '7px 10px', color: '#e8f0fe' }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Modal Component                                           */
/* ─────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'summary',     label: '📋 Summary' },
  { id: 'finances',   label: '💰 Finances' },
  { id: 'squads',     label: '🏏 Squads' },
  { id: 'best11',     label: '⭐ Best 11' },
  { id: 'leaderboard',label: '🏆 Leaderboard' },
];

export default function PdfPreviewModal({ room, onClose }) {
  const [activeTab,    setActiveTab]    = useState('summary');
  const [downloading,  setDownloading]  = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const { valid: isReady, errors: validationErrors } = validateBest11Data(room);

  const handleDownload = async () => {
    if (!isReady) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const result = downloadAuctionReportPDF(room);
      if (!result.valid) {
        setDownloadError(result.errors.join('\n'));
      }
    } catch (err) {
      setDownloadError('PDF generation failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 200 }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 201, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, pointerEvents: 'none',
      }}>
        <div style={{
          background: '#080814', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18, width: '100%', maxWidth: 760, maxHeight: '95vh',
          display: 'flex', flexDirection: 'column', pointerEvents: 'all',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
          animation: 'fadeInUp 0.25s ease',
        }}>

          {/* Header */}
          <div style={{
            padding: '16px 20px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>📄 Final Report Preview</div>
              <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>
                {room?.meta?.name || 'Auction Arena'} · {isReady ? '✅ Ready to download' : '⚠️ Not ready'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#888', fontSize: '1rem', padding: '5px 12px', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Validation warnings */}
          {!isReady && (
            <div style={{ padding: '12px 20px', background: 'rgba(255,80,80,0.06)', borderBottom: '1px solid rgba(255,80,80,0.15)', flexShrink: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ff6060', marginBottom: 6 }}>⚠️ Cannot generate PDF:</div>
              {validationErrors.map((e, i) => (
                <div key={i} style={{ fontSize: '0.72rem', color: '#ff9090', paddingLeft: 12, marginBottom: 3 }}>• {e}</div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, padding: '8px 16px 0', flexShrink: 0, overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '7px 13px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
                  fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                  background: activeTab === tab.id ? 'rgba(123,97,255,0.15)' : 'transparent',
                  color: activeTab === tab.id ? '#7b61ff' : '#666',
                  borderBottom: activeTab === tab.id ? '2px solid #7b61ff' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {activeTab === 'summary'      && <TabAuctionSummary room={room} />}
            {activeTab === 'finances'     && <TabTeamSummary room={room} />}
            {activeTab === 'squads'       && <TabSquads room={room} />}
            {activeTab === 'best11'       && <TabBest11 room={room} />}
            {activeTab === 'leaderboard'  && <TabLeaderboard room={room} />}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end',
            flexShrink: 0, background: 'rgba(255,255,255,0.01)',
          }}>
            {downloadError && (
              <div style={{ flex: 1, fontSize: '0.7rem', color: '#ff6060' }}>⚠️ {downloadError}</div>
            )}
            <button
              onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#777', cursor: 'pointer', fontSize: '0.82rem' }}
            >
              Close
            </button>
            <button
              id="pdf-download-btn"
              onClick={handleDownload}
              disabled={!isReady || downloading}
              style={{
                padding: '9px 22px', borderRadius: 10, border: 'none', cursor: isReady ? 'pointer' : 'not-allowed',
                background: isReady
                  ? (downloading ? 'rgba(255,193,7,0.3)' : 'linear-gradient(135deg, #ffc107, #ff9800)')
                  : 'rgba(255,255,255,0.06)',
                color: isReady ? '#000' : '#555', fontWeight: 800, fontSize: '0.82rem',
                transition: 'all 0.2s',
              }}
            >
              {downloading ? '⏳ Generating...' : '⬇ Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
