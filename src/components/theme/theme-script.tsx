/** Applies the saved or system theme before first paint to avoid a flash. */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=t==='dark'||(t!=='light'&&d);document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
