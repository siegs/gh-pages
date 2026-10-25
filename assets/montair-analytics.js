/* First-party, anonymous usage counts. No names, form values, IPs or precise locations are sent. */
(() => {
  'use strict';
  if (window.__montairAnalytics || !['bp5030.org','www.bp5030.org'].includes(location.hostname)) return;
  window.__montairAnalytics = true;
  const query = new URLSearchParams(location.search);
  const test = query.get('analytics_test') === '1';
  if (query.get('analytics') === 'off' || navigator.globalPrivacyControl || navigator.doNotTrack === '1' || (navigator.webdriver && !test)) return;
  const endpoint = 'https://bp5030-collector.siegs.chatgpt.site/api/collect';
  const read = (key) => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const write = (key,value) => { try { localStorage.setItem(key,value); } catch (_) {} };
  const uuid = () => crypto.randomUUID();
  let visitor = read('bp5030.visitor');
  if (!visitor || !/^[a-f0-9-]{36}$/i.test(visitor)) { visitor = uuid(); write('bp5030.visitor',visitor); }
  let session;
  try { session = JSON.parse(sessionStorage.getItem('bp5030.session') || 'null'); } catch (_) {}
  if (!session || Date.now() - session.at > 1800000) session = {id:uuid(),at:Date.now(),source:''};
  let referrer = '';
  try { referrer = document.referrer ? new URL(document.referrer).hostname : ''; } catch (_) {}
  if (referrer === location.hostname) referrer = '';
  const source = query.get('utm_source') === 'qr' ? 'qr' : (session.source || (referrer ? 'referral' : 'direct'));
  session.source = source; session.at = Date.now();
  try { sessionStorage.setItem('bp5030.session',JSON.stringify(session)); } catch (_) {}
  const device = /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  let queue;
  try { queue = JSON.parse(read('bp5030.queue') || '[]'); } catch (_) { queue = []; }
  if (!Array.isArray(queue)) queue = [];
  let sending = false;
  const persist = () => write('bp5030.queue',JSON.stringify(queue.slice(-50)));
  async function flush() {
    if (sending || !queue.length) return;
    sending = true;
    try {
      while (queue.length) {
        const response = await fetch(endpoint,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'text/plain'},body:JSON.stringify(queue[0]),keepalive:true,referrerPolicy:'no-referrer'});
        if (!response.ok) break;
        queue.shift(); persist();
      }
    } catch (_) {} finally { sending = false; }
  }
  function track(event,target='montair') {
    queue.push({id:uuid(),visitor,session:session.id,event,source,device,target,referrer,test});
    queue = queue.slice(-50); persist(); void flush();
  }
  let started = false;
  function start() {
    if (started || document.visibilityState === 'hidden' || document.prerendering) return;
    started = true; track('page_view');
    let visibleSeconds = 0;
    const engaged = setInterval(() => { if (document.visibilityState === 'visible' && ++visibleSeconds >= 20) { track('engaged','20s'); clearInterval(engaged); } },1000);
  }
  start();
  document.addEventListener('visibilitychange',() => { start(); if (document.visibilityState === 'hidden') void flush(); });
  document.addEventListener('prerenderingchange',start,{once:true});
  document.addEventListener('click',(event) => {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href,location.href);
    let target = '';
    if (url.origin === location.origin) {
      if (url.pathname.startsWith('/follow/montair') || url.hash === '#follow') target = 'updates';
      else if (url.hash === '#meals') target = 'school_meals';
      else if (['#commitments','#questions'].includes(url.hash)) target = 'wellness_policy';
      else if (url.hash === '#guidance') target = 'nutrition_guidance';
      else if (url.hash === '#sources') target = 'sources';
    } else if (url.protocol === 'https:') target = 'resource:' + url.hostname.slice(0,80);
    if (target) track('click',target);
  },{capture:true});
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => { for (const entry of entries) if (entry.isIntersecting) { track('section_view',entry.target.id); observer.unobserve(entry.target); } },{threshold:0.2});
    for (const id of ['meals','commitments','guidance','questions','follow','sources']) { const section = document.getElementById(id); if (section) observer.observe(section); }
  }
  setInterval(flush,15000);
  window.addEventListener('online',flush);
  window.addEventListener('pagehide',flush);
})();
