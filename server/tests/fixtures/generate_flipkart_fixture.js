import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const flipkartRows = [
  {
    'Invoice No': 'FK-2026-501',
    'Invoice Date': '04-09-2026',
    'Event Type': 'Sale',
    'Order ID': 'OD1002003001',
    'Warehouse State': 'Karnataka',
    'Delivery State': 'Tamil Nadu',
    'Taxable Value': 12500,
    'IGST Rate': 18,
    'CGST Rate': 0,
    'SGST Rate': 0,
    'IGST Amount': 2250,
    'CGST Amount': 0,
    'SGST Amount': 0,
    'Final Invoice Amount': 14750,
    'Buyer GSTIN': '',
    'HSN Code': '8518',
    'Product Title': 'Smart Wireless Soundbar',
    'Quantity': 1,
    'ECO GSTIN': '29AAACF1479P1ZU',
  },
  {
    'Invoice No': 'FK-2026-502',
    'Invoice Date': '08-09-2026',
    'Event Type': 'Sale',
    'Order ID': 'OD1002003002',
    'Warehouse State': 'Karnataka',
    'Delivery State': 'Karnataka',
    'Taxable Value': 6000,
    'IGST Rate': 0,
    'CGST Rate': 9,
    'SGST Rate': 9,
    'IGST Amount': 0,
    'CGST Amount': 540,
    'SGST Amount': 540,
    'Final Invoice Amount': 7080,
    'Buyer GSTIN': '',
    'HSN Code': '3926',
    'Product Title': 'Premium Ergonomic Laptop Stand',
    'Quantity': 2,
    'ECO GSTIN': '29AAACF1479P1ZU',
  },
  {
    'Invoice No': 'FK-2026-503',
    'Invoice Date': '18-09-2026',
    'Event Type': 'Return',
    'Order ID': 'OD1002003003',
    'Warehouse State': 'Karnataka',
    'Delivery State': 'Tamil Nadu',
    'Taxable Value': 12500,
    'IGST Rate': 18,
    'CGST Rate': 0,
    'SGST Rate': 0,
    'IGST Amount': 2250,
    'CGST Amount': 0,
    'SGST Amount': 0,
    'Final Invoice Amount': 14750,
    'Buyer GSTIN': '',
    'HSN Code': '8518',
    'Product Title': 'Smart Wireless Soundbar Return',
    'Quantity': 1,
    'ECO GSTIN': '29AAACF1479P1ZU',
  },
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(flipkartRows);
xlsx.utils.book_append_sheet(wb, ws, 'Sales Report');

const targetPath = path.join(__dirname, 'flipkart_sample_sales.xlsx');
xlsx.writeFile(wb, targetPath);
console.log('✓ Generated Flipkart Excel sample fixture at:', targetPath);
