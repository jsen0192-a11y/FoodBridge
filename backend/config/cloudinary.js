const cloudinary = require('cloudinary').v2;

const isConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log("☁️ Cloudinary integration configured successfully");
} else {
  console.log("⚠️ Cloudinary variables not set. Using local file storage fallback.");
}

module.exports = {
  cloudinary,
  isConfigured() {
    return !!isConfigured;
  },
  
  async uploadImage(fileStr) {
    if (!isConfigured) {
      return fileStr;
    }
    try {
      // Clean base64 string prefix if it exists to avoid Cloudinary format issues
      const cleanFile = fileStr.startsWith('data:image') ? fileStr : `data:image/jpeg;base64,${fileStr}`;
      
      const uploadResponse = await cloudinary.uploader.upload(cleanFile, {
        folder: 'donations',
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto", fetch_format: "auto" }
        ]
      });
      return uploadResponse.secure_url;
    } catch (error) {
      console.error("Cloudinary upload failed, using fallback:", error.message);
      return fileStr;
    }
  }
};
