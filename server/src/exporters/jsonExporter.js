import fs from 'fs';
import path from 'path';

/**
 * Generates the official GST Portal & Offline Tool compliant GSTR-1 JSON payload
 */
export function generateGstr1Json({ gstin, period, aggregatedData, outputFilePath }) {
  const payload = {
    gstin,
    fp: period, // e.g., '092026'
    cur_gt: 0,
    version: 'GST3.1.2',
    hash: 'hash',
    b2b: aggregatedData.sections.b2b || [],
    b2cs: aggregatedData.sections.b2cs || [],
    cdnr: aggregatedData.sections.cdnr || [],
    hsn: aggregatedData.sections.hsn || { data: [] },
    supeco: aggregatedData.sections.supeco || { cl14_2: [] },
  };

  const jsonString = JSON.stringify(payload, null, 2);

  if (outputFilePath) {
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputFilePath, jsonString, 'utf-8');
  }

  return { payload, jsonString };
}
