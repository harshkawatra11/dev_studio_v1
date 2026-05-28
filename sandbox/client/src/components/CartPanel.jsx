export default function CartPanel({ cart, isOpen, onClose, onCheckout }) {
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div style={{
      position:       'fixed',
      top:            56,
      right:          0,
      bottom:         0,
      width:          300,
      background:     '#fff',
      borderLeft:     '1px solid #e2e8f0',
      boxShadow:      '-4px 0 20px rgba(0,0,0,0.08)',
      zIndex:         99,
      display:        'flex',
      flexDirection:  'column',
      transform:      isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition:     'transform 0.25s ease',
    }}>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '14px 18px',
        borderBottom:   '1px solid #e2e8f0',
      }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Your Cart</span>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28,
            borderRadius: 8,
            background: '#f1f5f9',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 13 }}>
            Your cart is empty
          </div>
        ) : cart.map(item => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Qty: {item.qty}</div>
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
              ${(item.price * item.qty).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 18px', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <button
          onClick={onCheckout}
          disabled={cart.length === 0}
          style={{
            width:        '100%',
            padding:      9,
            background:   cart.length ? '#2563eb' : '#e2e8f0',
            color:        cart.length ? '#fff' : '#94a3b8',
            border:       'none',
            borderRadius: 8,
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
