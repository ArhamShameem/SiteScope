const streamifier = require('streamifier');

const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../middleware/asyncHandler');

function uploadToCloudinary(buffer, userId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'seo-geo-app/avatars',
        public_id: `user-${userId}-${Date.now()}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    const error = new Error('Profile image is required');
    error.statusCode = 400;
    throw error;
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    const error = new Error('Cloudinary is not configured');
    error.statusCode = 500;
    throw error;
  }

  const uploadResult = await uploadToCloudinary(req.file.buffer, req.user._id.toString());

  req.user.avatarUrl = uploadResult.secure_url;
  await req.user.save();

  res.json({
    user: {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      provider: req.user.provider,
      avatarUrl: req.user.avatarUrl,
      createdAt: req.user.createdAt,
    },
  });
});

module.exports = {
  uploadAvatar,
};
