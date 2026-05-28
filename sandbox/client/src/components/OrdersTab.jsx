import { useState, useEffect } from 'react';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return Math.floor(diff / 60)   + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return new Date(dateStr).toLocaleDateString();
}

export default function OrdersTab({ activeUser }) {
  const [orders,   setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState({ product_id: '', quantity: 1 });
  const [placing,  setPlacing]  = useState(false);

  useEffect(() => {
    loadOrders();
    fetch('/api/products').then(r => r.json()).then(setProducts).catch(() => {});
  }, []);

  async function loadOrders() {
    try {
      const data = await fetch('/api/orders').then(r => r.json());
      setOrders(data);
    } catch {}
  }

  async function placeOrder() {
    if (!form.product_id) return;
    setPlacing(true);
    try {
      await fetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:    activeUser,
          product_id: Number(form.product_id),
          quantity:   Number(form.quantity),
        })
      });
      setModal(false);
      setForm({ product_id: '', quantity: 1 });
      await loadOrders();
    } catch {}
    setPlacing(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>
          Orders
        </div>
        <button
          onClick={() => setModal(true)}
          style={{
            padding:      '7px 14px',
            background:   '#2563eb',
            color:        '#fff',
            border:       'none',
            borderRadius: 8,
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          + Place Order
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['#', 'Customer', 'Product', 'Qty', 'Total', 'Status', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No orders yet
                </td>
              </tr>
            ) : orders.map(o => (
              <tr
                key={o.id}
                style={{ borderBottom: '1px solid #f1f5f9' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 100, fontWeight: 700 }}>
                    #{o.id}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{o.user_name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{o.user_email}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{o.product_name}</td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{o.quantity}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>${Number(o.total).toFixed(2)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', background: '#dcfce7', color: '#16a34a', borderRadius: 100, fontWeight: 700 }}>
                    Completed
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>{timeAgo(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div
          onClick={e => e.target === e.currentTarget && setModal(false)}
          style={{
            position:       'fixed',
            inset:          0,
            background:     'rgba(0,0,0,0.4)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            zIndex:         200,
          }}
        >
          <div style={{
            background:   '#fff',
            borderRadius: 14,
            padding:      28,
            width:        400,
            boxShadow:    '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>Place New Order</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                Product
              </label>
              <select
                value={form.product_id}
                onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              >
                <option value="">Select a product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — ${p.price.toFixed(2)}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                Quantity
              </label>
              <input
                type="number" min="1" max="99"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setModal(false)}
                style={{ flex: 1, padding: '8px 16px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={placeOrder}
                disabled={!form.product_id || placing}
                style={{ flex: 2, padding: '8px 16px', background: form.product_id ? '#2563eb' : '#e2e8f0', color: form.product_id ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {placing ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
