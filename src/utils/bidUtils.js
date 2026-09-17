// ── Price formatting ──────────────────────────────────────────────────────────
export function formatPrice(paise) {
  if (!paise && paise !== 0) return '₹0';
  const crore = paise / 10000000;
  // Always display in Crores for amounts >= 1Cr
  if (crore >= 1) return `₹${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)}Cr`;
  // Sub-crore: show in Lakhs
  const lakh = paise / 100000;
  if (lakh >= 1) return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2)}L`;
  return `₹${paise}`;
}

// ── Convert base price string to paise ───────────────────────────────────────
export function getBasePriceInPaise(basePriceLabel) {
  if (typeof basePriceLabel === 'number') return basePriceLabel;
  const str = String(basePriceLabel || '20L').toUpperCase().trim();
  if (str.includes('CR')) return parseFloat(str) * 10000000;
  if (str.includes('L')) return parseFloat(str) * 100000;
  return parseFloat(str) * 100000 || 2000000;
}

// ── Get next bid amount (two-stage configurable increment) ────────────────────
// settings may contain:
//   bidThresholdCr — the bid amount (in Cr) at which rate switches (default 20)
//   bidRate1Cr     — increment (in Cr) below threshold              (default 0.25)
//   bidRate2Cr     — increment (in Cr) at/above threshold           (default 0.50)
export function getNextBidAmount(currentAmount, settings = {}) {
  const thresholdPaise = (settings?.bidThresholdCr ?? 2) * 10000000;
  const rate1Paise     = (settings?.bidRate1Cr     ?? 0.5) * 10000000;
  const rate2Paise     = (settings?.bidRate2Cr     ?? 1.0) * 10000000;

  const increment = currentAmount < thresholdPaise ? rate1Paise : rate2Paise;
  return currentAmount + increment;
}

// ── Quick bid amounts (derived from settings rates) ───────────────────────────
export function getQuickBidAmounts(settings = {}) {
  const rate1 = settings?.bidRate1Cr ?? 0.5;
  const rate2 = settings?.bidRate2Cr ?? 1.0;
  return [
    { label: `+${rate1 * 2}Cr`,  amount: Math.round(rate1 * 2  * 10000000) },
    { label: `+${rate2}Cr`,      amount: Math.round(rate2       * 10000000) },
    { label: `+${rate2 * 2}Cr`,  amount: Math.round(rate2 * 2  * 10000000) },
    { label: `+${rate2 * 4}Cr`,  amount: Math.round(rate2 * 4  * 10000000) },
  ];
}

// ── Calculate max allowed bid based on minimum squad reserve ─────────────────
/**
 * Dynamically calculates the maximum bid a team can place while ensuring
 * it can still fill its minimum squad at the cheapest available base prices.
 *
 * @param {Object} params
 * @param {number} params.currentPurse                 – team's remaining purse (paise)
 * @param {number} params.playersBought                – how many players the team already owns
 * @param {number} params.minSquadSize                 – configurable minimum squad size
 * @param {number} params.maxSquadSize                 – configurable maximum squad size
 * @param {number[]} params.availablePlayerBasePrices   – base prices (paise) of every OTHER
 *                                                        unsold player (excluding the current
 *                                                        player being bid on)
 * @returns {{ maxBid: number, reserveAmount: number, playersRequired: number,
 *             canBid: boolean, reason: string }}
 */
export function calculateMaxAllowedBid({
  currentPurse,
  playersBought,
  minSquadSize,
  maxSquadSize,
  availablePlayerBasePrices,
}) {
  // Edge: team already hit max squad size
  if (playersBought >= maxSquadSize) {
    return {
      maxBid: 0,
      reserveAmount: 0,
      playersRequired: 0,
      canBid: false,
      reason: `Squad is already full! (Max: ${maxSquadSize})`,
    };
  }

  // Edge: team has already met its minimum squad – no reserve needed
  if (playersBought >= minSquadSize) {
    return {
      maxBid: currentPurse,
      reserveAmount: 0,
      playersRequired: 0,
      canBid: currentPurse > 0,
      reason: currentPurse > 0 ? '' : 'No purse remaining',
    };
  }

  // How many MORE players are needed *after* buying the current one
  const playersRequired = minSquadSize - (playersBought + 1);

  // Edge: buying this player alone completes the squad
  if (playersRequired <= 0) {
    return {
      maxBid: currentPurse,
      reserveAmount: 0,
      playersRequired: 0,
      canBid: currentPurse > 0,
      reason: currentPurse > 0 ? '' : 'No purse remaining',
    };
  }

  // Edge: not enough unsold players left to fill the remaining slots
  if (availablePlayerBasePrices.length < playersRequired) {
    return {
      maxBid: 0,
      reserveAmount: 0,
      playersRequired,
      canBid: false,
      reason: `Cannot purchase this player. There are not enough available players remaining (${availablePlayerBasePrices.length}) to complete the minimum squad (need ${playersRequired} more after this purchase).`,
    };
  }

  // Sort ascending and take the cheapest `playersRequired` base prices
  const sorted = [...availablePlayerBasePrices].sort((a, b) => a - b);
  const reserveAmount = sorted.slice(0, playersRequired).reduce((sum, p) => sum + p, 0);

  const maxBid = currentPurse - reserveAmount;

  if (maxBid <= 0) {
    return {
      maxBid: 0,
      reserveAmount,
      playersRequired,
      canBid: false,
      reason: `Insufficient purse. You need to reserve ${formatPrice(reserveAmount)} for ${playersRequired} more players to meet the minimum squad of ${minSquadSize}.`,
    };
  }

  return {
    maxBid,
    reserveAmount,
    playersRequired,
    canBid: true,
    reason: '',
  };
}

// ── Format large number for display ──────────────────────────────────────────
export function formatBudget(amount) {
  if (!amount) return '₹0';
  const cr = amount / 10000000;
  return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)}Cr`;
}
