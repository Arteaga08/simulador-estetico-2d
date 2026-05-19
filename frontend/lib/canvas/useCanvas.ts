import { useRef, useCallback } from 'react'

interface UseCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  loadImage: (url: string) => Promise<ImageData>
  getImageData: () => ImageData | null
}

export function useCanvas(): UseCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const loadImage = useCallback(async (url: string): Promise<ImageData> => {
    const canvas = canvasRef.current
    if (!canvas) throw new Error('Canvas not mounted')

    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = url
    })

    // Use a temporary canvas to extract ImageData so the visible canvas
    // stays context-free and can be transferred to OffscreenCanvas later.
    const tmp = document.createElement('canvas')
    tmp.width = img.naturalWidth
    tmp.height = img.naturalHeight
    const ctx = tmp.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    return ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight)
  }, [])

  const getImageData = useCallback((): ImageData | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')!
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  }, [])

  return { canvasRef, loadImage, getImageData }
}
