// Shared SFX library metadata + helpers, used by the SFX page and the Beatline timeline.
const SFX_LIBRARY = [
  {id:'sfx-001',duration:'0.5s',size:'7 KB',label:'Quick Swipe Whoosh',tag:'fast whoosh',mixTag:'whoosh'},
  {id:'sfx-002',duration:'3.8s',size:'45 KB',label:'Double Notification Ping',tag:'notification',mixTag:'notification'},
  {id:'sfx-003',duration:'2.3s',size:'33 KB',label:'Rapid Typewriter Clicks',tag:'typewriter',mixTag:'typewriter'},
  {id:'sfx-004',duration:'3.6s',size:'55 KB',label:'Digital Glitch Stutter',tag:'glitch',mixTag:'glitch'},
  {id:'sfx-005',duration:'1.4s',size:'19 KB',label:'Zoom Whoosh Hit',tag:'whoosh impact',mixTag:'whoosh'},
  {id:'sfx-006',duration:'1.3s',size:'39 KB',label:'Reel Spin Ratchet',tag:'ratchet',mixTag:''},
  {id:'sfx-007',duration:'0.8s',size:'18 KB',label:'Punchy Impact Thud',tag:'impact thud',mixTag:'thud'},
  {id:'sfx-008',duration:'1.0s',size:'13 KB',label:'Build-Up Riser',tag:'riser',mixTag:'riser'},
  {id:'sfx-009',duration:'0.2s',size:'8 KB',label:'UI Pop Click',tag:'pop click',mixTag:'pop'},
  {id:'sfx-010',duration:'0.2s',size:'8 KB',label:'Soft Tap Click',tag:'click',mixTag:'click'},
  {id:'sfx-011',duration:'0.2s',size:'8 KB',label:'Snappy Tap',tag:'tap',mixTag:'tap'},
  {id:'sfx-012',duration:'0.3s',size:'9 KB',label:'Crisp Snap',tag:'snap',mixTag:''},
  {id:'sfx-013',duration:'0.5s',size:'14 KB',label:'Pop Stutter',tag:'pop',mixTag:'pop'},
  {id:'sfx-014',duration:'1.6s',size:'34 KB',label:'Deep Bass Hit',tag:'bass hit',mixTag:'bass'},
  {id:'sfx-015',duration:'1.6s',size:'33 KB',label:'Swoosh With Accent',tag:'swoosh',mixTag:'swoosh'},
  {id:'sfx-016',duration:'2.5s',size:'61 KB',label:'Camera Shutter Burst',tag:'camera shutter',mixTag:'camera'},
  {id:'sfx-017',duration:'9.5s',size:'235 KB',label:'Rhythmic Tick Loop',tag:'ticking clock',mixTag:'countdown'},
  {id:'sfx-018',duration:'5.3s',size:'120 KB',label:'Impact Into Rumble',tag:'explosion rumble',mixTag:'explosion'}
];
// 4 well-known free SFX libraries, linked to a category search so creators can find more like this one.
// mixTag maps to a known, working Mixkit tag page; falls back to the general library if none fits.
function similarSfxLinks(tag, mixTag){
  const q = encodeURIComponent(tag);
  const mixUrl = mixTag ? `https://mixkit.co/free-sound-effects/${mixTag}/` : 'https://mixkit.co/free-sound-effects/';
  return [
    {name:'Pixabay', url:`https://pixabay.com/sound-effects/search/${q}/`},
    {name:'Mixkit', url:mixUrl},
    {name:'Freesound', url:`https://freesound.org/search/?q=${q}`},
    {name:'Zapsplat', url:`https://www.zapsplat.com/?s=${q}`}
  ];
}
// Exact tag match against the local pack; used by Beatline to pick a library clip per cut point.
function findSfxByTag(tag){
  return SFX_LIBRARY.find(s=>s.tag===tag) || null;
}
