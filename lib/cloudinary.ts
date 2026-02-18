import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

interface UploadResult {
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
}

/**
 * Uploads an image file to Cloudinary
 * @param filePath Local file path to upload
 * @param folder Cloudinary folder (e.g., 'mumnhun/posts')
 * @param publicId Optional public ID for the image
 */
export async function uploadToCloudinary(
    filePath: string,
    folder: string = 'mumnhun/posts',
    publicId?: string
): Promise<UploadResult | null> {
    try {
        const options: any = {
            folder,
            use_filename: true,
            unique_filename: false,
            overwrite: false,
            resource_type: 'auto',
        };

        if (publicId) {
            options.public_id = publicId;
        }

        const result = await cloudinary.uploader.upload(filePath, options);

        return {
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
        };
    } catch (error) {
        console.error(`❌ Cloudinary upload failed for ${filePath}:`, error);
        return null;
    }
}

/**
 * Checks if a resource with the given public ID already exists
 */
export async function checkImageExists(publicId: string): Promise<string | null> {
    try {
        const result = await cloudinary.api.resource(publicId);
        return result.secure_url;
    } catch (error) {
        return null; // Not found
    }
}
