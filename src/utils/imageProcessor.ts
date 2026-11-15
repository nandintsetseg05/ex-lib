import { BOOK_FIELD_LIMITS } from '../types/book';

/**
 * Compresses and resizes a user-uploaded cover image into a crisp 3:4-friendly
 * JPEG data URI well beneath Firestore's 1MB document limit and schema bounds.
 */
export async function compressBookCoverFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPG, PNG, or WebP).');
  }

  const maxInputBytes = 15 * 1024 * 1024;
  if (file.size > maxInputBytes) {
    throw new Error('Image file must be smaller than 15 MB.');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const maxWidth = 540;
  const maxHeight = 720;

  let targetWidth = image.naturalWidth || maxWidth;
  let targetHeight = image.naturalHeight || maxHeight;

  const widthRatio = maxWidth / targetWidth;
  const heightRatio = maxHeight / targetHeight;
  const scale = Math.min(1, widthRatio, heightRatio);

  targetWidth = Math.max(1, Math.round(targetWidth * scale));
  targetHeight = Math.max(1, Math.round(targetHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to process image in this browser.');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const qualitySteps = [0.86, 0.76, 0.65, 0.52];
  for (const quality of qualitySteps) {
    const output = canvas.toDataURL('image/jpeg', quality);
    if (output.length <= BOOK_FIELD_LIMITS.MAX_COVER_LENGTH - 10000) {
      return output;
    }
  }

  // Final fallback downscale if still large
  const smallerCanvas = document.createElement('canvas');
  smallerCanvas.width = Math.round(targetWidth * 0.65);
  smallerCanvas.height = Math.round(targetHeight * 0.65);
  const smallCtx = smallerCanvas.getContext('2d');
  if (!smallCtx) {
    throw new Error('Unable to resize cover image.');
  }
  smallCtx.fillStyle = '#FFFFFF';
  smallCtx.fillRect(0, 0, smallerCanvas.width, smallerCanvas.height);
  smallCtx.drawImage(image, 0, 0, smallerCanvas.width, smallerCanvas.height);

  const finalOutput = smallerCanvas.toDataURL('image/jpeg', 0.6);
  if (finalOutput.length > BOOK_FIELD_LIMITS.MAX_COVER_LENGTH) {
    throw new Error('Processed image is still too large. Please try another photo.');
  }
  return finalOutput;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read the selected image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read the selected image file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The selected file could not be decoded as an image.'));
    img.src = src;
  });
}
