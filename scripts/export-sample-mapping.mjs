import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';

const workbookPath = 'C:/Users/Nqk/Downloads/Sample_E SKU List.xlsx';
const outputPath = path.resolve('src/data/defaultMapping.json');

const workbook = xlsx.readFile(workbookPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

const entries = rows
  .map((row) => {
    const oldCode = String(row['User Code'] ?? '').trim();
    const newCode = String(row['MATCHING CODE GUILIN'] ?? '').trim();
    const description = String(row.Description ?? '').trim();

    if (!oldCode || !newCode) {
      return null;
    }

    return {
      oldCode,
      newCode,
      description,
    };
  })
  .filter(Boolean);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2));

console.log(`Exported ${entries.length} mappings to ${outputPath}`);
