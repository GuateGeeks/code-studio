// Pixel coordinates are integers. Invalid rectangles never silently clamp.
export function validateCrop(size, rect) {
  const validSize = value => Number.isInteger(value) && value > 0 && value <= 1024;
  if (!size || !validSize(size.width) || !validSize(size.height) || size.width * size.height > 1048576 ||
      !rect || typeof rect !== 'object' || Array.isArray(rect) || Object.keys(rect).length !== 4 ||
      !['x', 'y', 'width', 'height'].every(key => Object.hasOwn(rect, key)) ||
      !Number.isInteger(rect.x) || !Number.isInteger(rect.y) || rect.x < 0 || rect.y < 0 ||
      !validSize(rect.width) || !validSize(rect.height) || rect.x + rect.width > size.width || rect.y + rect.height > size.height) {
    throw new Error('Recorte: el rectángulo debe estar dentro de la imagen y usar píxeles enteros.');
  }
  return {x: rect.x, y: rect.y, width: rect.width, height: rect.height};
}
