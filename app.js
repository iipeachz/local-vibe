(function () {
  "use strict";

  const FEE = 0.10;                 // platform fee taken from the host's payout
  const STORE = "localvibe.v1";    // localStorage key (demo: data stays in this browser)
  const POS = ["0% 0%", "100% 0%", "0% 100%", "100% 100%"];          // square boxes
  const POS_WIDE = ["0% 15%", "100% 15%", "0% 85%", "100% 85%"];    // landscape boxes: centre the quarter, skip the title text
  const CATS = [["All", "apps"], ["Pottery", "emoji_food_beverage"], ["Painting", "palette"], ["Textiles", "checkroom"], ["Jewelry", "diamond"], ["Cooking", "restaurant"], ["Other", "interests"]];
  const CAT_ICON = Object.fromEntries(CATS);
  const COVER_COLORS = [
    ["linear-gradient(135deg,#0B2E6F,#1B5FB8)", "#D6E6F8"],
    ["linear-gradient(135deg,#1D5E22,#3E9A45)", "#DDF0D3"],
    ["linear-gradient(135deg,#9E3E12,#E0773A)", "#FBE3D6"],
    ["linear-gradient(135deg,#5E2A82,#A35BC9)", "#EFDDF6"],
    ["linear-gradient(135deg,#8A5A06,#D9A12B)", "#FBEFD0"],
    ["linear-gradient(135deg,#1C232D,#46566A)", "#E3E7EC"]
  ];

  /* ---------- state ---------- */
  const view = document.getElementById("view");
  const S = { cat: "All", q: "", day: "", studio: "", seats: {}, book: null, confirm: null, form: null, formErr: "" };
  let DB = { bookings: [], hosted: { studio: "", workshops: [] } };
  try { const d = JSON.parse(localStorage.getItem(STORE) || "null"); if (d && d.bookings) DB = { bookings: d.bookings, hosted: d.hosted || DB.hosted }; } catch (e) {}
  function save() { try { localStorage.setItem(STORE, JSON.stringify(DB)); return true; } catch (e) { toast("Couldn't save in this browser. Check that site storage is allowed."); return false; } }

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const baht = n => "฿" + Math.round(n).toLocaleString("en-US");
  const pad2 = n => String(n).padStart(2, "0");
  const ymd = d => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  const today = ymd(new Date());
  const parseDay = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
  const fmtDay = s => parseDay(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const fmtLong = s => parseDay(s).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const addMin = (hhmm, m) => { const [h, mi] = String(hhmm).split(":").map(Number); const t = h * 60 + mi + Math.round(m); return pad2(Math.floor(t / 60) % 24) + ":" + pad2(t % 60); };
  const rid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function all() {
    const hosted = (DB.hosted.workshops || []).map(w => Object.assign({}, w, { studio: DB.hosted.studio || "Your studio", mine: true }));
    return window.SEED_WORKSHOPS.concat(hosted).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }
  const find = id => all().find(w => w.id === id);
  const taken = id => DB.bookings.filter(b => b.wid === id).reduce((a, b) => a + b.seats, 0);
  const left = w => Math.max(0, w.seats - taken(w.id));

  function cover(w, cls, extra) {
    const c = w.cover || {};
    if (c.img) return `<div class="cv sprite ${cls}" role="img" aria-label="${esc(w.title)} at ${esc(w.studio)}" style="background-image:url('${esc(c.img)}');background-position:${esc(c.pos || (/\b(wide|big)\b/.test(cls) ? POS_WIDE : POS)[c.q || 0])}">${extra || ""}</div>`;
    if (c.url) return `<div class="cv photo ${cls}" role="img" aria-label="${esc(w.title)}" style="background-image:url('${esc(c.url)}')">${extra || ""}</div>`;
    const p = COVER_COLORS[c.color || 0] || COVER_COLORS[0];
    return `<div class="cv ${cls}" role="img" aria-label="${esc(w.title)}" style="background:${p[0]};color:${p[1]}"><span class="ms f">${CAT_ICON[w.cat] || "interests"}</span>${extra || ""}</div>`;
  }
  function seatsLabel(w) {
    const l = left(w);
    if (!l) return `<span class="full">Full</span>`;
    if (l <= 3) return `<span class="seats-low">${l} seat${l > 1 ? "s" : ""} left</span>`;
    return `<span class="mu">${l} of ${w.seats} seats left</span>`;
  }
  let toastT;
  function toast(m) { const t = document.getElementById("toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }
  const go = h => { if (location.hash === h) render(); else location.hash = h; };

  /* ---------- views ---------- */
  function vExplore() {
    const q = S.q.trim().toLowerCase();
    const list = all().filter(w => w.date >= today && (S.cat === "All" || w.cat === S.cat) && (!S.day || w.date === S.day) && (!S.studio || w.studio === S.studio) &&
      (!q || (w.title + " " + w.studio + " " + w.cat + " " + (w.place || "")).toLowerCase().includes(q)));
    const studios = [...new Map(all().map(w => [w.studio, w])).values()];
    return `
    <section class="hero"><div class="wrap">
      <h1 class="h1">Make something with local makers</h1>
      <p>Pottery, indigo dyeing, macrame and more. Pick a class, book your seats and pay online.</p>
    </div></section>
    <div class="wrap">
      <div class="searchbox">
        <div class="sfield"><span class="ms">search</span><label for="q">What do you want to make?<input id="q" value="${esc(S.q)}" placeholder="Mug, indigo, macrame, studio name…" autocomplete="off"></label></div>
        <div class="sfield"><span class="ms">calendar_month</span><label for="day">Date<input id="day" type="date" min="${today}" value="${esc(S.day)}"></label></div>
        <button class="btn" data-a="scroll"><span class="ms">search</span>Search</button>
      </div>
    </div>
    <section class="section"><div class="wrap">
      <div class="bar-row"><h2 class="h2">Studios</h2>${S.studio ? `<button class="chip" data-a="studio" data-v=""><span class="ms">close</span>Show all studios</button>` : ""}</div>
      <div class="studios">${studios.map(w => `<button class="studio ${S.studio === w.studio ? "on" : ""}" data-a="studio" data-v="${esc(w.studio)}">${cover(w, "")}<div><div class="h3" style="font-size:15px">${esc(w.studio)}</div><div class="mu">${all().filter(x => x.studio === w.studio && x.date >= today).length} upcoming classes</div></div></button>`).join("")}</div>
    </div></section>
    <section class="section" id="results" style="padding-top:4px"><div class="wrap">
      <div class="bar-row"><h2 class="h2">Upcoming workshops</h2><span class="mu">${list.length} found</span></div>
      <div class="chips" style="margin-bottom:18px">${CATS.map(([c, i]) => `<button class="chip ${S.cat === c ? "on" : ""}" data-a="cat" data-v="${c}"><span class="ms">${i}</span>${c}</button>`).join("")}</div>
      ${list.length ? `<div class="grid">${list.map(card).join("")}</div>` : `<div class="empty"><span class="ms">travel_explore</span><div class="h3">No workshops match</div><div class="mu">Try another date or category.</div><button class="btn ghost" data-a="clear">Clear filters</button></div>`}
    </div></section>`;
  }
  function card(w) {
    return `<a class="wcard" href="#w-${esc(w.id)}">
      ${cover(w, "wide",`<span class="badge">${esc(w.cat)}</span><span class="studio-pill">${esc(w.studio)}</span>`)}
      <div class="body">
        <div class="when">${fmtDay(w.date)} · ${esc(w.time)}</div>
        <div class="wtitle">${esc(w.title)}</div>
        <div class="mu">${esc(w.hrs)} hrs · ${esc(w.place || w.studio)}</div>
        <div class="wfoot">${seatsLabel(w)}<span class="price">${baht(w.price)}<small> /seat</small></span></div>
      </div></a>`;
  }
  function vDetail(id) {
    const w = find(id);
    if (!w) return notFound();
    const l = left(w), t = taken(w.id);
    const n = Math.min(S.seats[id] || 1, Math.max(1, l));
    S.seats[id] = n;
    return `<div class="wrap">
      <a class="back" href="#"><span class="ms">chevron_left</span>All workshops</a>
      <div class="detail">
        <div>
          ${cover(w, "big", `<span class="badge">${esc(w.cat)}</span>`)}
          <div style="margin-top:20px"><div class="mu" style="font-weight:700">${esc(w.studio)}</div><h1 class="h1">${esc(w.title)}</h1></div>
          <div class="facts">
            <div class="fact"><span class="ms">calendar_month</span><div><b>${fmtDay(w.date)}</b><span>${esc(w.time)}–${addMin(w.time, w.hrs * 60)}</span></div></div>
            <div class="fact"><span class="ms">schedule</span><div><b>${esc(w.hrs)} hours</b><span>Hands-on class</span></div></div>
            <div class="fact"><span class="ms">location_on</span><div><b>${esc(w.place || w.studio)}</b><span>Address in your ticket</span></div></div>
          </div>
          <h2 class="h2" style="font-size:19px;margin-bottom:6px">About this workshop</h2>
          <div class="prose">${esc(w.desc)}</div>
          <div class="checks">
            <div class="ok"><span class="ms">check_circle</span>All materials included</div>
            <div class="ok"><span class="ms">event_available</span>Free cancellation up to 24 hours before</div>
            <div class="ok"><span class="ms">verified_user</span>Paid through Local Vibe, released to the host after the class</div>
          </div>
        </div>
        <aside class="panel" aria-label="Book this workshop">
          <div class="panel-top"><div class="price" style="font-size:26px">${baht(w.price)}<small> /seat</small></div><div class="mu">${fmtLong(w.date)} · ${esc(w.time)}</div></div>
          <div class="panel-body">
            <div><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="mu">${t} booked</span>${seatsLabel(w)}</div><div class="meter"><i style="width:${Math.min(100, t / w.seats * 100)}%"></i></div></div>
            ${w.mine ? `<a class="btn ghost wide" href="#manage-${esc(w.id)}"><span class="ms">tune</span>You're hosting this · Manage</a>` : l ? `
            <div style="display:flex;justify-content:space-between;align-items:center"><b>Seats</b><div class="stepper"><button data-a="seat" data-v="-1" aria-label="Fewer seats"><span class="ms">remove</span></button><b>${n}</b><button data-a="seat" data-v="1" aria-label="More seats"><span class="ms">add</span></button></div></div>
            <div class="lines"><div class="row"><span>${n} × ${baht(w.price)}</span><span>${baht(n * w.price)}</span></div><div class="row"><span>Booking fee</span><span>Free</span></div><div class="row tot"><span>Total</span><span>${baht(n * w.price)}</span></div></div>
            <button class="btn wide" data-a="startbook" data-v="${esc(w.id)}"><span class="ms">event_seat</span>Book ${n} seat${n > 1 ? "s" : ""}</button>` :
            `<div class="btn wide" aria-disabled="true">This workshop is full</div>`}
          </div>
        </aside>
      </div></div>`;
  }
  function vBook(id) {
    const w = find(id); if (!w) return notFound();
    if (!S.book || S.book.wid !== id) S.book = { wid: id, seats: S.seats[id] || 1, step: 1, name: "", email: "", phone: "", note: "", pay: "card", err: "" };
    const b = S.book; b.seats = Math.min(b.seats, Math.max(1, left(w)));
    const total = b.seats * w.price;
    const steps = `<div class="steps"><span class="done"><span class="ms">check</span>Seats</span><span class="${b.step === 1 ? "on" : "done"}">${b.step > 1 ? '<span class="ms">check</span>' : "2 ·"} Your details</span><span class="${b.step === 2 ? "on" : ""}">3 · Payment</span><span>4 · Ticket</span></div>`;
    const summary = `<aside class="panel" aria-label="Order summary"><div class="panel-top"><div class="mini">${cover(w, "")}<div><div class="mu" style="font-weight:700">${esc(w.studio)}</div><div class="h3">${esc(w.title)}</div><div class="mu">${fmtDay(w.date)} · ${esc(w.time)}</div></div></div></div>
      <div class="panel-body"><div style="display:flex;justify-content:space-between;align-items:center"><b>Seats</b><div class="stepper"><button data-a="bseat" data-v="-1" aria-label="Fewer seats"><span class="ms">remove</span></button><b>${b.seats}</b><button data-a="bseat" data-v="1" aria-label="More seats"><span class="ms">add</span></button></div></div>
      <div class="lines"><div class="row"><span>${b.seats} × ${baht(w.price)}</span><span>${baht(total)}</span></div><div class="row"><span>Booking fee</span><span>Free</span></div><div class="row tot"><span>Total</span><span>${baht(total)}</span></div></div>
      <div class="note"><span class="ms">verified_user</span><span>Your payment is held until the workshop ends. Cancel up to 24 hours before for a full refund.</span></div></div></aside>`;
    const details = `<div class="card form"><h2 class="h2" style="font-size:20px">Who's coming?</h2>
      <label for="b-name">Full name<input id="b-name" data-b="name" value="${esc(b.name)}" autocomplete="name" placeholder="Alex Morgan"></label>
      <div class="two"><label for="b-email">Email<input id="b-email" data-b="email" type="email" value="${esc(b.email)}" autocomplete="email" placeholder="alex@example.com"><span class="hint">We send your ticket here.</span></label>
      <label for="b-phone">Phone<input id="b-phone" data-b="phone" type="tel" value="${esc(b.phone)}" autocomplete="tel" placeholder="+66 81 234 5678"><span class="hint">For changes on the day.</span></label></div>
      <label for="b-note">Note for the host <span class="hint">Optional: allergies, kids joining, language</span><textarea id="b-note" data-b="note" placeholder="Two of us are beginners.">${esc(b.note)}</textarea></label>
      ${b.err ? `<div class="err" role="alert">${esc(b.err)}</div>` : ""}
      <button class="btn" data-a="tostep2">Continue to payment<span class="ms">arrow_forward</span></button></div>`;
    const payment = `<div class="card form"><h2 class="h2" style="font-size:20px">How would you like to pay?</h2>
      <div class="pay">
        <button class="payopt ${b.pay === "card" ? "on" : ""}" data-a="paym" data-v="card"><span class="dot"></span><span style="flex:1"><b>Card</b><br><span class="mu">Visa, Mastercard, JCB</span></span><span class="ms">credit_card</span></button>
        <button class="payopt ${b.pay === "promptpay" ? "on" : ""}" data-a="paym" data-v="promptpay"><span class="dot"></span><span style="flex:1"><b>PromptPay</b><br><span class="mu">Scan a QR code</span></span><span class="ms">qr_code_2</span></button>
      </div>
      <div class="mu">Booking for <b>${esc(b.name)}</b> · ${esc(b.email)} · ${esc(b.phone)} <button data-a="tostep1" style="color:var(--brand);font-weight:700">Edit</button></div>
      <div class="mu">Demo: no payment is taken. On the real site this step opens the payment provider.</div>
      <button class="btn" data-a="confirmbook"><span class="ms">lock</span>Pay ${baht(total)} and book</button></div>`;
    return `<div class="wrap"><a class="back" href="#w-${esc(id)}"><span class="ms">chevron_left</span>Back to workshop</a><h1 class="h1" style="font-size:30px">Book your seats</h1>${steps}
      <div class="book"><div>${b.step === 1 ? details : payment}</div>${summary}</div></div>`;
  }
  function vTicket(bid) {
    const b = DB.bookings.find(x => x.id === bid); const w = b && find(b.wid);
    if (!b || !w) return notFound("This booking isn't in this browser.");
    const confirming = S.confirm === "cancel:" + bid;
    return `<div class="wrap"><div class="ticket">
      <div class="ticket-top"><div style="display:flex;gap:8px;align-items:center;font-weight:700"><span class="ms f">check_circle</span>Booking confirmed</div><div class="h2" style="color:#fff;margin-top:6px">${esc(w.title)}</div><div style="opacity:.9">${esc(w.studio)}</div></div>
      ${cover(w, "wide")}
      <div class="ticket-body">
        <div><span>Date</span><b>${fmtDay(w.date)}</b></div><div><span>Time</span><b>${esc(w.time)}–${addMin(w.time, w.hrs * 60)}</b></div>
        <div><span>Name</span><b>${esc(b.name)}</b></div><div><span>Seats</span><b>${b.seats}</b></div>
        <div><span>Where</span><b>${esc(w.place || w.studio)}</b></div><div><span>Paid</span><b>${baht(b.total)} · ${b.pay === "promptpay" ? "PromptPay" : "Card"}</b></div>
      </div>
      <div class="cut"></div>
      <div style="padding:18px 24px;text-align:center"><div class="mu">Show this code at the door</div><div class="code">${esc(b.code)}</div></div>
      <div style="padding:0 24px 24px;display:flex;flex-direction:column;gap:10px">
        <a class="btn ghost wide" href="#bookings"><span class="ms">confirmation_number</span>All my bookings</a>
        ${confirming ? `<div class="card" style="box-shadow:none;display:flex;flex-direction:column;gap:10px"><b>Cancel and get ${baht(b.total)} back?</b><div class="mu">Your seats go back to other people.</div><div class="two"><button class="btn ghost" data-a="confirm" data-v="">Keep booking</button><button class="btn danger" data-a="cancel" data-v="${esc(b.id)}">Cancel booking</button></div></div>`
          : `<button class="btn danger wide" data-a="confirm" data-v="cancel:${esc(b.id)}">Cancel booking</button>`}
      </div></div></div>`;
  }
  function vBookings() {
    const rows = DB.bookings.map(b => ({ b, w: find(b.wid) })).filter(x => x.w).sort((a, z) => (a.w.date + a.w.time).localeCompare(z.w.date + z.w.time));
    return `<section class="page-head"><div class="wrap"><h1 class="h1" style="font-size:32px">My bookings</h1><p>Tickets booked in this browser.</p></div></section>
    <div class="wrap section">${rows.length ? `<div class="list">${rows.map(({ b, w }) => `<a class="lrow" href="#ticket-${esc(b.id)}">${cover(w, "")}<div class="grow"><div class="when">${fmtDay(w.date)} · ${esc(w.time)}</div><div class="h3">${esc(w.title)}</div><div class="mu">${esc(w.studio)} · ${b.seats} seat${b.seats > 1 ? "s" : ""} · ${baht(b.total)}</div></div><span class="pill green">${esc(b.code)}</span></a>`).join("")}</div>`
      : `<div class="empty"><span class="ms">confirmation_number</span><div class="h3">Your tickets show up here</div><div class="mu">Book a workshop and your ticket appears right away.</div><a class="btn" href="#">Find a workshop</a></div>`}</div>`;
  }
  function vHost() {
    const h = DB.hosted; const mine = all().filter(w => w.mine);
    const sold = mine.reduce((a, w) => a + taken(w.id), 0), gross = mine.reduce((a, w) => a + taken(w.id) * w.price, 0);
    if (!S.form) { const d = new Date(); d.setDate(d.getDate() + 7); S.form = { studio: h.studio || "", title: "", cat: "Pottery", date: ymd(d), time: "10:00", hrs: "2", seats: "8", price: "1000", place: "", desc: "", color: 0, url: null }; }
    const f = S.form;
    return `<section class="page-head"><div class="wrap"><h1 class="h1" style="font-size:32px">Host a workshop</h1><p>List your class, set seats and a price. People book and pay here; you're paid after the class, minus a ${FEE * 100}% platform fee.</p></div></section>
    <div class="wrap section"><div class="host-grid">
      <div class="card form" id="create"><h2 class="h2" style="font-size:20px">New workshop</h2>
        <label for="f-studio">Studio or host name<input id="f-studio" data-f="studio" value="${esc(f.studio)}" placeholder="Satee.ceramic"></label>
        <label for="f-title">Workshop title<input id="f-title" data-f="title" value="${esc(f.title)}" placeholder="Paint your own smiley mug"></label>
        <label for="f-cat">Category<select id="f-cat" data-f="cat">${CATS.slice(1).map(([c]) => `<option ${f.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
        <div class="two"><label for="f-date">Date<input id="f-date" data-f="date" type="date" min="${today}" value="${esc(f.date)}"></label><label for="f-time">Start time<input id="f-time" data-f="time" type="time" value="${esc(f.time)}"></label></div>
        <div class="two"><label for="f-hrs">Hours<input id="f-hrs" data-f="hrs" type="number" min="0.5" max="12" step="0.5" value="${esc(f.hrs)}"></label><label for="f-seats">Seats<input id="f-seats" data-f="seats" type="number" min="1" max="200" step="1" value="${esc(f.seats)}"></label></div>
        <label for="f-price">Price per seat (฿)<input id="f-price" data-f="price" type="number" min="0" step="10" value="${esc(f.price)}"></label>
        <div class="note" id="net"><span class="ms">payments</span><span>You get ${baht((+f.price || 0) * (1 - FEE))} per seat after the ${FEE * 100}% platform fee.</span></div>
        <label for="f-place">Location<input id="f-place" data-f="place" value="${esc(f.place)}" placeholder="Studio address or meeting point"></label>
        <label for="f-desc">Description<textarea id="f-desc" data-f="desc" placeholder="What people make, what's included, who it suits">${esc(f.desc)}</textarea></label>
        <div style="display:flex;flex-direction:column;gap:8px"><b>Cover</b>
          ${f.url ? `<div class="cv photo" style="height:160px;border-radius:14px;background-image:url('${esc(f.url)}')"></div><button class="btn ghost" data-a="nophoto">Remove photo</button>`
            : `<div class="swatches">${COVER_COLORS.map((p, i) => `<button class="sw ${f.color === i ? "on" : ""}" data-a="color" data-v="${i}" style="background:${p[0]}" aria-label="Cover colour ${i + 1}"></button>`).join("")}</div>
               <label class="btn ghost" for="f-photo" style="cursor:pointer;flex-direction:row"><span class="ms">add_photo_alternate</span>Upload a photo<input id="f-photo" type="file" accept="image/*" hidden></label>`}
        </div>
        ${S.formErr ? `<div class="err" role="alert">${esc(S.formErr)}</div>` : ""}
        <button class="btn" data-a="publish"><span class="ms">campaign</span>Publish workshop</button>
      </div>
      <div>
        <div class="tiles"><div class="tile"><b>${mine.length}</b><span>Your workshops</span></div><div class="tile"><b>${sold}</b><span>Seats sold</span></div><div class="tile"><b>${baht(gross * (1 - FEE))}</b><span>Your payout</span></div></div>
        <h2 class="h2" style="font-size:20px;margin-bottom:12px">Your workshops</h2>
        ${mine.length ? `<div class="list">${mine.map(w => { const t = taken(w.id); return `<a class="lrow" href="#manage-${esc(w.id)}">${cover(w, "")}<div class="grow"><div class="when">${fmtDay(w.date)} · ${esc(w.time)}</div><div class="h3">${esc(w.title)}</div><div class="mu">${t}/${w.seats} seats · ${baht(t * w.price)}</div><div class="meter" style="margin-top:6px"><i style="width:${Math.min(100, t / w.seats * 100)}%"></i></div></div></a>`; }).join("")}</div>`
          : `<div class="card" style="box-shadow:none"><div class="mu">Workshops you publish show up here with their bookings and payout.</div></div>`}
      </div></div></div>`;
  }
  function vManage(id) {
    const w = find(id); if (!w || !w.mine) return notFound();
    const people = DB.bookings.filter(b => b.wid === id); const t = taken(id), gross = t * w.price;
    const confirming = S.confirm === "del:" + id;
    return `<div class="wrap"><a class="back" href="#host"><span class="ms">chevron_left</span>Host dashboard</a>
      <div class="host-grid"><div>
        ${cover(w, "big", "").replace('class="cv', 'style="aspect-ratio:16/9;border-radius:18px" class="cv')}
        <h1 class="h1" style="font-size:30px;margin-top:16px">${esc(w.title)}</h1><div class="mu">${fmtLong(w.date)} · ${esc(w.time)} · ${esc(w.hrs)} hrs</div>
        <div class="card" style="margin-top:16px"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><b>${t} of ${w.seats} seats booked</b>${seatsLabel(w)}</div><div class="meter"><i style="width:${Math.min(100, t / w.seats * 100)}%"></i></div></div>
      </div><div style="display:flex;flex-direction:column;gap:16px">
        <div class="card lines"><div class="row"><span>${t} × ${baht(w.price)}</span><span>${baht(gross)}</span></div><div class="row minus"><span>Platform fee ${FEE * 100}%</span><span>-${baht(gross * FEE)}</span></div><div class="row tot"><span>Your payout</span><span>${baht(gross * (1 - FEE))}</span></div><div class="mu">Paid out after the workshop ends.</div></div>
        <div class="card"><h2 class="h3" style="margin-bottom:6px">Participants</h2>${people.length ? people.map(p => `<div class="person"><div><b>${esc(p.name)}</b><div class="mu">${esc(p.email)} · ${esc(p.phone)}</div>${p.note ? `<div class="mu">“${esc(p.note)}”</div>` : ""}</div><div style="text-align:right"><b>${p.seats} seat${p.seats > 1 ? "s" : ""}</b><div class="mu">${baht(p.total)}</div></div></div>`).join("") : `<div class="mu">No bookings yet.</div>`}</div>
        ${confirming ? `<div class="card" style="display:flex;flex-direction:column;gap:10px"><b>Delete this workshop?</b><div class="mu">${t ? `${t} booked seat${t > 1 ? "s" : ""} will be refunded. ` : ""}This can't be undone.</div><div class="two"><button class="btn ghost" data-a="confirm" data-v="">Keep it</button><button class="btn danger" data-a="delete" data-v="${esc(id)}">Delete</button></div></div>`
          : `<button class="btn danger" data-a="confirm" data-v="del:${esc(id)}"><span class="ms">delete</span>Delete workshop</button>`}
      </div></div></div>`;
  }
  function notFound(msg) { return `<div class="wrap"><div class="empty"><span class="ms">event_busy</span><div class="h3">${esc(msg || "This workshop isn't available")}</div><a class="btn ghost" href="#">See all workshops</a></div></div>`; }

  /* ---------- render ---------- */
  let lastRoute = "";
  function render() {
    const h = decodeURIComponent(location.hash.slice(1));
    const ae = document.activeElement; const fid = ae && ae.id && view.contains(ae) ? ae.id : null;
    let sel = null; try { sel = fid ? [ae.selectionStart, ae.selectionEnd] : null; } catch (e) {}
    let html, nav = "explore", title = "Local Vibe";
    if (h.startsWith("w-")) { const w = find(h.slice(2)); html = vDetail(h.slice(2)); if (w) title = w.title + " · Local Vibe"; }
    else if (h.startsWith("book-")) { html = vBook(h.slice(5)); title = "Book · Local Vibe"; }
    else if (h.startsWith("ticket-")) { html = vTicket(h.slice(7)); nav = "bookings"; title = "Your ticket · Local Vibe"; }
    else if (h === "bookings") { html = vBookings(); nav = "bookings"; title = "My bookings · Local Vibe"; }
    else if (h === "host") { html = vHost(); nav = "host"; title = "Host a workshop · Local Vibe"; }
    else if (h.startsWith("manage-")) { html = vManage(h.slice(7)); nav = "host"; }
    else html = vExplore();
    view.innerHTML = html;
    document.title = title;
    document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("on", a.dataset.nav === nav));
    const n = DB.bookings.length, nc = document.getElementById("navCount"); nc.hidden = !n; nc.textContent = n;
    if (h !== lastRoute) { window.scrollTo(0, 0); lastRoute = h; }
    if (fid) { const el = document.getElementById(fid); if (el) { el.focus(); try { if (sel) el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
  }

  /* ---------- events ---------- */
  document.addEventListener("input", e => {
    const t = e.target;
    if (t.id === "q") { S.q = t.value; render(); }
    else if (t.id === "day") { S.day = t.value; render(); }
    else if (t.dataset.b && S.book) { S.book[t.dataset.b] = t.value; S.book.err = ""; }
    else if (t.dataset.f && S.form) {
      S.form[t.dataset.f] = t.value; S.formErr = "";
      if (t.dataset.f === "price") { const n = document.querySelector("#net span:last-child"); if (n) n.textContent = `You get ${baht((+t.value || 0) * (1 - FEE))} per seat after the ${FEE * 100}% platform fee.`; }
    }
  });
  document.addEventListener("change", e => {
    if (e.target.id !== "f-photo") return;
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 900 / Math.max(img.width, img.height)); const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      S.form.url = c.toDataURL("image/jpeg", 0.8); render();
    };
    img.onerror = () => toast("That file isn't an image we can read. Try a JPG or PNG.");
    img.src = url;
  });
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-a]"); if (!t) return;
    const a = t.dataset.a, v = t.dataset.v;
    if (a === "cat") { S.cat = v; render(); }
    else if (a === "studio") { S.studio = v; render(); document.getElementById("results").scrollIntoView(); }
    else if (a === "clear") { S.cat = "All"; S.q = ""; S.day = ""; S.studio = ""; render(); }
    else if (a === "scroll") { document.getElementById("results").scrollIntoView(); }
    else if (a === "seat") { const id = decodeURIComponent(location.hash.slice(3)); const w = find(id); S.seats[id] = Math.max(1, Math.min(left(w), (S.seats[id] || 1) + (+v))); render(); }
    else if (a === "startbook") { S.book = null; go("#book-" + v); }
    else if (a === "bseat") { const w = find(S.book.wid); S.book.seats = Math.max(1, Math.min(left(w), S.book.seats + (+v))); S.seats[w.id] = S.book.seats; render(); }
    else if (a === "tostep2") {
      const b = S.book;
      b.err = !b.name.trim() ? "Enter the name for the booking." : !/^\S+@\S+\.\S+$/.test(b.email.trim()) ? "Enter an email address like name@example.com." : b.phone.replace(/\D/g, "").length < 8 ? "Enter a phone number with at least 8 digits." : "";
      if (!b.err) b.step = 2; render();
    }
    else if (a === "tostep1") { S.book.step = 1; render(); }
    else if (a === "paym") { S.book.pay = v; render(); }
    else if (a === "confirmbook") {
      const b = S.book, w = find(b.wid);
      if (b.seats > left(w)) { toast("Those seats were just taken. Choose fewer seats."); b.step = 1; render(); return; }
      const id = rid("b");
      DB.bookings.push({ id, wid: w.id, name: b.name.trim(), email: b.email.trim(), phone: b.phone.trim(), note: b.note.trim(), seats: b.seats, total: b.seats * w.price, pay: b.pay, code: "LV-" + id.slice(-5).toUpperCase(), at: new Date().toISOString() });
      if (save()) { S.book = null; go("#ticket-" + id); toast("Booked. Your ticket is ready."); } else DB.bookings.pop();
    }
    else if (a === "confirm") { S.confirm = v || null; render(); }
    else if (a === "cancel") { DB.bookings = DB.bookings.filter(b => b.id !== v); save(); S.confirm = null; go("#bookings"); toast("Booking cancelled. Your refund is on its way."); }
    else if (a === "color") { S.form.color = +v; render(); }
    else if (a === "nophoto") { S.form.url = null; render(); }
    else if (a === "publish") {
      const f = S.form;
      S.formErr = !f.studio.trim() ? "Add your studio or host name." : !f.title.trim() ? "Add a workshop title." : !f.date || f.date < today ? "Pick a date from today on." : !f.time ? "Add a start time." : !(+f.hrs > 0) ? "Hours must be more than 0." : !(+f.seats >= 1) ? "Offer at least 1 seat." : (f.price === "" || +f.price < 0) ? "Set a price per seat (0 for free)." : "";
      if (S.formErr) { render(); document.querySelector(".err").scrollIntoView({ block: "center" }); return; }
      const w = { id: rid("h"), title: f.title.trim(), cat: f.cat, date: f.date, time: f.time, hrs: +f.hrs, seats: Math.round(+f.seats), price: Math.round(+f.price), place: f.place.trim(), desc: f.desc.trim(), cover: f.url ? { url: f.url } : { color: f.color } };
      DB.hosted.studio = f.studio.trim(); DB.hosted.workshops.push(w);
      if (save()) { S.form = null; toast("Workshop published"); go("#w-" + w.id); } else DB.hosted.workshops.pop();
    }
    else if (a === "delete") { DB.hosted.workshops = DB.hosted.workshops.filter(w => w.id !== v); DB.bookings = DB.bookings.filter(b => b.wid !== v); save(); S.confirm = null; go("#host"); toast("Workshop deleted"); }
  });
  window.addEventListener("hashchange", () => { S.confirm = null; render(); });
  render();
})();
