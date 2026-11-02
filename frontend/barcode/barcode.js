import { BarcodeDetector } from "https://fastly.jsdelivr.net/npm/barcode-detector@3/dist/es/ponyfill.min.js";

console.log("[barcode] module loaded");

const acceptedFormats = await BarcodeDetector.getSupportedFormats();
console.log("[barcode] accepted formats:", acceptedFormats);

export class barcodeDetector_atomic {
  #bc_internal;
  #loaded = false;

  get() {
    if (!this.#loaded) {
      console.log("[barcode] creating BarcodeDetector");
      this.#bc_internal = new BarcodeDetector({
        formats: acceptedFormats
      });
      this.#loaded = true;
    }
    return this.#bc_internal;
  }

  // Grabs barcode data from image object
  async detect(image_object) {
    const isValid =
      typeof Blob !== "undefined" && image_object instanceof Blob ||
      typeof ImageData !== "undefined" && image_object instanceof ImageData ||
      typeof VideoFrame !== "undefined" && image_object instanceof VideoFrame ||
      typeof HTMLImageElement !== "undefined" && image_object instanceof HTMLImageElement ||
      typeof SVGImageElement !== "undefined" && image_object instanceof SVGImageElement ||
      typeof HTMLVideoElement !== "undefined" && image_object instanceof HTMLVideoElement ||
      typeof HTMLCanvasElement !== "undefined" && image_object instanceof HTMLCanvasElement ||
      typeof ImageBitmap !== "undefined" && image_object instanceof ImageBitmap ||
      typeof OffscreenCanvas !== "undefined" && image_object instanceof OffscreenCanvas;

    if (!isValid) {
      return null;
    }

    const detected_object = await this.get().detect(image_object);
    if (detected_object.length === 0) {
      return null;
    }

    return { val: detected_object[0].rawValue, boundingBox: detected_object[0].boundingBox };
  }
}