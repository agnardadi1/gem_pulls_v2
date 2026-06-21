import { useState } from 'react'
import { usePhoneStore } from '../../store/usePhoneStore'
import { useGameStore } from '../../store/useGameStore'
import PackStore from './PackStore'
import PackOpener from './PackOpener'
import Binder from './Binder'
import type { PackType, RealCard } from './packData'

type Tab = 'store' | 'binder'
type View = 'tabs' | 'opening'

export default function PackMarket() {
  const { closeApp } = usePhoneStore()
  const { bankroll } = useGameStore()
  const [tab, setTab] = useState<Tab>('store')
  const [view, setView] = useState<View>('tabs')
  const [selectedPack, setSelectedPack] = useState<PackType | null>(null)

  function handleSelectPack(pack: PackType) {
    setSelectedPack(pack)
    setView('opening')
  }

  function handleOpenDone(_cards: RealCard[]) {
    setView('tabs')
    setSelectedPack(null)
    setTab('binder')
  }

  return (
    <div className="flex flex-col" style={{ height: '100%', background: '#0a0a14' }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-3"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Back */}
        <button onClick={closeApp}
          className="flex items-center gap-1 cursor-pointer active:opacity-50 transition-opacity"
          style={{ padding: '8px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.09)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>Home</span>
        </button>

        {/* Title — only show in tabs view */}
        {view === 'tabs' && (
          <span style={{ color: 'white', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>
            Pack Market
          </span>
        )}
        {view === 'opening' && (
          <span style={{ color: 'white', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>
            Opening
          </span>
        )}

        {/* Bankroll */}
        <div className="flex items-center gap-1.5"
             style={{ padding: '7px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.09)' }}>
          <span style={{ color: '#facc15', fontSize: '10px' }}>●</span>
          <span style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>
            ${bankroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {view === 'opening' && selectedPack ? (

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <PackOpener pack={selectedPack} onDone={handleOpenDone} />
        </div>

      ) : (
        <>
          {/* ── Tab switcher ── */}
          <div className="flex-shrink-0 flex mx-4 mt-3 mb-3"
               style={{ borderRadius: '14px', padding: '4px', background: 'rgba(255,255,255,0.07)' }}>
            {(['store', 'binder'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 cursor-pointer transition-all"
                style={{
                  padding: '9px 0',
                  borderRadius: '11px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: tab === t ? 'rgba(255,255,255,0.13)' : 'transparent',
                  color: tab === t ? 'white' : 'rgba(255,255,255,0.38)',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                  letterSpacing: '-0.1px',
                }}>
                {t === 'store' ? 'Store' : 'Binder'}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {tab === 'store' ? <PackStore onSelect={handleSelectPack} /> : <Binder />}
          </div>
        </>
      )}
    </div>
  )
}
