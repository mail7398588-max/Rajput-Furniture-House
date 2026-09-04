'use client'

import { useEffect, useRef, useState } from 'react'

export default function FloatingScrollBar({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const syncing = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function check() {
      setVisible(container!.scrollWidth > container!.clientWidth + 10)
    }

    check()
    const ro = new ResizeObserver(check)
    ro.observe(container!)
    return () => ro.disconnect()
  }, [containerRef])

  useEffect(() => {
    const container = containerRef.current
    const track = trackRef.current
    if (!container || !track || !visible) return

    const containerEl = container
    const trackEl = track

    function syncFromContainer() {
      if (syncing.current) return
      syncing.current = true
      const ratio = containerEl.scrollLeft / (containerEl.scrollWidth - containerEl.clientWidth || 1)
      trackEl.scrollLeft = ratio * (trackEl.scrollWidth - trackEl.clientWidth)
      syncing.current = false
    }

    function syncFromTrack() {
      if (syncing.current) return
      syncing.current = true
      const ratio = trackEl.scrollLeft / (trackEl.scrollWidth - trackEl.clientWidth || 1)
      containerEl.scrollLeft = ratio * (containerEl.scrollWidth - containerEl.clientWidth)
      syncing.current = false
    }

    containerEl.addEventListener('scroll', syncFromContainer, { passive: true })
    trackEl.addEventListener('scroll', syncFromTrack, { passive: true })

    return () => {
      containerEl.removeEventListener('scroll', syncFromContainer)
      trackEl.removeEventListener('scroll', syncFromTrack)
    }
  }, [containerRef, visible])

  if (!visible) return null

  return (
    <div className="floating-scrollbar-wrapper">
      <div ref={trackRef} className="floating-scrollbar-track">
        <div className="floating-scrollbar-thumb" />
      </div>
    </div>
  )
}
