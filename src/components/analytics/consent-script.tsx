/**
 * Runs in the head before anything paints. Mirrors readConsent() and consentRequired(): when the visitor is in a
 * consent region and has not chosen, the html element is marked and the server-rendered banner shows at first paint
 * instead of after hydration, where it used to become the page's largest paint several seconds in.
 */
export function ConsentScript() {
  const code = `(function(){try{var c=JSON.parse(localStorage.getItem('cookie-consent')||'null');var ok=!!(c&&c.at&&typeof c.marketing==='boolean'&&Date.now()-new Date(c.at).getTime()<365*864e5);if(!ok&&!/(?:^|; )cr=row(?:;|$)/.test(document.cookie)){document.documentElement.setAttribute('data-consent','pending')}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
