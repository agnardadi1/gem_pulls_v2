import { useEffect, useRef, useState } from 'react'
import Phone from './components/Phone/Phone'

const PHONE_W = 390
const PHONE_H = 844

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return
      const vw = containerRef.current.clientWidth
      const vh = containerRef.current.clientHeight
      const s = Math.min(vw / PHONE_W, vh / PHONE_H, 1)
      setScale(s)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return (
    <div ref={containerRef} className="w-full h-svh flex items-center justify-center bg-[#111]">
      <div
        style={{
          width: PHONE_W,
          height: PHONE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <Phone />
      </div>
    </div>
  )
}
