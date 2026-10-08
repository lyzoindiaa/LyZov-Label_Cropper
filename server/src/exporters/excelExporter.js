import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { toRupees } from '../engine/money.js';
import { GST_STATE_CODES } from '../config/constants.js';

/**
 * Generates an Excel workbook formatted like the official GSTR-1 Offline Tool template
 */
export function generateGstr1Excel({ gstin, period, aggregatedData, outputFilePath }) {
  const wb = xlsx.utils.book_new();

  // Helper to format POS (e.g. '09-Uttar Pradesh')
  const formatPos = (posCode) => {
    if (!posCode) return '09-Uttar Pradesh';
    const clean = String(posCode).padStart(2, '0');
    const name = GST_STATE_CODES[clean] || 'Uttar Pradesh';
    return `${clean}-${name}`;
  };

  // 1. Sheet: b2b
  const b2bRows = [];
  (aggregatedData.sections.b2b || []).forEach(buyer => {
    buyer.inv.forEach(inv => {
      inv.itms.forEach(itm => {
        b2bRows.push({
          'GSTIN/UIN of Recipient': buyer.ctin,
          'Receiver Name': buyer.tradeName || '',
          'Invoice Number': inv.inum,
          'Invoice date': inv.idt,
          'Invoice Value': inv.val,
          'Place Of Supply': formatPos(inv.pos),
          'Reverse Charge': inv.rchrg || 'N',
          'Applicable % of Tax Rate': '',
          'Invoice Type': 'Regular',
          'E-Commerce GSTIN': '',
          'Rate': itm.itm_det.rt,
          'Taxable Value': itm.itm_det.txval,
          'Cess Amount': itm.itm_det.csamt,
        });
      });
    });
  });
  const wsB2B = xlsx.utils.json_to_sheet(b2bRows.length ? b2bRows : [{ 'Note': 'No B2B supplies for this period' }]);
  xlsx.utils.book_append_sheet(wb, wsB2B, 'b2b');

  // 2. Sheet: b2cs
  const b2csRows = (aggregatedData.sections.b2cs || []).map(row => ({
    'Type': row.typ || 'OE',
    'Place Of Supply': formatPos(row.pos),
    'Applicable % of Tax Rate': '',
    'Rate': row.rt,
    'Taxable Value': row.txval,
    'Integrated Tax': row.iamt,
    'Central Tax': row.camt,
    'State/UT Tax': row.samt,
    'Cess Amount': row.csamt,
    'E-Commerce GSTIN': '',
  }));
  const wsB2CS = xlsx.utils.json_to_sheet(b2csRows.length ? b2csRows : [{ 'Note': 'No B2CS supplies for this period' }]);
  xlsx.utils.book_append_sheet(wb, wsB2CS, 'b2cs');

  // 3. Sheet: cdnr
  const cdnrRows = [];
  (aggregatedData.sections.cdnr || []).forEach(buyer => {
    buyer.nt.forEach(note => {
      note.itms.forEach(itm => {
        cdnrRows.push({
          'GSTIN/UIN of Recipient': buyer.ctin,
          'Receiver Name': buyer.tradeName || '',
          'Note/Refund Voucher Number': note.nt_num,
          'Note/Refund Voucher date': note.nt_dt,
          'Document Type': note.ntty || 'C',
          'Reason for Issuing Document': '01-Sales Return',
          'Place Of Supply': formatPos(note.pos),
          'Note/Refund Voucher Value': note.val,
          'Applicable % of Tax Rate': '',
          'Rate': itm.itm_det.rt,
          'Taxable Value': itm.itm_det.txval,
          'Cess Amount': itm.itm_det.csamt,
          'Pre GST': 'N',
        });
      });
    });
  });
  const wsCDNR = xlsx.utils.json_to_sheet(cdnrRows.length ? cdnrRows : [{ 'Note': 'No Credit/Debit notes for this period' }]);
  xlsx.utils.book_append_sheet(wb, wsCDNR, 'cdnr');

  // 4. Sheet: exemp (NIL / Exempted supplies)
  const nilInv = aggregatedData.sections.nil?.inv || [];
  const findNil = (splyTy) => nilInv.find(i => i.sply_ty === splyTy)?.nil_amt || 0;
  const findExpt = (splyTy) => nilInv.find(i => i.sply_ty === splyTy)?.expt_amt || 0;
  const findNgsup = (splyTy) => nilInv.find(i => i.sply_ty === splyTy)?.ngsup_amt || 0;

  const exempRows = [
    {
      'Description': 'Inter-State supplies to Registered Persons',
      'Nil Rated Supplies': findNil('INTRB2B'),
      'Exempted (Other than Nil rated/non GST supply)': findExpt('INTRB2B'),
      'Non-GST Supplies': findNgsup('INTRB2B'),
    },
    {
      'Description': 'Intra-State supplies to Registered Persons',
      'Nil Rated Supplies': findNil('INTRAB2B'),
      'Exempted (Other than Nil rated/non GST supply)': findExpt('INTRAB2B'),
      'Non-GST Supplies': findNgsup('INTRAB2B'),
    },
    {
      'Description': 'Inter-State supplies to Unregistered Persons',
      'Nil Rated Supplies': findNil('INTRB2C'),
      'Exempted (Other than Nil rated/non GST supply)': findExpt('INTRB2C'),
      'Non-GST Supplies': findNgsup('INTRB2C'),
    },
    {
      'Description': 'Intra-State supplies to Unregistered Persons',
      'Nil Rated Supplies': findNil('INTRAB2C'),
      'Exempted (Other than Nil rated/non GST supply)': findExpt('INTRAB2C'),
    },
  ];
  const wsEXEMP = xlsx.utils.json_to_sheet(exempRows);
  xlsx.utils.book_append_sheet(wb, wsEXEMP, 'exemp');

  // 5. Sheet: hsn
  const rawHsn = aggregatedData.sections.hsn?.hsn_b2c || aggregatedData.sections.hsn?.hsn_b2b || aggregatedData.sections.hsn?.data || [];
  const hsnRows = rawHsn.map(row => ({
    'HSN': row.hsn_sc,
    'Description': row.desc,
    'UQC': row.uqc,
    'Total Quantity': row.qty,
    'Total Value': row.val,
    'Taxable Value': row.txval,
    'Rate': row.rt,
    'Integrated Tax Amount': row.iamt,
    'Central Tax Amount': row.camt,
    'State/UT Tax Amount': row.samt,
    'Cess Amount': row.csamt,
  }));
  const wsHSN = xlsx.utils.json_to_sheet(hsnRows.length ? hsnRows : [{ 'Note': 'No HSN records for this period' }]);
  xlsx.utils.book_append_sheet(wb, wsHSN, 'hsn');

  // 6. Sheet: docs (Documents Issued)
  const docDet = aggregatedData.sections.doc_issue?.doc_det || [];
  const docRows = [];
  docDet.forEach(d => {
    (d.docs || []).forEach(doc => {
      docRows.push({
        'Nature of Document': d.doc_typ,
        'Sr. No. From': doc.from,
        'Sr. No. To': doc.to,
        'Total Number': doc.totnum,
        'Cancelled': doc.cancel,
        'Net Issued': doc.net_issue,
      });
    });
  });
  const wsDOCS = xlsx.utils.json_to_sheet(docRows.length ? docRows : [{ 'Note': 'No documents issued' }]);
  xlsx.utils.book_append_sheet(wb, wsDOCS, 'docs');

  // 7. Sheet: supeco (Table 14 ECO)
  const rawClttx = aggregatedData.sections.supeco?.clttx || aggregatedData.sections.supeco?.cl14_2 || [];
  const ecoRows = rawClttx.map(row => ({
    'GSTIN of E-Commerce Operator': row.etin,
    'Trade Name': row.sup_name || '',
    'Merchant ID': '',
    'Taxable Value': row.suppval ?? row.txval ?? 0,
    'Integrated Tax Amount': row.igst ?? row.iamt ?? 0,
    'Central Tax Amount': row.cgst ?? row.camt ?? 0,
    'State/UT Tax Amount': row.sgst ?? row.samt ?? 0,
    'Cess Amount': row.cess ?? row.csamt ?? 0,
  }));
  const wsECO = xlsx.utils.json_to_sheet(ecoRows.length ? ecoRows : [{ 'Note': 'No E-Commerce supplies for this period' }]);
  xlsx.utils.book_append_sheet(wb, wsECO, 'supeco');

  // 8. Sheet: Summary
  const summaryRows = [
    { 'Metric': 'GSTIN', 'Value': gstin },
    { 'Metric': 'Tax Period', 'Value': period },
    { 'Metric': 'Total Sales Invoices', 'Value': aggregatedData.totals.totalInvoices },
    { 'Metric': 'Total Notes & Returns', 'Value': aggregatedData.totals.totalNotes || 0 },
    { 'Metric': 'Total Records Processed', 'Value': aggregatedData.totals.totalRowsProcessed || aggregatedData.totals.totalInvoices },
    { 'Metric': 'Total Taxable Value (₹)', 'Value': toRupees(aggregatedData.totals.taxableValuePaise) },
    { 'Metric': 'Total IGST (₹)', 'Value': toRupees(aggregatedData.totals.igstPaise) },
    { 'Metric': 'Total CGST (₹)', 'Value': toRupees(aggregatedData.totals.cgstPaise) },
    { 'Metric': 'Total SGST (₹)', 'Value': toRupees(aggregatedData.totals.sgstPaise) },
    { 'Metric': 'Total Cess (₹)', 'Value': toRupees(aggregatedData.totals.cessPaise) },
    { 'Metric': 'Total Tax (₹)', 'Value': toRupees(aggregatedData.totals.totalTaxPaise) },
    { 'Metric': 'Net value after returns (₹)', 'Value': toRupees(aggregatedData.totals.totalInvoiceValuePaise) },
  ];
  const wsSummary = xlsx.utils.json_to_sheet(summaryRows);
  xlsx.utils.book_append_sheet(wb, wsSummary, 'Summary');

  if (outputFilePath) {
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    xlsx.writeFile(wb, outputFilePath);
  }

  return wb;
}

