'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export default function FloatingScrollBar({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [thumbWidth, setThumbWidth] = useState(50)
  const [thumbLeft, setThumbLeft] = useState(0)
  const dragging = useRef(false)
  const startX = useRef(0)
  const scrollStart = useRef(0)

  const update = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const sw = container.scrollWidth
    const cw = container.clientWidth
    if (sw <= cw + 10) { setVisible(false); return }
    setVisible(true)
    const trackEl = trackRef.current
    if (!trackEl) return
    const tw = trackEl.clientWidth
    const ratio = cw / sw
    setThumbWidth(Math.max(40, ratio * tw))
    setThumbLeft((container.scrollLeft / (sw - cw)) * (tw - Math.max(40, ratio * tw)))
  }, [containerRef])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(container)
    container.addEventListener('scroll', update, { passive: true })
    return () => {
      ro.disconnect()
      container.removeEventListener('scroll', update)
    }
  }, [containerRef, update])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    startX.current = e.clientX
    scrollStart.current = containerRef.current?.scrollLeft || 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [containerRef])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const container = containerRef.current
    const track = trackRef.current
    if (!container || !track) return
    const dx = e.clientX - startX.current
    const sw = container.scrollWidth - container.clientWidth
    const tw = track.clientWidth - thumbWidth
    if (tw <= 0) return
    container.scrollLeft = scrollStart.current + (dx / tw) * sw
  }, [containerRef, thumbWidth])

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  if (!visible) return null

  return (
    <div className="floating-scrollbar-wrapper">
      <div ref={trackRef} className="floating-scrollbar-track">
        <div
          className="floating-scrollbar-thumb"
          style={{ width: `${thumbWidth}px`, transform: `translateX(${thumbLeft}px)` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
    </div>
  )
}
