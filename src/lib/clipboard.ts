/** Copy text; if the Clipboard API is unavailable, select the field so the user can copy manually. */
export async function copyText(text: string, fallbackInput?: HTMLInputElement | HTMLTextAreaElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard API can be unavailable (insecure context, permissions). Select the text so the user can copy it.
    fallbackInput?.focus()
    fallbackInput?.select()
    return false
  }
}
