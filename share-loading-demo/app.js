(function () {
  // Timings from the brief
  var PAGE_LOADING_MS = 2000;  // tap share → global loading 2s → share sheet
  var MEDIA_LOADING_MS = 1500; // sheet open → media loading 1.5s → long image

  var A = './assets/';

  // ---------- Long image content (Share Poster / Itinerary) ----------
  // Route steps: { t: text, hotel: bool }. Steps after the first get the one-way arrow.
  var DAYS = [
    { title: 'Thu, Jul 30 · Arrive in London and settle in Bloomsbury',
      route: [{ t: 'Numa London Bloomsbury', hotel: true }] },
    { title: 'Fri, Jul 31 · Explore British Museum, National Gallery, and West End Theatre',
      route: [{ t: 'The British Museum' }, { t: 'The National Gallery' }, { t: 'West End theatre' }, { t: 'Stay in London', hotel: true }] },
    { title: 'Sat, Aug 1 · Discover Tower of London, Tower Bridge, Thames River, and London Eye',
      route: [{ t: 'Tower of London' }, { t: 'Tower Bridge' }, { t: 'Thames River Sightseeing' }, { t: 'London Eye' }, { t: 'Stay in London', hotel: true }] },
    { title: 'Sun, Aug 2 · Visit Kensington Palace, Kyoto Garden, and travel to Edinburgh',
      route: [{ t: 'Kensington Palace' }, { t: 'Kyoto Garden' }, { t: 'London – Edinburgh' }, { t: 'Stay in Edinburgh', hotel: true }] },
    { title: 'Mon, Aug 3 · Explore Edinburgh Old Town, Palace of Holyroodhouse, and Arthur’s Seat',
      route: [{ t: 'Edinburgh Old Town' }, { t: 'Palace of Holyroodhouse' }, { t: 'Arthur’s Seat' }, { t: 'Stay in Edinburgh', hotel: true }] },
    { title: 'Tue, Aug 4 · Art and city stroll: National Galleries, Princes Street, Gardens, and Calton Hill',
      route: [{ t: 'National Galleries of Scotland' }, { t: 'Princes Street' }, { t: 'Princes Street Gardens' }, { t: 'Calton Hill' }, { t: 'Stay in Edinburgh', hotel: true }] },
    { title: 'Wed, Aug 5 · Depart Edinburgh for Shanghai', route: [] }
  ];

  var CHANNELS = [
    { label: 'WhatsApp', icon: 'logo-whatsapp.svg' },
    { label: 'Instagram', icon: 'logo-instagram.svg' },
    { label: 'Telegram', icon: 'logo-telegram.svg' },
    { label: 'Snapchat', icon: 'logo-snapchat.svg' },
    { label: 'Facebook Messenger', icon: 'logo-messenger.svg' },
    { label: 'KakaoTalk', icon: 'logo-kakaotalk.svg' }
  ];

  var ACTIONS = [
    { label: 'Share as image', icon: 'icon-image.svg' },
    { label: 'Copy link', icon: 'icon-link.svg', toast: 'Link copied' },
    { label: 'Edit with friends', icon: 'icon-user-add.svg' },
    { label: 'Message', icon: 'icon-message.svg' },
    { label: 'Email', icon: 'icon-email.svg' },
    { label: 'More', icon: 'icon-more.svg' }
  ];

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function img(src, w, h) {
    var i = new Image(w, h);
    i.src = A + src;
    i.alt = '';
    return i;
  }

  // Render days
  var daysEl = document.getElementById('days');
  DAYS.forEach(function (d) {
    var li = el('li', 'day');
    li.appendChild(img('bullet.svg', 6, 20)).className = 'day__bullet';
    var content = el('div', 'day__content');
    content.appendChild(el('p', 'day__title')).textContent = d.title;
    if (d.route.length) {
      var route = el('div', 'route');
      d.route.forEach(function (s, i) {
        var step = el('span', 'route__step');
        if (i > 0) step.appendChild(img('icon-arrow.svg', 12, 12));
        if (s.hotel) {
          var badge = el('span', 'hotel-badge');
          badge.appendChild(img('icon-hotel-bed.svg', 8, 8));
          step.appendChild(badge);
        }
        step.appendChild(document.createTextNode(s.t));
        route.appendChild(step);
      });
      content.appendChild(route);
    }
    li.appendChild(content);
    daysEl.appendChild(li);
  });

  // Render share rows
  function renderRow(rowEl, items, kind) {
    items.forEach(function (it) {
      var b = el('button', 'item item--' + kind);
      b.type = 'button';
      var icon = el('span', 'item__icon');
      icon.appendChild(kind === 'channel' ? img(it.icon, 56, 56) : img(it.icon, 28, 28));
      b.appendChild(icon);
      b.appendChild(el('span', 'item__label')).textContent = it.label;
      b.addEventListener('click', function () { toast(it.toast || it.label); });
      rowEl.appendChild(b);
    });
  }
  renderRow(document.getElementById('channels'), CHANNELS, 'channel');
  renderRow(document.getElementById('actions'), ACTIONS, 'action');

  // ---------- Flow ----------
  var device = document.getElementById('device');
  var loading = document.getElementById('globalLoading');
  var share = document.getElementById('share');
  var media = document.getElementById('media');
  var scroller = document.getElementById('mediaScroll');
  var timers = [];

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function openShare() {
    if (device.classList.contains('is-busy')) return;
    device.classList.add('is-busy');
    loading.classList.add('is-open');
    later(function () {
      loading.classList.remove('is-open');
      scroller.scrollTop = 0;
      media.classList.remove('is-ready', 'is-scrolled-end');
      share.classList.add('is-open');
      later(function () { media.classList.add('is-ready'); }, MEDIA_LOADING_MS);
    }, PAGE_LOADING_MS);
  }

  function reset() {
    clearTimers();
    loading.classList.remove('is-open');
    share.classList.remove('is-open');
    later(function () {
      media.classList.remove('is-ready', 'is-scrolled-end');
      device.classList.remove('is-busy');
    }, 300);
  }

  document.getElementById('shareBtn').addEventListener('click', openShare);
  document.getElementById('loadingClose').addEventListener('click', reset);
  document.getElementById('shareClose').addEventListener('click', reset);

  scroller.addEventListener('scroll', function () {
    var end = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 24;
    media.classList.toggle('is-scrolled-end', end);
  });

  var toastEl = document.getElementById('toast');
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, 1200);
  }

  // ---------- Fit the 390×844 artboard into the viewport ----------
  function fit() {
    var s = Math.min(window.innerWidth / 390, window.innerHeight / 844);
    device.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();
})();
