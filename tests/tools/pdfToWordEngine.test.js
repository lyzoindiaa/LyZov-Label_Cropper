import '../../src/polyfills.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { convertPdfToDocx } from '../../src/utils/pdfToWordEngine.js';

describe('PDF to Word (.docx) Engine', () => {
  it('converts a multi-page digital PDF with headings, bold text, and table rows into a genuine OOXML .docx', async () => {
    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page1 = pdfDoc.addPage([595, 842]);
    page1.drawText('Quarterly Sales Summary', {
      x: 50,
      y: 780,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    page1.drawText('Item', { x: 50, y: 720, size: 11, font: boldFont });
    page1.drawText('Units', { x: 240, y: 720, size: 11, font: boldFont });
    page1.drawText('Revenue', { x: 380, y: 720, size: 11, font: boldFont });

    page1.drawText('Thermal Labels', { x: 50, y: 700, size: 11, font: regularFont });
    page1.drawText('120', { x: 240, y: 700, size: 11, font: regularFont });
    page1.drawText('Rs 24000', { x: 380, y: 700, size: 11, font: regularFont });

    const page2 = pdfDoc.addPage([595, 842]);
    page2.drawText('Notes & Next Steps', {
      x: 50,
      y: 780,
      size: 16,
      font: boldFont,
    });
    page2.drawText('All shipments dispatched on schedule.', {
      x: 50,
      y: 745,
      size: 11,
      font: regularFont,
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

    const result = await convertPdfToDocx(pdfBlob, {
      enableOcr: false,
      extractImages: false,
    });

    assert.equal(result.pageCount, 2);
    assert.equal(result.ocrPageCount, 0);
    assert.equal(result.tableCount, 1);
    assert.equal(
      result.blob.type,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    const docxBytes = new Uint8Array(await result.blob.arrayBuffer());
    assert.equal(docxBytes[0], 0x50); // P
    assert.equal(docxBytes[1], 0x4b); // K

    const zip = await JSZip.loadAsync(docxBytes);
    const documentXml = await zip.file('word/document.xml').async('string');
    assert.match(documentXml, /Quarterly Sales Summary/);
    assert.match(documentXml, /<w:tbl>/);
    assert.match(documentXml, /Thermal Labels/);
    assert.match(documentXml, /w:type="page"/);
    assert.match(documentXml, /All shipments dispatched on schedule/);
  });

  it('rejects corrupt PDFs with a readable error', async () => {
    const badBlob = new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'application/pdf' });
    await assert.rejects(
      () => convertPdfToDocx(badBlob, { enableOcr: false, extractImages: false }),
      /InvalidPDFException|PDF/i
    );
  });
});
