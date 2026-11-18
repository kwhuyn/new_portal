(function () {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p) => p + Math.random().toString(36).slice(2, 9);
const fmt = (d) => new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');
const slugify = window.slugify;
const PER_PAGE = 6;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const S = {
  db: JSON.parse(JSON.stringify(window.SEED)), cur: null, route: { name: 'home', id: null },
  f: { q: '', cat: null, tag: null, page: 1 },
  admin: { tab: 'articles', st: 'pending', uq: '', ur: 'all', us: 'all' }, onOk: null,
};
let E = { id: null, thumb: '', tagIds: [] };

const cur = () => S.db.users.find((u) => u.id === S.cur) || null;
const role = () => (cur() ? cur().role : 'guest');
const userOf = (id) => S.db.users.find((u) => u.id === id);
const catOf = (id) => S.db.categories.find((c) => c.id === id);
const statusLabel = { published: 'Đã xuất bản', pending: 'Chờ duyệt', rejected: 'Từ chối' };
const badge = (s) => `<span class="badge b-${s}">${statusLabel[s]}</span>`;
const scrollTop = () => window.scrollTo({ top: 0 });

function toast(type, msg) {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = ({ success: '✅ ', warning: '⚠️ ', error: '❌ ' }[type]) + msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
function openModal(title, body) {
  $('#modal').innerHTML = `<div class="overlay"><div class="dlg"><div class="dlg-h"><h2>${title}</h2><button data-act="close-modal">✕</button></div>${body}</div></div>`;
}
const closeModal = () => { $('#modal').innerHTML = ''; };
function ask(msg, fn) {
  S.onOk = fn;
  openModal('Xác nhận', `<p style="font-size:14px;margin:0">${esc(msg)}</p><div class="dlg-f"><button class="btn" data-act="close-modal">Hủy</button><button class="btn danger" data-act="confirm-ok">Xác nhận</button></div>`);
}
function readImage(file, ok, bad) {
  if (!ALLOWED.includes(file.type)) return bad('Chỉ chấp nhận ảnh JPG, JPEG, PNG hoặc WEBP.');
  if (file.size > 5 * 1024 * 1024) return bad('Dung lượng ảnh tối đa là 5MB.');
  const r = new FileReader();
  r.onload = () => ok(r.result);
  r.readAsDataURL(file);
}

/* ---------- HEADER ---------- */
function renderHeader() {
  const u = cur(), r = role();
  const roles = [['guest', 'Khách'], ['member', 'Thành viên'], ['admin', 'Quản trị viên']];
  const right = u
    ? `<div class="menuwrap"><button class="userbtn" data-act="toggle-menu"><img class="av" src="${esc(u.avatar_url)}" alt=""><span class="hide-sm">${esc(u.full_name)}</span> ▾</button>
       <div class="dropdown" id="dd" hidden><button data-act="profile">👤 Hồ sơ cá nhân</button><button data-act="editor-new">✏️ Viết bài mới</button>
       ${r === 'admin' ? '<button data-act="admin">📊 Quản trị hệ thống</button>' : ''}<button class="red" data-act="logout">🚪 Đăng xuất</button></div></div>`
    : `<div style="display:flex;gap:8px"><button class="hbtn" data-act="login">Đăng nhập</button><button class="hbtn w" data-act="register">Đăng ký</button></div>`;
  $('#header').innerHTML = `
    <div class="topbar"><div class="wrap topbar-in"><span class="hide-sm">Phiên đăng nhập thử nghiệm</span>
      <div class="rs"><span>Vai trò:</span>${roles.map(([k, l]) => `<button data-act="role" data-r="${k}" class="${r === k ? 'on' : ''}">${l}</button>`).join('')}</div></div></div>
    <div class="wrap mainbar">
      <a class="logo" data-act="home"><span class="logo-ic">📰</span><span class="logo-pill grad-text hide-sm">News Portal</span></a>
      <div class="search"><span>🔍</span><input id="q" placeholder="Tìm kiếm tiêu đề, sapo, nội dung..." value="${esc(S.f.q)}" autocomplete="off"></div>
      ${right}
    </div>
    <div class="wrap"><nav class="catnav" id="catnav"></nav></div>`;
  updateNav();
}
function updateNav() {
  $('#catnav').innerHTML = `<button data-act="home" class="${!S.f.cat ? 'on' : ''}">Trang chủ</button>` +
    S.db.categories.map((c) => `<button data-act="cat" data-id="${c.id}" class="${S.f.cat === c.id ? 'on' : ''}">${esc(c.name)}</button>`).join('');
}
function filter(p) {
  Object.assign(S.f, { page: 1 }, p);
  S.route = { name: 'home', id: null };
  const qi = $('#q'); if (qi && qi !== document.activeElement) qi.value = S.f.q;
  renderView(); updateNav(); scrollTop();
}
function go(name, id = null) {
  S.route = { name, id };
  if (name === 'article') {
    const a = S.db.articles.find((x) => x.id === id);
    if (a && a.status === 'published') a.views_count++;
  }
  renderView(); scrollTop();
}

/* ---------- VIEWS ---------- */
function card(a) {
  const c = catOf(a.category_id), au = userOf(a.author_id);
  return `<article class="card acard" data-act="article" data-id="${a.id}"><div class="thumb"><img src="${esc(a.thumbnail_url)}" alt=""></div>
    <div class="acard-b"><span class="cat">${esc(c?.name)}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p>
    <div class="meta"><img class="av sm" src="${esc(au?.avatar_url)}" alt=""><span>${esc(au?.full_name)}</span><span>${fmtDate(a.created_at)}</span><span>👁 ${a.views_count}</span></div></div></article>`;
}
function viewHome() {
  const { q, cat, tag } = S.f, kw = q.trim().toLowerCase();
  const pub = S.db.articles.filter((a) => a.status === 'published').sort((a, b) => b.created_at - a.created_at);
  const list = pub.filter((a) => (!cat || a.category_id === cat) && (!tag || a.tag_ids.includes(tag)) &&
    (!kw || [a.title, a.summary, a.content.replace(/<[^>]+>/g, ' ')].some((s) => s.toLowerCase().includes(kw))));
  const feat = pub.filter((a) => a.is_featured).slice(0, 3);
  const pages = Math.ceil(list.length / PER_PAGE);
  if (S.f.page > pages) S.f.page = Math.max(1, pages);
  const shown = list.slice((S.f.page - 1) * PER_PAGE, S.f.page * PER_PAGE);
  const title = kw ? `Kết quả cho “${esc(q)}”` : cat ? esc(catOf(cat)?.name) : 'Tin mới nhất';
  let h = '<div class="stack">';
  if (!cat && !tag && !kw && feat.length) {
    h += `<section><div style="margin-bottom:12px"><span class="fbadge">Tin nổi bật</span></div><div class="hero-g">` +
      feat.map((a, i) => `<article class="hero ${i === 0 ? 'big' : ''}" data-act="article" data-id="${a.id}"><img src="${esc(a.thumbnail_url)}" alt="">
        <div class="hero-o"><h2>${esc(a.title)}</h2>${i === 0 ? `<p>${esc(a.summary)}</p>` : ''}<small>${fmtDate(a.created_at)} · 👁 ${a.views_count}</small></div></article>`).join('') + '</div></section>';
  }
  h += `<section><div class="chips"><h2>${title}</h2>${S.db.tags.map((t) => `<button class="chip ${tag === t.id ? 'on' : ''}" data-act="tag" data-id="${t.id}">#${esc(t.name)}</button>`).join('')}</div>`;
  h += shown.length ? `<div class="grid3">${shown.map(card).join('')}</div>` : '<div class="card pad center">Không có bài viết nào phù hợp. Hãy thử từ khóa hoặc bộ lọc khác.</div>';
  if (pages > 1) {
    h += `<div class="pager"><button data-act="page" data-n="${S.f.page - 1}" ${S.f.page === 1 ? 'disabled' : ''}>‹</button>` +
      Array.from({ length: pages }, (_, i) => `<button data-act="page" data-n="${i + 1}" class="${i + 1 === S.f.page ? 'on' : ''}">${i + 1}</button>`).join('') +
      `<button data-act="page" data-n="${S.f.page + 1}" ${S.f.page === pages ? 'disabled' : ''}>›</button></div>`;
  }
  return h + '</section></div>';
}

function commentsHtml(id) {
  const u = cur(), r = role();
  const list = S.db.comments.filter((c) => c.article_id === id).sort((a, b) => b.created_at - a.created_at);
  if (!list.length) return '<p style="font-size:14px;color:#64748B">Chưa có bình luận nào. Hãy là người đầu tiên!</p>';
  return list.map((c) => {
    const cu = userOf(c.user_id);
    const can = u && (r === 'admin' || u.id === c.user_id);
    return `<div class="cmt"><img class="av md" src="${esc(cu?.avatar_url)}" alt=""><div class="cmt-b"><div class="cmt-h"><span><b style="color:#1E293B;font-size:14px">${esc(cu?.full_name)}</b> · ${fmt(c.created_at)}</span>
      ${can ? `<button class="link" style="color:#DC2626" data-act="cmt-del" data-id="${c.id}">🗑 Xóa</button>` : ''}</div><p>${esc(c.content)}</p></div></div>`;
  }).join('');
}
function viewDetail(id) {
  const a = S.db.articles.find((x) => x.id === id), u = cur();
  if (!a) return '<div class="card pad center">Bài viết không tồn tại hoặc đã bị xóa. <button class="link" data-act="home">Về trang chủ</button></div>';
  if (a.status !== 'published' && role() !== 'admin' && u?.id !== a.author_id) return '<div class="card pad center">Bài viết chưa được xuất bản.</div>';
  const c = catOf(a.category_id), au = userOf(a.author_id);
  const tags = S.db.tags.filter((t) => a.tag_ids.includes(t.id));
  const related = S.db.articles.filter((x) => x.status === 'published' && x.category_id === a.category_id && x.id !== id).slice(0, 3);
  const n = S.db.comments.filter((x) => x.article_id === id).length;
  return `<div class="stack"><button class="link" data-act="home">← Quay lại</button>
    <article class="card art">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">${a.is_featured ? '<span class="fbadge">Tin nổi bật</span>' : ''}<button class="link" data-act="cat-from" data-id="${a.category_id}">${esc(c?.name)}</button></div>
      <h1>${esc(a.title)}</h1>
      <div class="info"><span style="display:flex;align-items:center;gap:8px"><img class="av md" src="${esc(au?.avatar_url)}" alt=""><b style="color:#1E293B">${esc(au?.full_name)}</b></span><span>🕒 ${fmt(a.created_at)}</span><span>👁 ${a.views_count} lượt xem</span></div>
      <p class="sapo">${esc(a.summary)}</p><div class="prose">${a.content}</div>
      ${tags.length ? `<div class="tags">${tags.map((t) => `<button class="tag" data-act="tag-from" data-id="${t.id}">#${esc(t.name)}</button>`).join('')}</div>` : ''}
    </article>
    <section class="card art"><h2 style="font-size:20px;font-weight:800;margin-bottom:16px">Bình luận (<span id="cCount">${n}</span>)</h2>
      <textarea class="input" id="cText" maxlength="1000" placeholder="Chia sẻ ý kiến của bạn..." ${u ? '' : 'readonly data-act="need-login"'}></textarea>
      <div class="row-b" style="margin:8px 0 0"><span class="counter" id="cLen">0/1000</span><button class="btn primary" data-act="cmt-send" data-id="${id}">Gửi bình luận</button></div>
      <div id="cList" style="margin-top:24px">${commentsHtml(id)}</div></section>
    ${related.length ? `<section><h2 style="font-size:20px;font-weight:800;margin-bottom:16px">Bài viết liên quan</h2><div class="grid3">${related.map(card).join('')}</div></section>` : ''}</div>`;
}
function refreshComments(id) {
  $('#cList').innerHTML = commentsHtml(id);
  $('#cCount').textContent = S.db.comments.filter((x) => x.article_id === id).length;
}

function viewProfile() {
  const u = cur();
  const mine = S.db.articles.filter((a) => a.author_id === u.id).sort((a, b) => b.created_at - a.created_at);
  return `<div class="stack"><div class="grid2">
    <form class="card pad" id="fProfile"><h2 style="font-size:18px;margin-bottom:16px">Hồ sơ cá nhân</h2>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px"><label style="position:relative;cursor:pointer"><img class="av lg" src="${esc(u.avatar_url)}" alt=""><span class="grad" style="position:absolute;right:-4px;bottom:-4px;border-radius:50%;padding:4px 6px;font-size:12px">📷</span><input type="file" id="avatarFile" accept=".jpg,.jpeg,.png,.webp" hidden></label>
        <div style="font-size:14px"><b style="color:#0F172A">${esc(u.email)}</b><br><span style="color:#64748B">Tham gia ${fmtDate(u.created_at)}</span></div></div>
      <div class="field"><label class="lb">Họ tên hiển thị</label><input class="input" id="p_name" value="${esc(u.full_name)}"></div>
      <div class="field"><label class="lb">Giới thiệu ngắn</label><textarea class="input" id="p_bio" maxlength="300">${esc(u.bio || '')}</textarea></div>
      <button class="btn primary">Lưu thay đổi</button></form>
    <form class="card pad" id="fPw"><h2 style="font-size:18px;margin-bottom:16px">Đổi mật khẩu</h2>
      <div class="field"><label class="lb">Mật khẩu cũ</label><input class="input" type="password" id="w_old"></div>
      <div class="field"><label class="lb">Mật khẩu mới</label><input class="input" type="password" id="w_new"></div>
      <div class="field"><label class="lb">Xác nhận mật khẩu mới</label><input class="input" type="password" id="w_cf"></div>
      <button class="btn primary">Đổi mật khẩu</button></form></div>
    <div class="card pad"><div class="row-b"><h2>Bài viết của tôi (${mine.length})</h2><button class="btn primary" data-act="editor-new">Viết bài mới</button></div>
    ${mine.length ? `<div class="tblw"><table><thead><tr><th>Tiêu đề</th><th>Chuyên mục</th><th>Ngày tạo</th><th>Trạng thái</th><th></th></tr></thead><tbody>
      ${mine.map((a) => `<tr><td style="font-weight:600;color:#0F172A;max-width:300px">${esc(a.title)}</td><td>${esc(catOf(a.category_id)?.name)}</td><td>${fmtDate(a.created_at)}</td>
        <td>${badge(a.status)}${a.status === 'rejected' ? `<div class="reason">Lý do: ${esc(a.reject_reason)}</div>` : ''}</td>
        <td class="act">${a.status === 'published' ? `<button class="btn sm" data-act="article" data-id="${a.id}">Xem</button> ` : ''}<button class="btn sm" data-act="editor-edit" data-id="${a.id}">✏️ Sửa</button></td></tr>`).join('')}</tbody></table></div>`
      : '<p style="font-size:14px;color:#64748B">Bạn chưa có bài viết nào.</p>'}</div></div>`;
}

function thumbHtml() {
  return E.thumb ? `<img src="${esc(E.thumb)}" alt="">` : '<div>☁️<br>Chọn ảnh JPG, PNG, WEBP (tối đa 5MB)</div>';
}
function tagsHtml() {
  return S.db.tags.map((t) => `<button type="button" class="chip ${E.tagIds.includes(t.id) ? 'on' : ''}" data-act="tag-toggle" data-id="${t.id}">#${esc(t.name)}</button>`).join('');
}
function viewEditor(id) {
  const old = id ? S.db.articles.find((a) => a.id === id) : null, u = cur();
  if (id && (!old || (role() !== 'admin' && old.author_id !== u.id))) return '<div class="card pad center">Bạn không có quyền chỉnh sửa bài viết này.</div>';
  E = { id, thumb: old?.thumbnail_url || '', tagIds: [...(old?.tag_ids || [])] };
  return `<h1 style="font-size:24px;font-weight:800;margin-bottom:16px">${old ? 'Chỉnh sửa bài viết' : 'Viết bài mới'}</h1>
  <div class="editor-g"><div class="card pad">
    <div class="field"><label class="lb">Tiêu đề *</label><input class="input" id="e_title" style="font-weight:700;font-size:18px" value="${esc(old?.title || '')}"><div class="err" id="er_title"></div></div>
    <div class="field"><label class="lb">Đoạn tóm tắt (Sapo)</label><textarea class="input" id="e_sum">${esc(old?.summary || '')}</textarea></div>
    <div class="field"><label class="lb">Nội dung *</label><div class="edwrap"><div class="toolbar">
      <button type="button" data-cmd="bold" title="In đậm"><b>B</b></button><button type="button" data-cmd="italic" title="In nghiêng"><i>I</i></button>
      <button type="button" data-cmd="formatBlock" data-v="h2">H2</button><button type="button" data-cmd="formatBlock" data-v="h3">H3</button>
      <button type="button" data-cmd="insertUnorderedList">• Danh sách</button>
      <label>🖼 Chèn ảnh<input type="file" id="imgFiles" multiple accept=".jpg,.jpeg,.png,.webp" hidden></label></div>
      <div id="ed" contenteditable="true" class="prose" data-ph="Viết nội dung bài báo tại đây...">${old?.content || ''}</div></div><div class="err" id="er_content"></div></div>
  </div>
  <div class="card pad" style="height:fit-content">
    <div class="field"><label class="lb">Chuyên mục *</label><select class="input" id="e_cat"><option value="">-- Chọn chuyên mục --</option>
      ${S.db.categories.map((c) => `<option value="${c.id}" ${old?.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><div class="err" id="er_cat"></div></div>
    <div class="field"><label class="lb">Ảnh thumbnail</label><label class="drop" id="thumbBox">${thumbHtml()}<input type="file" id="thumbFile" accept=".jpg,.jpeg,.png,.webp" hidden></label></div>
    <div class="field"><label class="lb">Thẻ Tags</label><div class="chips" id="tagBox" style="margin-bottom:8px">${tagsHtml()}</div>
      <div class="tagrow"><input class="input" id="newTag" placeholder="Thêm thẻ mới"><button type="button" class="btn" data-act="tag-add">+</button></div></div>
    <button class="btn primary full" data-act="ed-submit">${role() === 'admin' ? 'Xuất bản bài viết' : 'Gửi duyệt bài viết'}</button>
    <button class="btn full" style="margin-top:8px" data-act="${role() === 'admin' ? 'admin' : 'profile'}">Hủy</button></div></div>`;
}
function submitEditor() {
  const html = $('#ed').innerHTML, doc = new DOMParser().parseFromString(html, 'text/html');
  const title = $('#e_title').value.trim(), summary = $('#e_sum').value.trim(), cat = $('#e_cat').value;
  const e = {
    title: title ? '' : 'Vui lòng nhập tiêu đề.', cat: cat ? '' : 'Vui lòng chọn chuyên mục.',
    content: doc.body.textContent.trim() || doc.querySelector('img') ? '' : 'Vui lòng nhập nội dung bài viết.',
  };
  $('#er_title').textContent = e.title; $('#er_cat').textContent = e.cat; $('#er_content').textContent = e.content;
  if (e.title || e.cat || e.content) return toast('warning', 'Vui lòng điền đầy đủ các trường bắt buộc.');
  const imgs = [...doc.querySelectorAll('figure')].map((f) => ({ image_url: f.querySelector('img')?.getAttribute('src'), caption: f.querySelector('figcaption')?.textContent || '' })).filter((x) => x.image_url);
  const old = E.id ? S.db.articles.find((a) => a.id === E.id) : null, aid = old?.id || uid('a'), r = role();
  const base = { title, slug: slugify(title), summary, content: html, category_id: cat, tag_ids: E.tagIds, thumbnail_url: E.thumb || imgs[0]?.image_url || `https://picsum.photos/seed/${aid}/800/450` };
  let msg;
  if (old) {
    const status = r === 'admin' ? old.status : 'pending';
    Object.assign(old, base, { status, reject_reason: status === 'rejected' ? old.reject_reason : null });
    msg = r === 'admin' ? 'Đã cập nhật bài viết.' : (old.status === 'published' ? 'Bài viết đã chỉnh sửa và chuyển về trạng thái Chờ duyệt.' : 'Đã gửi duyệt lại bài viết.');
  } else {
    S.db.articles.push({ id: aid, ...base, author_id: cur().id, status: r === 'admin' ? 'published' : 'pending', reject_reason: null, views_count: 0, is_featured: false, created_at: Date.now() });
    msg = r === 'admin' ? 'Bài viết đã được xuất bản.' : 'Đã gửi bài viết, vui lòng chờ quản trị viên duyệt.';
  }
  S.db.article_images = S.db.article_images.filter((x) => x.article_id !== aid).concat(imgs.map((x) => ({ id: uid('i'), article_id: aid, ...x })));
  toast('success', msg);
  go(r === 'admin' ? 'admin' : 'profile');
}

/* ---------- ADMIN ---------- */
function viewAdmin() {
  const d = S.db, week = Date.now() - 7 * 864e5;
  const kpis = [['⏳', 'Bài chờ duyệt', d.articles.filter((a) => a.status === 'pending').length], ['📰', 'Tổng bài viết', d.articles.length],
    ['👥', 'Thành viên hoạt động', d.users.filter((u) => u.status === 'active').length], ['💬', 'Bình luận mới (7 ngày)', d.comments.filter((c) => c.created_at >= week).length]];
  const tabs = [['articles', '📝 Kiểm duyệt bài viết'], ['users', '👥 Quản lý người dùng'], ['comments', '💬 Quản lý bình luận'], ['categories', '🏷 Quản lý chuyên mục']];
  const body = { articles: tabArticles, users: tabUsers, comments: tabComments, categories: tabCategories }[S.admin.tab]();
  return `<div class="grid4">${kpis.map(([i, l, v]) => `<div class="card kpi"><i>${i}</i><div><b>${v}</b><small>${l}</small></div></div>`).join('')}</div>
    <div class="admin"><aside class="side">${tabs.map(([k, l]) => `<button data-act="atab" data-t="${k}" class="${S.admin.tab === k ? 'on' : ''}">${l}</button>`).join('')}</aside><section class="card panel">${body}</section></div>`;
}
function tabArticles() {
  const st = S.admin.st;
  const list = S.db.articles.filter((a) => st === 'all' || a.status === st).sort((a, b) => b.created_at - a.created_at);
  const opt = [['all', 'Tất cả trạng thái'], ['pending', 'Chờ duyệt'], ['published', 'Đã xuất bản'], ['rejected', 'Từ chối']];
  return `<div class="row-b"><h2>Kiểm duyệt bài viết</h2><select class="input auto" id="aSt">${opt.map(([v, l]) => `<option value="${v}" ${st === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>` +
    (list.length ? `<div class="tblw"><table><thead><tr><th>Bài viết</th><th>Tác giả</th><th>Trạng thái</th><th style="text-align:right">Thao tác</th></tr></thead><tbody>
    ${list.map((a) => `<tr><td><div class="mini"><img src="${esc(a.thumbnail_url)}" alt=""><div><b>${esc(a.title)}</b><small>${esc(catOf(a.category_id)?.name)} · ${fmt(a.created_at)}</small></div></div></td>
      <td>${esc(userOf(a.author_id)?.full_name)}</td><td>${badge(a.status)}${a.status === 'rejected' && a.reject_reason ? `<div class="reason">${esc(a.reject_reason)}</div>` : ''}</td>
      <td class="act">${a.status !== 'published' ? `<button class="btn sm" title="Duyệt xuất bản" style="color:#15803D" data-act="a-pub" data-id="${a.id}">✔</button> ` : ''}
      ${a.status !== 'rejected' ? `<button class="btn sm" title="Từ chối" style="color:#DC2626" data-act="a-rej" data-id="${a.id}">✖</button> ` : ''}
      ${a.status === 'published' ? `<button class="btn sm" title="Tin nổi bật" style="color:${a.is_featured ? '#F59E0B' : '#64748B'}" data-act="a-feat" data-id="${a.id}">${a.is_featured ? '★' : '☆'}</button> ` : ''}
      <button class="btn sm" title="Sửa" data-act="editor-edit" data-id="${a.id}">✏️</button> <button class="btn sm" title="Xóa" data-act="a-del" data-id="${a.id}">🗑</button></td></tr>`).join('')}</tbody></table></div>`
    : '<p class="empty">Không có bài viết nào.</p>');
}
function usersTable() {
  const { uq, ur, us } = S.admin, me = cur();
  const list = S.db.users.filter((u) => (ur === 'all' || u.role === ur) && (us === 'all' || u.status === us) && `${u.full_name} ${u.email}`.toLowerCase().includes(uq.toLowerCase()));
  if (!list.length) return '<p class="empty">Không tìm thấy người dùng.</p>';
  return `<div class="tblw"><table><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Phân quyền</th><th>Khóa / Mở khóa</th></tr></thead><tbody>
    ${list.map((u) => `<tr><td><div class="mini" style="align-items:center"><img class="av md" style="width:36px;height:36px" src="${esc(u.avatar_url)}" alt=""><div><b>${esc(u.full_name)}</b><small>${esc(u.email)}</small></div></div></td>
      <td><span class="badge b-${u.role}">${u.role === 'admin' ? 'Admin' : 'Member'}</span></td>
      <td><button class="btn sm" data-act="u-role" data-id="${u.id}">${u.role === 'admin' ? 'Hạ xuống Member' : 'Nâng lên Admin'}</button></td>
      <td><button class="sw ${u.status === 'locked' ? 'on' : ''}" data-act="u-lock" data-id="${u.id}" title="${u.id === me.id ? 'Không thể tự khóa chính mình' : ''}"></button> <small style="color:#64748B">${u.status === 'locked' ? 'Đã khóa' : 'Hoạt động'}</small></td></tr>`).join('')}</tbody></table></div>`;
}
function tabUsers() {
  const { uq, ur, us } = S.admin;
  const sel = (id, cur_, o) => `<select class="input auto" id="${id}">${o.map(([v, l]) => `<option value="${v}" ${cur_ === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  return `<div class="row-b"><h2>Quản lý người dùng</h2></div><div class="filters"><input class="input" id="uq" placeholder="Tìm theo tên hoặc email" value="${esc(uq)}">
    ${sel('ur', ur, [['all', 'Mọi vai trò'], ['admin', 'Admin'], ['member', 'Member']])}${sel('us', us, [['all', 'Mọi trạng thái'], ['active', 'Hoạt động'], ['locked', 'Bị khóa']])}</div><div id="uList">${usersTable()}</div>`;
}
function tabComments() {
  const list = [...S.db.comments].sort((a, b) => b.created_at - a.created_at);
  return `<div class="row-b"><h2>Bình luận mới nhất</h2></div>` + (list.length ? list.map((c) => {
    const u = userOf(c.user_id), a = S.db.articles.find((x) => x.id === c.article_id);
    return `<div class="li"><img class="av md" src="${esc(u?.avatar_url)}" alt=""><div class="grow"><div style="font-size:14px"><b style="color:#0F172A">${esc(u?.full_name)}</b> <small>· ${fmt(c.created_at)}</small></div>
      <div style="font-size:14px;word-break:break-word">${esc(c.content)}</div><small style="color:#1D4ED8">Bài: ${esc(a?.title)}</small></div>
      <button class="btn sm" style="color:#DC2626" data-act="cm-del" data-id="${c.id}">🗑</button></div>`;
  }).join('') : '<p class="empty">Chưa có bình luận nào.</p>');
}
function tabCategories() {
  const cnt = (id) => S.db.articles.filter((a) => a.category_id === id).length;
  return `<form class="form-bg" id="fCat"><h2 style="font-size:18px;font-weight:800;margin-bottom:12px" id="cTitle">Thêm chuyên mục mới</h2><input type="hidden" id="c_id">
    <div class="grid2" style="gap:12px"><div class="field"><label class="lb">Tên chuyên mục *</label><input class="input" id="c_name"></div>
    <div class="field"><label class="lb">Slug</label><input class="input" id="c_slug" placeholder="Tự động từ tên"></div></div>
    <div class="field"><label class="lb">Mô tả</label><input class="input" id="c_desc"></div>
    <button class="btn primary" id="c_btn">Thêm chuyên mục</button> <button type="button" class="btn" id="c_cancel" data-act="cat-cancel" hidden>Hủy</button></form>` +
    S.db.categories.map((c) => { const n = cnt(c.id); return `<div class="li"><div class="grow"><b style="color:#0F172A">${esc(c.name)}</b> <small>/${esc(c.slug)}</small><br><small>${esc(c.description)}</small>
      ${n ? `<div class="warnt">Đang chứa ${n} bài viết, không thể xóa.</div>` : ''}</div>
      <button class="btn sm" data-act="cat-edit" data-id="${c.id}">✏️</button><button class="btn sm" style="color:#DC2626" ${n ? 'disabled title="Chuyên mục đang chứa bài viết"' : ''} data-act="cat-del" data-id="${c.id}">🗑</button></div>`; }).join('');
}

/* ---------- RENDER ---------- */
function renderView() {
  let n = S.route.name;
  if (n === 'admin' && role() !== 'admin') n = 'home';
  if ((n === 'profile' || n === 'editor') && !cur()) n = 'home';
  if (n !== S.route.name) S.route = { name: n, id: null };
  const v = { home: viewHome, article: () => viewDetail(S.route.id), profile: viewProfile, editor: () => viewEditor(S.route.id), admin: viewAdmin }[n]();
  $('#view').innerHTML = v;
}
const renderAll = () => { renderHeader(); renderView(); };

/* ---------- AUTH ---------- */
function authModal(mode, msg) {
  const reg = mode === 'register';
  openModal(reg ? 'Đăng ký tài khoản' : 'Đăng nhập', `${msg ? `<div class="banner" id="aBanner">⚠️ <span>${esc(msg)}</span></div>` : '<div id="aBanner"></div>'}
    <form id="fAuth" data-mode="${mode}" novalidate>
    ${reg ? '<div class="field"><label class="lb">Họ và tên</label><input class="input" id="a_name"><div class="err" id="er_name"></div></div>' : ''}
    <div class="field"><label class="lb">Email</label><input class="input" type="email" id="a_email"><div class="err" id="er_email"></div></div>
    <div class="field"><label class="lb">Mật khẩu</label><input class="input" type="password" id="a_pw"><div class="err" id="er_pw"></div></div>
    ${reg ? '<div class="field"><label class="lb">Xác nhận mật khẩu</label><input class="input" type="password" id="a_pw2"><div class="err" id="er_pw2"></div></div>' : ''}
    <button class="btn primary full">${reg ? 'Tạo tài khoản' : 'Đăng nhập'}</button></form>
    <p style="text-align:center;font-size:14px;margin:16px 0 0">${reg ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <button class="link" data-act="${reg ? 'login' : 'register'}">${reg ? 'Đăng nhập' : 'Đăng ký'}</button></p>`);
}
function submitAuth(form) {
  const reg = form.dataset.mode === 'register', v = (id) => ($(id)?.value ?? '');
  const name = v('#a_name').trim(), email = v('#a_email').trim(), pw = v('#a_pw'), pw2 = v('#a_pw2');
  const er = { name: reg && !name ? 'Vui lòng nhập họ tên.' : '', email: /^\S+@\S+\.\S+$/.test(email) ? '' : 'Email không hợp lệ.',
    pw: pw.length >= 8 ? '' : 'Mật khẩu tối thiểu 8 ký tự.', pw2: reg && pw2 !== pw ? 'Mật khẩu xác nhận không khớp.' : '' };
  ['name', 'email', 'pw', 'pw2'].forEach((k) => { const el = $('#er_' + k); if (el) el.textContent = er[k]; });
  if (Object.values(er).some(Boolean)) return;
  const banner = (m) => { $('#aBanner').outerHTML = `<div class="banner" id="aBanner">⚠️ <span>${esc(m)}</span></div>`; };
  if (reg) {
    if (S.db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return banner('Email này đã được đăng ký.');
    const u = { id: uid('u'), full_name: name, email, password: pw, avatar_url: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`, role: 'member', status: 'active', bio: '', created_at: Date.now() };
    S.db.users.push(u); S.cur = u.id; toast('success', 'Đăng ký thành công!');
  } else {
    const u = S.db.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u || u.password !== pw) return banner('Email hoặc mật khẩu không đúng.');
    if (u.status === 'locked') return banner('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
    S.cur = u.id; toast('success', `Chào mừng ${u.full_name} quay lại!`);
  }
  closeModal(); renderAll();
}

/* ---------- ACTIONS ---------- */
const needLogin = () => authModal('login', 'Bạn cần đăng nhập để bình luận.');
const upd = (arr, id, p) => { const x = S.db[arr].find((y) => y.id === id); if (x) Object.assign(x, p); return x; };
const A = {
  'close-modal': closeModal,
  'confirm-ok': () => { const f = S.onOk; closeModal(); if (f) f(); },
  'toggle-menu': () => { const d = $('#dd'); d.hidden = !d.hidden; },
  home: () => filter({ q: '', cat: null, tag: null }),
  cat: (d) => filter({ cat: d.id, tag: null }),
  'cat-from': (d) => filter({ cat: d.id, tag: null, q: '' }),
  tag: (d) => filter({ tag: S.f.tag === d.id ? null : d.id }),
  'tag-from': (d) => filter({ tag: d.id, cat: null, q: '' }),
  page: (d) => { S.f.page = +d.n; renderView(); scrollTop(); },
  article: (d) => go('article', d.id),
  login: () => authModal('login'),
  register: () => authModal('register'),
  logout: () => { S.cur = null; S.route = { name: 'home', id: null }; renderAll(); toast('success', 'Đã đăng xuất.'); },
  role: (d) => {
    if (d.r === 'guest') S.cur = null;
    else if (role() !== d.r) { const u = S.db.users.find((x) => x.role === d.r && x.status === 'active'); if (u) S.cur = u.id; }
    toast('success', `Đã chuyển sang chế độ ${{ guest: 'Khách', member: 'Thành viên', admin: 'Quản trị viên' }[d.r]}.`);
    renderAll();
  },
  profile: () => go('profile'),
  admin: () => go('admin'),
  'editor-new': () => go('editor'),
  'editor-edit': (d) => go('editor', d.id),
  'need-login': needLogin,
  'cmt-send': (d) => {
    if (!cur()) return needLogin();
    const t = $('#cText').value.trim();
    if (!t) return toast('warning', 'Vui lòng nhập nội dung bình luận.');
    S.db.comments.push({ id: uid('m'), article_id: d.id, user_id: cur().id, content: t, created_at: Date.now() });
    $('#cText').value = ''; $('#cLen').textContent = '0/1000'; refreshComments(d.id); toast('success', 'Đã gửi bình luận.');
  },
  'cmt-del': (d) => ask('Xóa bình luận này?', () => { S.db.comments = S.db.comments.filter((c) => c.id !== d.id); refreshComments(S.route.id); toast('success', 'Đã xóa bình luận.'); }),
  'tag-toggle': (d) => { const i = E.tagIds.indexOf(d.id); i < 0 ? E.tagIds.push(d.id) : E.tagIds.splice(i, 1); $('#tagBox').innerHTML = tagsHtml(); },
  'tag-add': () => {
    const n = $('#newTag').value.trim(); if (!n) return;
    let t = S.db.tags.find((x) => x.name.toLowerCase() === n.toLowerCase());
    if (!t) { t = { id: uid('t'), name: n, slug: slugify(n) }; S.db.tags.push(t); }
    if (!E.tagIds.includes(t.id)) E.tagIds.push(t.id);
    $('#newTag').value = ''; $('#tagBox').innerHTML = tagsHtml();
  },
  'ed-submit': submitEditor,
  atab: (d) => { S.admin.tab = d.t; renderView(); },
  'a-pub': (d) => { upd('articles', d.id, { status: 'published', reject_reason: null }); toast('success', 'Đã duyệt xuất bản bài viết.'); renderView(); },
  'a-rej': (d) => openModal('Từ chối bài viết', `<form id="fReject" data-id="${d.id}"><p style="font-size:14px;font-weight:600;margin:0 0 8px">${esc(S.db.articles.find((a) => a.id === d.id)?.title)}</p>
    <label class="lb">Lý do từ chối *</label><textarea class="input" id="r_reason"></textarea><div class="dlg-f"><button type="button" class="btn" data-act="close-modal">Hủy</button><button class="btn danger">Xác nhận từ chối</button></div></form>`),
  'a-feat': (d) => { const a = S.db.articles.find((x) => x.id === d.id); a.is_featured = !a.is_featured; toast('success', a.is_featured ? 'Đã đặt làm tin nổi bật.' : 'Đã bỏ tin nổi bật.'); renderView(); },
  'a-del': (d) => ask('Xóa bài viết này? Các bình luận của bài cũng sẽ bị xóa.', () => {
    S.db.articles = S.db.articles.filter((a) => a.id !== d.id); S.db.comments = S.db.comments.filter((c) => c.article_id !== d.id);
    S.db.article_images = S.db.article_images.filter((i) => i.article_id !== d.id); toast('success', 'Đã xóa bài viết.'); renderView();
  }),
  'u-role': (d) => {
    if (d.id === S.cur) return toast('warning', 'Bạn không thể tự hạ quyền của chính mình.');
    const u = userOf(d.id); u.role = u.role === 'admin' ? 'member' : 'admin';
    toast('success', u.role === 'admin' ? 'Đã nâng quyền lên Quản trị viên.' : 'Đã hạ quyền xuống Thành viên.'); renderView();
  },
  'u-lock': (d) => {
    if (d.id === S.cur) return toast('warning', 'Bạn không thể tự khóa tài khoản của chính mình.');
    const u = userOf(d.id); u.status = u.status === 'active' ? 'locked' : 'active';
    toast('success', u.status === 'locked' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.'); renderView();
  },
  'cm-del': (d) => ask('Xóa bình luận vi phạm này?', () => { S.db.comments = S.db.comments.filter((c) => c.id !== d.id); toast('success', 'Đã xóa bình luận.'); renderView(); }),
  'cat-edit': (d) => {
    const c = catOf(d.id);
    $('#c_id').value = c.id; $('#c_name').value = c.name; $('#c_slug').value = c.slug; $('#c_desc').value = c.description;
    $('#cTitle').textContent = 'Sửa chuyên mục'; $('#c_btn').textContent = 'Lưu thay đổi'; $('#c_cancel').hidden = false; $('#c_name').focus();
  },
  'cat-cancel': renderView,
  'cat-del': (d) => {
    if (S.db.articles.some((a) => a.category_id === d.id)) return toast('warning', 'Không thể xóa chuyên mục đang chứa bài viết.');
    ask(`Xóa chuyên mục "${catOf(d.id).name}"?`, () => { S.db.categories = S.db.categories.filter((c) => c.id !== d.id); toast('success', 'Đã xóa chuyên mục.'); updateNav(); renderView(); });
  },
};

const FORMS = {
  fAuth: submitAuth,
  fReject: (f) => {
    const r = $('#r_reason').value.trim();
    if (!r) return toast('warning', 'Vui lòng nhập lý do từ chối.');
    upd('articles', f.dataset.id, { status: 'rejected', reject_reason: r, is_featured: false });
    closeModal(); toast('success', 'Đã từ chối bài viết.'); renderView();
  },
  fProfile: () => {
    const n = $('#p_name').value.trim();
    if (!n) return toast('warning', 'Họ tên không được để trống.');
    Object.assign(cur(), { full_name: n, bio: $('#p_bio').value }); toast('success', 'Đã cập nhật hồ sơ.'); renderHeader();
  },
  fPw: () => {
    const o = $('#w_old').value, n = $('#w_new').value, c = $('#w_cf').value;
    if (o !== cur().password) return toast('error', 'Mật khẩu cũ không đúng.');
    if (n.length < 8) return toast('warning', 'Mật khẩu mới tối thiểu 8 ký tự.');
    if (n !== c) return toast('warning', 'Mật khẩu xác nhận không khớp.');
    cur().password = n; $('#fPw').reset(); toast('success', 'Đã đổi mật khẩu.');
  },
  fCat: () => {
    const name = $('#c_name').value.trim(), id = $('#c_id').value;
    if (!name) return toast('warning', 'Vui lòng nhập tên chuyên mục.');
    const slug = slugify($('#c_slug').value || name);
    if (S.db.categories.some((c) => c.slug === slug && c.id !== id)) return toast('error', 'Slug đã tồn tại.');
    const data = { name, slug, description: $('#c_desc').value };
    if (id) Object.assign(catOf(id), data); else S.db.categories.push({ id: uid('c'), ...data });
    toast('success', id ? 'Đã cập nhật chuyên mục.' : 'Đã thêm chuyên mục.'); updateNav(); renderView();
  },
};

/* ---------- EVENTS ---------- */
document.addEventListener('click', (e) => {
  if (!e.target.closest('.menuwrap')) { const d = $('#dd'); if (d) d.hidden = true; }
  if (e.target.closest('.dropdown')) { const d = $('#dd'); if (d) d.hidden = true; }
  if (e.target.classList.contains('overlay')) return closeModal();
  const el = e.target.closest('[data-act]');
  if (el && A[el.dataset.act]) A[el.dataset.act](el.dataset, el, e);
});
document.addEventListener('mousedown', (e) => {
  const b = e.target.closest('[data-cmd]');
  if (!b) return;
  e.preventDefault();
  $('#ed').focus();
  document.execCommand(b.dataset.cmd, false, b.dataset.v || null);
});
document.addEventListener('submit', (e) => { e.preventDefault(); const f = FORMS[e.target.id]; if (f) f(e.target); });
document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'q') { S.f.q = e.target.value; S.f.page = 1; S.route = { name: 'home', id: null }; renderView(); updateNav(); }
  else if (id === 'cText') { const l = $('#cLen'); l.textContent = e.target.value.length + '/1000'; l.classList.toggle('warn', e.target.value.length > 900); }
  else if (id === 'uq') { S.admin.uq = e.target.value; $('#uList').innerHTML = usersTable(); }
});
document.addEventListener('change', (e) => {
  const t = e.target, id = t.id;
  if (id === 'aSt') { S.admin.st = t.value; renderView(); }
  else if (id === 'ur' || id === 'us') { S.admin[id] = t.value; $('#uList').innerHTML = usersTable(); }
  else if (id === 'avatarFile' && t.files[0]) readImage(t.files[0], (url) => { cur().avatar_url = url; toast('success', 'Đã đổi ảnh đại diện.'); renderHeader(); renderView(); }, (m) => toast('error', m));
  else if (id === 'thumbFile' && t.files[0]) readImage(t.files[0], (url) => { E.thumb = url; $('#thumbBox').innerHTML = thumbHtml() + '<input type="file" id="thumbFile" accept=".jpg,.jpeg,.png,.webp" hidden>'; }, (m) => toast('error', m));
  else if (id === 'imgFiles') {
    [...t.files].forEach((file) => readImage(file, (url) => {
      $('#ed').focus();
      document.execCommand('insertHTML', false, `<figure><img src="${url}" alt=""><figcaption>Nhập chú thích ảnh</figcaption></figure><p><br></p>`);
    }, (m) => toast('error', `${file.name}: ${m}`)));
    t.value = '';
  }
  if ((id === 'avatarFile' || id === 'thumbFile') && !t.files[0]) return;
});
document.addEventListener('keydown', (e) => { if (e.target.id === 'newTag' && e.key === 'Enter') { e.preventDefault(); A['tag-add'](); } });

renderAll();
})();
