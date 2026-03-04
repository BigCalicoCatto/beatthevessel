'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { connected } = useWallet();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [typedText, setTypedText] = useState('');
  const fullText = 'WAGER. FIRE. CONQUER.';

  useEffect(() => {
    setMounted(true);
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (connected) router.push('/lobby');
  }, [connected]);

  if (!mounted) return null;

  return (
    <main style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(rgba(42,106,155,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(42,106,155,0.08) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '800px', height: '800px', borderRadius: '50%',
        border: '1px solid rgba(0,255,136,0.05)', zIndex: 0,
        pointerEvents: 'none',
      }}>
        <div style={{ position: 'absolute', inset: '25%', borderRadius: '50%', border: '1px solid rgba(0,255,136,0.08)' }} />
        <div style={{ position: 'absolute', inset: '40%', borderRadius: '50%', border: '1px solid rgba(0,255,136,0.1)' }} />
      </div>

      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
        borderBottom: '1px solid rgba(42,106,155,0.2)',
        backdropFilter: 'blur(10px)', zIndex: 100,
        background: 'rgba(2,12,20,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#00ff88', boxShadow: '0 0 10px #00ff88',
          }} />
          <span className="font-display" style={{ fontSize: '24px', letterSpacing: '4px', color: '#e8f4f8' }}>
            BEAT THE VESSEL
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <span className="font-mono" style={{ color: '#6a9ab8', fontSize: '12px', letterSpacing: '2px' }}>DEVNET</span>
          <WalletMultiButton />
        </div>
      </nav>

      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '120px 48px 80px', position: 'relative', zIndex: 1, textAlign: 'center',
      }}>
        <div className="font-mono" style={{ color: '#00ff88', fontSize: '12px', letterSpacing: '4px', marginBottom: '24px', opacity: 0.8 }}>
          ◆ ON-CHAIN BATTLESHIP ◆ SOLANA ◆
        </div>

        <h1 className="font-display" style={{
          fontSize: 'clamp(80px, 12vw, 160px)', lineHeight: 0.9,
          letterSpacing: '8px', marginBottom: '24px',
          background: 'linear-gradient(180deg, #e8f4f8 0%, #6a9ab8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          BEAT THE<br />VESSEL
        </h1>

        <div className="font-mono" style={{
          fontSize: '18px', letterSpacing: '6px', color: '#00ff88',
          marginBottom: '48px', minHeight: '28px',
        }}>
          {typedText}<span style={{ animation: 'blink 1s infinite' }}>_</span>
        </div>

        <WalletMultiButton />

        <div style={{ display: 'flex', gap: '48px', marginTop: '80px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'WINNER TAKES', value: '90%' },
            { label: 'TURN TIMER', value: '20s' },
            { label: 'GRID SIZE', value: '10×10' },
            { label: 'SHIPS', value: '4' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div className="font-display" style={{ fontSize: '48px', color: '#00ff88', textShadow: '0 0 20px rgba(0,255,136,0.4)' }}>
                {stat.value}
              </div>
              <div className="font-mono" style={{ fontSize: '11px', letterSpacing: '3px', color: '#6a9ab8', marginTop: '4px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 48px', maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '4px', marginBottom: '48px', textAlign: 'center' }}>
          ── HOW TO PLAY ──
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {[
            { step: '01', title: 'CONNECT & WAGER', desc: 'Connect your Phantom wallet. Create a game and lock in your SOL wager.', icon: '⚓' },
            { step: '02', title: 'PLACE YOUR FLEET', desc: 'Position your 4 ships on the 10×10 grid. You have 60 seconds.', icon: '🚢' },
            { step: '03', title: 'FIRE AT WILL', desc: 'Take turns firing at coordinates. 20 seconds per shot or you lose.', icon: '💥' },
            { step: '04', title: 'CLAIM VICTORY', desc: 'Sink all enemy ships. 90% of pot to winner. Paid instantly on-chain.', icon: '🏆' },
          ].map((item) => (
            <div key={item.step} className="panel" style={{ padding: '32px 24px', borderRadius: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span className="font-mono" style={{ fontSize: '11px', color: '#00ff88', letterSpacing: '2px' }}>{item.step}</span>
                <span style={{ fontSize: '24px' }}>{item.icon}</span>
              </div>
              <h3 className="font-display" style={{ fontSize: '28px', letterSpacing: '3px', color: '#e8f4f8', marginBottom: '12px' }}>{item.title}</h3>
              <p style={{ color: '#6a9ab8', lineHeight: '1.6', fontSize: '15px' }}>{item.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '64px' }}>
          <WalletMultiButton />
          <p className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '2px', marginTop: '16px' }}>
            CURRENTLY ON DEVNET — PLAY WITH FAKE SOL
          </p>
        </div>
      </section>

      <footer style={{
        borderTop: '1px solid rgba(42,106,155,0.2)',
        padding: '24px 48px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '16px',
      }}>
        <span className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '2px' }}>© 2025 BEAT THE VESSEL</span>
        <span className="font-mono" style={{ color: '#6a9ab8', fontSize: '11px', letterSpacing: '2px' }}>PROGRAM: GcQeeFpckZ9PJNz427wG8pQxrWkNtS3U66GrGPVSe2bm</span>
      </footer>
    </main>
  );
}
