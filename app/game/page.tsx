'use client';

import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { getProgram, getGamePDA, getPlayerPDA } from '@/lib/program';

type Phase = 'placing' | 'waiting' | 'battle' | 'gameover';
type Cell = 'empty' | 'ship' | 'hit' | 'miss';

interface Ship {
  size: number;
  name: string;
  placed: boolean;
}

const SHIPS: Ship[] = [
  { size: 4, name: 'DESTROYER', placed: false },
  { size: 3, name: 'CRUISER', placed: false },
  { size: 3, name: 'SUBMARINE', placed: false },
  { size: 2, name: 'PATROL', placed: false },
];

const COLS = ['A','B','C','D','E','F','G','H','I','J'];
const ROWS = ['1','2','3','4','5','6','7','8','9','10'];

export default function GamePage() {
  const { connected, publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('placing');
  const [myBoard, setMyBoard] = useState<Cell[]>(Array(100).fill('empty'));
  const [enemyBoard, setEnemyBoard] = useState<Cell[]>(Array(100).fill('empty'));
  const [ships, setShips] = useState<Ship[]>(SHIPS);
  const [selectedShip, setSelectedShip] = useState<number>(0);
  const [horizontal, setHorizontal] = useState(true);
  const [timer, setTimer] = useState(60);
  const [turnTimer, setTurnTimer] = useState(20);
  const [myTurn, setMyTurn] = useState(true);
  const [wager, setWager] = useState('0.1');
  const [winner, setWinner] = useState<'me' | 'enemy' | null>(null);
  const [hoverCells, setHoverCells] = useState<number[]>([]);
  const [allPlaced, setAllPlaced] = useState(false);
  const [placedCount, setPlacedCount] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('creator');

  useEffect(() => {
    if (!connected) router.push('/');
    const w = localStorage.getItem('wager');
    const r = localStorage.getItem('role');
    if (w) setWager((parseInt(w) / LAMPORTS_PER_SOL).toFixed(2));
    if (r) setRole(r);
  }, [connected]);

  useEffect(() => {
    if (phase !== 'placing') return;
    if (timer <= 0) { setWinner('enemy'); setPhase('gameover'); return; }
    const t = setTimeout(() => setTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, phase]);

  useEffect(() => {
    if (phase !== 'battle' || !myTurn) return;
    if (turnTimer <= 0) { setWinner('enemy'); setPhase('gameover'); return; }
    const t = setTimeout(() => setTurnTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [turnTimer, phase, myTurn]);

  const getShipCells = (idx: number, size: number, isHorizontal: boolean): number[] => {
    const row = Math.floor(idx / 10);
    const col = idx % 10;
    const cells: number[] = [];
    for (let i = 0; i < size; i++) {
      const r = isHorizontal ? row : row + i;
      const c = isHorizontal ? col + i : col;
      if (r >= 10 || c >= 10) return [];
      cells.push(r * 10 + c);
    }
    return cells;
  };

  const handleMyBoardHover = (idx: number) => {
    if (phase !== 'placing' || allPlaced) return;
    const ship = ships[selectedShip];
    if (!ship || ship.placed) return;
    setHoverCells(getShipCells(idx, ship.size, horizontal));
  };

  const handlePlaceShip = (idx: number) => {
    if (phase !== 'placing' || allPlaced) return;
    const ship = ships[selectedShip];
    if (!ship || ship.placed) return;
    const cells = getShipCells(idx, ship.size, horizontal);
    if (cells.length !== ship.size) return;
    if (cells.some(c => myBoard[c] === 'ship')) return;
    const newBoard = [...myBoard];
    cells.forEach(c => { newBoard[c] = 'ship'; });
    setMyBoard(newBoard);
    const newShips = [...ships];
    newShips[selectedShip] = { ...ship, placed: true };
    setShips(newShips);
    const nextUnplaced = newShips.findIndex(s => !s.placed);
    setPlacedCount(newShips.filter(s => s.placed).length);
    if (nextUnplaced === -1) { setAllPlaced(true); } else { setSelectedShip(nextUnplaced); }
  };

  const handleCommitBoard = () => {
    setPhase('waiting');
    setTimeout(() => { setPhase('battle'); setTurnTimer(20); }, 2000);
  };

  const handleCancelGame = async () => {
    if (!anchorWallet || !publicKey) return;
    setCancelling(true);
    setStatus('Cancelling game and refunding SOL...');
    try {
      const program = getProgram(anchorWallet);
      const [gamePDA] = getGamePDA(publicKey);
      const [playerPDA] = getPlayerPDA(publicKey);
      await program.methods
        .cancelGame()
        .accounts({
          creator: publicKey,
          playerAccount: playerPDA,
          game: gamePDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setStatus('Refunded! Returning to lobby...');
      setTimeout(() => router.push('/lobby'), 1500);
    } catch (e: any) {
      setStatus('Error: ' + (e.message || 'Cancel failed'));
    }
    setCancelling(false);
  };

  const handleFireShot = (idx: number) => {
    if (phase !== 'battle' || !myTurn) return;
    if (enemyBoard[idx] !== 'empty') return;
    const newBoard = [...enemyBoard];
    const isHit = Math.random() > 0.6;
    newBoard[idx] = isHit ? 'hit' : 'miss';
    setEnemyBoard(newBoard);
    const hits = newBoard.filter(c => c === 'hit').length;
    if (hits >= 12) { setWinner('me'); setPhase('gameover'); return; }
    setMyTurn(false);
    setTurnTimer(20);
    setTimeout(() => {
      const available = Array.from({length: 100}, (_, i) => i).filter(i => myBoard[i] === 'empty' || myBoard[i] === 'ship');
      if (!available.length) return;
      const shot = available[Math.floor(Math.random() * available.length)];
      const newMyBoard = [...myBoard];
      newMyBoard[shot] = myBoard[shot] === 'ship' ? 'hit' : 'miss';
      setMyBoard(newMyBoard);
      setMyTurn(true);
      setTurnTimer(20);
    }, 1500);
  };

  const timerColor = (t: number, max: number) => {
    const pct = t / max;
    if (pct > 0.5) return '#00ff88';
    if (pct > 0.25) return '#ffc400';
    return '#ff3333';
  };

  const renderBoard = (board: Cell[], isEnemy: boolean) => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '20px repeat(10, 1fr)', gap: '2px', marginBottom: '2px' }}>
        <div />
        {COLS.map(c => (
          <div key={c} className="font-mono" style={{ textAlign: 'center', fontSize: '10px', color: '#6a9ab8' }}>{c}</div>
        ))}
      </div>
      {ROWS.map((row, ri) => (
        <div key={row} style={{ display: 'grid', gridTemplateColumns: '20px repeat(10, 1fr)', gap: '2px', marginBottom: '2px' }}>
          <div className="font-mono" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#6a9ab8' }}>{row}</div>
          {COLS.map((_, ci) => {
            const idx = ri * 10 + ci;
            const cell = board[idx];
            const isHovered = !isEnemy && hoverCells.includes(idx);
            let bg = 'rgba(6,32,48,0.6)';
            let border = 'rgba(42,106,155,0.25)';
            let content: string | null = null;
            if (cell === 'ship' && !isEnemy) { bg = 'rgba(0,255,136,0.15)'; border = 'rgba(0,255,136,0.6)'; }
            if (cell === 'hit') { bg = 'rgba(255,51,51,0.3)'; border = '#ff3333'; content = '✕'; }
            if (cell === 'miss') { bg = 'rgba(42,106,155,0.15)'; border = 'rgba(42,106,155,0.4)'; content = '·'; }
            if (isHovered) { bg = 'rgba(0,255,136,0.1)'; border = '#00ff88'; }
            return (
              <div key={ci}
                onClick={() => isEnemy ? handleFireShot(idx) : handlePlaceShip(idx)}
                onMouseEnter={() => !isEnemy && handleMyBoardHover(idx)}
                onMouseLeave={() => setHoverCells([])}
                style={{
                  aspectRatio: '1', background: bg, border: `1px solid ${border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: isEnemy && phase === 'battle' && myTurn ? 'crosshair' : 'default',
                  transition: 'all 0.1s', fontSize: '14px', fontWeight: 'bold',
                  color: cell === 'hit' ? '#ff3333' : '#6a9ab8',
                }}
              >{content}</div>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', padding: '80px 24px 40px', position: 'relative' }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(rgba(42,106,155,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(42,106,155,0.05) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: '1px solid rgba(42,106,155,0.2)',
        backdropFilter: 'blur(10px)', zIndex: 100, background: 'rgba(2,12,20,0.9)',
      }}>
        <span className="font-display" style={{ fontSize: '18px', letterSpacing: '4px' }}>BEAT THE VESSEL</span>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '2px' }}>
            WAGER: <span style={{ color: '#00ff88' }}>{wager} SOL</span>
          </div>
          <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '2px' }}>
            POT: <span style={{ color: '#ffc400' }}>{(parseFloat(wager) * 2 * 0.9).toFixed(2)} SOL</span>
          </div>
          {role === 'creator' && phase === 'placing' && (
            <button onClick={handleCancelGame} disabled={cancelling} className="btn-danger" style={{ fontSize: '14px', padding: '8px 16px' }}>
              {cancelling ? 'CANCELLING...' : 'CANCEL & REFUND'}
            </button>
          )}
        </div>
      </nav>

      {status && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.4)',
          color: '#00ff88', padding: '12px 24px', zIndex: 200,
        }} className="font-mono">
          ◆ {status}
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {phase === 'placing' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div className="font-mono" style={{ color: '#00ff88', fontSize: '11px', letterSpacing: '4px', marginBottom: '8px' }}>PHASE 1 — DEPLOY FLEET</div>
                <h1 className="font-display" style={{ fontSize: '48px', letterSpacing: '4px' }}>PLACE YOUR SHIPS</h1>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '2px', marginBottom: '4px' }}>TIME REMAINING</div>
                <div className="font-display" style={{
                  fontSize: '64px', letterSpacing: '4px',
                  color: timerColor(timer, 60),
                  textShadow: `0 0 20px ${timerColor(timer, 60)}40`,
                  animation: timer <= 10 ? 'blink 0.5s infinite' : 'none',
                }}>{String(timer).padStart(2, '0')}s</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '24px', alignItems: 'start' }}>
              <div className="panel" style={{ padding: '20px' }}>
                {renderBoard(myBoard, false)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="panel" style={{ padding: '16px' }}>
                  <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '10px', letterSpacing: '2px', marginBottom: '10px' }}>ORIENTATION</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[true, false].map((h) => (
                      <button key={String(h)} onClick={() => setHorizontal(h)} className="font-mono" style={{
                        flex: 1, padding: '10px', fontSize: '11px', letterSpacing: '1px',
                        background: horizontal === h ? 'rgba(0,255,136,0.15)' : 'transparent',
                        border: `1px solid ${horizontal === h ? '#00ff88' : 'rgba(42,106,155,0.4)'}`,
                        color: horizontal === h ? '#00ff88' : '#6a9ab8',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}>{h ? 'HORIZ' : 'VERT'}</button>
                    ))}
                  </div>
                </div>

                <div className="panel" style={{ padding: '16px' }}>
                  <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '10px', letterSpacing: '2px', marginBottom: '12px' }}>
                    FLEET ({placedCount}/4)
                  </div>
                  {ships.map((ship, i) => (
                    <div key={i} onClick={() => !ship.placed && setSelectedShip(i)} style={{
                      padding: '10px', marginBottom: '8px',
                      background: ship.placed ? 'rgba(0,255,136,0.05)' : selectedShip === i ? 'rgba(0,255,136,0.1)' : 'transparent',
                      border: `1px solid ${ship.placed ? 'rgba(0,255,136,0.3)' : selectedShip === i ? '#00ff88' : 'rgba(42,106,155,0.3)'}`,
                      cursor: ship.placed ? 'default' : 'pointer',
                      opacity: ship.placed ? 0.6 : 1, transition: 'all 0.2s',
                    }}>
                      <div className="font-mono" style={{ fontSize: '10px', letterSpacing: '2px', color: ship.placed ? '#00ff88' : selectedShip === i ? '#00ff88' : '#6a9ab8', marginBottom: '6px' }}>
                        {ship.placed ? '✓ ' : ''}{ship.name}
                      </div>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {Array(ship.size).fill(0).map((_, j) => (
                          <div key={j} style={{
                            width: '16px', height: '16px',
                            background: ship.placed ? 'rgba(0,255,136,0.3)' : selectedShip === i ? 'rgba(0,255,136,0.5)' : 'rgba(42,106,155,0.3)',
                            border: `1px solid ${ship.placed ? '#00ff88' : selectedShip === i ? '#00ff88' : 'rgba(42,106,155,0.5)'}`,
                          }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {allPlaced && (
                  <button onClick={handleCommitBoard} className="btn-primary" style={{ width: '100%', fontSize: '18px' }}>
                    ⚓ LOCK & BATTLE
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {phase === 'waiting' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '24px', textAlign: 'center' }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              border: '2px solid rgba(0,255,136,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'sonar 2s ease-in-out infinite',
            }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 20px #00ff88' }} />
            </div>
            <h2 className="font-display" style={{ fontSize: '40px', letterSpacing: '6px', color: '#00ff88' }}>SCANNING FOR ENEMY...</h2>
            <p className="font-mono" style={{ color: '#6a9ab8', fontSize: '13px', letterSpacing: '2px' }}>WAITING FOR OPPONENT</p>
            <button onClick={handleCancelGame} disabled={cancelling} className="btn-danger">
              {cancelling ? 'CANCELLING...' : 'CANCEL & REFUND'}
            </button>
          </div>
        )}

        {phase === 'battle' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div className="font-mono" style={{ color: myTurn ? '#00ff88' : '#ff3333', fontSize: '11px', letterSpacing: '4px', marginBottom: '8px' }}>
                  {myTurn ? '◆ YOUR TURN — FIRE!' : '◆ ENEMY FIRING...'}
                </div>
                <h1 className="font-display" style={{ fontSize: '40px', letterSpacing: '4px' }}>BATTLE STATIONS</h1>
              </div>
              {myTurn && (
                <div style={{ textAlign: 'right' }}>
                  <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '2px', marginBottom: '4px' }}>FIRE IN</div>
                  <div className="font-display" style={{
                    fontSize: '72px', letterSpacing: '2px',
                    color: timerColor(turnTimer, 20),
                    textShadow: `0 0 20px ${timerColor(turnTimer, 20)}40`,
                    animation: turnTimer <= 5 ? 'blink 0.3s infinite' : 'none',
                  }}>{String(turnTimer).padStart(2, '0')}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <div className="font-mono" style={{ color: '#ff3333', fontSize: '11px', letterSpacing: '3px', marginBottom: '12px' }}>
                  ◆ ENEMY WATERS {myTurn ? '— CLICK TO FIRE' : ''}
                </div>
                <div className="panel" style={{ padding: '20px', opacity: myTurn ? 1 : 0.6, transition: 'opacity 0.3s' }}>
                  {renderBoard(enemyBoard, true)}
                </div>
              </div>
              <div>
                <div className="font-mono" style={{ color: '#00ff88', fontSize: '11px', letterSpacing: '3px', marginBottom: '12px' }}>◆ YOUR WATERS</div>
                <div className="panel" style={{ padding: '20px' }}>
                  {renderBoard(myBoard, false)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '20px', flexWrap: 'wrap' }}>
              {[
                { label: 'HITS', value: enemyBoard.filter(c => c === 'hit').length, color: '#ff3333' },
                { label: 'MISSES', value: enemyBoard.filter(c => c === 'miss').length, color: '#6a9ab8' },
                { label: 'CELLS LEFT', value: `${enemyBoard.filter(c => c === 'hit').length}/12`, color: '#ffc400' },
              ].map(stat => (
                <div key={stat.label} className="panel" style={{ padding: '16px 24px', flex: 1, minWidth: '120px' }}>
                  <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '10px', letterSpacing: '2px', marginBottom: '4px' }}>{stat.label}</div>
                  <div className="font-display" style={{ fontSize: '32px', color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'gameover' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: '24px', textAlign: 'center' }}>
            <div className="font-display" style={{
              fontSize: 'clamp(60px, 12vw, 120px)', letterSpacing: '8px',
              color: winner === 'me' ? '#00ff88' : '#ff3333',
              textShadow: `0 0 40px ${winner === 'me' ? 'rgba(0,255,136,0.5)' : 'rgba(255,51,51,0.5)'}`,
            }}>
              {winner === 'me' ? 'VICTORY' : 'DEFEATED'}
            </div>
            <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '13px', letterSpacing: '3px' }}>
              {winner === 'me' ? 'ALL ENEMY SHIPS SUNK' : 'YOUR FLEET HAS BEEN SUNK'}
            </div>
            <div className="font-display" style={{ fontSize: '48px', color: winner === 'me' ? '#ffc400' : '#ff3333' }}>
              {winner === 'me' ? `+${(parseFloat(wager) * 2 * 0.9).toFixed(2)}` : `-${wager}`} SOL
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <button onClick={() => router.push('/lobby')} className="btn-primary">RETURN TO LOBBY</button>
              <button onClick={() => window.location.reload()} className="btn-danger">REMATCH</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
