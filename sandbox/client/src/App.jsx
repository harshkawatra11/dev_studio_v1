import { useState } from 'react';
import Header      from './components/Header.jsx';
import ProductGrid from './components/ProductGrid.jsx';
import CartPanel   from './components/CartPanel.jsx';
import OrdersTab   from './components/OrdersTab.jsx';
import UsersTab    from './components/UsersTab.jsx';
import FeatureSlot from './components/FeatureSlot.jsx';

const TABS = ['Products', 'Orders', 'Users'];

export default function App() {
  const [activeTab,  setActiveTab]  = useState('Products');
  const [cart,       setCart]       = useState([]);
  const [cartOpen,   setCartOpen]   = useState(false);
  const [activeUser, setActiveUser] = useState(1);
  const [toast,      setToast]      = useState('');

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    showToast(product.name + ' added to cart');
  }

  function checkout() {
    setCart([]);
    setCartOpen(false);
    showToast('Order placed successfully!');
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header
        cartCount={cartCount}
        onCartToggle={() => setCartOpen(o => !o)}
        activeUser={activeUser}
        onUserChange={setActiveUser}
      />

      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding:      '12px 20px',
              fontSize:     13,
              fontWeight:   600,
              color:        activeTab === tab ? '#2563eb' : '#64748b',
              border:       'none',
              borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              background:   'none',
              cursor:       'pointer',
              fontFamily:   'inherit',
              transition:   'all 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <FeatureSlot />

        {activeTab === 'Products' && <ProductGrid onAddToCart={addToCart} />}
        {activeTab === 'Orders'   && <OrdersTab activeUser={activeUser} />}
        {activeTab === 'Users'    && <UsersTab />}
      </main>

      <CartPanel
        cart={cart}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={checkout}
      />

      {toast && (
        <div style={{
          position:     'fixed',
          bottom:       24,
          right:        24,
          background:   '#0f172a',
          color:        '#fff',
          padding:      '10px 16px',
          borderRadius: 8,
          fontSize:     13,
          fontWeight:   500,
          zIndex:       300,
          animation:    'slideIn 0.2s ease-out',
          boxShadow:    '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
