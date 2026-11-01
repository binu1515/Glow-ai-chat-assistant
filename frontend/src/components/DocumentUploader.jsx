import React, { useState, useEffect } from 'react';
import { X, FileText, Upload, Trash2, Search, CheckCircle2, Loader2, Database, AlertCircle } from 'lucide-react';
import { fetchDocuments, uploadDocument, deleteDocument, searchDocuments } from '../services/api';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <FileText className="h-5 w-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-semibold text-white">Document Management & Knowledge Base</h2>
              <p className="text-[11px] text-slate-400">
                Indexed for the MCP Document Search tool with semantic retrieval and Redis caching
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs text-slate-300">
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
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center">
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
              className="inline-flex cursor-pointer flex-col items-center justify-center space-y-2 text-slate-300 hover:text-white"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              </div>
              <span className="font-semibold text-sm">
                {uploading ? 'Processing & Indexing Document...' : 'Click to Upload Document (.txt, .md, .json)'}
              </span>
              <span className="text-[10px] text-slate-500">
                Documents are automatically chunked and made available to the MCP Search tool
              </span>
            </label>
          </div>

          {/* Uploaded Documents List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">Indexed Documents ({documents.length})</h3>
            </div>

            {documents.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-center text-slate-500">
                No documents uploaded yet. Upload a document above to test semantic search.
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-3 hover:border-slate-700"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-950 text-indigo-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{doc.filename}</div>
                        <div className="text-[10px] text-slate-400">
                          {(doc.file_size_bytes / 1024).toFixed(1)} KB • {doc.chunk_count} passage chunks •{' '}
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      className="rounded p-1.5 text-slate-400 hover:bg-rose-950/60 hover:text-rose-300 transition"
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
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <h3 className="font-semibold text-white flex items-center space-x-1.5">
              <Search className="h-4 w-4 text-cyan-400" />
              <span>Test Document Search Retrieval</span>
            </h3>

            <form onSubmit={handleTestSearch} className="flex space-x-2">
              <input
                type="text"
                placeholder="Search queries, e.g. 'policy', 'token', 'cache'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
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
              <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Found {searchResults.matches_found} matching passage(s)</span>
                  {searchResults.cached && (
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-400 text-[10px] font-medium">
                      Redis Cache Hit
                    </span>
                  )}
                </div>

                {searchResults.results?.map((res, i) => (
                  <div key={i} className="rounded-lg bg-slate-900 p-2.5 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 mb-1">
                      <span className="text-indigo-400 font-semibold">{res.document}</span>
                      <span>Relevance: {res.score}%</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans">{res.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-800 px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

