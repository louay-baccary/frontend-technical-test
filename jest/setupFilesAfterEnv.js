import "@testing-library/jest-dom";

// jsdom doesn't implement matchMedia - every real browser does. Mocked here
// once, globally, rather than per-test, since anything using
// prefers-color-scheme (e.g. useTheme) would otherwise throw in any test
// that renders it, whether or not that test cares about theming.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}