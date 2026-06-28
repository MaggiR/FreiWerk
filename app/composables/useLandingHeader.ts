/**
 * Shared flag describing whether the marketing landing hero is currently in
 * view. The landing page updates it via an IntersectionObserver; the app header
 * reads it to stay hidden over the hero and slide in once the user scrolls past.
 */
export function useLandingHeader() {
  const heroVisible = useState('landing-hero-visible', () => true)
  return { heroVisible }
}
