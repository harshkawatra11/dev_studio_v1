import { useState, useEffect } from 'react';

export default function Header({ cartCount, onCartToggle, activeUser, onUserChange }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers).catch(() => {});
  }, []);

  return (
    <header style={{
      background:     '#ffffff',
      borderBottom:   '1px solid #e2e8f0',
      padding:        '0 24px',
      height:         56,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      position:       'sticky',
      top:            0,
      zIndex:         100,
      boxShadow:      '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>
        Shop<span style={{ color: '#2563eb' }}>Base</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <select
          value={activeUser}
          onChange={e => onUserChange(Number(e.target.value))}
          style={{
            padding:      '5px 10px',
            border:       '1px solid #e2e8f0',
            borderRadius: 8,
            background:   '#fff',
            color:        '#0f172a',
            fontSize:     13,
            cursor:       'pointer',
            fontFamily:   'inherit',
            outline:      'none',
          }}
        >
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <button
          onClick={onCartToggle}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            padding:      '6px 14px',
            background:   '#0f172a',
            color:        '#fff',
            border:       'none',
            borderRadius: 8,
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
            fontFamily:   'inherit',
            transition:   'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
          onMouseLeave={e => e.currentTarget.style.background = '#0f172a'}
        >
          🛒 Cart
          <span style={{
            background:   '#2563eb',
            color:        '#fff',
            borderRadius: 100,
            padding:      '1px 7px',
            fontSize:     10,
            fontWeight:   700,
            minWidth:     18,
            textAlign:    'center',
          }}>
            {cartCount}
          </span>
        </button>

        <span style={{
          fontSize:      10,
          padding:       '3px 8px',
          background:    '#f1f5f9',
          border:        '1px solid #e2e8f0',
          borderRadius:  100,
          color:         '#64748b',
          fontWeight:    600,
          letterSpacing: '0.04em',
        }}>
          Sandbox v1.0
        </span>
      </div>
    </header>
  );
}
