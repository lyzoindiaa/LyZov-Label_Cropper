import xlsx from 'xlsx';

const wb = xlsx.readFile('d:/label_cropper/docs-design/45255dc8-625d-41de-9d11-741919864d9d_1791204761000.xlsx');
console.log('Workbook SheetNames:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  console.log(`Sheet "${name}" !ref range: ${sheet['!ref']}`);
}
