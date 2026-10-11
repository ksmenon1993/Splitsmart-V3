// Which member "I" am in each group. There are no accounts, so this is a per-device
// convenience: if storage is unavailable the app just asks again.
const key = (groupId: string) => `splitsmart:me:${groupId}`

export function getMe(groupId: string): string | null {
  try {
    return localStorage.getItem(key(groupId))
  } catch {
    return null
  }
}

export function saveMe(groupId: string, memberId: string) {
  try {
    localStorage.setItem(key(groupId), memberId)
  } catch {
    // Remembered for this visit only.
  }
}
