import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { toRupees } from '../engine/money.js';

/**
 * Generates an Excel workbook formatted like the official GSTR-1 Offline Tool
 */
export function generateGstr1Excel({ gstin, period, aggregatedData, outputFilePath }) {
  const wb = xlsx.utils.book_new();

  // 1. Sheet: b2b
  const b2bRows = [];
  (aggregatedData.sections.b2b || []).forEach(buyer => {
    buyer.inv.forEach(inv => {
      inv.itms.forEach(itm => {
        b2bRows.push({
          'GSTIN/UIN of Recipient': buyer.ctin,
          'Invoice Number': inv.inum,
          'Invoice date': inv.idt,
          'Invoice Value': inv.val,
          'Place Of Supply': inv.pos,
          'Reverse Charge': inv.rchrg || 'N',
          'Invoice Type': 'Regular',
          'Rate': itm.itm_det.rt,
          'Taxable Value': itm.itm_det.txval,
          'Integrated Tax': itm.itm_det.iamt,
          'Central Tax': itm.itm_det.camt,
          'State/UT Tax': itm.itm_det.samt,
          'Cess Amount': itm.itm_det.csamt,
        });
      });
    });
  });
  const wsB2B = xlsx.utils.json_to_sheet(b2bRows.length ? b2bRows : [{ 'Note': 'No B2B supplies for this period' }]);
  xlsx.utils.book_append_sheet(wb, wsB2B, 'b2b');

  // 2. Sheet: b2cs
  const b2csRows = (aggregatedData.sections.b2cs || []).map(row => ({
    'Type': row.sply_ty === 'INTER' ? 'Inter-State' : 'Intra-State',
    'Place Of Supply': row.pos,
    'Rate': row.rt,
    'Taxable Value': row.txval,
    'Integrated Tax': row.iamt,
    'Central Tax': row.camt,
    'State/UT Tax': row.samt,
    'Cess Amount': row.csamt,
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
          'Note Number': note.nt_num,
          'Note Date': note.nt_dt,
          'Original Invoice Number': note.inum,
          'Original Invoice Date': note.idt,
          'Document Type': 'C',
          'Note Value': note.val,
          'Rate': itm.itm_det.rt,
          'Taxable Value': itm.itm_det.txval,
          'Integrated Tax': itm.itm_det.iamt,
          'Central Tax': itm.itm_det.camt,
          'State/UT Tax': itm.itm_det.samt,
          'Cess Amount': itm.itm_det.csamt,
        });
      });
    });
  });
  const wsCDNR = xlsx.utils.json_to_sheet(cdnrRows.length ? cdnrRows : [{ 'Note': 'No Credit/Debit notes for this period' }]);
  xlsx.utils.book_append_sheet(wb, wsCDNR, 'cdnr');

  // 4. Sheet: hsn
  const hsnRows = (aggregatedData.sections.hsn?.data || []).map(row => ({
    'HSN': row.hsn_sc,
    'Description': row.desc,
    'UQC': row.uqc,
    'Total Quantity': row.qty,
    'Total Value': row.val,
    'Taxable Value': row.txval,
    'Rate': row.rt,
    'Integrated Tax': row.iamt,
    'Central Tax': row.camt,
    'State/UT Tax': row.samt,
    'Cess Amount': row.csamt,
  }));
  const wsHSN = xlsx.utils.json_to_sheet(hsnRows.length ? hsnRows : [{ 'Note': 'No HSN records for this period' }]);
  xlsx.utils.book_append_sheet(wb, wsHSN, 'hsn');

  // 5. Sheet: Table 14 (supeco)
  const ecoRows = (aggregatedData.sections.supeco?.cl14_2 || []).map(row => ({
    'GSTIN of E-Commerce Operator': row.etin,
    'Legal / Trade Name': row.sup_name,
    'Taxable Value': row.txval,
    'Integrated Tax': row.iamt,
    'Central Tax': row.camt,
    'State/UT Tax': row.samt,
    'Cess Amount': row.csamt,
  }));
  const wsECO = xlsx.utils.json_to_sheet(ecoRows.length ? ecoRows : [{ 'Note': 'No E-Commerce supplies for this period' }]);
  xlsx.utils.book_append_sheet(wb, wsECO, 'Table 14 ECO');

  // 6. Sheet: Summary
  const summaryRows = [
    { 'Metric': 'GSTIN', 'Value': gstin },
    { 'Metric': 'Tax Period', 'Value': period },
    { 'Metric': 'Total Invoices', 'Value': aggregatedData.totals.totalInvoices },
    { 'Metric': 'Total Taxable Value (₹)', 'Value': toRupees(aggregatedData.totals.taxableValuePaise) },
    { 'Metric': 'Total IGST (₹)', 'Value': toRupees(aggregatedData.totals.igstPaise) },
    { 'Metric': 'Total CGST (₹)', 'Value': toRupees(aggregatedData.totals.cgstPaise) },
    { 'Metric': 'Total SGST (₹)', 'Value': toRupees(aggregatedData.totals.sgstPaise) },
    { 'Metric': 'Total Cess (₹)', 'Value': toRupees(aggregatedData.totals.cessPaise) },
    { 'Metric': 'Total Tax (₹)', 'Value': toRupees(aggregatedData.totals.totalTaxPaise) },
    { 'Metric': 'Total Invoice Value (₹)', 'Value': toRupees(aggregatedData.totals.totalInvoiceValuePaise) },
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
