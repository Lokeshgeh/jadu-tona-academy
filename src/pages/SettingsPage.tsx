import { useRef, useState } from "react";
import {
  CORRUPT_BACKUP_KEY,
  LIMITS,
  PROGRESS_SCHEMA_VERSION,
  STORAGE_KEY,
} from "../domain/progress";
import { CONTENT_VERSION } from "../domain/content";
import { MAX_ANNOTATIONS, MAX_ANNOTATION_TEXT } from "../domain/annotations";
import { useProgress } from "../state/store";
import { Badge, Callout, PageHeader, Stat, formatDateTime } from "../components/ui";

function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const { state, exportText, importText, resetAll } = useProgress();
  const [importStatus, setImportStatus] = useState<{ tone: "good" | "bad"; message: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [resetWord, setResetWord] = useState("");
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const exportBody = exportText();
  const size = new Blob([exportBody]).size;
  const backup = typeof window !== "undefined" ? window.localStorage.getItem(CORRUPT_BACKUP_KEY) : null;
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;

  const onExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadText(`jadu-tona-progress-${date}.json`, exportBody);
  };

  const onFile = async (file: File | undefined) => {
    setImportStatus(null);
    if (!file) return;
    setFileName(file.name);
    if (file.size > LIMITS.importBytes) {
      setImportStatus({ tone: "bad", message: `File is ${humanBytes(file.size)}; the limit is ${humanBytes(LIMITS.importBytes)}.` });
      return;
    }
    try {
      const text = await file.text();
      importText(text);
      setImportStatus({ tone: "good", message: `Imported ${file.name}. Your previous local record was replaced by the validated bundle.` });
    } catch (error) {
      setImportStatus({ tone: "bad", message: error instanceof Error ? error.message : "Could not import that file." });
    }
  };

  const onReset = () => {
    if (resetWord !== "RESET") return;
    resetAll();
    setResetWord("");
    setResetNotice("Local progress cleared. A fresh empty record is now stored in this browser.");
    if (fileInput.current) fileInput.current.value = "";
    setImportStatus(null);
  };

  const onDownloadBackup = () => {
    if (backup === null) return;
    downloadText(`jadu-tona-corrupt-backup-${Date.now()}.txt`, backup);
  };

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Settings"
        title="Your data, your browser"
        description="There is no account, sync, analytics service, or backend. Progress lives in localStorage until you export it or clear it."
        actions={<Badge tone="good">No network calls</Badge>}
      />

      <section className="stat-grid" aria-label="Stored data summary">
        <Stat label="Export size" value={humanBytes(size)} hint={`JSON bundle limit: ${humanBytes(LIMITS.importBytes)}.`} />
        <Stat label="Stored bytes" value={stored === null ? "0 B" : humanBytes(new Blob([stored]).size)} hint={`Key: ${STORAGE_KEY}`} />
        <Stat label="Attempts" value={state.attempts.length + state.scenarioAttempts.length} hint={`${state.attempts.length} questions, ${state.scenarioAttempts.length} scenarios.`} />
        <Stat label="Annotations" value={`${state.annotations.length}/${MAX_ANNOTATIONS}`} hint={`Maximum ${MAX_ANNOTATION_TEXT} characters each.`} />
      </section>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <h2>Export</h2>
            <Badge tone="info">schema v{PROGRESS_SCHEMA_VERSION}</Badge>
          </div>
          <p>
            Download a validated JSON bundle of your XP ledger, attempts, lesson completions, scenario record, assessment
            history, streak, and annotations. The file is created locally by your browser.
          </p>
          <button type="button" className="button button-primary" onClick={onExport}>
            Download progress JSON
          </button>
          <p className="muted tiny">
            Content version {CONTENT_VERSION}. Export includes only data listed above — no identifiers, no device
            fingerprints, no timestamps beyond the progress events.
          </p>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Import</h2>
            <Badge tone="warn">Replaces current data</Badge>
          </div>
          <p>
            Import a bundle exported by this app. The file is size-limited, parsed, schema-validated, and rejected on any
            unknown field or unsupported version before it replaces your current record.
          </p>
          <label className="file-field">
            Choose JSON file
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              onChange={(event) => void onFile(event.target.files?.[0])}
            />
          </label>
          {fileName && <p className="muted tiny">Selected: {fileName}</p>}
          {importStatus && (
            <p className={`alert ${importStatus.tone === "good" ? "alert-good" : "alert-error"}`} role="status">
              {importStatus.message}
            </p>
          )}
          <p className="muted tiny">A failed import leaves your existing progress untouched.</p>
        </section>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <h2>Storage diagnostics</h2>
            <Badge tone="neutral">local only</Badge>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Progress key</dt>
              <dd className="mono">{STORAGE_KEY}</dd>
            </div>
            <div>
              <dt>Corrupt backup key</dt>
              <dd className="mono">{CORRUPT_BACKUP_KEY}</dd>
            </div>
            <div>
              <dt>Last activity</dt>
              <dd>{state.streak.lastDay ?? "None yet"}</dd>
            </div>
            <div>
              <dt>Record created</dt>
              <dd>{formatDateTime(state.createdAt)}</dd>
            </div>
            <div>
              <dt>Record updated</dt>
              <dd>{formatDateTime(state.updatedAt)}</dd>
            </div>
          </dl>
          {backup !== null ? (
            <>
              <Callout title="A corrupt backup exists" tone="warn">
                An earlier value could not be read and was preserved rather than deleted. Downloading it is safe; it is
                raw text, not a validated bundle.
              </Callout>
              <button type="button" className="button button-secondary" onClick={onDownloadBackup}>
                Download corrupt backup
              </button>
            </>
          ) : (
            <p className="muted small">No corrupt-value backup is present. Corrupt data is never silently discarded.</p>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Scope and security</h2>
            <Badge tone="info">Read-only facts</Badge>
          </div>
          <ul className="check-list">
            <li>Static site; no backend, accounts, cookies, telemetry, or external requests.</li>
            <li>Strict Content Security Policy; scripts load only from the app itself.</li>
            <li>Progress and notes persist in localStorage; clearing site data removes them.</li>
            <li>Imported data is validated with strict schemas and hard size limits.</li>
            <li>Out-of-scope source modules are excluded from the game; the audit document records the boundary.</li>
            <li>Charts are synthetic and labelled; no live or historical market feed exists in this app.</li>
          </ul>
          <p className="muted tiny">
            Clearing browser data is irreversible unless you exported first. The app cannot recover localStorage after
            the browser removes it.
          </p>
        </section>
      </div>

      <section className="card danger-card">
        <div className="card-head">
          <h2>Reset everything</h2>
          <Badge tone="bad">Destructive</Badge>
        </div>
        <p>
          This clears the progress key and resets the in-memory record to a new empty state. It does not delete the
          corrupt-value backup. Type <span className="mono">RESET</span> to enable the button.
        </p>
        <div className="row wrap gap-sm">
          <label className="inline-field">
            Confirmation
            <input
              type="text"
              value={resetWord}
              onChange={(event) => setResetWord(event.target.value)}
              placeholder="RESET"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button type="button" className="button button-danger" disabled={resetWord !== "RESET"} onClick={onReset}>
            Clear all local progress
          </button>
        </div>
        {resetNotice && (
          <p className="alert alert-good" role="status">
            {resetNotice}
          </p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>About this build</h2>
          <Badge tone="info">Educational simulation</Badge>
        </div>
        <p>
          JADU TONA Trading Academy is a local-first training game built from the supplied Pine Script v6 strategy
          source. Scored strategy answers are limited to behaviours pinned to source anchors and engine tests. The game
          makes no profitability claim and does not execute trades.
        </p>
        <p className="muted small">
          No fabricated counters: XP, streaks, attempts, accuracy, scenario results, and assessment history are all
          derived from actions stored on this device. Empty states stay empty.
        </p>
      </section>
    </div>
  );
}
