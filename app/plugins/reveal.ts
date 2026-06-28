/**
 * `v-reveal` — animate an element into view on scroll.
 *
 * The element is "armed" (hidden, shifted) on mount and revealed once it enters
 * the viewport. Arming happens client-side only, so server-rendered/no-JS output
 * stays fully visible. An optional binding value sets a stagger delay in ms.
 *
 * Registered universally (with a no-op `getSSRProps`) so the directive resolves
 * during SSR; the `mounted`/`unmounted` hooks only ever run on the client.
 *
 * Usage: <div v-reveal>…</div> or <div v-reveal="120">…</div>
 */
export default defineNuxtPlugin((nuxtApp) => {
  const observers = new WeakMap<HTMLElement, IntersectionObserver>()

  nuxtApp.vueApp.directive('reveal', {
    getSSRProps() {
      return {}
    },
    mounted(el: HTMLElement, binding) {
      const reduceMotion = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      ).matches

      if (reduceMotion || typeof IntersectionObserver === 'undefined') {
        el.classList.add('reveal--in')
        return
      }

      const delay = typeof binding.value === 'number' ? binding.value : 0
      if (delay > 0) el.style.transitionDelay = `${delay}ms`

      el.classList.add('reveal--armed')

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            el.classList.add('reveal--in')
            observer.unobserve(el)
            observers.delete(el)
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
      )

      observer.observe(el)
      observers.set(el, observer)
    },
    unmounted(el: HTMLElement) {
      observers.get(el)?.disconnect()
      observers.delete(el)
    },
  })
})
