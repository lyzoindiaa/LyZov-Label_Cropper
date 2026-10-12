/**
 * gstr3bJsonExporter.js
 *
 * Phase 6: GSTR-3B JSON Exporter
 *
 * Generates a GST Portal-compliant GSTR-3B JSON file from a Gstr3bReturn document.
 * Schema verified against the GSTR3B_Excel_Utility JSON output format.
 *
 * Key schema notes:
 *   - ret_period: MMYYYY (different from GSTR-1 fp MMYYYY — same format, different key)
 *   - All monetary values in INR (2 decimal places), NOT paise
 *   - sup_details: Outward supply details (Tables 3.1 + 3.1.1)
 *   - inter_sup: Inter-state supplies (Table 3.2)
 *   - itc_elg: ITC eligible (Table 4)
 *   - inward_sup: Inward supplies (Table 5)
 *   - intr_ltfee: Interest & late fee (Table 5.1)
 */

import { toRupees } from '../engine/money.js';

/**
 * @param {Object} return3b - Gstr3bReturn mongoose document (or plain object)
 * @param {Object} business - Business document { gstin, legalName }
 * @returns {Object} - Portal-compliant 3B JSON object
 */
export function generateGstr3bJson(return3b, business) {
  const t31 = return3b.table31 || {};
  const t32 = return3b.table32 || {};
  const t4  = return3b.table4  || {};
  const t5  = return3b.table5  || {};
  const t51 = return3b.table51 || {};
  const t6  = return3b.table6  || {};

  const period = String(return3b.period || ''); // MMYYYY

  const json = {
    gstin: business.gstin.toUpperCase(),
    ret_period: period,

    // ── Table 3.1 — Outward Supplies ─────────────────────────────────────
    sup_details: {
      // 3.1(a) Outward taxable supplies
      osup_det: {
        txval: toRupees(t31.outward_taxable?.taxableValuePaise ?? 0),
        iamt:  toRupees(t31.outward_taxable?.igstPaise ?? 0),
        camt:  toRupees(t31.outward_taxable?.cgstPaise ?? 0),
        samt:  toRupees(t31.outward_taxable?.sgstPaise ?? 0),
        csamt: toRupees(t31.outward_taxable?.cessPaise ?? 0),
      },
      // 3.1(b) Zero rated supplies
      osup_zero: {
        txval: toRupees(t31.outward_zero_rated?.taxableValuePaise ?? 0),
        iamt:  toRupees(t31.outward_zero_rated?.igstPaise ?? 0),
        csamt: toRupees(t31.outward_zero_rated?.cessPaise ?? 0),
      },
      // 3.1(c) Nil / Exempt outward
      osup_nil_exmp: {
        txval: toRupees(t31.outward_nil_exempt?.taxableValuePaise ?? 0),
      },
      // 3.1(d) Inward supplies liable to reverse charge
      isup_rev: {
        txval: toRupees(t31.inward_reverse_charge?.taxableValuePaise ?? 0),
        iamt:  toRupees(t31.inward_reverse_charge?.igstPaise ?? 0),
        camt:  toRupees(t31.inward_reverse_charge?.cgstPaise ?? 0),
        samt:  toRupees(t31.inward_reverse_charge?.sgstPaise ?? 0),
        csamt: toRupees(t31.inward_reverse_charge?.cessPaise ?? 0),
      },
      // 3.1(e) Non-GST outward
      osup_nongst: {
        txval: toRupees(t31.non_gst_outward?.taxableValuePaise ?? 0),
      },
    },

    // ── Table 3.2 — Inter-State Supplies ─────────────────────────────────
    inter_sup: {
      // Supplies to unregistered persons
      unreg_det: (t32.supplies_unregistered || []).map(row => ({
        pos:   String(row.pos || '').padStart(2, '0'),
        txval: toRupees(row.taxableValuePaise ?? 0),
        iamt:  toRupees(row.igstPaise ?? 0),
      })),
      // Composition dealer supplies
      comp_det: (t32.supplies_composition || []).map(row => ({
        pos:   String(row.pos || '').padStart(2, '0'),
        txval: toRupees(row.taxableValuePaise ?? 0),
        iamt:  toRupees(row.igstPaise ?? 0),
      })),
      // UIN holder supplies
      uin_det: (t32.supplies_uin || []).map(row => ({
        pos:   String(row.pos || '').padStart(2, '0'),
        txval: toRupees(row.taxableValuePaise ?? 0),
        iamt:  toRupees(row.igstPaise ?? 0),
      })),
    },

    // ── Table 4 — Eligible ITC ────────────────────────────────────────────
    itc_elg: {
      itc_avl: [
        // (1) Import of goods
        { ty: 'IMPG',
          iamt:  toRupees(t4.itc_available?.import_goods?.igstPaise ?? 0),
          csamt: toRupees(t4.itc_available?.import_goods?.cessPaise ?? 0) },
        // (2) Import of services
        { ty: 'IMPS',
          iamt:  toRupees(t4.itc_available?.import_services?.igstPaise ?? 0),
          csamt: toRupees(t4.itc_available?.import_services?.cessPaise ?? 0) },
        // (3) Inward supplies liable to RCM
        { ty: 'ISRC',
          iamt:  toRupees(t4.itc_available?.inward_reverse_charge?.igstPaise ?? 0),
          camt:  toRupees(t4.itc_available?.inward_reverse_charge?.cgstPaise ?? 0),
          samt:  toRupees(t4.itc_available?.inward_reverse_charge?.sgstPaise ?? 0),
          csamt: toRupees(t4.itc_available?.inward_reverse_charge?.cessPaise ?? 0) },
        // (4) ISD
        { ty: 'ISD',
          iamt:  toRupees(t4.itc_available?.inward_isd?.igstPaise ?? 0),
          camt:  toRupees(t4.itc_available?.inward_isd?.cgstPaise ?? 0),
          samt:  toRupees(t4.itc_available?.inward_isd?.sgstPaise ?? 0),
          csamt: toRupees(t4.itc_available?.inward_isd?.cessPaise ?? 0) },
        // (5) All other ITC
        { ty: 'OTH',
          iamt:  toRupees(t4.itc_available?.all_other_itc?.igstPaise ?? 0),
          camt:  toRupees(t4.itc_available?.all_other_itc?.cgstPaise ?? 0),
          samt:  toRupees(t4.itc_available?.all_other_itc?.sgstPaise ?? 0),
          csamt: toRupees(t4.itc_available?.all_other_itc?.cessPaise ?? 0) },
      ],
      itc_rev: [
        { ty: 'RUL',
          iamt:  toRupees(t4.itc_reversed?.as_per_rules?.igstPaise ?? 0),
          camt:  toRupees(t4.itc_reversed?.as_per_rules?.cgstPaise ?? 0),
          samt:  toRupees(t4.itc_reversed?.as_per_rules?.sgstPaise ?? 0),
          csamt: toRupees(t4.itc_reversed?.as_per_rules?.cessPaise ?? 0) },
        { ty: 'OTH',
          iamt:  toRupees(t4.itc_reversed?.others?.igstPaise ?? 0),
          camt:  toRupees(t4.itc_reversed?.others?.cgstPaise ?? 0),
          samt:  toRupees(t4.itc_reversed?.others?.sgstPaise ?? 0),
          csamt: toRupees(t4.itc_reversed?.others?.cessPaise ?? 0) },
      ],
      itc_net: [
        { ty: 'ALL',
          iamt:  toRupees(t4.net_itc?.igstPaise ?? 0),
          camt:  toRupees(t4.net_itc?.cgstPaise ?? 0),
          samt:  toRupees(t4.net_itc?.sgstPaise ?? 0),
          csamt: toRupees(t4.net_itc?.cessPaise ?? 0) },
      ],
      itc_inelg: [
        { ty: 'RUL',
          iamt:  toRupees(t4.ineligible_itc?.as_per_section_17_5?.igstPaise ?? 0),
          camt:  toRupees(t4.ineligible_itc?.as_per_section_17_5?.cgstPaise ?? 0),
          samt:  toRupees(t4.ineligible_itc?.as_per_section_17_5?.sgstPaise ?? 0),
          csamt: toRupees(t4.ineligible_itc?.as_per_section_17_5?.cessPaise ?? 0) },
        { ty: 'OTH',
          iamt:  toRupees(t4.ineligible_itc?.others?.igstPaise ?? 0),
          camt:  toRupees(t4.ineligible_itc?.others?.cgstPaise ?? 0),
          samt:  toRupees(t4.ineligible_itc?.others?.sgstPaise ?? 0),
          csamt: toRupees(t4.ineligible_itc?.others?.cessPaise ?? 0) },
      ],
    },

    // ── Table 5 — Exempt/Nil/Non-GST Inward Supplies ─────────────────────
    inward_sup: {
      isup_details: [
        {
          ty: 'GST',
          inter: toRupees(t5.from_composition_exempt_nil?.interStatePaise ?? 0),
          intra: toRupees(t5.from_composition_exempt_nil?.intraStatePaise ?? 0),
        },
        {
          ty: 'NONGST',
          inter: toRupees(t5.non_gst_inward?.interStatePaise ?? 0),
          intra: toRupees(t5.non_gst_inward?.intraStatePaise ?? 0),
        },
      ],
    },

    // ── Table 5.1 — Interest & Late Fee ──────────────────────────────────
    intr_ltfee: {
      intr_details: [
        {
          ty: 'Integrated Tax',
          intr: toRupees(t51.interest?.igstPaise ?? 0),
          fee:  0,
        },
        {
          ty: 'Central Tax',
          intr: toRupees(t51.interest?.cgstPaise ?? 0),
          fee:  toRupees(t51.late_fee?.cgstPaise ?? 0),
        },
        {
          ty: 'State/UT Tax',
          intr: toRupees(t51.interest?.sgstPaise ?? 0),
          fee:  toRupees(t51.late_fee?.sgstPaise ?? 0),
        },
      ],
    },
  };

  return json;
}
