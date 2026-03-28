import React, { useState, useEffect } from 'react';
import { getStats, getBalances, consolidate } from '../api/client';
import client from '../api/client';
import { LayoutDashboard, Wallet, Repeat, Activity, ListChecks, History } from 'lucide-react';
import '../styles/index.css';

const App = () => {
  const [stats, setStats] = useState(null);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'transactions'

  const fetchData = async () => {
    try {
      const [statsRes, balancesRes, txRes] = await Promise.all([
        getStats(), 
        getBalances(),
        client.get('/admin/transactions')
      ]);
      setStats(statsRes.data);
      setBalances(balancesRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleConsolidate = async (userId) => {
    if (!confirm('¿Deseas consolidar los fondos de este usuario a la hot wallet principal?')) return;
    try {
      await consolidate(userId);
      alert('Consolidación enviada mediante Tatum SDK');
      fetchData();
    } catch (err) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  if (loading) return <div className="loading">Iniciando Tatum Gateway...</div>;

  return (
    <div className="app-container">
      <div className="sidebar">
        <h2 style={{color: 'var(--primary)', marginBottom: '2rem'}}>USDT Tatum</h2>
        <nav>
          <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <LayoutDashboard size={20}/> Dashboard
          </div>
          <div className={`nav-item ${view === 'transactions' ? 'active' : ''}`} onClick={() => setView('transactions')}>
            <History size={20}/> Transacciones
          </div>
          <div className="nav-item"><Activity size={20}/> Logs Webhook</div>
        </nav>
      </div>

      <div className="main-content">
        <header>
          <h1>{view === 'dashboard' ? 'Resumen General' : 'Historial de Pagos'}</h1>
          <div className="status-badge"><Activity size={16} /> Tatum Cloud Connected</div>
        </header>

        {view === 'dashboard' ? (
          <>
            <div className="stats-grid">
              <div className="card">
                <div className="card-title">Volumen Total Pagado</div>
                <div className="card-value">{stats?.total_volume.toFixed(2)} USDT</div>
              </div>
              <div className="card">
                <div className="card-title">Órdenes Activas</div>
                <div className="card-value">{stats?.active_orders}</div>
              </div>
              <div className="card">
                <div className="card-title">Total Usuarios Únicos</div>
                <div className="card-value">{stats?.total_users}</div>
              </div>
            </div>

            <section>
              <h3 style={{marginBottom: '1.5rem'}}>Saldos por Usuario (Dirección Fija)</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Usuario App</th>
                      <th>Dirección BSC</th>
                      <th>Saldo USDT (Real)</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((u) => (
                      <tr key={u.user_id_internal}>
                        <td>{u.user_id_internal}</td>
                        <td style={{fontSize: '0.75rem', color: 'var(--text-dim)'}}>{u.direccion_asignada}</td>
                        <td style={{fontWeight: '700', color: parseFloat(u.balance) > 0 ? 'var(--success)' : 'inherit'}}>
                            {u.balance}
                        </td>
                        <td>
                          {parseFloat(u.balance) > 0 && (
                            <button onClick={() => handleConsolidate(u.user_id_internal)} className="btn-small">
                              Consolidar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Monto</th>
                    <th>TX Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.created_at).toLocaleString()}</td>
                      <td>{tx.usuarios?.user_id_internal}</td>
                      <td style={{color: 'var(--success)', fontWeight: '600'}}>+{tx.monto} USDT</td>
                      <td style={{fontSize: '0.7rem'}}>
                        <a href={`https://bscscan.com/tx/${tx.tx_hash}`} target="_blank" rel="noreferrer" style={{color: 'var(--primary)'}}>
                          {tx.tx_hash.substring(0, 20)}...
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default App;
