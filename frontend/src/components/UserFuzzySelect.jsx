import { useEffect, useMemo, useRef, useState } from 'react';
import { searchMembers } from '../services/workspace';

export default function UserFuzzySelect({ workspaceId, onSelect, limit = 10, className = '' }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!workspaceId) return;
    const handler = setTimeout(async () => {
      const q = query.trim();
      if (q.length > 0 && q.length < 2) { setItems([]); return; }
      setLoading(true);
      try {
        const results = await searchMembers(workspaceId, q, limit);
        setItems(results);
        setOpen(true);
        setHighlight(0);
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query, workspaceId, limit]);

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = items[highlight]; if (it) { onSelect?.(it); setOpen(false); setQuery(''); } }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  const highlightText = (text, term) => {
    const t = (term || '').trim();
    if (!t || t.length < 2) return text;
    const idx = text.toLowerCase().indexOf(t.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + t.length);
    const after = text.slice(idx + t.length);
    return (
      <>
        {before}
        <mark className="bg-yellow-200">{match}</mark>
        {after}
      </>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Assign to..."
        className="w-full border rounded px-2 py-1"
      />
      {open && items.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border rounded shadow">
          {items.map((u, idx) => (
            <li
              key={u._id}
              className={`flex items-center gap-2 px-2 py-2 cursor-pointer ${idx === highlight ? 'bg-gray-100' : ''}`}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => { e.preventDefault(); onSelect?.(u); setOpen(false); setQuery(''); }}
            >
              {u.avatar ? (
                <img src={u.avatar} alt={u.displayName} className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                  {(u.displayName || '?').slice(0,1)}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm">{highlightText(u.displayName || '', query)}</span>
                <span className="text-xs text-gray-500">{highlightText(u.email || '', query)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && query.trim().length >= 2 && items.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow px-2 py-2 text-sm text-gray-500">No matches</div>
      )}
    </div>
  );
}
