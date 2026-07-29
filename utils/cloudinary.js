const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a local file to Cloudinary
 * @param {string} filePath Local path to the file
 * @param {string} folder Target folder in Cloudinary
 * @returns {Promise<string>} Secure URL of the uploaded asset
 */
async function uploadFileToCloudinary(filePath, folder = 'ecomart') {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary file upload error:', error);
    throw error;
  }
}

/**
 * Uploads a base64 string directly to Cloudinary
 * @param {string} base64Str Data URI scheme (e.g. data:image/png;base64,...) or raw base64
 * @param {string} folder Target folder in Cloudinary
 * @returns {Promise<string>} Secure URL of the uploaded asset
 */
async function uploadBase64ToCloudinary(base64Str, folder = 'ecomart') {
  try {
    const result = await cloudinary.uploader.upload(base64Str, {
      folder: folder,
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary base64 upload error:', error);
    throw error;
  }
}

module.exports = {
  cloudinary,
  uploadFileToCloudinary,
  uploadBase64ToCloudinary
};
