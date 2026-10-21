/**
 * The Google Ads tag (gtag.js) on every page, in Google's consent mode. In the EEA, the UK and Switzerland it starts
 * with every storage type denied and sets nothing until the viewer picks "Accept all"; elsewhere it starts granted
 * unless the viewer chose "Only necessary". The middleware's region cookie decides which. A stored choice always
 * wins. Off entirely until NEXT_PUBLIC_GOOGLE_ADS_ID is set, so previews never report.
 */
const ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

export function GoogleTag() {
  if (!ID) return null;
  const inline = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
(function(){var g=null;try{var c=JSON.parse(localStorage.getItem('cookie-consent')||'null');if(c&&typeof c.marketing==='boolean')g=c.marketing}catch(e){}
if(g===null){g=/(?:^|; )cr=row(?:;|$)/.test(document.cookie)}
var s=g?'granted':'denied';gtag('consent','default',{ad_storage:s,ad_user_data:s,ad_personalization:s,analytics_storage:s,wait_for_update:g?0:500});})();
gtag('js',new Date());gtag('config',${JSON.stringify(ID)},{allow_enhanced_conversions:true});`;
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`} />
      <script dangerouslySetInnerHTML={{ __html: inline }} />
    </>
  );
}
