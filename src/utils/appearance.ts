export function changeAppearance(appearance?: string): void {
  if (appearance === 'auto' || appearance === undefined) {
    appearance = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  document.documentElement.setAttribute('data-theme', appearance);
  document.documentElement.style.colorScheme = appearance;
  document.body.setAttribute('data-theme', appearance);
  document.body.style.colorScheme = appearance;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', appearance === 'dark' ? '#222' : '#fff');
}
