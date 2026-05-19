const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function createShareToken(
  sessionId: string,
  token: string,
): Promise<{ shareUrl: string; expiresAt: string }> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/share`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to create share token')
  return res.json()
}
