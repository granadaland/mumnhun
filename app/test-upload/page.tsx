'use client'

import { CldUploadWidget, CldImage } from 'next-cloudinary'
import { useState } from 'react'

export default function TestUploadPage() {
  const [uploadedImage, setUploadedImage] = useState<{
    publicId: string
    url: string
  } | null>(null)
  
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-3xl font-bold mb-2">📤 Cloudinary Upload Test</h1>
          <p className="text-gray-600">Test image upload functionality</p>
        </div>
        
        {/* Upload Button */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Step 1: Upload Image</h2>
          
          <CldUploadWidget
            uploadPreset={uploadPreset}
            onSuccess={(result: any) => {
              console.log('✅ Upload Success:', result.info)
              setUploadedImage({
                publicId: result.info.public_id,
                url: result.info.secure_url,
              })
            }}
            onError={(error: any) => {
              console.error('❌ Upload Error:', error)
              alert('Upload failed! Check console.')
            }}
          >
            {({ open }) => (
              <button
                onClick={() => open()}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
              >
                📁 Click to Upload Image
              </button>
            )}
          </CldUploadWidget>
          
          <p className="mt-3 text-sm text-gray-500">
            Upload preset: <code className="bg-gray-100 px-2 py-1 rounded">{uploadPreset}</code>
          </p>
        </div>
        
        {/* Display Result */}
        {uploadedImage && (
          <div className="bg-green-50 border-2 border-green-200 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-green-800">
              ✅ Upload Successful!
            </h2>
            
            <div className="space-y-4">
              {/* Image Info */}
              <div className="bg-white p-4 rounded">
                <p className="text-sm font-semibold mb-1">Image URL:</p>
                <p className="text-xs text-gray-600 break-all">{uploadedImage.url}</p>
              </div>
              
              <div className="bg-white p-4 rounded">
                <p className="text-sm font-semibold mb-1">Public ID:</p>
                <p className="text-xs text-gray-600 break-all">{uploadedImage.publicId}</p>
              </div>
              
              {/* Display Image */}
              <div>
                <p className="text-sm font-semibold mb-2">Uploaded Image (Optimized):</p>
                <CldImage
                  src={uploadedImage.publicId}
                  width={600}
                  height={400}
                  alt="Uploaded test image"
                  className="rounded-lg shadow-lg w-full"
                  crop="fill"
                  gravity="auto"
                />
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  )
}
