export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden" style={{ background: '#F5F3FF' }}>
      {children}
    </div>
  )
}
