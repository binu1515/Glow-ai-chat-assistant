import React, { useState, useEffect } from 'react';
import { X, FileText, Upload, Trash2, Search, CheckCircle2, Loader2, Database, AlertCircle } from 'lucide-react';
import { fetchDocuments, uploadDocument, deleteDocument, searchDocuments } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function DocumentUploader({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  // Test search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetchDocuments();
      setDocuments(res.documents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setFeedback(null);
    try {
      const doc = await uploadDocument(file);
      setFeedback(`Uploaded "${doc.filename}" successfully (${doc.chunk_count} chunks indexed). Cache updated.`);
      await loadDocuments();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId, filename) => {
    try {
      await deleteDocument(docId);
      setDocuments(documents.filter((d) => d.id !== docId));
      setFeedback(`Deleted "${filename}".`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTestSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await searchDocuments(searchQuery.trim());
      setSearchResults(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const { isDark } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl ${
        isDark ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center space-x-2.5">
            <FileText className="h-5 w-5 text-indigo-500" />
            <div>
              <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Document Management & Knowledge Base</h2>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Indexed for the MCP Document Search tool with semantic retrieval and Redis caching
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg p-1.5 transition ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {error && (
            <div className="flex items-center space-x-2 rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {feedback && (
            <div className="flex items-center space-x-2 rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Upload Box */}
          <div className={`rounded-xl border border-dashed p-6 text-center transition ${
            isDark
              ? 'border-slate-700 bg-slate-950/50'
              : 'border-slate-300 bg-slate-50/70 hover:border-indigo-400'
          }`}>
            <input
              type="file"
              id="doc-upload"
              accept=".txt,.md,.json,.csv,.py"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="doc-upload"
              className={`inline-flex cursor-pointer flex-col items-center justify-center space-y-2 transition ${
                isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-indigo-600'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-500">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              </div>
              <span className="font-semibold text-sm">
                {uploading ? 'Processing & Indexing Document...' : 'Click to Upload Document (.txt, .md, .json)'}
              </span>
              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Documents are automatically chunked and made available to the MCP Search tool
              </span>
            </label>
          </div>

          {/* Uploaded Documents List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Indexed Documents ({documents.length})</h3>
            </div>

            {documents.length === 0 ? (
              <div className={`rounded-lg border p-4 text-center ${
                isDark ? 'border-slate-800 bg-slate-950 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}>
                No documents uploaded yet. Upload a document above to test semantic search.
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between rounded-xl border p-3 transition ${
                      isDark
                        ? 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isDark ? 'bg-indigo-950 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{doc.filename}</div>
                        <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {(doc.file_size_bytes / 1024).toFixed(1)} KB • {doc.chunk_count} passage chunks •{' '}
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      className={`rounded p-1.5 transition ${
                        isDark ? 'text-slate-400 hover:bg-rose-950/60 hover:text-rose-300' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                      }`}
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct Search Test Console */}
          <div className={`rounded-xl border p-4 space-y-3 ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50/80 shadow-xs'
          }`}>
            <h3 className={`font-semibold flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Search className="h-4 w-4 text-cyan-500" />
              <span>Test Document Search Retrieval</span>
            </h3>

            <form onSubmit={handleTestSearch} className="flex space-x-2">
              <input
                type="text"
                placeholder="Search queries, e.g. 'policy', 'token', 'cache'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs outline-none focus:border-indigo-500 ${
                  isDark
                    ? 'border-slate-700 bg-slate-900 text-white placeholder-slate-500'
                    : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 shadow-xs'
                }`}
              />
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </button>
            </form>

            {/* Test Search Results */}
            {searchResults && (
              <div className={`mt-3 space-y-2 border-t pt-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className={`flex items-center justify-between text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Found {searchResults.matches_found} matching passage(s)</span>
                  {searchResults.cached && (
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      Redis Cache Hit
                    </span>
                  )}
                </div>

                {searchResults.results?.map((res, i) => (
                  <div key={i} className={`rounded-lg p-2.5 border text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                      <span className="text-indigo-500 font-semibold">{res.document}</span>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Relevance: {res.score}%</span>
                    </div>
                    <p className={`leading-relaxed font-sans ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{res.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end border-t px-6 py-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

