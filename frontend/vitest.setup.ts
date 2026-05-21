import '@testing-library/jest-dom'

// Polyfill ImageData for jsdom environment if needed.
// Spec signatures:
//   new ImageData(sw, sh, settings?)
//   new ImageData(data, sw, sh?, settings?)
if (typeof ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    data: Uint8ClampedArray
    width: number
    height: number

    constructor(
      widthOrData: number | Uint8ClampedArray,
      swOrHeight: number,
      sh?: number,
    ) {
      if (typeof widthOrData === 'number') {
        // new ImageData(sw, sh)
        this.width = widthOrData
        this.height = swOrHeight
        this.data = new Uint8ClampedArray(this.width * this.height * 4)
      } else {
        // new ImageData(data, sw, sh?)  — sh inferred from data length when omitted
        const data = widthOrData
        this.width = swOrHeight
        this.height = sh ?? data.length / 4 / swOrHeight
        this.data = new Uint8ClampedArray(data)
      }
    }
  } as any
}
