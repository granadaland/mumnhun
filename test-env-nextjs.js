const { loadEnvConfig } = require('@next/env')

const projectDir = process.cwd()
loadEnvConfig(projectDir)

console.log('=================================')
console.log('Testing Next.js Environment Load:')
console.log('=================================')
console.log('Cloud Name:', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
console.log('API Key:', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY)
console.log('Upload Preset:', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET)
console.log('=================================')

if (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
  console.log('✅ SUCCESS! Env vars loaded correctly!')
} else {
  console.log('❌ FAILED! Env vars not loaded!')
}
