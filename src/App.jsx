import { useState, useEffect, useRef } from "react";
import * as db from "./lib/supabase.js";

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #080808; }
  ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
  input,textarea { outline: none; }
  input::placeholder,textarea::placeholder { color: #333; }
`;
const AC = "#C8FF00";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 9);
const initials = n => (n || "??").slice(0, 2).toUpperCase();
const timeAgo = ts => {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s/60)}min`;
  if (s < 86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}j`;
};
const hotScore = m => (m.likes - m.dislikes) / Math.pow((Date.now() - new Date(m.created_at || m.timestamp).getTime()) / 3600000 + 2, 1.5);
const sortMemes = (arr, tab) => {
  const a = [...arr];
  if (tab === "hot") return a.sort((x, y) => hotScore(y) - hotScore(x));
  if (tab === "new") return a.sort((x, y) => new Date(y.created_at||y.timestamp) - new Date(x.created_at||x.timestamp));
  if (tab === "top") return a.sort((x, y) => y.likes - x.likes);
  return a;
};

// normalize DB row → app format
const normMeme = r => ({
  id: r.id, title: r.title, imageUrl: r.image_url,
  texts: Array.isArray(r.texts) ? r.texts : (typeof r.texts === "string" ? JSON.parse(r.texts) : []),
  author: r.author, tags: r.tags || [],
  likes: r.likes || 0, dislikes: r.dislikes || 0,
  timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  created_at: r.created_at,
});
const normComment = r => ({
  id: r.id, memeId: r.meme_id, author: r.author,
  text: r.text, likes: r.likes || 0,
  timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
});

const TEMPLATES = [
  { id:"t1",  name:"Nuit Violette",      emoji:"🌌", bg:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)" },
  { id:"t2",  name:"Feu",               emoji:"🔥", bg:"linear-gradient(135deg,#f12711,#f5af19)" },
  { id:"t3",  name:"Océan",             emoji:"🌊", bg:"linear-gradient(135deg,#0575e6,#021b79)" },
  { id:"t4",  name:"Matrix",            emoji:"💻", bg:"linear-gradient(135deg,#000000,#0a2a0a,#00ff41,#000000)" },
  { id:"t5",  name:"Coucher de soleil", emoji:"🌅", bg:"linear-gradient(135deg,#f7971e,#ffd200)" },
  { id:"t6",  name:"Néon Rose",         emoji:"💜", bg:"linear-gradient(135deg,#f953c6,#b91d73)" },
  { id:"t7",  name:"Forêt",             emoji:"🌲", bg:"linear-gradient(135deg,#134e5e,#71b280)" },
  { id:"t8",  name:"Glace",             emoji:"❄️", bg:"linear-gradient(135deg,#a8edea,#fed6e3)" },
  { id:"t9",  name:"Minuit",            emoji:"🌙", bg:"linear-gradient(135deg,#232526,#414345)" },
  { id:"t10", name:"Lave",              emoji:"🌋", bg:"linear-gradient(135deg,#200122,#6f0000)" },
  { id:"t11", name:"Aurora",            emoji:"🌠", bg:"linear-gradient(135deg,#00c3ff,#ffff1c)" },
  { id:"t12", name:"Or Noir",           emoji:"✨", bg:"linear-gradient(135deg,#0f0c29,#c6a855)" },
  { id:"t13", name:"Cyber",             emoji:"🤖", bg:"linear-gradient(135deg,#000000,#001f3f,#00d2ff)" },
  { id:"t14", name:"Sakura",            emoji:"🌸", bg:"linear-gradient(135deg,#ff9a9e,#fecfef,#ffecd2)" },
  { id:"t15", name:"Arcade",            emoji:"🕹️", bg:"linear-gradient(135deg,#1a1a2e,#16213e,#e94560)" },
  { id:"t16", name:"Tempête",           emoji:"⚡", bg:"linear-gradient(135deg,#373b44,#4286f4)" },
  { id:"t17", name:"Désert",            emoji:"🏜️", bg:"linear-gradient(135deg,#c79081,#dfa579)" },
  { id:"t18", name:"Poison",            emoji:"☠️", bg:"linear-gradient(135deg,#11998e,#38ef7d)" },
  { id:"t19", name:"Rétro",             emoji:"📺", bg:"linear-gradient(135deg,#fc4a1a,#f7b733)" },
  { id:"t20", name:"Cosmos",            emoji:"🚀", bg:"linear-gradient(135deg,#1f005c,#5b0060,#870160,#ac255e,#ca485c)" },
  { id:"t21", name:"Pastel",            emoji:"🎨", bg:"linear-gradient(135deg,#a18cd1,#fbc2eb)" },
  { id:"t22", name:"Jungle",            emoji:"🐆", bg:"linear-gradient(135deg,#1d6f42,#52c234)" },
  { id:"t23", name:"Blanc pur",         emoji:"☁️", bg:"linear-gradient(135deg,#f5f7fa,#c3cfe2)" },
  { id:"t24", name:"Enfer",             emoji:"😈", bg:"linear-gradient(135deg,#1a0000,#8b0000,#ff4500)" },
  { id:"t25", name:"Hologramme",        emoji:"💠", bg:"linear-gradient(135deg,#00c6fb,#005bea,#a855f7,#ec4899)" },
];
const BG_PREFIX = "bg:";
const isBg = url => url?.startsWith(BG_PREFIX);
const getBg = url => url?.slice(BG_PREFIX.length);
const mkTxt = (text="TEXTE", x=50, y=10) => ({ id:uid(), text, x, y, fontSize:36, color:"#ffffff", bold:true });

const txtStyle = (t, extra={}) => ({
  fontFamily:"Impact,'Arial Black',sans-serif",
  fontSize:`${t.fontSize||32}px`,
  color:t.color||"#fff",
  textTransform:"uppercase",
  textShadow:"2px 2px 0 #000,-2px 2px 0 #000,2px -2px 0 #000,-2px -2px 0 #000",
  lineHeight:1.2, whiteSpace:"pre-wrap", textAlign:"center", display:"block",
  pointerEvents:"none", userSelect:"none", ...extra,
});

const MemeRender = ({ meme, maxH }) => (
  <div style={{ position:"relative", lineHeight:0, overflow:"hidden",
    background: isBg(meme.imageUrl) ? getBg(meme.imageUrl) : "#111",
    minHeight: isBg(meme.imageUrl) ? (maxH || 220) : undefined,
  }}>
    {!isBg(meme.imageUrl) && (
      <img src={meme.imageUrl} alt={meme.title}
        style={{ width:"100%", display:"block", ...(maxH?{maxHeight:maxH,objectFit:"cover"}:{}) }}
        onError={e=>{ e.target.style.minHeight="100px"; e.target.style.background="#1a1a1a"; }} />
    )}
    {(meme.texts||[]).map(t=>(
      <div key={t.id} style={{ position:"absolute", left:`${t.x}%`, top:`${t.y}%`, transform:"translate(-50%,-50%)", pointerEvents:"none", maxWidth:"92%" }}>
        <span style={txtStyle(t)}>{t.text}</span>
      </div>
    ))}
  </div>
);

const Av = ({ name, size=40 }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:"#181818", border:`2px solid ${AC}`,
    display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif",
    fontSize:Math.floor(size*0.38)+"px", color:AC, flexShrink:0 }}>
    {initials(name)}
  </div>
);

const COLORS = ["#ffffff","#000000","#ffff00","#ff4444","#44aaff","#ff8800","#44ff88","#ff44ff","#ccff00"];

export default function App() {
  const [memes, setMemes]     = useState([]);
  const [votes, setVotes]     = useState({});   // { meme_id: 'up'|'down' }
  const [comments, setCmts]   = useState({});   // { meme_id: [comment] }
  const [cVotes, setCVotes]   = useState({});   // { `${meme_id}_${comment_id}`: true }
  const [follows, setFollows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState(() => localStorage.getItem("mh_user") || null);
  const [view, setView]         = useState("feed");
  const [viewUser, setViewUser] = useState(null);
  const [tab, setTab]           = useState("hot");
  const [feedFilter, setFeedFilter] = useState("all");
  const [search, setSearch]     = useState("");
  const [searchMode, setSearchMode] = useState("memes");
  const [detailMeme, setDetailMeme] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [toast, setToast] = useState(null);

  const [authGate, setAuthGate]     = useState(null);
  const [authInput, setAuthInput]   = useState("");
  const [authPwd, setAuthPwd]       = useState("");
  const [authStep, setAuthStep]     = useState("choose");
  const [loginInput, setLoginInput] = useState("");
  const [loginPwd, setLoginPwd]     = useState("");
  const [loginErr, setLoginErr]     = useState("");

  const [crStep, setCrStep]         = useState(1);
  const [crImageUrl, setCrImageUrl] = useState("");
  const [crCustomUrl, setCrCustomUrl] = useState("");
  const [crUrlBroken, setCrUrlBroken] = useState(false);
  const [crTexts, setCrTexts]       = useState([mkTxt("TEXTE DU HAUT",50,8), mkTxt("TEXTE DU BAS",50,88)]);
  const [crTitle, setCrTitle]       = useState("");
  const [crTags, setCrTags]         = useState("");
  const [selectedTxt, setSelectedTxt] = useState(null);
  const imgRef  = useRef(null);
  const dragRef = useRef(null);
  const fileRef = useRef(null);

  // ── LOAD ALL DATA FROM SUPABASE ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [rawMemes, rawComments] = await Promise.all([
        db.getMemes(),
        db.getComments(),
      ]);
      if (rawMemes) setMemes(rawMemes.map(normMeme));
      if (rawComments) {
        const grouped = {};
        rawComments.forEach(c => {
          const nc = normComment(c);
          if (!grouped[nc.memeId]) grouped[nc.memeId] = [];
          grouped[nc.memeId].push(nc);
        });
        setCmts(grouped);
      }
      if (username) {
        const [rawVotes, rawCVotes, rawFollows] = await Promise.all([
          db.getVotesByUser(username),
          db.getCommentVotesByUser(username),
          db.getFollowsByUser(username),
        ]);
        if (rawVotes) {
          const v = {};
          rawVotes.forEach(r => { v[r.meme_id] = r.direction; });
          setVotes(v);
        }
        if (rawCVotes) {
          const cv = {};
          rawCVotes.forEach(r => { cv[`${r.comment_id}`] = true; });
          setCVotes(cv);
        }
        if (rawFollows) setFollows(rawFollows.map(r => r.followed));
      }
      setLoading(false);
    })();
  }, [username]);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const needAuth = (action) => { if (!username) { setAuthGate(action); setAuthStep("choose"); return true; } return false; };

  // ── AUTH ──
  const doRegister = async () => {
    const name = authInput.trim(); const pwd = authPwd.trim();
    if (!name || name.length < 3) return setLoginErr("Pseudo trop court (min 3 caractères)");
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(name)) return setLoginErr("Pseudo : lettres, chiffres, _ - . seulement");
    if (!pwd || pwd.length < 4) return setLoginErr("Mot de passe trop court (min 4 caractères)");
    const existing = await db.getUserByName(name);
    if (existing && existing.length > 0) return setLoginErr("Pseudo déjà pris !");
    const res = await db.insertUser(name, pwd);
    if (!res) return setLoginErr("Erreur serveur, réessaie.");
    localStorage.setItem("mh_user", name);
    setUsername(name);
    setAuthGate(null); setAuthInput(""); setAuthPwd(""); setLoginErr("");
    showToast(`Bienvenue @${name} ! 🎉`);
  };

  const doLogin = async () => {
    const name = loginInput.trim(); const pwd = loginPwd.trim();
    const res = await db.getUserByName(name);
    if (!res || res.length === 0) return setLoginErr("Compte introuvable.");
    if (res[0].password !== pwd) return setLoginErr("Mot de passe incorrect.");
    localStorage.setItem("mh_user", res[0].username);
    setUsername(res[0].username);
    setAuthGate(null); setLoginInput(""); setLoginPwd(""); setLoginErr("");
    showToast(`Content de te revoir @${res[0].username} !`);
  };

  const doLogout = () => {
    localStorage.removeItem("mh_user");
    setUsername(null); setVotes({}); setFollows({}); setCVotes({});
    setView("feed");
  };

  // ── VOTE ──
  const handleVote = async (id, dir) => {
    if (needAuth("vote")) return;
    const cur = votes[id];
    const newDir = cur === dir ? null : dir;

    // optimistic UI
    setMemes(p => p.map(m => {
      if (m.id !== id) return m;
      let { likes, dislikes } = m;
      if (cur === "up") likes--;
      if (cur === "down") dislikes--;
      if (newDir === "up") likes++;
      if (newDir === "down") dislikes++;
      return { ...m, likes: Math.max(0, likes), dislikes: Math.max(0, dislikes) };
    }));
    if (detailMeme?.id === id) setDetailMeme(prev => {
      let { likes, dislikes } = prev;
      if (cur === "up") likes--; if (cur === "down") dislikes--;
      if (newDir === "up") likes++; if (newDir === "down") dislikes++;
      return { ...prev, likes: Math.max(0, likes), dislikes: Math.max(0, dislikes) };
    });
    setVotes(p => ({ ...p, [id]: newDir }));

    // persist
    const updated = memes.find(m => m.id === id);
    if (updated) {
      let { likes, dislikes } = updated;
      if (cur === "up") likes--; if (cur === "down") dislikes--;
      if (newDir === "up") likes++; if (newDir === "down") dislikes++;
      await db.updateMemeLikes(id, Math.max(0, likes), Math.max(0, dislikes));
    }
    if (newDir) await db.upsertVote(username, id, newDir);
    else await db.deleteVote(username, id);
  };

  // ── FOLLOW ──
  const handleFollow = async user => {
    if (needAuth("follow")) return;
    const isF = follows.includes(user);
    setFollows(p => isF ? p.filter(u => u !== user) : [...p, user]);
    showToast(isF ? `Désabonné de @${user}` : `Abonné à @${user} !`);
    if (isF) await db.deleteFollow(username, user);
    else await db.insertFollow(username, user);
  };

  // ── COMMENT ──
  const postComment = async () => {
    if (needAuth("comment")) return;
    if (!commentText.trim() || !detailMeme) return;
    const nc = { id: uid(), memeId: detailMeme.id, author: username, text: commentText.trim(), likes: 0, timestamp: Date.now() };
    setCmts(p => ({ ...p, [detailMeme.id]: [...(p[detailMeme.id]||[]), nc] }));
    setCommentText("");
    await db.insertComment(nc);
  };

  const voteComment = async (mId, cId) => {
    if (needAuth("vote")) return;
    const key = cId; const liked = cVotes[key];
    setCmts(p => ({ ...p, [mId]: (p[mId]||[]).map(c => c.id===cId ? {...c, likes: c.likes+(liked?-1:1)} : c) }));
    setCVotes(p => ({ ...p, [key]: !liked }));
    const comment = (comments[mId]||[]).find(c => c.id === cId);
    if (comment) await db.updateCommentLikes(cId, comment.likes + (liked ? -1 : 1));
    if (liked) await db.deleteCommentVote(username, cId);
    else await db.insertCommentVote(username, cId);
  };

  // ── FILE UPLOAD ──
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("Fichier non supporté !");
    if (file.size > 5 * 1024 * 1024) return showToast("Image trop lourde (max 5 Mo)");
    const reader = new FileReader();
    reader.onload = ev => { setCrImageUrl(ev.target.result); setCrCustomUrl(""); setCrUrlBroken(false); };
    reader.readAsDataURL(file);
  };

  // ── DELETE MEME ──
  const deleteMeme = async (id) => {
    if (!window.confirm("Supprimer ce mème définitivement ?")) return;
    setMemes(p => p.filter(m => m.id !== id));
    if (detailMeme?.id === id) setDetailMeme(null);
    showToast("Mème supprimé 🗑️");
    await db.deleteMeme(id);
  };

  // ── PUBLISH ──
  const publishMeme = async () => {
    if (needAuth("create")) return;
    if (!crTitle.trim() || !crImageUrl) return;
    const nm = {
      id: uid(), title: crTitle.trim(), imageUrl: crImageUrl,
      texts: crTexts.filter(t => t.text.trim()),
      author: username, timestamp: Date.now(), likes: 1, dislikes: 0,
      tags: crTags.split(",").map(t => t.trim()).filter(Boolean),
      created_at: new Date().toISOString(),
    };
    setMemes(p => [nm, ...p]);
    setVotes(p => ({ ...p, [nm.id]: "up" }));
    setCrStep(1); setCrImageUrl(""); setCrCustomUrl(""); setCrUrlBroken(false); setCrTitle(""); setCrTags("");
    setCrTexts([mkTxt("TEXTE DU HAUT",50,8), mkTxt("TEXTE DU BAS",50,88)]); setSelectedTxt(null);
    setView("feed"); showToast("Mème publié ! 🎉");
    await db.insertMeme(nm);
    await db.upsertVote(username, nm.id, "up");
  };

  // ── CREATOR DRAG ──
  const startDrag = (e, textId) => {
    e.preventDefault(); e.stopPropagation();
    const txt = crTexts.find(t => t.id === textId); if (!txt) return;
    dragRef.current = { textId, startCX:e.clientX, startCY:e.clientY, startTX:txt.x, startTY:txt.y };
    setSelectedTxt(textId);
    const move = ev => {
      const d = dragRef.current; if (!d || !imgRef.current) return;
      const r = imgRef.current.getBoundingClientRect();
      const dx = ((ev.clientX - d.startCX) / r.width) * 100;
      const dy = ((ev.clientY - d.startCY) / r.height) * 100;
      setCrTexts(p => p.map(t => t.id === d.textId ? { ...t, x:clamp(d.startTX+dx,2,95), y:clamp(d.startTY+dy,2,95) } : t));
    };
    const up = () => { dragRef.current = null; window.removeEventListener("pointermove",move); window.removeEventListener("pointerup",up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const addText = () => setCrTexts(p => [...p, mkTxt("NOUVEAU TEXTE", 50, 50)]);
  const delText = id => { setCrTexts(p => p.filter(t => t.id !== id)); if (selectedTxt===id) setSelectedTxt(null); };
  const updText = (id, key, val) => setCrTexts(p => p.map(t => t.id===id ? {...t,[key]:val} : t));

  // ── FEED ──
  let feedMemes = memes;
  if (feedFilter === "following") feedMemes = feedMemes.filter(m => follows.includes(m.author));
  if (search && searchMode === "memes") feedMemes = feedMemes.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) || m.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );
  feedMemes = sortMemes(feedMemes, tab);
  const allCreators = [...new Set(memes.map(m => m.author))];
  const filteredUsers = search && searchMode === "users" ? allCreators.filter(u => u.toLowerCase().includes(search.toLowerCase())) : [];

  // ── STYLES ──
  const S = {
    root:{ fontFamily:"'JetBrains Mono',monospace", background:"#080808", minHeight:"100vh", color:"#e8e8e8", paddingBottom:68 },
    hdr:{ background:"#090909", borderBottom:"1px solid #161616", padding:"10px 14px", position:"sticky", top:0, zIndex:40 },
    logo:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, color:AC, cursor:"pointer" },
    sInp:{ flex:1, background:"#111", border:"1px solid #1e1e1e", borderRadius:6, padding:"7px 12px", color:"#e8e8e8", fontFamily:"inherit", fontSize:12 },
    pill:(a)=>({ background:a?"#181818":"transparent", border:`1px solid ${a?"#2a2a2a":"#1a1a1a"}`, borderRadius:4, padding:"5px 10px", color:a?AC:"#444", fontFamily:"'Bebas Neue',sans-serif", fontSize:13, cursor:"pointer" }),
    tab:(a)=>({ background:a?AC:"transparent", color:a?"#080808":"#555", border:a?"none":"1px solid #1a1a1a", borderRadius:4, padding:"4px 14px", fontFamily:"'Bebas Neue',sans-serif", fontSize:15, cursor:"pointer", flexShrink:0 }),
    tabBar:{ display:"flex", gap:4, padding:"10px 14px 8px", borderBottom:"1px solid #111", overflowX:"auto" },
    grid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(255px,1fr))", gap:12, padding:"12px 14px" },
    card:{ background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:8, overflow:"hidden" },
    inp:{ background:"#0a0a0a", border:"1px solid #1e1e1e", borderRadius:6, padding:"8px 12px", color:"#e8e8e8", fontFamily:"inherit", fontSize:12, width:"100%" },
    lbl:{ fontSize:10, color:"#555", letterSpacing:1, display:"block", marginBottom:4, fontFamily:"'Bebas Neue',sans-serif" },
    overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:80, overflowY:"auto", padding:"1rem" },
    modal:{ background:"#0c0c0c", border:"1px solid #1e1e1e", borderRadius:10, maxWidth:540, margin:"0 auto" },
    bigBtn:(dis)=>({ background:dis?"#181818":AC, border:"none", borderRadius:6, color:dis?"#333":"#080808", fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:1, padding:10, cursor:dis?"not-allowed":"pointer", width:"100%", opacity:dis?0.5:1 }),
    nav:{ position:"fixed", bottom:0, left:0, right:0, background:"#090909", borderTop:"1px solid #181818", display:"flex", zIndex:50 },
    navBtn:(a)=>({ flex:1, background:"transparent", border:"none", color:a?AC:"#444", fontFamily:"'Bebas Neue',sans-serif", fontSize:10, letterSpacing:1, padding:"10px 4px 6px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }),
    vb:(a,t)=>({ background:a?(t==="up"?AC:"#c03030"):"#141414", border:`1px solid ${a?(t==="up"?AC:"#c03030"):"#222"}`, borderRadius:4, color:a?(t==="up"?"#080808":"#fff"):"#555", fontFamily:"inherit", fontSize:12, padding:"3px 10px", cursor:"pointer" }),
    score:v=>({ fontSize:13, fontWeight:700, color:v>0?AC:v<0?"#c03030":"#444", minWidth:28, textAlign:"center" }),
    pHead:{ padding:"1.5rem 14px 1rem", display:"flex", gap:14, alignItems:"flex-start", borderBottom:"1px solid #111" },
    sNum:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:AC, display:"block", lineHeight:1 },
    fBtn:(isF)=>({ background:isF?"transparent":AC, border:`1px solid ${isF?"#2a2a2a":AC}`, borderRadius:6, color:isF?"#555":"#080808", fontFamily:"'Bebas Neue',sans-serif", fontSize:14, padding:"6px 16px", cursor:"pointer" }),
    toast:{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", background:AC, color:"#080808", fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1, padding:"8px 20px", borderRadius:6, zIndex:200, whiteSpace:"nowrap", pointerEvents:"none" },
  };

  const VoteBar = ({ m, sp }) => {
    const sc = m.likes - m.dislikes;
    return <div style={{ display:"flex", gap:6, alignItems:"center" }}>
      <button style={S.vb(votes[m.id]==="up","up")} onClick={e=>{ if(sp)e.stopPropagation(); handleVote(m.id,"up"); }}>▲ {m.likes}</button>
      <span style={S.score(sc)}>{sc>0?"+":""}{sc}</span>
      <button style={S.vb(votes[m.id]==="down","down")} onClick={e=>{ if(sp)e.stopPropagation(); handleVote(m.id,"down"); }}>▼ {m.dislikes}</button>
    </div>;
  };

  const CardGrid = ({ list, empty }) => (
    <div style={S.grid}>
      {!list.length && <div style={{ gridColumn:"1/-1", textAlign:"center", color:"#222", padding:"4rem 0", fontFamily:"'Bebas Neue',sans-serif", fontSize:18 }}>{empty||"Aucun mème ici 👀"}</div>}
      {list.map(m => (
        <div key={m.id} style={{ ...S.card, cursor:"pointer" }} onClick={() => setDetailMeme(m)}>
          <MemeRender meme={m} maxH={260} />
          <div style={{ padding:"10px 12px" }}>
            <p style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"#f0f0f0", lineHeight:1.2, marginBottom:6 }}>{m.title}</p>
            <div style={{ fontSize:11, color:"#444", display:"flex", gap:6, flexWrap:"wrap", alignItems:"center", marginBottom:8 }}>
              <span style={{ color:"#555", cursor:"pointer" }} onClick={e=>{ e.stopPropagation(); setViewUser(m.author); setView("userpage"); }}>@{m.author}</span>
              <span>·</span><span>{timeAgo(m.created_at || m.timestamp)}</span>
              {m.tags?.slice(0,2).map(t=><span key={t} style={{ background:"#161616", border:"1px solid #222", borderRadius:3, padding:"1px 5px", fontSize:10, color:"#555" }}>#{t}</span>)}
            </div>
            <div style={{ display:"flex", alignItems:"center" }}>
              <VoteBar m={m} sp />
              <span style={{ fontSize:11, color:"#444", marginLeft:"auto" }}>💬 {(comments[m.id]||[]).length}</span>
              {m.author === username && (
                <button style={{ background:"transparent", border:"none", color:"#c03030", fontSize:14, cursor:"pointer", marginLeft:8 }}
                  onClick={e=>{ e.stopPropagation(); deleteMeme(m.id); }}>🗑️</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) return (
    <div style={{ background:"#080808", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:AC, letterSpacing:4 }}>MEMEHUB</div>
    </div>
  );

  return (
    <div style={S.root}>
      <style>{FONTS}</style>

      {/* HEADER */}
      <div style={S.hdr}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <span style={S.logo} onClick={()=>setView("feed")}>MEMEHUB</span>
          {username
            ? <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color:AC, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>@{username}</span>
                <button style={{ background:"transparent", border:"1px solid #1e1e1e", borderRadius:5, color:"#555", fontFamily:"inherit", fontSize:11, padding:"4px 10px", cursor:"pointer" }} onClick={doLogout}>Déco.</button>
              </div>
            : <button style={{ background:AC, border:"none", borderRadius:5, color:"#080808", fontFamily:"'Bebas Neue',sans-serif", fontSize:14, letterSpacing:1, padding:"5px 14px", cursor:"pointer" }} onClick={()=>{ setAuthGate("browse"); setAuthStep("choose"); }}>CONNEXION</button>
          }
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <input style={S.sInp} placeholder={searchMode==="memes"?"Rechercher un mème…":"Rechercher un créateur…"} value={search} onChange={e=>setSearch(e.target.value)} />
          <button style={S.pill(searchMode==="memes")} onClick={()=>setSearchMode("memes")}>MÈMES</button>
          <button style={S.pill(searchMode==="users")} onClick={()=>setSearchMode("users")}>CRÉATEURS</button>
        </div>
      </div>

      {/* FEED */}
      {view === "feed" && (<>
        <div style={S.tabBar}>
          {[["hot","🔥 CHAUD"],["new","✨ NOUVEAU"],["top","🏆 TOP"]].map(([k,l])=>(
            <button key={k} style={S.tab(tab===k)} onClick={()=>setTab(k)}>{l}</button>
          ))}
          <div style={{ flex:1 }} />
          <button style={S.tab(feedFilter==="following")} onClick={()=>setFeedFilter(f=>f==="following"?"all":"following")}>
            {feedFilter==="following"?"👥 ABONNEMENTS":"👥 TOUS"}
          </button>
        </div>
        {searchMode==="users" && filteredUsers.length>0 && (
          <div style={{ padding:"10px 14px" }}>
            <div style={{ ...S.lbl, marginBottom:8 }}>CRÉATEURS TROUVÉS</div>
            {filteredUsers.map(u=>(
              <div key={u} style={{ ...S.card, display:"flex", alignItems:"center", gap:12, padding:"10px 14px", cursor:"pointer", marginBottom:6 }} onClick={()=>{ setViewUser(u); setView("userpage"); }}>
                <Av name={u} size={38} />
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:"#e8e8e8" }}>@{u}</div>
                  <div style={{ fontSize:11, color:"#444" }}>{memes.filter(m=>m.author===u).length} mèmes · {memes.filter(m=>m.author===u).reduce((a,m)=>a+m.likes,0)} likes</div>
                </div>
                {u!==username && <button style={{ ...S.fBtn(follows.includes(u)), fontSize:12, padding:"4px 12px" }} onClick={e=>{ e.stopPropagation(); handleFollow(u); }}>{follows.includes(u)?"✓ Suivi":"+ Suivre"}</button>}
              </div>
            ))}
          </div>
        )}
        <CardGrid list={feedMemes} empty={feedFilter==="following"?"Abonne-toi à des créateurs pour voir leurs mèmes !":"Aucun mème ici"} />
      </>)}

      {/* CRÉATEUR */}
      {view === "creator" && (
        <div style={{ padding:"14px", maxWidth:900, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:AC, letterSpacing:2 }}>CRÉATEUR DE MÈMES</span>
            <div style={{ display:"flex", gap:4, marginLeft:"auto" }}>
              {[1,2].map(s=><div key={s} style={{ width:28, height:4, borderRadius:2, background:crStep>=s?AC:"#222" }} />)}
            </div>
          </div>
          {crStep===1 && (
            <div>
              <div style={{ ...S.lbl, fontSize:12, marginBottom:12 }}>ÉTAPE 1 — CHOISIR UN TEMPLATE OU UNE IMAGE</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                <div style={{ background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:8, padding:12 }}>
                  <label style={S.lbl}>🔗 URL D'IMAGE</label>
                  <input style={{ ...S.inp, marginBottom:8 }} placeholder="https://i.imgflip.com/..." value={crCustomUrl}
                    onChange={e=>{ const v=e.target.value; setCrCustomUrl(v); setCrUrlBroken(false); setCrImageUrl(v.trim()); }} />
                  {crCustomUrl.trim() && (
                    <div style={{ position:"relative", lineHeight:0 }}>
                      {!crUrlBroken
                        ? <img key={crCustomUrl} src={crCustomUrl.trim()} alt="preview" style={{ width:"100%", maxHeight:120, objectFit:"cover", borderRadius:5, background:"#111", display:"block" }} onError={()=>setCrUrlBroken(true)} />
                        : <div style={{ background:"#1a0a0a", border:"1px solid #3a1a1a", borderRadius:5, padding:"12px 10px", fontSize:11, color:"#ff5555", textAlign:"center" }}>⚠ URL invalide ou image inaccessible</div>
                      }
                    </div>
                  )}
                </div>
                <div style={{ background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:8, padding:12, display:"flex", flexDirection:"column", gap:8 }}>
                  <label style={S.lbl}>📁 DEPUIS TON APPAREIL</label>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFileUpload} />
                  <button style={{ background:crImageUrl.startsWith("data:")?"#1a2a00":"#141414", border:`1px dashed ${crImageUrl.startsWith("data:")?AC:"#333"}`, borderRadius:6, color:crImageUrl.startsWith("data:")?AC:"#666", fontFamily:"'Bebas Neue',sans-serif", fontSize:14, padding:"12px 10px", cursor:"pointer" }} onClick={()=>fileRef.current?.click()}>
                    {crImageUrl.startsWith("data:") ? "✓ IMAGE CHARGÉE — changer" : "CHOISIR UN FICHIER"}
                  </button>
                  {crImageUrl.startsWith("data:") && <img src={crImageUrl} alt="aperçu" style={{ width:"100%", maxHeight:90, objectFit:"cover", borderRadius:5 }} />}
                  <div style={{ fontSize:10, color:"#444" }}>JPG, PNG, GIF · max 5 Mo</div>
                </div>
              </div>
              <div style={{ ...S.lbl, marginBottom:8 }}>OU CHOISIR UN FOND DE COULEUR</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:8, marginBottom:14 }}>
                {TEMPLATES.map(t => {
                  const tUrl = BG_PREFIX + t.bg; const selected = crImageUrl === tUrl;
                  return (
                    <div key={t.id} style={{ borderRadius:8, overflow:"hidden", cursor:"pointer", border:`2px solid ${selected?AC:"transparent"}`, transition:"border-color .12s" }}
                      onClick={()=>{ setCrImageUrl(tUrl); setCrCustomUrl(""); setCrUrlBroken(false); }}>
                      <div style={{ background:t.bg, height:80, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>{t.emoji}</div>
                      <div style={{ background:"#111", padding:"4px 6px", fontSize:10, color:selected?AC:"#666", fontFamily:"'Bebas Neue',sans-serif", textAlign:"center", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{t.name}</div>
                    </div>
                  );
                })}
              </div>
              <button style={S.bigBtn(!crImageUrl||(crUrlBroken&&!isBg(crImageUrl)))} disabled={!crImageUrl||(crUrlBroken&&!isBg(crImageUrl))}
                onClick={()=>{ if(!username){setAuthGate("create");setAuthStep("choose");}else setCrStep(2); }}>
                SUIVANT → AJOUTER DU TEXTE
              </button>
            </div>
          )}
          {crStep===2 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:16 }}>
              <div>
                <div style={{ ...S.lbl, marginBottom:8 }}>CLIQUE SUR UN TEXTE POUR LE SÉLECTIONNER, GLISSE-LE POUR LE DÉPLACER</div>
                <div ref={imgRef} style={{ position:"relative", borderRadius:8, overflow:"hidden", userSelect:"none", lineHeight:0, border:"1px solid #1e1e1e", background:isBg(crImageUrl)?getBg(crImageUrl):"#111", minHeight:isBg(crImageUrl)?280:undefined, cursor:"default" }}
                  onPointerDown={e=>{ if(e.target===imgRef.current||e.target.tagName==="IMG") setSelectedTxt(null); }}>
                  {!isBg(crImageUrl) && <img src={crImageUrl} alt="template" style={{ width:"100%", display:"block", pointerEvents:"none" }} />}
                  {crTexts.map(t => (
                    <div key={t.id} style={{ position:"absolute", left:`${t.x}%`, top:`${t.y}%`, transform:"translate(-50%,-50%)", cursor:"grab", padding:4, outline:selectedTxt===t.id?`2px dashed ${AC}`:"2px dashed transparent", borderRadius:3, maxWidth:"90%" }}
                      onPointerDown={e=>startDrag(e,t.id)} onClick={e=>{ e.stopPropagation(); setSelectedTxt(t.id); }}>
                      <span style={txtStyle(t)}>{t.text||"..."}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:AC }}>TEXTES ({crTexts.length})</span>
                  <button style={{ background:AC, border:"none", borderRadius:4, color:"#080808", fontFamily:"'Bebas Neue',sans-serif", fontSize:13, padding:"3px 10px", cursor:"pointer" }} onClick={addText}>+ AJOUTER</button>
                </div>
                {crTexts.map(t=>(
                  <div key={t.id} style={{ background:"#0f0f0f", border:`1px solid ${selectedTxt===t.id?AC:"#1a1a1a"}`, borderRadius:6, padding:10 }}
                    onClick={()=>setSelectedTxt(t.id)}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontSize:10, color:selectedTxt===t.id?AC:"#444", fontFamily:"'Bebas Neue',sans-serif" }}>TEXTE {crTexts.indexOf(t)+1}</span>
                      <button style={{ background:"transparent", border:"none", color:"#555", cursor:"pointer", fontSize:16 }} onClick={e=>{ e.stopPropagation(); delText(t.id); }}>✕</button>
                    </div>
                    <input style={{ ...S.inp, marginBottom:6, fontFamily:"Impact,sans-serif", textTransform:"uppercase" }}
                      value={t.text} onChange={e=>updText(t.id,"text",e.target.value)} onClick={e=>e.stopPropagation()} placeholder="TEXTE…" />
                    {selectedTxt===t.id && (<>
                      <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
                        <label style={{ ...S.lbl, margin:0 }}>TAILLE:</label>
                        <input type="range" min={14} max={72} value={t.fontSize} style={{ flex:1, accentColor:AC }} onChange={e=>updText(t.id,"fontSize",+e.target.value)} />
                        <span style={{ fontSize:11, color:AC, minWidth:24 }}>{t.fontSize}</span>
                      </div>
                      <div>
                        <label style={{ ...S.lbl, marginBottom:4 }}>COULEUR:</label>
                        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                          {COLORS.map(c=><div key={c} style={{ width:22, height:22, borderRadius:"50%", background:c, border:`2px solid ${t.color===c?AC:"transparent"}`, cursor:"pointer" }} onClick={()=>updText(t.id,"color",c)} />)}
                        </div>
                      </div>
                    </>)}
                  </div>
                ))}
                <div>
                  <label style={S.lbl}>TITRE DU POST *</label>
                  <input style={S.inp} placeholder="Donne un titre à ton mème…" value={crTitle} onChange={e=>setCrTitle(e.target.value)} />
                </div>
                <div>
                  <label style={S.lbl}>TAGS</label>
                  <input style={S.inp} placeholder="dev, relatable, boulot…" value={crTags} onChange={e=>setCrTags(e.target.value)} />
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button style={{ flex:1, background:"transparent", border:"1px solid #1e1e1e", borderRadius:6, color:"#555", fontFamily:"inherit", fontSize:12, padding:8, cursor:"pointer" }} onClick={()=>setCrStep(1)}>← RETOUR</button>
                  <button style={{ flex:2, ...S.bigBtn(!crTitle.trim()), padding:8 }} disabled={!crTitle.trim()} onClick={publishMeme}>PUBLIER !</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROFIL */}
      {view === "profile" && (() => {
        const myMemes = memes.filter(m => m.author === username);
        return (<>
          <div style={S.pHead}>
            <Av name={username} size={64} />
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#e8e8e8", letterSpacing:1 }}>@{username}</div>
              <div style={{ display:"flex", gap:24, marginTop:10 }}>
                <div><span style={S.sNum}>{myMemes.length}</span><span style={{ fontSize:10, color:"#555" }}>mèmes</span></div>
                <div><span style={S.sNum}>{myMemes.reduce((a,m)=>a+m.likes,0)}</span><span style={{ fontSize:10, color:"#555" }}>likes</span></div>
                <div><span style={S.sNum}>{follows.length}</span><span style={{ fontSize:10, color:"#555" }}>suivis</span></div>
              </div>
            </div>
          </div>
          {follows.length>0 && (
            <div style={{ padding:"10px 14px", borderBottom:"1px solid #111" }}>
              <div style={{ ...S.lbl, marginBottom:8 }}>MES ABONNEMENTS</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {follows.map(u=>(
                  <div key={u} style={{ display:"flex", alignItems:"center", gap:6, background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:20, padding:"5px 10px", cursor:"pointer" }}
                    onClick={()=>{ setViewUser(u); setView("userpage"); }}>
                    <Av name={u} size={20} />
                    <span style={{ fontSize:11, color:"#aaa" }}>@{u}</span>
                    <button style={{ background:"transparent", border:"none", color:"#333", cursor:"pointer", fontSize:12 }} onClick={e=>{ e.stopPropagation(); handleFollow(u); }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ padding:"10px 14px 0" }}><div style={S.lbl}>MES MÈMES ({myMemes.length})</div></div>
          {!myMemes.length
            ? <div style={{ textAlign:"center", padding:"3rem 1rem", color:"#2a2a2a" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, marginBottom:16 }}>Aucun mème posté</div>
                <button style={{ ...S.bigBtn(false), maxWidth:220, margin:"0 auto" }} onClick={()=>setView("creator")}>CRÉER MON PREMIER MÈME</button>
              </div>
            : <CardGrid list={myMemes} />}
        </>);
      })()}

      {/* PAGE USER */}
      {view === "userpage" && viewUser && (() => {
        const u = viewUser; const um = memes.filter(m=>m.author===u);
        const isF = follows.includes(u); const isMe = u===username;
        return (<>
          <div style={S.pHead}>
            <Av name={u} size={64} />
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#e8e8e8" }}>@{u}</div>
              <div style={{ display:"flex", gap:24, marginTop:10 }}>
                <div><span style={S.sNum}>{um.length}</span><span style={{ fontSize:10, color:"#555" }}>mèmes</span></div>
                <div><span style={S.sNum}>{um.reduce((a,m)=>a+m.likes,0)}</span><span style={{ fontSize:10, color:"#555" }}>likes</span></div>
              </div>
            </div>
            {!isMe && <button style={S.fBtn(isF)} onClick={()=>handleFollow(u)}>{isF?"✓ Abonné":"+ Suivre"}</button>}
            {isMe && <button style={{ ...S.fBtn(true), fontSize:12 }} onClick={()=>setView("profile")}>Mon profil</button>}
          </div>
          <CardGrid list={um} />
        </>);
      })()}

      {/* NAV */}
      <div style={S.nav}>
        <button style={S.navBtn(view==="feed")} onClick={()=>setView("feed")}><span style={{ fontSize:20 }}>🏠</span>ACCUEIL</button>
        <button style={S.navBtn(view==="creator")} onClick={()=>{ if(needAuth("create")) return; setView("creator"); setCrStep(1); }}>
          <span style={{ fontSize:20 }}>✏️</span>CRÉER
        </button>
        <button style={S.navBtn(view==="profile")} onClick={()=>{ if(needAuth("profile")) return; setView("profile"); }}>
          <span style={{ fontSize:20 }}>👤</span>PROFIL
        </button>
      </div>

      {/* MODAL DÉTAIL */}
      {detailMeme && (() => {
        const m = detailMeme;
        const mCmts = [...(comments[m.id]||[])].sort((a,b) => b.timestamp - a.timestamp);
        const isF = follows.includes(m.author);
        return (
          <div style={S.overlay} onClick={e=>{ if(e.target===e.currentTarget) setDetailMeme(null); }}>
            <div style={S.modal}>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderBottom:"1px solid #181818" }}>
                <Av name={m.author} size={34} />
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:"#e8e8e8", cursor:"pointer" }}
                    onClick={()=>{ setViewUser(m.author); setView("userpage"); setDetailMeme(null); }}>@{m.author}</div>
                  <div style={{ fontSize:10, color:"#444" }}>{timeAgo(m.created_at||m.timestamp)}</div>
                </div>
                {m.author!==username && <button style={{ ...S.fBtn(isF), fontSize:12, padding:"4px 12px" }} onClick={()=>handleFollow(m.author)}>{isF?"✓ Abonné":"+ Suivre"}</button>}
                <button style={{ background:"transparent", border:"none", color:"#555", fontSize:20, cursor:"pointer", lineHeight:1, padding:"0 4px" }} onClick={()=>setDetailMeme(null)}>✕</button>
              </div>
              <MemeRender meme={m} />
              <div style={{ padding:"12px 14px", borderBottom:"1px solid #181818" }}>
                <p style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:19, color:"#f0f0f0", marginBottom:10 }}>{m.title}</p>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <VoteBar m={m} />
                  <div style={{ marginLeft:"auto", display:"flex", gap:4, flexWrap:"wrap" }}>
                    {m.tags?.map(t=><span key={t} style={{ background:"#161616", border:"1px solid #222", borderRadius:3, padding:"1px 5px", fontSize:10, color:"#555" }}>#{t}</span>)}
                  </div>
                </div>
              </div>
              <div style={{ padding:"12px 14px" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:AC, letterSpacing:1, marginBottom:10 }}>COMMENTAIRES ({mCmts.length})</div>
                {username
                  ? <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                      <textarea style={{ ...S.inp, resize:"none", height:50, lineHeight:1.5 }} placeholder="Ton commentaire…" value={commentText}
                        onChange={e=>setCommentText(e.target.value)}
                        onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); postComment(); } }} />
                      <button style={{ background:AC, border:"none", borderRadius:6, color:"#080808", fontFamily:"'Bebas Neue',sans-serif", fontSize:14, padding:"8px 14px", cursor:"pointer", flexShrink:0 }} onClick={postComment}>OK</button>
                    </div>
                  : <div style={{ fontSize:12, color:"#444", marginBottom:12, cursor:"pointer" }} onClick={()=>{ setDetailMeme(null); setAuthGate("comment"); setAuthStep("choose"); }}>→ Connecte-toi pour commenter</div>
                }
                <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:280, overflowY:"auto" }}>
                  {mCmts.map(c=>(
                    <div key={c.id} style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:6, padding:"8px 10px" }}>
                      <div style={{ display:"flex", alignItems:"center", marginBottom:4 }}>
                        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, color:AC, cursor:"pointer" }}
                          onClick={()=>{ setViewUser(c.author); setView("userpage"); setDetailMeme(null); }}>@{c.author}</span>
                        <span style={{ fontSize:10, color:"#333", marginLeft:8 }}>{timeAgo(c.timestamp)}</span>
                        <button style={{ marginLeft:"auto", background:"transparent", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:11, color:cVotes[c.id]?AC:"#444" }}
                          onClick={()=>voteComment(m.id,c.id)}>▲ {c.likes}</button>
                      </div>
                      <p style={{ margin:0, fontSize:13, color:"#ccc", lineHeight:1.5 }}>{c.text}</p>
                    </div>
                  ))}
                  {!mCmts.length && <div style={{ textAlign:"center", color:"#2a2a2a", padding:"1.5rem", fontSize:12 }}>Sois le premier à commenter !</div>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* AUTH MODAL */}
      {authGate && (
        <div style={{ ...S.overlay, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ ...S.modal, maxWidth:360, padding:0, overflow:"hidden" }}>
            <div style={{ background:"#0f0f0f", padding:"20px 20px 0" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:AC, letterSpacing:2, marginBottom:4 }}>MEMEHUB</div>
              <div style={{ fontSize:12, color:"#555", marginBottom:20 }}>
                {authGate==="vote"&&"Connecte-toi pour voter"}{authGate==="create"&&"Connecte-toi pour créer des mèmes"}
                {authGate==="comment"&&"Connecte-toi pour commenter"}{authGate==="follow"&&"Connecte-toi pour suivre des créateurs"}
                {authGate==="profile"&&"Connecte-toi pour accéder à ton profil"}{authGate==="browse"&&"Rejoins la communauté MEMEHUB"}
              </div>
            </div>
            {authStep==="choose" && (
              <div style={{ padding:"0 20px 20px", display:"flex", flexDirection:"column", gap:10 }}>
                <button style={S.bigBtn(false)} onClick={()=>{ setAuthStep("register"); setLoginErr(""); setAuthInput(""); }}>CRÉER UN COMPTE</button>
                <button style={{ background:"transparent", border:`1px solid ${AC}`, borderRadius:6, color:AC, fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:1, padding:10, cursor:"pointer" }}
                  onClick={()=>{ setAuthStep("login"); setLoginErr(""); setLoginInput(""); }}>SE CONNECTER</button>
                <button style={{ background:"transparent", border:"none", color:"#333", fontFamily:"inherit", fontSize:11, padding:"6px 0", cursor:"pointer" }} onClick={()=>setAuthGate(null)}>Continuer sans compte (lecture seule)</button>
              </div>
            )}
            {authStep==="register" && (
              <div style={{ padding:"0 20px 20px" }}>
                <label style={S.lbl}>PSEUDO *</label>
                <input style={{ ...S.inp, marginBottom:8 }} placeholder="memeur_du_75…" value={authInput} onChange={e=>{ setAuthInput(e.target.value); setLoginErr(""); }} autoFocus />
                <label style={S.lbl}>MOT DE PASSE *</label>
                <input type="password" style={{ ...S.inp, marginBottom:8 }} placeholder="Min 4 caractères…" value={authPwd}
                  onChange={e=>{ setAuthPwd(e.target.value); setLoginErr(""); }} onKeyDown={e=>e.key==="Enter"&&doRegister()} />
                {loginErr && <div style={{ fontSize:11, color:"#ff5555", marginBottom:8 }}>⚠ {loginErr}</div>}
                <button style={{ ...S.bigBtn(!authInput.trim()||authInput.trim().length<3||!authPwd.trim()||authPwd.trim().length<4), marginBottom:8 }}
                  onClick={doRegister} disabled={!authInput.trim()||authInput.trim().length<3||!authPwd.trim()||authPwd.trim().length<4}>CRÉER MON COMPTE</button>
                <button style={{ background:"transparent", border:"none", color:"#444", fontFamily:"inherit", fontSize:11, cursor:"pointer" }} onClick={()=>setAuthStep("choose")}>← Retour</button>
              </div>
            )}
            {authStep==="login" && (
              <div style={{ padding:"0 20px 20px" }}>
                <label style={S.lbl}>PSEUDO</label>
                <input style={{ ...S.inp, marginBottom:8 }} placeholder="Ton pseudo…" value={loginInput} onChange={e=>{ setLoginInput(e.target.value); setLoginErr(""); }} autoFocus />
                <label style={S.lbl}>MOT DE PASSE</label>
                <input type="password" style={{ ...S.inp, marginBottom:8 }} placeholder="Ton mot de passe…" value={loginPwd}
                  onChange={e=>{ setLoginPwd(e.target.value); setLoginErr(""); }} onKeyDown={e=>e.key==="Enter"&&doLogin()} />
                {loginErr && <div style={{ fontSize:11, color:"#ff5555", marginBottom:8 }}>⚠ {loginErr}</div>}
                <button style={{ ...S.bigBtn(!loginInput.trim()||!loginPwd.trim()), marginBottom:8 }}
                  onClick={doLogin} disabled={!loginInput.trim()||!loginPwd.trim()}>SE CONNECTER</button>
                <button style={{ background:"transparent", border:"none", color:"#444", fontFamily:"inherit", fontSize:11, cursor:"pointer" }} onClick={()=>setAuthStep("choose")}>← Retour</button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}
