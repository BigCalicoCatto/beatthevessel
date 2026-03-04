'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const CONNECTION = new Connection('https://api.devnet.solana.com', 'confirmed');

export default function Lobby() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [wagerInput, setWagerInput] = useState('0.1');
  const [creating, setCreating] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [tab, setTab] = useState<'create' | 'join'>('create');

  useEffect(() => {
    if (!connected) router.push('/');
  }, [connected]);

  useEffect(() => {
    if (publicKey) {
      CONNECTION.getBalance(publicKey).then(bal => {
        setBalance(bal / LAMPORTS_PER_SOL);
      });
    }
  }, [publicKey]);

  const handleCreateGame = async () => {
    setCreating(true);
    const wagerLamports = Math.floor(parseFloat(wagerInput) * LAMPORTS_PER_SOL);
    localStorage.setItem('wager', wagerLamports.toString());
    localStorage.setItem('role', 'creator');
    router.push('/game');
    setCreating(false);
  };

  const handleJoinGame = (game: any) => {
    localStorage.setItem('wager', game.wager.toString());
    localStorage.setItem('role', 'joiner');
    router.push('/game');
  };

  const mockGames = [
    { id: 1, creator: 'Dh3k...9mPq', wager: 0.5 * LAMPORTS_PER_SOL, wagerSol: '0.5' },
    { id: 2, creator: 'Bx7r...4kLm', wager: 1.0 * LAMPORTS_PER_SOL, wagerSol: '1.0' },
    { id: 3, creator: 'Yz2s...8nWq', wager: 0.1 * LAMPORTS_PER_SOL, wagerSol: '0.1' },
  ];

  return (
    <main style={{ minHeight: '100vh', position: 'relative' }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(rgba(42,106,155,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(42,106,155,0.06) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
        borderBottom: '1px solid rgba(42,106,155,0.2)',
        backdropFilter: 'blur(10px)',
        zIndex: 100, background: 'rgba(2,12,20,0.8)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => router.push('/')}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#00ff88', boxShadow: '0 0 10px #00ff88',
          }} />
          <span className="font-display" style={{ fontSize: '20px', letterSpacing: '4px' }}>
            BEAT THE VESSEL
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {publicKey && (
            <div className="font-mono" style={{
              color: '#6a9ab8', fontSize: '12px', letterSpacing: '1px',
              background: 'rgba(42,106,155,0.1)', padding: '6px 12px',
              border: '1px solid rgba(42,106,155,0.3)',
            }}>
              ◆ {balance.toFixed(2)} SOL
            </div>
          )}
          <WalletMultiButton />
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '120px 48px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '48px' }}>
          <div className="font-mono" style={{ color: '#00ff88', fontSize: '11px', letterSpacing: '4px', marginBottom: '12px' }}>
            ◆ COMMAND CENTER
          </div>
          <h1 className="font-display" style={{
            fontSize: '64px', letterSpacing: '6px',
            background: 'linear-gradient(180deg, #e8f4f8 0%, #6a9ab8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            BATTLE LOBBY
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0', marginBottom: '32px', borderBottom: '1px solid rgba(42,106,155,0.3)' }}>
          {(['create', 'join'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="font-display" style={{
              padding: '12px 32px', fontSize: '20px', letterSpacing: '3px',
              background: 'transparent', border: 'none',
              borderBottom: tab === t ? '2px solid #00ff88' : '2px solid transparent',
              color: tab === t ? '#00ff88' : '#6a9ab8',
              cursor: 'pointer', transition: 'all 0.2s', marginBottom: '-1px',
            }}>
              {t === 'create' ? 'CREATE GAME' : 'JOIN GAME'}
            </button>
          ))}
        </div>

        {tab === 'create' && (
          <div className="panel" style={{ padding: '40px', borderRadius: '2px' }}>
            <h2 className="font-display" style={{ fontSize: '32px', letterSpacing: '4px', marginBottom: '8px' }}>
              DEPLOY YOUR FLEET
            </h2>
            <p className="font-body" style={{ color: '#6a9ab8', marginBottom: '32px', fontSize: '15px' }}>
              Set your wager. Your SOL will be locked until the battle ends.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label className="font-mono" style={{
                display: 'block', fontSize: '11px',
                letterSpacing: '3px', color: '#6a9ab8', marginBottom: '12px',
              }}>
                WAGER AMOUNT (SOL)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number" value={wagerInput}
                  onChange={(e) => setWagerInput(e.target.value)}
                  min="0.01" step="0.1"
                  style={{
                    width: '100%', padding: '16px 60px 16px 20px',
                    background: 'rgba(6,32,48,0.8)',
                    border: '1px solid rgba(42,106,155,0.4)',
                    color: '#00ff88', fontFamily: 'Share Tech Mono, monospace',
                    fontSize: '32px', outline: 'none', letterSpacing: '2px',
                  }}
                />
                <span className="font-display" style={{
                  position: 'absolute', right: '20px', top: '50%',
                  transform: 'translateY(-50%)', color: '#6a9ab8', fontSize: '20px',
                }}>SOL</span>
              </div>
              <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '2px', marginTop: '8px' }}>
                WINNER RECEIVES: {(parseFloat(wagerInput || '0') * 2 * 0.9).toFixed(3)} SOL
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
              {['0.1', '0.5', '1.0', '2.0', '5.0'].map((amt) => (
                <button key={amt} onClick={() => setWagerInput(amt)} className="font-mono" style={{
                  padding: '8px 16px', fontSize: '13px',
                  background: wagerInput === amt ? 'rgba(0,255,136,0.15)' : 'transparent',
                  border: `1px solid ${wagerInput === amt ? '#00ff88' : 'rgba(42,106,155,0.4)'}`,
                  color: wagerInput === amt ? '#00ff88' : '#6a9ab8',
                  cursor: 'pointer', letterSpacing: '2px', transition: 'all 0.2s',
                }}>{amt}</button>
              ))}
            </div>

            <button onClick={handleCreateGame} disabled={creating} className="btn-primary" style={{ width: '100%', fontSize: '22px' }}>
              {creating ? 'DEPLOYING...' : '⚓ CREATE BATTLE'}
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div>
            <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '3px', marginBottom: '16px' }}>
              {mockGames.length} OPEN BATTLES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mockGames.map((game) => (
                <div key={game.id} className="panel" style={{
                  padding: '24px 32px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,255,136,0.4)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(42,106,155,0.4)')}
                >
                  <div>
                    <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '2px', marginBottom: '4px' }}>COMMANDER</div>
                    <div className="font-mono" style={{ color: '#e8f4f8', fontSize: '16px' }}>{game.creator}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '2px', marginBottom: '4px' }}>WAGER</div>
                    <div className="font-display" style={{ color: '#00ff88', fontSize: '32px', textShadow: '0 0 10px rgba(0,255,136,0.4)' }}>
                      {game.wagerSol} SOL
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '2px', marginBottom: '4px' }}>YOU WIN</div>
                    <div className="font-display" style={{ color: '#ffc400', fontSize: '24px' }}>
                      {(parseFloat(game.wagerSol) * 2 * 0.9).toFixed(2)} SOL
                    </div>
                  </div>
                  <button onClick={() => handleJoinGame(game)} className="btn-primary">JOIN BATTLE</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
