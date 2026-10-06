import Script from "next/script";

const GTM = process.env.NEXT_PUBLIC_GTM_ID ?? "";
const GA = process.env.NEXT_PUBLIC_GA_ID ?? "";

/**
 * Carrega o Google Tag Manager (GTM-XXXX) ou, se não houver, o Google Analytics 4 (G-XXXX).
 * Sem nenhuma das duas variáveis, não carrega nada. Entra depois que a página já está pronta (lazyOnload),
 * para não pesar no celular. Anúncios e personalização ficam desligados.
 */
export default function Analytics() {
  if (/^GTM-[A-Z0-9]{4,12}$/.test(GTM)) {
    return (
      <Script id="gtm" strategy="lazyOnload">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=document.getElementsByTagName('script')[0],j=document.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id=${GTM}';f.parentNode.insertBefore(j,f);`}
      </Script>
    );
  }
  if (/^G-[A-Z0-9]{6,14}$/.test(GA)) {
    return (
      <>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="lazyOnload" />
        <Script id="ga4" strategy="lazyOnload">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
gtag('js',new Date());
gtag('config','${GA}',{allow_google_signals:false,allow_ad_personalization_signals:false});`}
        </Script>
      </>
    );
  }
  return null;
}
