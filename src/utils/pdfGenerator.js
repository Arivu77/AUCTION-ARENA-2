/**
 * ── Auction Arena — PDF Report Generator ─────────────────────────────────────
 *
 * Uses jsPDF + jsPDF-AutoTable to produce a structured multi-page PDF.
 *
 * CRITICAL RULE: Winner is determined ONLY by Best 11 Score (sum of the
 * 11 manually selected players' scores). Remaining squad players are
 * strictly excluded from scoring.
 *
 * Tie-breaker: If scores are equal, the team with more UNCAPPED players
 * within their selected Best 11 wins.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Role helpers ──────────────────────────────────────────────────────────────

function getBest11Role(player) {
  const raw = (
    player.normalizedCategory ||
    player.role ||
    player.set ||
    player.categoryId ||
    ''
  ).trim().toLowerCase().replace(/[\s_-]+/g, '');

  if (raw === 'wkbatter' || raw === 'wk' || raw.includes('wicket') || raw.includes('keeper')) return 'WK-Batter';
  if (raw.includes('allround') || raw === 'ar') return 'All-Rounder';
  if (raw === 'bowler' || raw.includes('bowl')) return 'Bowler';
  return 'Batter'; // safe fallback (covers 'batter', 'batsman', etc.)
}

function isUncapped(player) {
  if (player.capped === false || player.capped === 0) return true;
  if (typeof player.capped === 'string') {
    const v = player.capped.toLowerCase().trim();
    if (v === 'false' || v === 'no' || v === 'uncapped' || v === '0') return true;
  }
  const src = (player.set || player.categoryId || '').toLowerCase();
  return src.includes('uncap');
}

function getPlayerCappedLabel(player) {
  return isUncapped(player) ? 'Uncapped' : 'Capped';
}

function formatRupees(val) {
  if (val == null || val === 0) return '₹0';
  const cr = val / 10000000;
  if (cr >= 1) return `₹${cr.toFixed(2)} Cr`;
  const lakh = val / 100000;
  if (lakh >= 1) return `₹${lakh.toFixed(2)} L`;
  return `₹${val.toLocaleString()}`;
}

function formatDate(ts) {
  if (!ts) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Role ordering for Best 11 display ────────────────────────────────────────
const ROLE_ORDER = ['Batter', 'WK-Batter', 'All-Rounder', 'Bowler'];
const ROLE_LABEL = {
  'Batter':      'BATSMEN',
  'WK-Batter':   'WICKET KEEPERS',
  'All-Rounder': 'ALL-ROUNDERS',
  'Bowler':      'BOWLERS',
};

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validates the room data before PDF generation.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateBest11Data(room) {
  const errors = [];

  if (!room) { errors.push('No auction data found.'); return { valid: false, errors }; }

  const teams = room.teams ? Object.entries(room.teams) : [];
  if (teams.length === 0) { errors.push('No teams found in this auction.'); return { valid: false, errors }; }

  const players = room.players ? Object.values(room.players) : [];
  const soldPlayers = players.filter(p => p.status === 'sold');

  if (players.length === 0) errors.push('No players found in this auction.');
  if (soldPlayers.length === 0) errors.push('No sold players found.');

  for (const [, team] of teams) {
    if (!team.players || team.players.length === 0) {
      errors.push(`Team "${team.name}" has no purchased players.`);
    }
    if (!team.best11 || !Array.isArray(team.best11) || team.best11.length === 0) {
      errors.push(`Team "${team.name}" has not submitted its Best 11.`);
    } else if (team.best11.length !== 11) {
      errors.push(`Team "${team.name}" Best 11 has only ${team.best11.length} players (must be exactly 11).`);
    }
    if (team.best11Score == null) {
      errors.push(`Team "${team.name}" does not have a Best 11 score calculated.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── PDF colour palette ────────────────────────────────────────────────────────
const C = {
  // brand
  gold:       [255, 193,   7],
  cyan:       [ 20, 209, 255],
  purple:     [123,  97, 255],
  green:      [  0, 230, 118],
  pink:       [255,  60, 172],
  // grays
  dark:       [ 10,  10,  22],
  darkMid:    [ 22,  22,  44],
  midGray:    [ 88,  88, 110],
  lightGray:  [180, 180, 200],
  offWhite:   [240, 240, 250],
  white:      [255, 255, 255],
  // row alternates
  rowEven:    [248, 248, 254],
  rowOdd:     [255, 255, 255],
  // accent
  winnerBg:   [  5,  38,  20],
};

// ── jsPDF helpers ─────────────────────────────────────────────────────────────

function addPageBackground(doc) {
  doc.setFillColor(...C.white);
  doc.rect(0, 0, 210, 297, 'F');
}

function headerBand(doc, title, subtitle = '') {
  // Dark band
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, 210, 38, 'F');

  // Gold accent bar
  doc.setFillColor(...C.gold);
  doc.rect(0, 38, 210, 2, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...C.white);
  doc.text('🏆  AUCTION ARENA', 14, 17);

  doc.setFontSize(10);
  doc.setTextColor(...C.gold);
  doc.text(title.toUpperCase(), 14, 26);

  if (subtitle) {
    doc.setFontSize(8);
    doc.setTextColor(...C.lightGray);
    doc.text(subtitle, 14, 33);
  }
}

function sectionTitle(doc, y, text, color = C.dark) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...color);
  doc.text(text, 14, y);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.4);
  doc.line(14, y + 1.5, 196, y + 1.5);
  return y + 8;
}

function footer(doc, pageNum, totalPages, generatedAt) {
  const y = 290;
  doc.setFontSize(7);
  doc.setTextColor(...C.midGray);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated by Auction Arena', 14, y);
  doc.text(`Page ${pageNum} of ${totalPages}`, 105, y, { align: 'center' });
  doc.text(generatedAt, 196, y, { align: 'right' });
  doc.setDrawColor(...C.lightGray);
  doc.setLineWidth(0.2);
  doc.line(14, y - 3, 196, y - 3);
}

// ── Rank sorted teams (Best 11 Score → Uncapped tiebreaker) ──────────────────
function getRankedTeams(room) {
  const teams = room.teams ? Object.entries(room.teams) : [];
  return [...teams].sort(([, a], [, b]) => {
    const scoreDiff = (b.best11Score || 0) - (a.best11Score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    // Tie-breaker: sum of scores of the 4 uncapped players in Best 11
    return (b.uncappedBest11TotalScore || 0) - (a.uncappedBest11TotalScore || 0);
  });
}

// ── PAGE 1: Auction Summary ───────────────────────────────────────────────────

function buildPage1(doc, room, generatedAt) {
  addPageBackground(doc);
  headerBand(doc, 'Auction Summary Report', generatedAt);

  const players  = room.players ? Object.values(room.players) : [];
  const sold     = players.filter(p => p.status === 'sold');
  const unsold   = players.filter(p => p.status === 'unsold');
  const teams    = room.teams ? Object.entries(room.teams) : [];
  const totalPurse = teams.reduce((sum, [, t]) => sum + (t.initialPurse || t.purse || 0), 0);
  const totalSpent = sold.reduce((sum, p) => sum + (p.soldFor || 0), 0);

  let y = 52;
  y = sectionTitle(doc, y, '📋  Auction Information');

  const infoRows = [
    ['Auction Name',     room.meta?.name || 'Auction Arena'],
    ['Hosted By',        room.meta?.ownerName || '—'],
    ['Date',             formatDate(room.meta?.createdAt)],
    ['Status',           room.status === 'ended' ? '✅ Completed' : room.status || 'Ended'],
    ['Total Teams',      String(teams.length)],
    ['Total Players',    String(players.length)],
    ['Players Sold',     String(sold.length)],
    ['Players Unsold',   String(unsold.length)],
    ['Total Purse Pool', formatRupees(totalPurse)],
    ['Total Amount Spent', formatRupees(totalSpent)],
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: infoRows,
    theme: 'grid',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60, fillColor: C.rowEven, textColor: C.dark },
      1: { cellWidth: 110, textColor: [40, 40, 60] },
    },
    styles: { fontSize: 9, cellPadding: 4, lineColor: [220, 220, 235], lineWidth: 0.3 },
    margin: { left: 14, right: 14 },
  });

  y = (doc.lastAutoTable?.finalY || y) + 14;
  y = sectionTitle(doc, y, '🏟️  Team Overview');

  const teamRows = teams.map(([, t], i) => {
    const rank = i + 1; // teams are NOT sorted here — just listing
    return [
      String(rank),
      t.name || '—',
      formatRupees(t.initialPurse || t.purse || 0),
      String((t.players || []).length),
      t.best11Score != null ? String(t.best11Score) : '—',
      String(t.uncappedBest11TotalScore ?? '—'),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Team', 'Purse', 'Players Bought', 'Best 11 Score', 'Uncapped-4 Score']],
    body: teamRows,
    theme: 'striped',
    headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: C.rowEven },
    styles: { fontSize: 8.5, cellPadding: 4, textColor: [30, 30, 50] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 48, fontStyle: 'bold' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 32, halign: 'center', textColor: C.purple },
      5: { cellWidth: 30, halign: 'center', textColor: C.cyan },
    },
    margin: { left: 14, right: 14 },
  });
}

// ── PAGE 2: Team Financial Summary ────────────────────────────────────────────

function buildPage2(doc, room, generatedAt) {
  doc.addPage();
  addPageBackground(doc);
  headerBand(doc, 'Team Financial Summary', generatedAt);

  const teams = room.teams ? Object.entries(room.teams) : [];
  let y = 52;
  y = sectionTitle(doc, y, '💰  Purse & Spend Breakdown');

  const rows = teams.map(([, t]) => {
    const bought  = (t.players || []);
    const initial = t.initialPurse || (t.purse || 0) + bought.reduce((s, p) => s + (p.soldFor || 0), 0);
    const spent   = bought.reduce((s, p) => s + (p.soldFor || 0), 0);
    const remaining = t.purse || (initial - spent);
    return [
      t.name || '—',
      formatRupees(initial),
      formatRupees(spent),
      formatRupees(remaining),
      String(bought.length),
      t.best11Score != null ? String(t.best11Score) : '—',
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Team', 'Initial Purse', 'Amount Spent', 'Remaining', 'Players Bought', 'Best 11 Score']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: C.rowEven },
    styles: { fontSize: 8.5, cellPadding: 4, textColor: [30, 30, 50] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      1: { cellWidth: 32, halign: 'right' },
      2: { cellWidth: 32, halign: 'right', textColor: [180, 60, 60] },
      3: { cellWidth: 32, halign: 'right', textColor: [0, 140, 80] },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 28, halign: 'center', fontStyle: 'bold', textColor: C.purple },
    },
    margin: { left: 14, right: 14 },
  });
}

// ── PAGE 3+: Complete Squads ──────────────────────────────────────────────────

function buildSquadPages(doc, room, generatedAt) {
  const ranked = getRankedTeams(room);

  for (const [, team] of ranked) {
    doc.addPage();
    addPageBackground(doc);
    headerBand(doc, `${team.name} — Complete Squad`, generatedAt);

    const players = team.players || [];
    let y = 52;
    y = sectionTitle(doc, y, `🏏  ${team.name} — Full Purchased Squad (${players.length} players)`);

    if (players.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(...C.midGray);
      doc.text('No players purchased by this team.', 14, y + 6);
      continue;
    }

    const rows = players.map((p, i) => [
      String(i + 1),
      p.name || '—',
      p.set || p.categoryId || '—',
      getPlayerCappedLabel(p),
      getBest11Role(p),
      formatRupees(p.soldFor || 0),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['S.No', 'Player', 'Category', 'Capped/Uncapped', 'Role', 'Auction Price']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: C.rowEven },
      styles: { fontSize: 8, cellPadding: 3.5, textColor: [30, 30, 50] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 50, fontStyle: 'bold' },
        2: { cellWidth: 40 },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 28, halign: 'center' },
        5: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: C.gold },
      },
      margin: { left: 14, right: 14 },
    });
  }
}

// ── PAGE N+: Final Best 11 Sections ──────────────────────────────────────────

function buildBest11Pages(doc, room, generatedAt) {
  const ranked = getRankedTeams(room);

  for (const [, team] of ranked) {
    doc.addPage();
    addPageBackground(doc);
    headerBand(doc, `${team.name} — Final Best 11`, generatedAt);

    const best11 = team.best11 || [];
    let y = 50;

    // Score banner
    doc.setFillColor(...C.dark);
    doc.roundedRect(14, y, 182, 16, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.gold);
    doc.text(`⭐  Best 11 Total Score: ${team.best11Score ?? '—'}`, 20, y + 7);
    doc.setTextColor(...C.cyan);
    doc.text(`Uncapped Players: ${team.best11UncappedCount ?? '—'}`, 20, y + 13);
    y += 22;

    // Group by role
    for (const role of ROLE_ORDER) {
      const rolePlayers = best11.filter(p => getBest11Role(p) === role);
      if (rolePlayers.length === 0) continue;

      y = sectionTitle(doc, y, `${ROLE_LABEL[role]} (${rolePlayers.length})`, C.dark);

      const rows = rolePlayers.map((p, i) => [
        String(i + 1),
        p.name || '—',
        p.set || p.categoryId || '—',
        getPlayerCappedLabel(p),
        p.score != null ? String(p.score) : '—',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['#', 'Player', 'Category', 'Capped/Uncapped', 'Score']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: C.darkMid, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: C.rowEven },
        styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [20, 20, 40] },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 55, fontStyle: 'bold' },
          2: { cellWidth: 45 },
          3: { cellWidth: 32, halign: 'center' },
          4: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: C.purple },
        },
        margin: { left: 14, right: 14 },
      });

      y = (doc.lastAutoTable?.finalY || y) + 8;
      if (y > 265) { doc.addPage(); addPageBackground(doc); y = 20; }
    }
  }
}

// ── Final Leaderboard + Winner Page ──────────────────────────────────────────

function buildLeaderboardPage(doc, room, generatedAt) {
  doc.addPage();
  addPageBackground(doc);
  headerBand(doc, 'Final Leaderboard & Winner', generatedAt);

  const ranked = getRankedTeams(room);
  let y = 52;

  // Determine tie at the top
  let isTie = false;
  if (ranked.length >= 2) {
    const [, top]    = ranked[0];
    const [, second] = ranked[1];
    isTie = (top.best11Score || 0) === (second.best11Score || 0) &&
            (top.uncappedBest11TotalScore || 0) === (second.uncappedBest11TotalScore || 0);
  }

  // ── Leaderboard table ──
  y = sectionTitle(doc, y, '📊  Final Leaderboard (Best 11 Scores Only)');

  const rows = ranked.map(([, t], i) => [
    i === 0 ? '🥇 1st' : i === 1 ? '🥈 2nd' : i === 2 ? '🥉 3rd' : `#${i + 1}`,
    t.name || '—',
    t.best11Score != null ? String(t.best11Score) : '—',
    t.uncappedBest11TotalScore != null ? String(t.uncappedBest11TotalScore) : '—',
    i === 0 && !isTie ? '🏆 WINNER' : i === 0 && isTie ? '⚖️ TIED' : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Rank', 'Team', 'Best 11 Score', 'Uncapped-4 Score', 'Status']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: C.rowEven },
    styles: { fontSize: 9, cellPadding: 5, textColor: [20, 20, 50] },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 55, fontStyle: 'bold' },
      2: { cellWidth: 35, halign: 'center', fontStyle: 'bold', textColor: C.purple },
      3: { cellWidth: 40, halign: 'center' },
      4: { cellWidth: 32, halign: 'center', fontStyle: 'bold', textColor: [0, 140, 80] },
    },
    didParseCell: (data) => {
      if (data.row.index === 0 && data.section === 'body') {
        data.cell.styles.fillColor = [240, 255, 245]; // light green tint for winner row
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc.lastAutoTable?.finalY || y) + 20;

  // ── Winner section ──
  if (ranked.length > 0 && !isTie) {
    const [, winner] = ranked[0];

    // Winner box
    doc.setFillColor(...C.dark);
    doc.roundedRect(14, y, 182, 60, 5, 5, 'F');

    // Gold border
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(1.2);
    doc.roundedRect(14, y, 182, 60, 5, 5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...C.gold);
    doc.text('🏆  AUCTION ARENA WINNER', 105, y + 14, { align: 'center' });

    doc.setFontSize(18);
    doc.setTextColor(...C.white);
    doc.text(winner.name || '—', 105, y + 28, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(...C.cyan);
    doc.text(`Best 11 Total Score: ${winner.best11Score ?? '—'}`, 105, y + 39, { align: 'center' });
    doc.setTextColor(...C.gold);
    doc.text(`Uncapped-4 Score (Tie-breaker): ${winner.uncappedBest11TotalScore ?? '—'}`, 105, y + 47, { align: 'center' });

  } else if (isTie) {
    // Tie box
    doc.setFillColor(40, 35, 5);
    doc.roundedRect(14, y, 182, 60, 5, 5, 'F');
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(1.2);
    doc.roundedRect(14, y, 182, 60, 5, 5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...C.gold);
    doc.text('⚖️  TIE — ADMIN DECISION REQUIRED', 105, y + 18, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(...C.lightGray);
    doc.text('Two or more teams have equal Best 11 Score AND equal Uncapped-4 Score.', 105, y + 30, { align: 'center' });
    doc.text('The auction host must manually determine the winner.', 105, y + 40, { align: 'center' });
  }

  // Tie-breaker note (always show for clarity)
  y += 70;
  doc.setFontSize(7.5);
  doc.setTextColor(...C.midGray);
  doc.setFont('helvetica', 'italic');
  const note = isTie
    ? 'COMPLETE TIE: equal Best 11 Score AND equal Uncapped-4 Score. Admin decision required.'
    : ranked.length >= 2 &&
      (ranked[0][1].best11Score || 0) === (ranked[1][1].best11Score || 0)
        ? `Tie-breaker applied: Winner had higher Uncapped-4 Score (${ranked[0][1].uncappedBest11TotalScore ?? '?'} vs ${ranked[1][1].uncappedBest11TotalScore ?? '?'}).`
        : "Winner determined by highest Best 11 Score (sum of 11 selected players' scores only).";
  doc.text(note, 105, y, { align: 'center', maxWidth: 180 });
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate the complete Auction Arena PDF report.
 *
 * @param {object} room — full room object from Firebase / localStorage
 * @returns {{ valid: boolean, errors: string[], blob?: Blob }}
 */
export function generateAuctionReportPDF(room) {
  // ── Validate first ──
  const { valid, errors } = validateBest11Data(room);
  if (!valid) return { valid: false, errors };

  const doc         = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const generatedAt = new Date().toLocaleString('en-IN');
  const totalPages  = 3 + Object.keys(room.teams || {}).length * 2 + 1; // estimate

  // Build pages
  buildPage1(doc, room, generatedAt);
  buildPage2(doc, room, generatedAt);
  buildSquadPages(doc, room, generatedAt);
  buildBest11Pages(doc, room, generatedAt);
  buildLeaderboardPage(doc, room, generatedAt);

  // Add footer to every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    footer(doc, i, pageCount, generatedAt);
  }

  return { valid: true, errors: [], blob: doc.output('blob'), doc };
}

/**
 * Trigger a browser download of the PDF.
 *
 * @param {object} room — full room object
 * @param {string} [filename] — optional filename override
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function downloadAuctionReportPDF(room, filename) {
  const result = generateAuctionReportPDF(room);
  if (!result.valid) return result;

  const name = filename || `auction-report-${(room.meta?.name || 'arena').replace(/\s+/g, '-').toLowerCase()}.pdf`;
  result.doc.save(name);
  return { valid: true, errors: [] };
}
