'use client'

import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-warm-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-warm-100">
        <div className="flex items-center justify-between p-6 border-b border-warm-100 bg-gradient-to-r from-warm-50 to-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-warm-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-warm-100 hover:bg-warm-200 flex items-center justify-center text-warm-500 hover:text-warm-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
