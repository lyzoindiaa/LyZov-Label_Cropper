/**
 * interStateEngine.js
 *
 * Computes GSTR-3B Table 3.2:
 * Inter-State supplies to Unregistered Persons, Composition Dealers and UIN Holders
 * aggregated by Place of Supply (POS) state.
 *
 * Source: B2CS rows from GSTR-1 aggregated data where sply_ty = 'INTER'
 *
 * NOTE: From November 2025 tax period, the portal auto-fills Table 3.2 from GSTR-1.
 * This engine's primary purpose is for RECONCILIATION — compare our computed values
 * against the portal's auto-filled values and flag mismatches before filing.
 */

import { toPaise } from '../engine/money.js';
import { GST_STATE_CODES } from '../config/constants.js';

/**
 * @param {Object} gstr1Aggregated - Output from aggregateGstr1()
 * @returns {{ supplies_unregistered: Array, supplies_composition: Array, supplies_uin: Array }}
 */
export function computeTable32(gstr1Aggregated) {
  const b2csList = gstr1Aggregated?.sections?.b2cs || [];

  // Map: pos -> { taxableValuePaise, igstPaise }
  const interStateMap = {};

  for (const row of b2csList) {
    // Only inter-state rows contribute to Table 3.2
    if (row.sply_ty !== 'INTER') continue;

    const pos = String(row.pos || '').padStart(2, '0');

    if (!interStateMap[pos]) {
      interStateMap[pos] = {
        pos,
        posName: GST_STATE_CODES[pos] || `State ${pos}`,
        taxableValuePaise: 0,
        igstPaise: 0,
      };
    }

    interStateMap[pos].taxableValuePaise += toPaise(row.txval || 0);
    interStateMap[pos].igstPaise         += toPaise(row.iamt || 0);
  }

  // Sort by POS code for deterministic output
  const suppliesUnregistered = Object.values(interStateMap)
    .filter(r => r.taxableValuePaise !== 0)
    .sort((a, b) => a.pos.localeCompare(b.pos));

  return {
    supplies_unregistered: suppliesUnregistered,
    supplies_composition:  [], // not applicable for Amazon/Flipkart B2C sellers
    supplies_uin:          [], // not applicable for Amazon/Flipkart B2C sellers
  };
}
