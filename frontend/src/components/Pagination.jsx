import { ChevronLeft, ChevronRight } from 'lucide-react';

// Compact page list: 1 … 4 5 6 … 12
function pages(current, total) {
  const set = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('…' + p);
    out.push(p);
  });
  return out;
}

export default function Pagination({ meta, onChange, noun = 'éléments' }) {
  if (!meta) return null;
  const { page, limit, total, totalPages } = meta;
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <span className="muted small">
        Affichage de {from}–{to} sur {total} {noun}
      </span>
      <div className="pager">
        <button className="btn btn-light btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={16} /> Précédent
        </button>
        {pages(page, totalPages).map((p) =>
          typeof p === 'string' ? (
            <span key={p} className="pager-gap">…</span>
          ) : (
            <button key={p} className={`pager-num ${p === page ? 'active' : ''}`} onClick={() => onChange(p)}>
              {p}
            </button>
          ),
        )}
        <button className="btn btn-light btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Suivant <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
