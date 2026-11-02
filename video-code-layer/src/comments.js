// Duo 书本态 secondary pane: Comments (Figma › Video › Screen · book, Comment.Item instances).
// Avatars exported from the same frame into assets/avatars/.
import { html, useState, cx } from './lib.js';
import { Icon } from './icons.js';

const A = './assets/avatars/';

export const COMMENTS = [
  { name: 'lehbro', time: '4 days ago', likes: 1, tag: 'Author liked', text: 'I tried the classic sticky rice cakes from a stall near the main canal and they were so good. Highly recommend grabbing some local snacks before you hop on the boat.' },
  { name: 'itsgiving', time: 'Oct 21', likes: 0, text: 'The boat ride was short but really gave a new perspective of the town. I’d say it’s worth the extra 40 yuan for at least one trip, especially around sunset.' },
  { name: 'bussin', time: 'Oct 18', likes: 0, text: 'If you’re into souvenirs, there’s a surprising amount of handmade stuff like fans and little paintings. I snagged a watercolor of a bridge for my desk.' },
  { name: 'PowerLah', time: 'Oct 13', likes: 0, text: 'I brought my parents and they loved the slower pace compared to downtown Shanghai. The whole place is super walkable, so it was easy for them to keep up.' },
  { name: 'RubyGoesOut', time: 'Oct 5', likes: 0, text: 'If you come on a weekday, it’s so much calmer. I barely saw any big tour groups and got to chat with a few local shop owners about the history of the town.' },
  { name: 'notbadleh', time: 'Oct 5', likes: 0, text: 'I wish there were more signs in English, but the area map from the Tourist Info center actually helped a lot. Don’t skip grabbing one when you arrive.' },
  { name: 'snackeh', time: '7 hours ago', likes: 0, text: 'I’m a local and I still come here when I want to escape the city noise. It’s touristy, but there’s something about the water and old buildings that always calms me down.' },
  { name: 'beenknew', time: 'Sep 23', likes: 0, text: 'I tried both the bus and the canal boat from the metro station, and the boat was definitely more scenic, though a bit pricier. The bus is quick if you’re short on time.' },
  { name: 'LaksaLover', time: 'Sep 23', likes: 0, text: 'The tea houses along the river are a perfect pit stop. I spent way too long people-watching with a pot of jasmine tea. Prices were reasonable too.' },
  { name: 'kosongla', time: 'Sep 4', likes: 0, text: 'Anyone else get major Spirited Away feels from those narrow lanes and bridges? It’s like stepping into another world for the afternoon.' },
  { name: 'Yana Mi', time: 'Jul 27', likes: 0, viewOriginal: true, text: 'You have such a wonderful top. Could you please tell me where you bought it?' },
].map((c) => ({ ...c, avatar: A + c.name.toLowerCase().replace(/\s+/g, '') + '.jpg' }));

// Comment.Item — avatar 36, meta 12/18, body 16/24 clamped to 3 lines with an expand chevron, actions row 24
function CommentItem({ c, last }) {
  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const long = c.text.length > 110;
  return html`<div class="cm-item">
    ${c.avatar ? html`<img class="cm-avatar" src=${c.avatar} alt="" />` : html`<span class="cm-avatar me"></span>`}
    <div class="cm-content">
      <div class="cm-meta"><span class="cm-name">${c.name}</span><span class="cm-time">${c.time}</span></div>
      <div class=${cx('cm-body', long && !open && 'clamped')}>
        <span class="cm-text">${c.text}</span>
        ${long && html`<button class=${cx('cm-expand', open && 'open')} aria-label=${open ? 'Collapse' : 'Expand'} onClick=${() => setOpen(!open)}><${Icon} name="arrow_down_outlined" size=${16} /></button>`}
      </div>
      ${c.viewOriginal && html`<button class="cm-original">View original</button>`}
      <div class="cm-actions">
        <div>${c.tag && html`<span class="cm-tag">${c.tag}</span>`}</div>
        <div class="cm-right">
          <button class=${cx('cm-like', liked && 'on')} onClick=${() => setLiked(!liked)}><${Icon} name="thumbs_up_outlined" size=${16} /><span>${c.likes + (liked ? 1 : 0)}</span></button>
          <button aria-label="Reply"><${Icon} name="comment_outlined" size=${16} /></button>
          <button aria-label="More"><${Icon} name="more_ios" size=${16} /></button>
        </div>
      </div>
      ${!last && html`<i class="cm-divider"></i>`}
    </div>
  </div>`;
}

// Comments sent in the demo survive closing and reopening the pane
let sent = [];
export const commentCount = () => sent.length + COMMENTS.length;

export function CommentsPane({ onClose, inset = 12, closable = true }) {
  const [mine, setMine] = useState(sent);
  const [draft, setDraft] = useState('');
  const list = [...mine, ...COMMENTS];
  const send = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    sent = [{ name: 'You', time: 'Just now', likes: 0, text }, ...sent];
    setMine(sent);
    setDraft('');
  };
  return html`<div class="cm-pane" style=${`--cm-inset:${inset}px`}>
    <div class=${cx('cm-head', !closable && 'no-close')}>
      ${closable && html`<button class="cm-close" aria-label="Close comments" onClick=${onClose}><${Icon} name="close_outlined" size=${24} /></button>`}
      <div class="cm-title">${list.length} comments</div>
    </div>
    <div class="cm-list">
      ${list.map((c, i) => html`<${CommentItem} key=${c.name + c.text.length + i} c=${c} last=${i === list.length - 1} />`)}
      <div class="cm-end">– No more results –</div>
    </div>
    <form class="cm-input" onSubmit=${send}>
      <input value=${draft} onInput=${(e) => setDraft(e.target.value)} placeholder="Say something" aria-label="Say something" />
    </form>
  </div>`;
}
