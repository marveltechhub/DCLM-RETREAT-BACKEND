import { Readable } from 'stream';
import { cloudinary } from '../config/cloudinary.js';

function bufferToStreamUpload(buffer, folder) {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder: folder || 'dclm-camp-profiles', resource_type: 'image' },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(upload);
  });
}

export async function uploadProfileImage(buffer) {
  return bufferToStreamUpload(buffer, 'dclm-easter-retreat/profiles');
}
