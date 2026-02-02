export default function TestEnvPage() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  
  console.log('🔍 SERVER CHECK:', { cloudName, apiKey, uploadPreset })
  
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-3xl font-bold mb-4">🎉 SUCCESS!</h1>
          <p className="text-gray-600">Cloudinary credentials are loading correctly</p>
        </div>
        
        <div className="bg-green-50 border-2 border-green-200 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">✅ Server-side Values:</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex gap-2">
              <span className="text-green-600">✅</span>
              <span>Cloud Name: {cloudName}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600">✅</span>
              <span>API Key: {apiKey}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600">✅</span>
              <span>Upload Preset: {uploadPreset}</span>
            </div>
          </div>
        </div>
        
        <ClientTest />
      </div>
    </div>
  )
}

function ClientTest() {
  "use client"
  
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  
  return (
    <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">🌐 Client-side (Browser):</h2>
      <div className="font-mono text-sm">
        <div className="flex gap-2">
          <span className="text-green-600">✅</span>
          <span>Cloud Name: {cloudName}</span>
        </div>
      </div>
    </div>
  )
}
