import '@testing-library/jest-dom'

// Polyfill ImageData for jsdom environment if needed
if (typeof ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    data: Uint8ClampedArray
    width: number
    height: number

    constructor(widthOrData: number | Uint8ClampedArray, height?: number, options?: any) {
      if (typeof widthOrData === 'number') {
        this.width = widthOrData
        this.height = height || 0
        this.data = new Uint8ClampedArray(this.width * this.height * 4)
      } else {
        const data = widthOrData
        this.width = height || 0
        this.height = options?.height || 0
        this.data = new Uint8ClampedArray(data)
      }
    }
  } as any
}
