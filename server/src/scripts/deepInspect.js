import fs from 'fs';
import xlsx from 'xlsx';

console.log('========================================');
console.log('1. INSPECTING AMAZON CSV');
console.log('========================================');
const csvRaw = fs.readFileSync('d:/label_cropper/docs-design/MTR_B2C-SEPTEMBER-2026-ATFATWBLJ4EL2.csv', 'utf8');
const lines = csvRaw.trim().split(/\r?\n/);
console.log('Total CSV lines:', lines.length);
console.log('Header columns count:', lines[0].split(',').length);
console.log('Data rows:');
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  console.log(` Row ${i}: Invoice=${parts[1]}, Type=${parts[3]}, Item=${parts[10]}, Amount=${parts[27]}`);
}

console.log('\n========================================');
console.log('2. INSPECTING FLIPKART EXCEL');
console.log('========================================');
const wb = xlsx.readFile('d:/label_cropper/docs-design/45255dc8-625d-41de-9d11-741919864d9d_1791204761000.xlsx');
console.log('Sheets in workbook:', wb.SheetNames);
for (const sheetName of wb.SheetNames) {
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\nSheet "${sheetName}": ${rows.length} total rows`);
  if (rows.length <= 5) {
    rows.forEach((r, idx) => console.log(`  Row ${idx}:`, r.slice(0, 10)));
  } else {
    console.log('  Row 0 (Headers):', rows[0].slice(0, 10));
    console.log('  Row 1 (First data):', rows[1].slice(0, 10));
    console.log(`  ... and ${rows.length - 1} data rows.`);
  }
}

console.log('\n========================================');
console.log('3. INSPECTING OFFICIAL GSTR-1 REFERENCE JSON');
console.log('========================================');
const jsonPath = 'd:/label_cropper/docs-design/GSTR1_returns_09GUPPM8961P1Z6_monthly_092026.json';
if (fs.existsSync(jsonPath)) {
  const jsonRaw = fs.readFileSync(jsonPath, 'utf8');
  const json = JSON.parse(jsonRaw);
  console.log('Reference JSON content:');
  console.log(JSON.stringify(json, null, 2));
} else {
  console.log('No reference JSON file found.');
}
