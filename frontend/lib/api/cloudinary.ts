const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function getCloudinarySignature(token: string): Promise<{
  signature: string
  timestamp: number
  cloudName: string
  apiKey: string
  folder: string
}> {
  const res = await fetch(`${API_BASE}/api/cloudinary/sign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to get Cloudinary signature')
  return res.json()
}

export async function uploadToCloudinary(
  file: File,
  token: string,
): Promise<{ publicId: string; secureUrl: string }> {
  const { signature, timestamp, cloudName, apiKey, folder } = await getCloudinarySignature(token)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(timestamp))
  formData.append('signature', signature)
  formData.append('folder', folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) throw new Error('Cloudinary upload failed')
  const data = await res.json()
  return { publicId: data.public_id, secureUrl: data.secure_url }
}
