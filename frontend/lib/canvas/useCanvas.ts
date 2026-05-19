import { useRef, useCallback } from 'react'

interface UseCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>
  loadImage: (url: string) => Promise<ImageData>
  getImageData: () => ImageData | null
}

export function useCanvas(): UseCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const loadImage = useCallback(async (url: string): Promise<ImageData> => {
    const canvas = canvasRef.current
    if (!canvas) throw new Error('Canvas not mounted')
    const ctx = canvas.getContext('2d')!

    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = url
    })

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx.drawImage(img, 0, 0)
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
