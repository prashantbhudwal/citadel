/**
 * 	•	Tries the request.
	•	If it fails, waits delay ms.
	•	Each failure doubles the delay: delay *= 2.
	•	Stops when it succeeds or attempts exceeds MAX_ATTEMPTS.

Use a while loop for the retry logic, return true on success, false on failure after max attempts.
 */
const wait = function (ms: number) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), ms))
}
async function retryWithBackoff(
  fn: () => Promise<void>,
  maxAttempts: number,
  initialDelay: number,
): Promise<boolean> {
  let attempts = 1
  let delay = initialDelay
  while (attempts <= maxAttempts) {
    try {
      await fn()
      return true
    } catch (e) {
      attempts++
      if (attempts > maxAttempts) return false
      await wait(delay)
      delay = delay * 2
    }
  }
  return false
}
// Test: fn fails twice then succeeds; fn always fails.
