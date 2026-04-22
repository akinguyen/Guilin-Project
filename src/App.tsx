import { useState } from "react";
import {
  translateOldCode,
  type ColorCode,
  type TranslationResult,
} from "./lib/translator";

export default function App() {
  const [oldCode, setOldCode] = useState("W123912");
  const [color, setColor] = useState<ColorCode>("W");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState("");

  function handleTranslate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setResult(translateOldCode(oldCode, color));
      setError("");
    } catch (translationError) {
      setResult(null);
      setError(
        translationError instanceof Error
          ? translationError.message
          : "Unable to translate this furniture code.",
      );
    }
  }

  return (
    <div className="page-shell">
      <main className="app-card">
        <section className="hero">
          <h2>Furniture Code Translator</h2>
        </section>

        <section className="panel-grid">
          <article className="panel">
            <div className="panel-heading">
              <h2>Old code input</h2>
              <span className="badge">Rule-based translator</span>
            </div>
            <form className="translator-form" onSubmit={handleTranslate}>
              <label className="field">
                <span>Old furniture code</span>
                <input
                  value={oldCode}
                  onChange={(event) => setOldCode(event.target.value)}
                  placeholder="W123912"
                />
              </label>

              <label className="field">
                <span>Finish color</span>
                <select
                  value={color}
                  onChange={(event) =>
                    setColor(event.target.value as ColorCode)
                  }
                >
                  <option value="W">White (W)</option>
                  <option value="B">Wood (B)</option>
                </select>
              </label>

              <button className="primary-button" type="submit">
                Translate code
              </button>
            </form>
          </article>
        </section>

        {error ? <p className="error-banner">{error}</p> : null}

        <section className="results-header">
          <div>
            <p className="section-kicker">Translation results</p>
            <h2>
              {result
                ? result.normalizedInput
                : "Enter a furniture code to see suggestions"}
            </h2>
            <p className="supporting-copy">
              {result
                ? `${result.familyCode} means ${result.familyName}.`
                : "Example: W123912 becomes one box plus two equal-width doors."}
            </p>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <span>Suggested translated parts</span>
            <strong>{result?.suggestions.length ?? 0}</strong>
          </article>
          <article className="stat-card">
            <span>Furniture family</span>
            <strong>{result?.familyCode ?? "--"}</strong>
          </article>
          <article className="stat-card">
            <span>Chosen color</span>
            <strong>{color}</strong>
          </article>
        </section>

        <section className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Suggested new code</th>
                  <th>Quantity</th>
                  <th>Part type</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {result?.suggestions.length ? (
                  result.suggestions.map((suggestion) => (
                    <tr key={`${suggestion.code}-${suggestion.kind}`}>
                      <td>{suggestion.code}</td>
                      <td>{suggestion.quantity}</td>
                      <td>{suggestion.kind}</td>
                      <td>{suggestion.note}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="empty-state">
                      No translated suggestions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="text-review rule-layout">
          <div className="panel-heading">
            <h2>How the translator read this code</h2>
          </div>
          <div className="rule-grid">
            <article className="rule-card">
              <h3>Known prefixes</h3>
              <ul>
                <li>`W` = upper / wall cabinet</li>
                <li>`B` = base</li>
                <li>`DB` = drawer base</li>
                <li>`V` = vanity</li>
                <li>`PC` = pantry</li>
                <li>`BLS` = lazy susan</li>
                <li>`FDB` = base FHD</li>
                <li>`SB` = slink base</li>
                <li>`SBFD` = slink base FHD</li>
                <li>`BCD` = base curved with door</li>
                <li>`WBD` = wall bottom drawer</li>
                <li>`BFDS` = base starter FHD</li>
                <li>`BB` = base blind</li>
                <li>`BBFHD` = base blind FHD</li>
              </ul>
            </article>

            <article className="rule-card">
              <h3>Applied explanation</h3>
              <ul>
                {result ? (
                  result.explanation.map((line) => <li key={line}>{line}</li>)
                ) : (
                  <li>
                    The app will show the parsed dimensions, door logic, and
                    color rule here after translation.
                  </li>
                )}
              </ul>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
