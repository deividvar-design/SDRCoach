/**
 * The Google Ads tag (gtag.js) on every page, in Google's consent mode. It loads before any choice is made but
 * starts with every storage type denied, so it sets no cookies and sends only cookieless pings until the viewer
 * picks "Accept all" on the banner. A stored "Accept all" is applied before the first hit so returning viewers are
 * measured from the first page. Off entirely until NEXT_PUBLIC_GOOGLE_ADS_ID is set, so previews never report.
 */
const ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

export function GoogleTag() {
  if (!ID) return null;
  const inline = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{var c=JSON.parse(localStorage.getItem('cookie-consent')||'null');if(c&&c.marketing===true){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'})}}catch(e){}
gtag('js',new Date());gtag('config',${JSON.stringify(ID)});`;
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`} />
      <script dangerouslySetInnerHTML={{ __html: inline }} />
    </>
  );
}
