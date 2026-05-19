'use client'

import { useRef, useEffect } from 'react'
import { useSimulator } from './SimulatorContext'

interface DrawingLayerProps {
  width: number
  height: number
}

export function DrawingLayer({ width, height }: DrawingLayerProps) {
  const { state, addStroke } = useSimulator()
  const { activeTool, strokes } = state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const currentPoints = useRef<Array<{ x: number; y: number }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return
      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height)
      stroke.points.slice(1).forEach(p => ctx.lineTo(p.x * canvas.width, p.y * canvas.height))
      ctx.stroke()
    })
  }, [strokes, width, height])

  function getRelativePoint(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (activeTool !== 'draw') return
    isDrawing.current = true
    currentPoints.current = [getRelativePoint(e)]
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || activeTool !== 'draw') return
    currentPoints.current.push(getRelativePoint(e))
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pts = currentPoints.current
    if (pts.length >= 2) {
      const prev = pts[pts.length - 2]
      const curr = pts[pts.length - 1]
      ctx.beginPath()
      ctx.strokeStyle = '#EF4444'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height)
      ctx.lineTo(curr.x * canvas.width, curr.y * canvas.height)
      ctx.stroke()
    }
  }

  function handleMouseUp() {
    if (!isDrawing.current) return
    isDrawing.current = false
    if (currentPoints.current.length > 1) {
      addStroke({ id: crypto.randomUUID(), points: currentPoints.current, color: '#EF4444', width: 2 })
    }
    currentPoints.current = []
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0"
      style={{
        cursor: activeTool === 'draw' ? 'crosshair' : 'default',
        pointerEvents: activeTool === 'draw' ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  )
}
