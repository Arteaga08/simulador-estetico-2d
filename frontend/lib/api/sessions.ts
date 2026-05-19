const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface SaveSessionPayload {
  patientId: string
  procedimiento: string
  tecnica: string
  sliderConfig: Record<string, Record<string, number>>
  notas: string
  imagePublicId?: string
}

export async function saveSession(
  payload: SaveSessionPayload,
  token: string,
): Promise<{ sessionId: string }> {
  const res = await fetch(`${API_BASE}/api/patients/${payload.patientId}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      procedimiento: payload.procedimiento,
      tecnica: payload.tecnica,
      notas: payload.notas,
      sliderConfig: payload.sliderConfig,
      imagePublicId: payload.imagePublicId,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Error desconocido' }))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }

  return res.json()
}
