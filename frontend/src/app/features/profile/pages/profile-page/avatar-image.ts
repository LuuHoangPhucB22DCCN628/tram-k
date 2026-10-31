export const MAX_AVATAR_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_AVATAR_STORED_BYTES = 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class AvatarImageError extends Error {}

export async function prepareAvatarImage(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new AvatarImageError('Chỉ chọn ảnh JPG, PNG hoặc WebP.');
  }
  if (file.size > MAX_AVATAR_SOURCE_BYTES) {
    throw new AvatarImageError('Ảnh gốc vượt quá 10 MB. Hãy chọn ảnh nhỏ hơn.');
  }
  if (file.size <= MAX_AVATAR_STORED_BYTES) {
    return readAsDataUrl(file);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new AvatarImageError('Không thể mở ảnh. Vui lòng chọn tệp ảnh khác.');
  }

  try {
    if (!bitmap.width || !bitmap.height) {
      throw new AvatarImageError('Ảnh không có kích thước hợp lệ.');
    }
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new AvatarImageError('Trình duyệt không thể xử lý ảnh này.');

    for (const maxEdge of [1600, 1280, 1024, 800, 640, 480]) {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.88, 0.76, 0.64, 0.52]) {
        const dataUrl = canvas.toDataURL('image/webp', quality);
        if (avatarBytes(dataUrl) <= MAX_AVATAR_STORED_BYTES) return dataUrl;
      }
    }
    throw new AvatarImageError('Không thể giảm ảnh xuống dung lượng phù hợp. Hãy chọn ảnh khác.');
  } finally {
    bitmap.close();
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new AvatarImageError('Không thể đọc ảnh. Vui lòng thử tệp khác.'));
    reader.readAsDataURL(file);
  });
}

function avatarBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return (
    Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)
  );
}
