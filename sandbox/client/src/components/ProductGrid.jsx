import { useState, useEffect } from 'react';

export default function ProductGrid({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [added,    setAdded]    = useState({});

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts).catch(() => {});
  }, []);

  function handleAdd(product) {
    onAddToCart(product);
    setAdded(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => setAdded(prev => ({ ...prev, [product.id]: false })), 1500);
  }

  return (
    <div>
      <div style={{
        fontSize:      11,
        fontWeight:    700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color:         '#94a3b8',
        marginBottom:  16,
      }}>
        Products
      </div>
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap:                 16,
      }}>
        {products.map(p => (
          <div
            key={p.id}
            style={{
              background:   '#fff',
              border:       '1px solid #e2e8f0',
              borderRadius: 12,
              padding:      18,
              transition:   'box-shadow 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 14 }}>
              {p.description || '—'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>${p.price.toFixed(2)}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{p.inventory} in stock</span>
            </div>
            <button
              onClick={() => handleAdd(p)}
              style={{
                width:        '100%',
                padding:      8,
                background:   added[p.id] ? '#16a34a' : '#0f172a',
                color:        '#fff',
                border:       'none',
                borderRadius: 8,
                fontSize:     12,
                fontWeight:   600,
                cursor:       'pointer',
                fontFamily:   'inherit',
                transition:   'background 0.15s',
              }}
            >
              {added[p.id] ? '✓ Added' : 'Add to Cart'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
