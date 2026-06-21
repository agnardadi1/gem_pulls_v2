import { usePhoneStore } from '../../store/usePhoneStore'

export default function InstagramApp() {
  const { closeApp } = usePhoneStore()
  return (
    <div className="flex-1 bg-black flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={closeApp} className="text-pink-400 text-sm font-semibold">← Home</button>
        <span className="text-white font-bold text-lg flex-1 text-center pr-10">Instagram</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Unlock at Level 2</div>
    </div>
  )
}
