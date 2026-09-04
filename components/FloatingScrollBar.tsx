'use client'

import { useEffect, useRef, useState } from 'react'

export default function FloatingScrollBar({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [clientWidth, setClientWidth] = useState(0)
  const syncing = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function check() {
      const sw = container!.scrollWidth
      const cw = container!.clientWidth
      setScrollWidth(sw)
      setClientWidth(cw)
      setVisible(sw > cw + 10)
    }

    check()
    const ro = new ResizeObserver(check)
    ro.observe(container!)
    return () => ro.disconnect()
  }, [containerRef])

  useEffect(() => {
    const container = containerRef.current
    const scrollbar = scrollRef.current
    if (!container || !scrollbar) return

    function syncFromContainer() {
      if (syncing.current) return
      syncing.current = true
      scrollbar.scrollLeft = container!.scrollLeft
      syncing.current = false
    }

    function syncFromScrollbar() {
      if (syncing.current) return
      syncing.current = true
      container!.scrollLeft = scrollbar.scrollLeft
      syncing.current = false
    }

    container.addEventListener('scroll', syncFromContainer, { passive: true })
    scrollbar.addEventListener('scroll', syncFromScrollbar, { passive: true })

    return () => {
      container.removeEventListener('scroll', syncFromContainer)
      scrollbar.removeEventListener('scroll', syncFromScrollbar)
    }
  }, [containerRef])

  if (!visible) return null

  const ratio = clientWidth / scrollWidth

  return (
    <div className="floating-scrollbar-wrapper">
      <div ref={scrollRef} className="floating-scrollbar-track">
        <div
          className="floating-scrollbar-thumb"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
