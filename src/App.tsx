import { useEffect, useMemo, useState } from 'react';
import defaultMappings from './data/defaultMapping.json';
import { parseImage, parsePdf } from './lib/document';
import { buildLookup, parseWorkbook, translateText } from './lib/mapping';
import type { DocumentParseResult, MappingEntry, TranslationHit } from './types';

const bundledMappings = defaultMappings as MappingEntry[];

function downloadCsv(rows: TranslationHit[]) {
  const csv = [
    ['Detected code', 'Normalized code', 'Translated code', 'Description', 'Occurrences'].join(','),
    ...rows.map((row) =>
      [
        row.code,
        row.normalizedCode,
        row.replacement ?? '',
        row.description ?? '',
        row.count.toString(),
      ]
        .map((value) => `"${value.replace(/"/g, '""')}"`)
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'translated-codes.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [mappingEntries, setMappingEntries] = useState<MappingEntry[]>(bundledMappings);
  const [mappingSource, setMappingSource] = useState('Bundled sample mapping');
  const [parseResult, setParseResult] = useState<DocumentParseResult | null>(null);
  const [translations, setTranslations] = useState<TranslationHit[]>([]);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const lookup = useMemo(() => buildLookup(mappingEntries), [mappingEntries]);

  useEffect(() => {
    if (!parseResult) {
      setTranslations([]);
      return;
    }

    setTranslations(translateText(parseResult.rawText, lookup));
  }, [lookup, parseResult]);

  const matchedCount = translations.filter((item) => item.replacement).length;
  const unmatchedCount = translations.length - matchedCount;

  async function handleMappingUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const entries = parseWorkbook(buffer);

      if (!entries.length) {
        throw new Error('No valid code mappings were found in the workbook.');
      }

      setMappingEntries(entries);
      setMappingSource(file.name);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to read the mapping workbook.');
    } finally {
      event.target.value = '';
    }
  }

  async function handleDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsProcessing(true);
    setSelectedFileName(file.name);
    setErrorMessage('');

    try {
      const result = file.type === 'application/pdf' ? await parsePdf(file) : await parseImage(file);

      setParseResult(result);
    } catch (error) {
      setParseResult(null);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to process the uploaded document.');
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  }

  return (
    <div className="page-shell">
      <main className="app-card">
        <section className="hero">
          <p className="eyebrow">Guilin Remodeling Tools</p>
          <h1>Translate old furniture codes from PDFs and images into the new Guilin codes.</h1>
          <p className="hero-copy">
            Upload your SKU translation workbook, then drop in a customer PDF, screenshot, or product image.
            The app extracts the codes it finds and shows which ones match your new Guilin naming.
          </p>
        </section>

        <section className="panel-grid">
          <article className="panel">
            <div className="panel-heading">
              <h2>1. Mapping table</h2>
              <span className="badge">{mappingEntries.length.toLocaleString()} active rows</span>
            </div>
            <p>
              Current source: <strong>{mappingSource}</strong>
            </p>
            <label className="upload-tile">
              <input type="file" accept=".xlsx,.xls" onChange={handleMappingUpload} />
              <span>Import a new Excel mapping file</span>
              <small>Looks for the old code in `User Code` and the new code in `MATCHING CODE GUILIN`.</small>
            </label>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <h2>2. Document import</h2>
              <span className="badge">{selectedFileName || 'No file yet'}</span>
            </div>
            <label className="upload-tile accent">
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp,image/bmp"
                onChange={handleDocumentUpload}
              />
              <span>{isProcessing ? 'Reading document...' : 'Upload a PDF or image'}</span>
              <small>PDFs use embedded text first and fall back to OCR when needed. Images use OCR.</small>
            </label>
          </article>
        </section>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

        <section className="results-header">
          <div>
            <p className="section-kicker">Translation results</p>
            <h2>{translations.length ? 'Detected codes from your document' : 'Upload a document to start'}</h2>
            {parseResult ? (
              <p className="supporting-copy">
                Extraction method: <strong>{parseResult.extractionMethod}</strong>
                {parseResult.pageCount ? ` - ${parseResult.pageCount} page(s)` : ''}
              </p>
            ) : (
              <p className="supporting-copy">
                The included sample mapping is loaded by default so you can test with your `test.pdf` right away.
              </p>
            )}
          </div>

          {translations.length ? (
            <button className="export-button" type="button" onClick={() => downloadCsv(translations)}>
              Export CSV
            </button>
          ) : null}
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <span>Total unique codes</span>
            <strong>{translations.length}</strong>
          </article>
          <article className="stat-card">
            <span>Matched to new Guilin code</span>
            <strong>{matchedCount}</strong>
          </article>
          <article className="stat-card">
            <span>Still unmatched</span>
            <strong>{unmatchedCount}</strong>
          </article>
        </section>

        <section className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Detected code</th>
                  <th>New Guilin code</th>
                  <th>Description</th>
                  <th>Occurrences</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {translations.length ? (
                  translations.map((row) => (
                    <tr key={row.normalizedCode}>
                      <td>{row.code}</td>
                      <td>{row.replacement ?? 'Not found'}</td>
                      <td>{row.description ?? 'No description available'}</td>
                      <td>{row.count}</td>
                      <td>
                        <span className={row.replacement ? 'status-pill matched' : 'status-pill missing'}>
                          {row.replacement ? 'Matched' : 'Needs review'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      No codes detected yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="text-review">
          <div className="panel-heading">
            <h2>Extracted text preview</h2>
          </div>
          <pre>{parseResult?.rawText.slice(0, 6000) ?? 'The document text preview will appear here.'}</pre>
        </section>
      </main>
    </div>
  );
}
