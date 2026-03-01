import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

/**
 * FACTORY MIGRATION WIZARD
 * Drop into any Factory template's Settings or Onboarding flow.
 * 
 * Steps:
 *   1. Select CRM
 *   2. Select entity type (contacts / jobs / invoices)
 *   3. Upload CSV (or connect API for supported CRMs)
 *   4. Review auto-mapping — adjust if needed
 *   5. Preview first 5 rows
 *   6. Confirm → import
 *   7. Success / error report
 */

// Order is enforced — contacts must exist before jobs, jobs before invoices
const ENTITY_ORDER = ['contacts', 'jobs', 'invoices'];

const ENTITY_LABELS = {
  contacts: 'Contacts & Clients',
  jobs:     'Jobs & Projects',
  invoices: 'Invoices',
};

const ENTITY_DEPENDENCIES = {
  contacts: null,
  jobs:     'contacts',
  invoices: 'jobs',
};

const ENTITY_DEPENDENCY_REASON = {
  jobs:     'Jobs are linked to contacts — import Contacts first so they connect properly.',
  invoices: 'Invoices are linked to jobs and contacts — import both first.',
};

export default function MigrationWizard() {
  const [step, setStep] = useState(1);
  const [crms, setCrms] = useState([]);
  const [selectedCrm, setSelectedCrm] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [completedEntities, setCompletedEntities] = useState([]); // tracks what's been imported this session
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);   // { sessionId, mapping, summary, preview, errorSample }
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Load CRM list on mount
  useEffect(() => {
    fetch('/api/v1/migration/crms')
      .then(r => r.json())
      .then(d => setCrms(d.crms))
      .catch(() => setError('Failed to load CRM list.'));
  }, []);

  // ── Step 1: CRM Select ──
  const handleSelectCrm = (crm) => {
    setSelectedCrm(crm);
    setStep(2);
  };

  // ── Step 2: Entity Select ──
  const handleSelectEntity = (entity) => {
    setSelectedEntity(entity);
    setStep(3);
  };

  // ── Step 3: File Upload ──
  const onDrop = useCallback((accepted) => {
    setFile(accepted[0]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('crmKey', selectedCrm.key);
    formData.append('entity', selectedEntity);

    try {
      const res = await fetch('/api/v1/migration/preview', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data);
      setMapping(data.mapping);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Mapping Review ──
  const handleMappingChange = (canonicalField, newCsvColumn) => {
    setMapping(prev => ({ ...prev, [canonicalField]: newCsvColumn }));
  };

  // ── Step 5/6: Confirm Import ──
  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/migration/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: preview.sessionId,
          crmKey: selectedCrm.key,
          entity: selectedEntity,
          columnMappingOverride: mapping,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setCompletedEntities(prev => [...new Set([...prev, selectedEntity])]);
      setStep(7);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Rollback ──
  const handleRollback = async () => {
    if (!result?.migrationId) return;
    if (!window.confirm('This will delete all records from this import. Are you sure?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/migration/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migrationId: result.migrationId }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(null);
        setStep(1);
        setSelectedCrm(null);
        setSelectedEntity(null);
        setFile(null);
        setPreview(null);
        alert('Migration rolled back. All imported records removed.');
      }
    } catch (err) {
      alert('Rollback failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Import from Another CRM</h1>
      <p className="text-gray-500 mb-6 text-sm">Move your data in a few steps. Nothing changes until you confirm.</p>

      {/* Progress Bar */}
      <div className="flex items-center gap-1 mb-8">
        {['CRM', 'Data Type', 'Upload', 'Review Mapping', 'Preview', 'Confirm', 'Done'].map((label, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <div className={`flex-1 h-1 rounded-full ${step > i + 1 ? 'bg-blue-500' : step === i + 1 ? 'bg-blue-300' : 'bg-gray-200'}`} />
            {i === 6 && <span className="text-xs text-gray-400 ml-1">{label}</span>}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* ── STEP 1: CRM SELECT ── */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Where is your data coming from?</h2>
          <div className="grid grid-cols-2 gap-3">
            {crms.map(crm => (
              <button
                key={crm.key}
                onClick={() => handleSelectCrm(crm)}
                className="border border-gray-200 rounded-xl p-4 text-left hover:border-blue-400 hover:shadow-sm transition-all"
              >
                <div className="font-semibold">{crm.name}</div>
                {crm.hasApi && <div className="text-xs text-blue-500 mt-1">Direct connect available</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2: ENTITY SELECT (ENFORCED ORDER) ── */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">What are you importing?</h2>
          <p className="text-sm text-gray-500 mb-4">
            You must import in this order — each type links to the one before it.
          </p>
          <div className="flex flex-col gap-3">
            {ENTITY_ORDER.map((key, i) => {
              const dep = ENTITY_DEPENDENCIES[key];
              const isLocked = dep && !completedEntities.includes(dep);
              const isDone = completedEntities.includes(key);

              return (
                <button
                  key={key}
                  onClick={() => !isLocked && !isDone && handleSelectEntity(key)}
                  disabled={isLocked || isDone}
                  className={`border rounded-xl p-4 text-left transition-all
                    ${isDone ? 'border-green-300 bg-green-50 opacity-70 cursor-default' : ''}
                    ${isLocked ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' : ''}
                    ${!isLocked && !isDone ? 'border-gray-200 hover:border-blue-400' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-400 mr-2">Step {i + 1}</span>
                      <span className="font-semibold">{ENTITY_LABELS[key]}</span>
                    </div>
                    {isDone && <span className="text-green-500 text-sm font-medium">✓ Done</span>}
                    {isLocked && <span className="text-gray-400 text-xs">🔒 Import {ENTITY_LABELS[dep]} first</span>}
                  </div>
                  {isLocked && (
                    <div className="text-xs text-gray-400 mt-1">{ENTITY_DEPENDENCY_REASON[key]}</div>
                  )}
                </button>
              );
            })}
          </div>
          <button onClick={() => setStep(1)} className="mt-4 text-sm text-gray-400 hover:text-gray-600">← Back</button>
        </div>
      )}

      {/* ── STEP 3: FILE UPLOAD ── */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Upload your {ENTITY_LABELS[selectedEntity]} CSV</h2>
          {selectedCrm?.exportInstructions && (
            <div className="bg-blue-50 text-blue-700 rounded-lg p-3 text-sm mb-4">
              <strong>How to export from {selectedCrm.name}:</strong> {selectedCrm.exportInstructions}
            </div>
          )}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300'}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div>
                <div className="text-2xl mb-2">📄</div>
                <div className="font-medium">{file.name}</div>
                <div className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div className="text-2xl mb-2">⬆️</div>
                <div className="font-medium">Drop CSV file here</div>
                <div className="text-sm text-gray-400">or click to browse</div>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Analyze File →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: MAPPING REVIEW ── */}
      {step === 4 && preview && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Review Column Mapping</h2>
          <p className="text-sm text-gray-500 mb-4">We auto-detected these mappings. Adjust any that look wrong.</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
            <span className="font-medium">{preview.summary.totalRows}</span> rows found ·{' '}
            <span className="text-green-600 font-medium">{preview.summary.validRows}</span> valid ·{' '}
            <span className="text-red-500 font-medium">{preview.summary.errorRows}</span> with issues
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-4">Field in System</th>
                <th className="pb-2">Maps from CSV column</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(mapping).map(canonicalField => (
                <tr key={canonicalField} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-xs text-gray-600">{canonicalField}</td>
                  <td className="py-2">
                    <select
                      value={mapping[canonicalField] || ''}
                      onChange={e => handleMappingChange(canonicalField, e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-sm w-full"
                    >
                      <option value="">— skip this field —</option>
                      {preview.summary.extraCsvColumns?.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                      {Object.values(mapping).filter(Boolean).map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(3)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <button
              onClick={() => setStep(5)}
              className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Preview Data →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: DATA PREVIEW ── */}
      {step === 5 && preview && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Preview</h2>
          <p className="text-sm text-gray-500 mb-4">First 5 rows of what will be imported. Everything looks right?</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(preview.preview[0] || {}).map(k => (
                    <th key={k} className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-3 py-2 whitespace-nowrap">{val ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.errorSample.length > 0 && (
            <div className="mt-4 text-sm">
              <div className="font-medium text-red-600 mb-1">{preview.summary.errorRows} rows have issues and will be skipped:</div>
              {preview.errorSample.map((e, i) => (
                <div key={i} className="text-red-500 text-xs">Row {e.rowIndex}: {e.errors.join(', ')}</div>
              ))}
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(4)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <button
              onClick={() => setStep(6)}
              className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Confirm Import →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 6: CONFIRM ── */}
      {step === 6 && preview && (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">📥</div>
          <h2 className="text-xl font-bold mb-2">Ready to Import</h2>
          <p className="text-gray-500 mb-6">
            <strong>{preview.summary.validRows}</strong> {ENTITY_LABELS[selectedEntity].toLowerCase()} will be imported from <strong>{selectedCrm?.name}</strong>.
            {preview.summary.errorRows > 0 && ` ${preview.summary.errorRows} rows with errors will be skipped.`}
          </p>
          <p className="text-xs text-gray-400 mb-6">You can undo this import immediately after if something looks wrong.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setStep(5)} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2">← Back</button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-green-600 text-white px-8 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : '✓ Import Now'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 7: DONE ── */}
      {step === 7 && result && (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">{result.errors > 0 ? '⚠️' : '✅'}</div>
          <h2 className="text-xl font-bold mb-2">Import Complete</h2>
          <div className="text-gray-600 mb-2">
            <span className="text-green-600 font-semibold">{result.inserted}</span> records imported successfully.
            {result.errors > 0 && <span className="text-red-500"> · {result.errors} failed.</span>}
          </div>
          {result.errorDetail?.length > 0 && (
            <div className="mt-4 text-left bg-red-50 rounded-lg p-4 text-xs text-red-600 max-h-32 overflow-y-auto">
              {result.errorDetail.map((e, i) => <div key={i}>{e.error}</div>)}
            </div>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={handleRollback}
              className="text-sm text-red-500 hover:text-red-700 border border-red-200 px-4 py-2 rounded-lg"
            >
              Undo Import
            </button>
            <button
              onClick={() => { setStep(2); setSelectedEntity(null); setFile(null); setPreview(null); setResult(null); }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              {completedEntities.length < 3 ? 'Import Next Data Type →' : 'Import More Data'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
