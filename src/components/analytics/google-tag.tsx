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
gtag('js',new Date());gtag('config',${JSON.stringify(ID)},{allow_enhanced_conversions:true});
(function(){var go=function(){var s=document.createElement('script');s.async=true;s.src=${JSON.stringify(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`)};document.head.appendChild(s)};var idle=function(){('requestIdleCallback' in window)?requestIdleCallback(go,{timeout:2000}):setTimeout(go,1)};if(document.readyState==='complete'){idle()}else{window.addEventListener('load',idle,{once:true})}})();`;
  // Calls made before the library arrives queue in the dataLayer and are delivered when it loads, so nothing is
  // lost by letting the page paint first. Conversions happen on later clicks and connects anyway.
  return <script dangerouslySetInnerHTML={{ __html: inline }} />;
}
