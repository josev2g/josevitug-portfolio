/* Hero scrub, smooth scroll, passages, section reveals. Core 3D lives in core3d.js. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 767px)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Make the AUTOMATE headline span ~90% of the viewport width.
  const headline = $('#headline');
  function fitHeadline() {
    headline.style.fontSize = '100px';
    const w = headline.getBoundingClientRect().width;
    headline.style.fontSize = (100 * innerWidth * 0.9 / w) + 'px';
  }
  fitHeadline();
  document.fonts.ready.then(fitHeadline);
  addEventListener('resize', fitHeadline);

  const nav = $('#nav');
  const setNavSolid = () => nav.classList.toggle('solid', scrollY > $('#hero').offsetHeight - innerHeight);

  // Upwork placeholder: keep the link inert until a real URL is set.
  $$('[data-placeholder]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  if (reduced || !window.gsap) {
    document.documentElement.classList.add('rm');
    const wrap = document.createElement('div');
    wrap.className = 'passages-static';
    $$('.passage').forEach(p => wrap.appendChild(p));
    $('#hero').after(wrap);
    addEventListener('scroll', setNavSolid, { passive: true });
    window.coreScroll = null; // core3d.js renders a static frame
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Smooth scroll with inertia that settles over ~1.5s; no snapping.
  const lenis = new Lenis({ lerp: 0.06, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.on('scroll', setNavSolid);

  $$('a[data-scroll]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.8 });
  }));

  // Hero video: load fully as a blob so seeking is instant, then scrub by scroll.
  const video = $('#heroVideo');
  const src = mobile ? 'assets/video/hero-orbit-540.mp4' : 'assets/video/hero-orbit-720.mp4';
  fetch(src).then(r => r.blob()).then(b => {
    video.src = URL.createObjectURL(b);
    video.load();
  }).catch(() => { video.src = src; });

  let targetTime = 0;
  const hero = $('#hero');
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: self => { targetTime = self.progress * (video.duration || 12); }
    }
  });

  // Video time follows the (already smoothed) scroll; only seek when it moved a frame.
  gsap.ticker.add(() => {
    if (video.readyState >= 2 && Math.abs(video.currentTime - targetTime) > 1 / 30) {
      video.currentTime = targetTime;
    }
  });

  // Header, headline, cutout and buttons fade and blur out as scrolling begins.
  tl.to(['#heroUi', '#headline', '#cutout'], { opacity: 0, filter: 'blur(14px)', y: -40, duration: 0.07 }, 0.005);
  tl.to(nav, { opacity: 0, filter: 'blur(8px)', duration: 0.05 }, 0.005);
  tl.to(nav, { opacity: 1, filter: 'blur(0px)', duration: 0.04 }, 0.96);

  // Passages: each fades in, holds while the camera pauses, fades out.
  $$('.passage').forEach(p => {
    const at = parseFloat(p.dataset.at), out = parseFloat(p.dataset.out);
    const dx = mobile ? 0 : (p.classList.contains('side-left') ? -40 : 40);
    tl.fromTo(p, { opacity: 0, x: dx, filter: 'blur(10px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.04 }, at)
      .to(p, { opacity: 0, x: -dx, filter: 'blur(10px)', duration: 0.04 }, out);
  });
  tl.to({}, { duration: 0.001 }, 1); // pin timeline length to 1 so `at` reads as hero progress

  // Section content reveals.
  $$('.block-inner > *').forEach(el => el.classList.add('reveal'));
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.06, ease: 'power3.out', overwrite: true })
  });

  // Hand scroll-driven state to the 3D core (read every frame in core3d.js).
  const side = s => (mobile ? 0 : (s === 'left' ? -0.27 : 0.27));
  const core = { x: side('left'), rotY: 0, rotX: 0.25, scale: 0.6, opacity: 0, pulse: 0 };
  window.coreScroll = core;
  // The core holds its side while a section is read and moves only in the gap between sections.
  const move = (trigger, start, end, vars) => gsap.to(core, {
    ...vars, ease: 'sine.inOut', immediateRender: false,
    scrollTrigger: { trigger, start, end, scrub: true }
  });
  move('#about', 'top bottom', 'top 30%', { opacity: mobile ? 0.35 : 1, scale: 1, rotY: 1.2 });          // enter with About
  move('#services', 'top 85%', 'top 25%', { x: side('right'), rotY: 3.6, rotX: -0.15, scale: 1.06 });  // to Services
  move('#work', 'top 85%', 'top 25%', { x: side('left'), rotY: 6.2, rotX: 0.3, scale: 0.95 });         // to Case Studies
  move('#contact', 'top bottom', 'top 55%', { scale: 0.4, opacity: 0, rotY: 7.4 });                      // out before CTA

  // Light paths pulse as each section's content enters.
  $$('.block').forEach(b => ScrollTrigger.create({
    trigger: b, start: 'top 60%', end: 'bottom 40%',
    onEnter: () => (core.pulse = 1), onEnterBack: () => (core.pulse = 1)
  }));
})();
