import { classifyOrderLine, GSTR1_SECTIONS } from './classifier.js';
import { toRupees } from './money.js';
import { GST_STATE_CODES } from '../config/constants.js';

/**
 * Returns state-specific ETIN and legal trade name for E-Commerce Operators
 */
export function getPlatformDetails(platform, sellerStateCode = '09') {
  const isAmazon = String(platform || '').toLowerCase().includes('amazon');
  const isFlipkart = String(platform || '').toLowerCase().includes('flipkart');
  const statePrefix = String(sellerStateCode || '09').padStart(2, '0');

  if (isAmazon) {
    const etins = {
      '09': '09AAICA3918J1CR',
      '29': '29AABCA0027R1ZW',
      '27': '27AABCA0027R1Z9',
      '07': '07AABCA0027R1ZE',
      '24': '24AABCA0027R1ZF',
    };
    return {
      etin: etins[statePrefix] || `09AAICA3918J1CR`,
      sup_name: 'Amazon Seller Services Private Limited',
    };
  } else if (isFlipkart) {
    const etins = {
      '09': '09AACCF0683K1CQ',
      '29': '29AAACF1479P1ZU',
      '07': '07AAACF1479P1Z3',
      '27': '27AAACF1479P1ZG',
    };
    return {
      etin: etins[statePrefix] || `09AACCF0683K1CQ`,
      sup_name: 'Flipkart Internet Private Limited',
    };
  }
  return { etin: '', sup_name: '' };
}

/**
 * Sanitizes and standardizes HSN code to 8 digits
 */
export function sanitizeHsn(hsn, description) {
  if (!hsn) return '99999999';
  const clean = String(hsn).replace(/[^0-9]/g, '');

  if (clean === '3926' || clean === '392640') return '39264099';
  if (clean === '9506') return '95069190';
  if (clean === '4421') return '44219190';
  if (clean === '9405') return '94054200';

  if (clean.length >= 8) {
    return clean.slice(0, 8);
  } else if (clean.length >= 4) {
    return clean.padEnd(8, '0');
  }

  const descLower = String(description || '').toLowerCase();
  if (descLower.includes('plastic') || descLower.includes('krishna') || descLower.includes('showpiece') || descLower.includes('idol')) return '39264099';
  if (descLower.includes('rope') || descLower.includes('jump')) return '95069190';
  if (descLower.includes('resin') || descLower.includes('statue') || descLower.includes('temple')) return '44219190';
  return '99999999';
}

/**
 * Extracts numeric prefix/suffix for document series grouping
 */
function getSeriesPrefix(numStr) {
  const match = String(numStr).match(/^([A-Za-z0-9_-]+?)([0-9]{1,7})$/);
  if (match) {
    return { prefix: match[1], num: parseInt(match[2], 10), raw: numStr };
  }
  return { prefix: String(numStr), num: 0, raw: numStr };
}

function buildDocSeries(numArray, warnings = []) {
  const map = {};
  numArray.forEach(str => {
    const p = getSeriesPrefix(str);
    if (!map[p.prefix]) map[p.prefix] = [];
    map[p.prefix].push(p);
  });

  const docs = [];
  let numCounter = 1;
  Object.keys(map).forEach(prefix => {
    const items = map[prefix].sort((a, b) => a.num - b.num);
    const minNum = items[0].num;
    const maxNum = items[items.length - 1].num;

    // Detect sequence gaps (missing / potentially cancelled document numbers)
    let cancelCount = 0;
    if (minNum > 0 && maxNum > minNum) {
      const existingNums = new Set(items.map(i => i.num));
      const missing = [];
      for (let n = minNum; n <= maxNum; n++) {
        if (!existingNums.has(n)) {
          missing.push(`${prefix}${n}`);
          cancelCount++;
        }
      }
      if (missing.length > 0) {
        warnings.push({
          type: 'WARNING',
          field: 'doc_issue',
          message: `Document ${missing.join(', ')} is missing from the sequence ${items[0].raw}–${items[items.length - 1].raw}. ` +
            `If cancelled, mark it in Table 13 (the "cancel" count has been set to ${cancelCount} automatically). ` +
            `If it was issued outside this upload, please add it manually.`,
        });
      }
    }

    const totnum = items.length + cancelCount; // total issued incl. cancelled
    docs.push({
      num: numCounter++,
      from: items[0].raw,
      to: items[items.length - 1].raw,
      totnum,
      cancel: cancelCount,
      net_issue: totnum - cancelCount,
    });
  });
  return docs;
}

/**
 * Aggregates unified orderlines into statutory GSTR-1 data structures
 */
export function aggregateGstr1(orderLines, sellerStateCode = '09', legalName = '', grossTurnover = 0) {
  const totals = {
    grossTurnover,
    totalInvoices: 0,              // Count of sales invoices only (e.g. 45)
    totalNotes: 0,                 // Count of credit/debit notes & returns (e.g. 20)
    totalRowsProcessed: orderLines.length, // Total orderlines (e.g. 65)
    taxableValuePaise: 0,
    igstPaise: 0,
    cgstPaise: 0,
    sgstPaise: 0,
    cessPaise: 0,
    totalTaxPaise: 0,
    totalInvoiceValuePaise: 0,
  };

  const b2bMap = {};   // ctin -> inv[]
  const b2csMap = {};  // `${pos}_${rate}_${splyTy}` -> aggregated object
  const cdnrMap = {};  // ctin -> nt[]
  const hsnMap = {};   // `${hsn}_${rate}_${uqc}` -> aggregated object
  const ecoMap = {};   // etin -> aggregated ECO summary

  // 4 Lines for Nil/Exempt section
  const nilMap = {
    INTRB2B:  { sply_ty: 'INTRB2B',  nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
    INTRAB2B: { sply_ty: 'INTRAB2B', nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
    INTRB2C:  { sply_ty: 'INTRB2C',  nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
    INTRAB2C: { sply_ty: 'INTRAB2C', nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
  };

  const seenInvoices = new Set();
  const salesInvoiceNumbers = [];
  const creditNoteNumbers = [];
  const debitNoteNumbers = [];

  for (const line of orderLines) {
    const classification = classifyOrderLine(line, sellerStateCode);
    const isReturn = line.type === 'return';
    const isDebit = line.docType === 'DR' || String(line.invoiceNumber).startsWith('LZAF');
    const isCredit = isReturn || line.docType === 'CR' || String(line.invoiceNumber).startsWith('LYAF');
    const sign = isReturn ? -1 : 1;

    // Track Sales Invoices vs Notes count separately
    if (!seenInvoices.has(line.invoiceNumber)) {
      seenInvoices.add(line.invoiceNumber);
      if (isDebit) {
        totals.totalNotes++;
        debitNoteNumbers.push(line.invoiceNumber);
      } else if (isCredit) {
        totals.totalNotes++;
        creditNoteNumbers.push(line.invoiceNumber);
      } else {
        totals.totalInvoices++;
        salesInvoiceNumbers.push(line.invoiceNumber);
      }
    }

    // Accumulate overall totals (paise)
    totals.taxableValuePaise += line.taxableValuePaise * sign;
    totals.igstPaise += line.igstPaise * sign;
    totals.cgstPaise += line.cgstPaise * sign;
    totals.sgstPaise += line.sgstPaise * sign;
    totals.cessPaise += line.cessPaise * sign;
    totals.totalInvoiceValuePaise += line.invoiceValuePaise * sign;

    const formattedInvDate = line.invoiceDate instanceof Date 
      ? `${String(line.invoiceDate.getDate()).padStart(2, '0')}-${String(line.invoiceDate.getMonth() + 1).padStart(2, '0')}-${line.invoiceDate.getFullYear()}`
      : '01-09-2026';

    const isInterState = classification.isInterState;

    // 1. Process B2B (Table 4)
    if (classification.section === GSTR1_SECTIONS.B2B) {
      if (line.gstRate === 0) {
        const nilKey = isInterState ? 'INTRB2B' : 'INTRAB2B';
        nilMap[nilKey].nil_amt += toRupees(line.taxableValuePaise) * sign;
      } else {
        const ctin = line.buyerGstin;
        if (!b2bMap[ctin]) {
          b2bMap[ctin] = { ctin, inv: [] };
        }

        let invoiceObj = b2bMap[ctin].inv.find(i => i.inum === line.invoiceNumber);
        if (!invoiceObj) {
          invoiceObj = {
            inum: line.invoiceNumber,
            idt: formattedInvDate,
            val: toRupees(line.invoiceValuePaise),
            pos: line.placeOfSupply,
            rchrg: 'N',
            inv_typ: 'R',
            itms: [],
          };
          b2bMap[ctin].inv.push(invoiceObj);
        } else {
          invoiceObj.val = Number((invoiceObj.val + toRupees(line.invoiceValuePaise)).toFixed(2));
        }

        invoiceObj.itms.push({
          num: invoiceObj.itms.length + 1,
          itm_det: {
            rt: line.gstRate,
            txval: toRupees(line.taxableValuePaise),
            iamt: toRupees(line.igstPaise),
            camt: toRupees(line.cgstPaise),
            samt: toRupees(line.sgstPaise),
            csamt: toRupees(line.cessPaise),
          },
        });
      }
    }

    // 2. Process CDNR (Table 9B Credit/Debit Notes for Registered)
    else if (classification.section === GSTR1_SECTIONS.CDNR) {
      const ctin = line.buyerGstin;
      if (!cdnrMap[ctin]) {
        cdnrMap[ctin] = { ctin, nt: [] };
      }

      cdnrMap[ctin].nt.push({
        nt_num: `CR-${line.invoiceNumber}`,
        nt_dt: formattedInvDate,
        inum: line.invoiceNumber,
        idt: formattedInvDate,
        ntty: isDebit ? 'D' : 'C',
        p_gst: 'N',
        val: toRupees(line.invoiceValuePaise),
        itms: [{
          num: 1,
          itm_det: {
            rt: line.gstRate,
            txval: toRupees(line.taxableValuePaise),
            iamt: toRupees(line.igstPaise),
            camt: toRupees(line.cgstPaise),
            samt: toRupees(line.sgstPaise),
            csamt: toRupees(line.cessPaise),
          },
        }],
      });
    }

    // 3. Process B2CS (Table 7 Small Unregistered Supplies) vs NIL (Table 8)
    else {
      if (line.gstRate === 0) {
        // Move 0% supplies to NIL/Exempt section
        const nilKey = isInterState ? 'INTRB2C' : 'INTRAB2C';
        nilMap[nilKey].nil_amt += toRupees(line.taxableValuePaise) * sign;
      } else {
        const splyTy = isInterState ? 'INTER' : 'INTRA';
        const key = `${line.placeOfSupply}_${line.gstRate}_${splyTy}`;

        if (!b2csMap[key]) {
          b2csMap[key] = {
            typ: 'OE',               // Other than E-Commerce
            sply_ty: splyTy,
            pos: line.placeOfSupply,
            rt: line.gstRate,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0,
          };
        }

        b2csMap[key].txval += toRupees(line.taxableValuePaise) * sign;
        b2csMap[key].iamt += toRupees(line.igstPaise) * sign;
        b2csMap[key].camt += toRupees(line.cgstPaise) * sign;
        b2csMap[key].samt += toRupees(line.sgstPaise) * sign;
        b2csMap[key].csamt += toRupees(line.cessPaise) * sign;
      }
    }

    // 4. Process HSN Summary (Table 12)
    //    Rule: when the same HSN+rate bucket is seen multiple times, keep the
    //    description belonging to the highest-value line (most representative product).
    const cleanDesc = (line.description || 'Goods sold through marketplace').replace(/^["'\s]+|["'\s]+$/g, '').trim();
    const hsnCode = sanitizeHsn(line.hsn, cleanDesc);
    const uqcCode = line.uqc || 'PCS';
    const hsnKey = `${hsnCode}_${line.gstRate}_${uqcCode}`;
    const lineVal = toRupees(line.taxableValuePaise) * sign;

    if (!hsnMap[hsnKey]) {
      hsnMap[hsnKey] = {
        num: Object.keys(hsnMap).length + 1,
        hsn_sc: hsnCode,
        desc: cleanDesc,
        uqc: uqcCode,
        qty: 0,
        val: 0,
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
        rt: line.gstRate,
        _highVal: 0,   // private tracker — stripped before export
      };
    }
    // Update description if this line has a higher taxable value than the previous best
    if (toRupees(line.taxableValuePaise) > hsnMap[hsnKey]._highVal) {
      hsnMap[hsnKey].desc = cleanDesc;
      hsnMap[hsnKey]._highVal = toRupees(line.taxableValuePaise);
    }
    hsnMap[hsnKey].qty  += line.quantity * sign;
    hsnMap[hsnKey].val  += toRupees(line.invoiceValuePaise) * sign;
    hsnMap[hsnKey].txval += lineVal;
    hsnMap[hsnKey].iamt += toRupees(line.igstPaise) * sign;
    hsnMap[hsnKey].camt += toRupees(line.cgstPaise) * sign;
    hsnMap[hsnKey].samt += toRupees(line.sgstPaise) * sign;
    hsnMap[hsnKey].csamt += toRupees(line.cessPaise) * sign;

    // 5. Process Table 14 (Supplies through E-Commerce Operator - Sec 52)
    if (line.platform || line.platformGstin) {
      const details = getPlatformDetails(line.platform || 'flipkart', sellerStateCode);
      const etin = details.etin || line.platformGstin;
      const sup_name = details.sup_name;

      if (!ecoMap[etin]) {
        ecoMap[etin] = {
          etin,
          sup_name,
          suppval: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0,
          flag: 'N',
        };
      }
      ecoMap[etin].suppval += toRupees(line.taxableValuePaise) * sign;
      ecoMap[etin].igst    += toRupees(line.igstPaise) * sign;
      ecoMap[etin].cgst    += toRupees(line.cgstPaise) * sign;
      ecoMap[etin].sgst    += toRupees(line.sgstPaise) * sign;
      ecoMap[etin].cess    += toRupees(line.cessPaise) * sign;
    }
  }

  // Round B2CS decimals.
  // Zero-value buckets are intentionally excluded ─ the GST portal accepts absent
  // zero-value B2CS rows and the offline tool treats them the same way.
  const b2csList = Object.values(b2csMap).map(item => ({
    ...item,
    txval: Number(item.txval.toFixed(2)),
    iamt:  Number(item.iamt.toFixed(2)),
    camt:  Number(item.camt.toFixed(2)),
    samt:  Number(item.samt.toFixed(2)),
    csamt: Number(item.csamt.toFixed(2)),
  })).filter(item => item.txval !== 0);

  // Round Nil section decimals
  const nilList = Object.values(nilMap).map(item => ({
    ...item,
    nil_amt: Number(item.nil_amt.toFixed(2)),
    expt_amt: Number(item.expt_amt.toFixed(2)),
    ngsup_amt: Number(item.ngsup_amt.toFixed(2)),
  }));

  // Round HSN decimals & renumber sequentially 1...N, stripping internal _highVal tracker
  const hsnList = Object.values(hsnMap).map(item => {
    // eslint-disable-next-line no-unused-vars
    const { _highVal, ...rest } = item;
    return {
      ...rest,
      val:   Number(rest.val.toFixed(2)),
      txval: Number(rest.txval.toFixed(2)),
      iamt:  Number(rest.iamt.toFixed(2)),
      camt:  Number(rest.camt.toFixed(2)),
      samt:  Number(rest.samt.toFixed(2)),
      csamt: Number(rest.csamt.toFixed(2)),
    };
  }).filter(item => item.txval !== 0);

  hsnList.forEach((item, idx) => {
    item.num = idx + 1;
  });

  // Round Table 14 decimals
  const table14List = Object.values(ecoMap).map(item => ({
    ...item,
    suppval: Number(item.suppval.toFixed(2)),
    igst:    Number(item.igst.toFixed(2)),
    cgst:    Number(item.cgst.toFixed(2)),
    sgst:    Number(item.sgst.toFixed(2)),
    cess:    Number(item.cess.toFixed(2)),
  }));

  // Detect Same-HSN Rate Conflicts
  // A common source is Amazon's "Exempt" tax code which reports 0% for products that
  // normally carry 5%, 12% or 18%. The totals remain correct but the seller should
  // confirm each product's real GST rate before filing.
  const warnings = [];
  const hsnRateMap = {};
  hsnList.forEach(item => {
    if (!hsnRateMap[item.hsn_sc]) hsnRateMap[item.hsn_sc] = new Set();
    hsnRateMap[item.hsn_sc].add(item.rt);
  });
  Object.keys(hsnRateMap).forEach(hsnCode => {
    const rates = Array.from(hsnRateMap[hsnCode]).sort((a, b) => a - b);
    if (rates.length > 1) {
      const hasZero = rates.includes(0);
      const nonZero = rates.filter(r => r > 0);
      const hint = hasZero
        ? ` The 0% row likely originates from an exempt/nil tax code in the marketplace report — confirm the actual rate (${nonZero.join('%, ')}%) for each product before filing.`
        : '';
      warnings.push({
        type: 'WARNING',
        field: 'hsn',
        message: `Data Quality: HSN ${hsnCode} appears under multiple GST rates (${rates.join('%, ')}%).${hint}`,
      });
    }
  });

  // Build Document Issued (Table 13) summary series using official codes:
  // 1: Invoices for outward supply, 4: Debit Note, 5: Credit Note
  const salesDocs = buildDocSeries(salesInvoiceNumbers, warnings);
  const creditDocs = buildDocSeries(creditNoteNumbers, warnings);
  const debitDocs = buildDocSeries(debitNoteNumbers, warnings);

  const doc_det = [];
  if (salesDocs.length > 0) {
    doc_det.push({
      doc_num: 1,
      doc_typ: 'Invoices for outward supply',
      docs: salesDocs,
    });
  }
  if (debitDocs.length > 0) {
    doc_det.push({
      doc_num: 4,
      doc_typ: 'Debit Note',
      docs: debitDocs,
    });
  }
  if (creditDocs.length > 0) {
    doc_det.push({
      doc_num: 5,
      doc_typ: 'Credit Note',
      docs: creditDocs,
    });
  }

  const docIssueSection = { doc_det };

  totals.totalTaxPaise = totals.igstPaise + totals.cgstPaise + totals.sgstPaise + totals.cessPaise;

  return {
    totals,
    warnings,
    sections: {
      b2b:        Object.values(b2bMap),
      b2cs:       b2csList,
      cdnr:       Object.values(cdnrMap),
      nil:        { inv: nilList },
      hsn:        { hsn_b2c: hsnList },      // GST portal key: hsn_b2c for B2C supplies
      supeco:     { clttx: table14List },    // GST portal key: clttx (Table 14 Sec 52)
      doc_issue:  docIssueSection,
    },
    sectionCounts: {
      b2bCount: Object.values(b2bMap).reduce((acc, curr) => acc + curr.inv.length, 0),
      b2csCount: b2csList.length,
      cdnrCount: Object.values(cdnrMap).reduce((acc, curr) => acc + curr.nt.length, 0),
      nilCount: nilList.length,
      hsnCount: hsnList.length,
      table14Count: table14List.length,
    },
  };
}


