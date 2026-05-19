import { useRef, useEffect, useCallback } from 'react'
import type { LiquifyConfig, WorkerInMessage, WorkerOutMessage } from './types'

interface UseLiquifyReturn {
  initWorker: (canvas: OffscreenCanvas, imageData: ImageData) => Promise<void>
  applyConfig: (config: LiquifyConfig) => Promise<void>
  reset: () => Promise<void>
  isReady: () => boolean
}

export function useLiquify(): UseLiquifyReturn {
  const workerRef = useRef<Worker | null>(null)
  const readyRef = useRef(false)

  useEffect(() => {
    const worker = new Worker(
      new URL('./liquify.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    return () => {
      worker.terminate()
      workerRef.current = null
      readyRef.current = false
    }
  }, [])

  function sendAndWait(msg: WorkerInMessage, transfer?: Transferable[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = workerRef.current
      if (!worker) return reject(new Error('Worker not initialized'))

      function onMessage(e: MessageEvent<WorkerOutMessage>) {
        worker!.removeEventListener('message', onMessage)
        if (e.data.type === 'ERROR') reject(new Error(e.data.message))
        else resolve()
      }

      worker.addEventListener('message', onMessage)
      if (transfer?.length) {
        worker.postMessage(msg, transfer)
      } else {
        worker.postMessage(msg)
      }
    })
  }

  const initWorker = useCallback(async (canvas: OffscreenCanvas, imageData: ImageData) => {
    await sendAndWait({ type: 'INIT', canvas, imageData }, [canvas])
    readyRef.current = true
  }, [])

  const applyConfig = useCallback(async (config: LiquifyConfig) => {
    if (!readyRef.current) return
    await sendAndWait({ type: 'APPLY', config })
  }, [])

  const reset = useCallback(async () => {
    if (!readyRef.current) return
    await sendAndWait({ type: 'RESET' })
  }, [])

  const isReady = useCallback(() => readyRef.current, [])

  return { initWorker, applyConfig, reset, isReady }
}
