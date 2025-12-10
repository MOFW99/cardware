(function(){
  const trackList = document.getElementById('trackList');
  const liveFrame = document.getElementById('liveFrame');
  const previewFrame = document.getElementById('previewFrame');
  const placeholder = document.getElementById('placeholder');
  const frameStack = document.getElementById('frameStack');
  const navTracce = document.getElementById('nav-tracce');
  const navAbout = document.getElementById('nav-about');
  const navHardware = document.getElementById('nav-hardware');
  const stage = document.getElementById('stage');

  function toSkinPath(rel){ return rel; }

  let selectedLi = null;
  let mobileSkinImg = null;
  let desktopSkinImg = null;
  const appAudio = document.getElementById('appAudio');

  function isMobile(){ return window.matchMedia && window.matchMedia('(max-width: 768px)').matches; }
  // playlist (panel) - same behavior on mobile and desktop
  const listEls = Array.from(trackList.querySelectorAll('li'));
  const playlist = listEls.map(li => ((li.getAttribute('data-audio') || '').replace(/^\.?\/*/,'')));
  let currentIndex = -1;
  function playFromIndex(idx){
    if (!appAudio || idx < 0 || idx >= playlist.length) return;
    currentIndex = idx;
    // aggiorna selezione panel
    const li = listEls[idx];
    if (li){
      if (selectedLi) selectedLi.classList.remove('active');
      selectedLi = li; selectedLi.classList.add('active');
      // aggiorna skin visiva in base al device
      const rel = li.getAttribute('data-skin');
      if (rel){
        if (isMobile()){
          // su mobile aggiorna PNG della skin attiva
          if (!mobileSkinImg) {
            mobileSkinImg = document.createElement('img');
            mobileSkinImg.id = 'mobileSkinImg';
            document.body.appendChild(mobileSkinImg);
          }
          const parts = (rel || '').split('/');
          const skinFolder = parts.length >= 2 ? parts[parts.length - 2] : '';
          const basePath = parts.slice(0, parts.length - 1).join('/');
          mobileSkinImg.src = `${basePath}/${skinFolder}.png`;
          if (liveFrame) liveFrame.style.display = 'none';
          if (previewFrame) previewFrame.style.display = 'none';
        } else {
          // su desktop mostra PNG -desktop della traccia corrente
          showDesktopSkin(rel);
        }
        hidePreview();
      }
    }
    // riproduci
    appAudio.src = playlist[idx];
    appAudio.muted = false;
    appAudio.volume = 1;
    appAudio.play().catch(()=>{});
  }
  if (appAudio){
    appAudio.addEventListener('ended', ()=>{ 
      if (currentIndex >= 0 && currentIndex < playlist.length - 1){
        playFromIndex(currentIndex + 1);
      }
    });
    appAudio.addEventListener('error', ()=>{ 
      // salta file problematico
      if (currentIndex >= 0 && currentIndex < playlist.length - 1){
        playFromIndex(currentIndex + 1);
      }
    });
  }
  function slugify(text){
    const base = (text || '').toLowerCase();
    const norm = base.normalize ? base.normalize('NFD').replace(/[\u0300-\u036f]/g,'') : base;
    return norm
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'');
  }
  // remove mobile-specific audio resolution: we use fixed playlist order
  function pauseIframeAudio(){
    try {
      const doc = liveFrame.contentDocument || liveFrame.contentWindow?.document;
      if (!doc) return;
      const a = doc.querySelector('audio');
      if (a) a.pause();
    } catch(_){}
  }

  function showPreview(li){
    const rel = li.getAttribute('data-skin'); if (!rel) return;
    // Desktop: mostra PNG -desktop invece della preview iframe
    if (!isMobile()) {
      showDesktopSkin(rel);
      return;
    }
    const url = toSkinPath(rel);
    if (previewFrame.src !== url) previewFrame.src = url;
    previewFrame.classList.add('active');
    placeholder.style.display = 'none';
    // Nascondi la skin live per mostrare solo l'anteprima
    liveFrame.classList.add('hidden');
  }

  function hidePreview(){ previewFrame.classList.remove('active'); }

  function showDesktopSkin(rel){
    if (!rel) return;
    const parts = (rel || '').split('/');
    const skinFolder = parts.length >= 2 ? parts[parts.length - 2] : '';
    const basePath = parts.slice(0, parts.length - 1).join('/');
    if (!desktopSkinImg) {
      desktopSkinImg = document.createElement('img');
      desktopSkinImg.id = 'desktopSkinImg';
      (stage || document.body).appendChild(desktopSkinImg);
    }
    desktopSkinImg.src = `${basePath}/${skinFolder}-desktop.png`;
    // Nascondi gli iframe quando mostriamo l'immagine desktop
    if (liveFrame) liveFrame.style.display = 'none';
    if (previewFrame) previewFrame.style.display = 'none';
  }

  async function select(li){
    const rel = li.getAttribute('data-skin'); if (!rel) return;
    const url = toSkinPath(rel);
    const folder = rel.split('/')[0];
    const explicitAudio = li.getAttribute('data-audio') || null; // not used with fixed playlist, kept for potential UI
    if (selectedLi) selectedLi.classList.remove('active');
    selectedLi = li; selectedLi.classList.add('active');
    // Mobile: mostra solo PNG della skin
    if (isMobile()) {
      if (!mobileSkinImg) {
        mobileSkinImg = document.createElement('img');
        mobileSkinImg.id = 'mobileSkinImg';
        document.body.appendChild(mobileSkinImg);
      }
      const parts = (rel || '').split('/');
      const skinFolder = parts.length >= 2 ? parts[parts.length - 2] : '';
      const basePath = parts.slice(0, parts.length - 1).join('/');
      mobileSkinImg.src = `${basePath}/${skinFolder}.png`;
      // assicurati che gli iframe siano nascosti su mobile
      if (liveFrame) liveFrame.style.display = 'none';
      if (previewFrame) previewFrame.style.display = 'none';
    } else {
      // Desktop: usa PNG -desktop
      showDesktopSkin(rel);
    }
    // Avvia playlist dal click corrente (sia mobile che desktop)
    pauseIframeAudio();
    const startIdx = listEls.indexOf(li);
    if (startIdx >= 0) playFromIndex(startIdx);
    // Nessuna interazione iframe: UI basata su PNG
    hidePreview();
  }

  // Fit frameStack to viewport (preserve 900x700 aspect)
  function fitToViewport(){
    if (!frameStack) return;
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const baseW = 900, baseH = 700;
    const mobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    const scale = mobile ? (vw / baseW) : Math.min(vw / baseW, vh / baseH);
    frameStack.style.transform = `scale(${scale})`;
    // Evita crop su mobile: imposta un'altezza del contenitore pari all'altezza scalata
    if (mobile) {
      frameStack.style.height = `${baseH * scale}px`;
    } else {
      frameStack.style.height = `${baseH}px`;
    }
  }
  window.addEventListener('resize', fitToViewport, { passive:true });
  fitToViewport();

  // Mobile thumbnails disabilitati: la skin sta dietro al panel e fissata in alto

  // Mobile: nascondi elementi non sostenibili (es. seek di MSN) all'interno della skin
  function sanitizeMobile(frame){
    if (!isMobile()) return;
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return;
      // MSN: rimuovi seek bar su mobile
      ['seekTrack','seekFront','seekThumb'].forEach(id=>{
        const el = doc.getElementById(id);
        if (el) el.style.display = 'none';
      });
    } catch(_){}
  }

  liveFrame.addEventListener('load', ()=> sanitizeMobile(liveFrame));
  previewFrame.addEventListener('load', ()=> sanitizeMobile(previewFrame));

  // Quando entri nell'area lista -> nascondi live
  trackList.addEventListener('mouseenter', ()=>{ liveFrame.classList.add('hidden'); }, true);
  // Hover su elemento: aggiorna preview
  trackList.addEventListener('mouseover', (e)=>{ const li = e.target.closest('li'); if (!li) return; showPreview(li); });
  // Uscita dall'area lista -> ripristina live
  trackList.addEventListener('mouseleave', ()=>{
    hidePreview();
    // su desktop ripristina la skin della traccia in riproduzione
    if (!isMobile()){
      if (currentIndex >= 0 && currentIndex < listEls.length){
        const currentLi = listEls[currentIndex];
        const rel = currentLi && currentLi.getAttribute('data-skin');
        if (rel) showDesktopSkin(rel);
      }
    } else {
      // su mobile ripristina visibilità coerente (iframe non usati)
      liveFrame.classList.remove('hidden');
    }
  });
  trackList.addEventListener('click', (e)=>{ const li = e.target.closest('li'); if (!li) return; select(li); });

  // Set background from wp-content/background with best-effort formats
  (function setBg(){
    const bases = ['../wp-content/background', './wp-content/background'];
    const exts  = ['.jpg', '.jpeg', '.png', '.webp'];
    (async function trySet(){
      for (const b of bases){
        for (const ext of exts){
          const url = b + ext;
          try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); if (r.ok) { document.body.style.backgroundImage = `url('${url}')`; return; } } catch(_){ }
        }

      }
    })();
  })();

  // Carica la prima skin senza selezionarla (niente stato "blu" finché non clicchi)
  function loadInitialSkin(li){
    if (!li) return;
    const rel = li.getAttribute('data-skin'); if (!rel) return;
    const url = toSkinPath(rel);
    const folder = rel.split('/')[0];
    // Mobile: mostra PNG ma non attiva audio né selezione
    if (isMobile()) {
      if (!mobileSkinImg) {
        mobileSkinImg = document.createElement('img');
        mobileSkinImg.id = 'mobileSkinImg';
        document.body.appendChild(mobileSkinImg);
      }
      const parts = (rel || '').split('/');
      const skinFolder = parts.length >= 2 ? parts[parts.length - 2] : '';
      const basePath = parts.slice(0, parts.length - 1).join('/');
      mobileSkinImg.src = `${basePath}/${skinFolder}.png`;
      if (liveFrame) liveFrame.style.display = 'none';
      if (previewFrame) previewFrame.style.display = 'none';
    } else {
      // Desktop: mostra PNG -desktop senza selezione
      showDesktopSkin(rel);
    }
    hidePreview();
  }
  const first = trackList.querySelector('li');
  if (first) loadInitialSkin(first);

  // Nav handlers
  if (navTracce){
    navTracce.addEventListener('click', (e)=>{ e.preventDefault(); document.getElementById('trackList').scrollIntoView({ behavior:'smooth', block:'nearest' }); });
  }
  if (navAbout){
    navAbout.addEventListener('click', (e)=>{ /* navigate to about */ });
  }
  if (navHardware){
    navHardware.addEventListener('click', (e)=>{ /* default href to index.html */ });
  }
})();




