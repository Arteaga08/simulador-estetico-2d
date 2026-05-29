import { applyLiquify } from './liquify'
import type { WorkerInMessage, WorkerOutMessage } from './types'

let offscreen: OffscreenCanvas | null = null
let ctx: OffscreenCanvasRenderingContext2D | null = null
let originalImageData: ImageData | null = null

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data

  if (msg.type === 'INIT') {
    offscreen = msg.canvas
    ctx = offscreen.getContext('2d')!
    originalImageData = msg.imageData
    ctx.putImageData(originalImageData, 0, 0)
    postOut({ type: 'READY' })
    return
  }

  if (msg.type === 'RELOAD') {
    if (!ctx) { postOut({ type: 'ERROR', message: 'No ctx' }); return }
    originalImageData = msg.imageData
    ctx.putImageData(originalImageData, 0, 0)
    postOut({ type: 'DONE' })
    return
  }

  if (msg.type === 'RESET') {
    if (ctx && originalImageData) {
      ctx.putImageData(originalImageData, 0, 0)
    }
    postOut({ type: 'DONE' })
    return
  }

  if (msg.type === 'APPLY') {
    if (!ctx || !originalImageData) {
      postOut({ type: 'ERROR', message: 'Worker not initialized' })
      return
    }
    try {
      const result = applyLiquify(originalImageData, msg.config.controlPoints, msg.config.noseBbox)
      ctx.putImageData(result, 0, 0)
      postOut({ type: 'DONE' })
    } catch (err) {
      postOut({ type: 'ERROR', message: String(err) })
    }
    return
  }
}

function postOut(msg: WorkerOutMessage) {
  ;(self as unknown as Worker).postMessage(msg)
}
