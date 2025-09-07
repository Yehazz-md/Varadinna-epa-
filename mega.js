import * as mega from 'megajs';

// Use Vercel environment variables for security
const auth = {
  email: process.env.MEGA_EMAIL,
  password: process.env.MEGA_PASSWORD,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
};

export const upload = (data, name) => {
  return new Promise((resolve, reject) => {
    try {
      const storage = new mega.Storage(auth, () => {
        const uploadStream = storage.upload({ name, allowUploadBuffering: true });
        data.pipe(uploadStream);

        storage.on("add", (file) => {
          file.link((err, url) => {
            if (err) reject(err);
            else {
              storage.close();
              resolve(url);
            }
          });
        });

        storage.on("error", (error) => reject(error));
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const download = (url) => {
  return new Promise((resolve, reject) => {
    try {
      const file = mega.File.fromURL(url);
      file.loadAttributes((err) => {
        if (err) return reject(err);

        file.downloadBuffer((err, buffer) => {
          if (err) reject(err);
          else resolve(buffer);
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};
