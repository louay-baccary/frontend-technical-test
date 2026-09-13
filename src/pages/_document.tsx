import { Html, Head, Main, NextScript } from 'next/document'

// Applies a stored theme preference before first paint, so a reload with
// "dark" saved doesn't flash light mode while React hydrates and useTheme's
// own effect runs. Keep the storage key in sync with src/hooks/useTheme.ts.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = window.localStorage.getItem('theme-preference');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (e) {}
})();
`

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
