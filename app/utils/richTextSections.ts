const HEADING_SELECTOR = 'h1, h2, h3'

function isHeading(element: Element): boolean {
  return /^H[123]$/i.test(element.tagName)
}

function headingLevel(tagName: string): number {
  return Number(tagName[1])
}

function sectionTitleLevel(summary: Element): number | null {
  if (summary.classList.contains('rich-text__section-title--h1')) return 1
  if (summary.classList.contains('rich-text__section-title--h2')) return 2
  if (summary.classList.contains('rich-text__section-title--h3')) return 3
  return null
}

function getSectionHeadingLevel(element: Element): number | null {
  if (isHeading(element)) {
    return headingLevel(element.tagName)
  }

  if (
    element instanceof HTMLElement &&
    element.classList.contains('rich-text__section')
  ) {
    const summary = element.querySelector('summary')
    if (summary) return sectionTitleLevel(summary)
  }

  return null
}

function isSectionBoundary(
  currentHeading: HTMLElement,
  sibling: Element,
): boolean {
  const siblingLevel = getSectionHeadingLevel(sibling)
  if (siblingLevel === null) return false
  return siblingLevel <= headingLevel(currentHeading.tagName)
}

/**
 * Wraps each heading and its following content (until the next heading of equal
 * or higher level) in a native <details> block for collapsible sections.
 */
export function wrapHeadingSections(container: HTMLElement): void {
  const headings = Array.from(container.querySelectorAll(HEADING_SELECTOR))

  for (let i = headings.length - 1; i >= 0; i--) {
    const heading = headings[i]
    if (!(heading instanceof HTMLElement)) continue

    const details = document.createElement('details')
    details.className = 'rich-text__section'
    details.open = true

    const summary = document.createElement('summary')
    summary.className = `rich-text__section-title rich-text__section-title--${heading.tagName.toLowerCase()}`
    summary.append(...Array.from(heading.childNodes))

    const body = document.createElement('div')
    body.className = 'rich-text__section-body'

    let sibling = heading.nextElementSibling
    while (sibling && !isSectionBoundary(heading, sibling)) {
      const next = sibling.nextElementSibling
      body.appendChild(sibling)
      sibling = next
    }

    details.append(summary)
    if (body.childNodes.length > 0) {
      details.append(body)
    }

    heading.replaceWith(details)
  }
}
