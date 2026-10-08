import { classifyOrderLine, GSTR1_SECTIONS } from './classifier.js';
import { toRupees } from './money.js';

/**
 * Aggregates unified orderlines into statutory GSTR-1 data structures
 */
export function aggregateGstr1(orderLines, sellerStateCode, legalName) {
  const totals = {
    totalInvoices: 0,
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

  const seenInvoices = new Set();

  for (const line of orderLines) {
    const classification = classifyOrderLine(line, sellerStateCode);
    const isReturn = line.type === 'return';
    const sign = isReturn ? -1 : 1;

    // Track invoice count
    if (!seenInvoices.has(line.invoiceNumber)) {
      seenInvoices.add(line.invoiceNumber);
      totals.totalInvoices++;
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

    // 1. Process B2B (Table 4)
    if (classification.section === GSTR1_SECTIONS.B2B) {
      const ctin = line.buyerGstin;
      if (!b2bMap[ctin]) {
        b2bMap[ctin] = { ctin, inv: [] };
      }

      // Check if this invoice is already partially listed for another item
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
        ntty: 'C', // Credit note
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

    // 3. Process B2CS (Table 7 Small Unregistered Supplies)
    else {
      const splyTy = classification.isInterState ? 'INTER' : 'INTRA';
      const key = `${line.placeOfSupply}_${line.gstRate}_${splyTy}`;

      if (!b2csMap[key]) {
        b2csMap[key] = {
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

    // 4. Process HSN Summary (Table 12)
    const hsnCode = (line.hsn || '9999').replace(/[^0-9]/g, '').slice(0, 8);
    const hsnKey = `${hsnCode}_${line.gstRate}_${line.uqc || 'OTH'}`;
    if (!hsnMap[hsnKey]) {
      hsnMap[hsnKey] = {
        num: Object.keys(hsnMap).length + 1,
        hsn_sc: hsnCode,
        desc: line.description || 'Goods sold through marketplace',
        uqc: line.uqc || 'OTH',
        qty: 0,
        val: 0,
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
        rt: line.gstRate,
      };
    }
    hsnMap[hsnKey].qty += line.quantity * sign;
    hsnMap[hsnKey].val += toRupees(line.invoiceValuePaise) * sign;
    hsnMap[hsnKey].txval += toRupees(line.taxableValuePaise) * sign;
    hsnMap[hsnKey].iamt += toRupees(line.igstPaise) * sign;
    hsnMap[hsnKey].camt += toRupees(line.cgstPaise) * sign;
    hsnMap[hsnKey].samt += toRupees(line.sgstPaise) * sign;
    hsnMap[hsnKey].csamt += toRupees(line.cessPaise) * sign;

    // 5. Process Table 14 (Supplies through E-Commerce Operator - Sec 52)
    // GST schema uses: suppval, igst, cgst, sgst, cess, flag
    if (line.platformGstin) {
      const etin = line.platformGstin;
      if (!ecoMap[etin]) {
        ecoMap[etin] = {
          etin,
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

  // Round B2CS decimals
  const b2csList = Object.values(b2csMap).map(item => ({
    ...item,
    txval: Number(item.txval.toFixed(2)),
    iamt: Number(item.iamt.toFixed(2)),
    camt: Number(item.camt.toFixed(2)),
    samt: Number(item.samt.toFixed(2)),
    csamt: Number(item.csamt.toFixed(2)),
  })).filter(item => item.txval !== 0);

  // Round HSN decimals
  const hsnList = Object.values(hsnMap).map(item => ({
    ...item,
    val: Number(item.val.toFixed(2)),
    txval: Number(item.txval.toFixed(2)),
    iamt: Number(item.iamt.toFixed(2)),
    camt: Number(item.camt.toFixed(2)),
    samt: Number(item.samt.toFixed(2)),
    csamt: Number(item.csamt.toFixed(2)),
  })).filter(item => item.txval !== 0);

  // Round Table 14 decimals
  const table14List = Object.values(ecoMap).map(item => ({
    ...item,
    suppval: Number(item.suppval.toFixed(2)),
    igst:    Number(item.igst.toFixed(2)),
    cgst:    Number(item.cgst.toFixed(2)),
    sgst:    Number(item.sgst.toFixed(2)),
    cess:    Number(item.cess.toFixed(2)),
  }));

  totals.totalTaxPaise = totals.igstPaise + totals.cgstPaise + totals.sgstPaise + totals.cessPaise;

  return {
    totals,
    sections: {
      b2b:    Object.values(b2bMap),
      b2cs:   b2csList,
      cdnr:   Object.values(cdnrMap),
      hsn:    { hsn_b2b: hsnList },      // GST portal key: hsn_b2b
      supeco: { clttx: table14List },    // GST portal key: clttx (Table 14 Sec 52)
    },
    sectionCounts: {
      b2bCount: Object.values(b2bMap).reduce((acc, curr) => acc + curr.inv.length, 0),
      b2csCount: b2csList.length,
      cdnrCount: Object.values(cdnrMap).reduce((acc, curr) => acc + curr.nt.length, 0),
      hsnCount: hsnList.length,
      table14Count: table14List.length,
    },
  };
}
