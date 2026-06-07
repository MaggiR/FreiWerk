# Fonts

FreiWerk uses **DejaVu Sans** (per FDP corporate design). The font is self-hosted
to avoid third-party requests.

Place the following files in this directory:

- `DejaVuSans.ttf`
- `DejaVuSans-Bold.ttf`

DejaVu Sans is released under a permissive license (a Bitstream Vera / public-domain
derivative). Download from <https://dejavu-fonts.github.io/>. The TTF files are used
directly via `@font-face` (`format('truetype')`).

If the files are missing, the CSS stack falls back to the system sans-serif, so the
app still renders correctly during development.
