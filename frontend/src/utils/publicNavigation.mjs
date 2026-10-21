export const PUBLIC_NAV_PAGES=[
  {key:'home',label:'Home',label_ta:'முகப்பு',to:'/shop',end:true},
  {key:'products',label:'Products',label_ta:'பொருட்கள்',to:'/shop/products'},
  {key:'vehicles',label:'Vehicles',label_ta:'வாகனங்கள்',to:'/shop/vehicles'},
  {key:'offers',label:'Offers',label_ta:'சலுகைகள்',to:'/shop/offers'},
  {key:'about',label:'About',label_ta:'எங்களைப் பற்றி',to:'/shop/about'},
  {key:'contact',label:'Contact',label_ta:'தொடர்பு',to:'/shop/contact'},
  {key:'mechanical',label:'Mechanical Service',label_ta:'மெக்கானிக்கல் சேவை',to:'/shop/mechanical-services'}
];
export const PUBLIC_NAV_SINHALA={home:'මුල් පිටුව',products:'නිෂ්පාදන',vehicles:'වාහන',offers:'දීමනා',about:'අප ගැන',contact:'සම්බන්ධ වන්න',mechanical:'යාන්ත්‍රික සේවාව'};
export function safePublicLink(value){
  if(typeof value!=='string'||value.length>500||/[\s\\\u0000-\u001f]/.test(value))return false;
  try{
    if(/^https?:\/\//i.test(value)){const url=new URL(value);return !!url.hostname&&!url.username&&!url.password;}
    if(!value.startsWith('/')||value.startsWith('//'))return false;
    const url=new URL(value,'https://public.invalid');
    return url.origin==='https://public.invalid'&&(url.pathname==='/shop'||url.pathname.startsWith('/shop/'));
  }catch{return false;}
}
export function parsePublicNavigation(raw){
  let parsed={};try{parsed=typeof raw==='string'?JSON.parse(raw||'{}'):raw||{};}catch{}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))parsed={};
  const builtin={},labels={},labels_ta={},labels_si={};
  for(const page of PUBLIC_NAV_PAGES){builtin[page.key]=page.key==='home'||parsed.builtin?.[page.key]!==false;labels[page.key]=typeof parsed.labels?.[page.key]==='string'&&parsed.labels[page.key].trim()?parsed.labels[page.key].trim().slice(0,50):page.label;}
  for(const page of PUBLIC_NAV_PAGES)labels_ta[page.key]=typeof parsed.labels_ta?.[page.key]==='string'?parsed.labels_ta[page.key].trim().slice(0,50):'';
  for(const page of PUBLIC_NAV_PAGES)labels_si[page.key]=typeof parsed.labels_si?.[page.key]==='string'?parsed.labels_si[page.key].trim().slice(0,50):'';
  const keys=PUBLIC_NAV_PAGES.map(page=>page.key);
  const order=[...new Set([...(Array.isArray(parsed.order)?parsed.order:[]),...keys])].filter(key=>keys.includes(key));
  const custom=(Array.isArray(parsed.custom)?parsed.custom:[]).slice(0,10).map(link=>({label:typeof link?.label==='string'?link.label.slice(0,50):'',label_ta:typeof link?.label_ta==='string'?link.label_ta.slice(0,50):'',label_si:typeof link?.label_si==='string'?link.label_si.slice(0,50):'',url:typeof link?.url==='string'?link.url:'',visible:link?.visible!==false}));
  return {builtin,labels,labels_ta,labels_si,order,custom};
}
export function validatePublicNavigation(raw){
  let parsed;try{parsed=typeof raw==='string'?JSON.parse(raw||'{}'):raw;}catch{throw new Error('Invalid navbar settings.');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Invalid navbar settings.');
  if(parsed.labels)for(const value of Object.values(parsed.labels))if(typeof value!=='string'||!value.trim()||value.trim().length>50)throw new Error('Menu names are required and can contain up to 50 characters.');
  if(parsed.labels_ta)for(const value of Object.values(parsed.labels_ta))if(typeof value!=='string'||value.trim().length>50)throw new Error('Tamil menu names can contain up to 50 characters.');
  if(parsed.labels_si)for(const value of Object.values(parsed.labels_si))if(typeof value!=='string'||value.trim().length>50)throw new Error('Sinhala menu names can contain up to 50 characters.');
  if(parsed.builtin)for(const value of Object.values(parsed.builtin))if(typeof value!=='boolean')throw new Error('Invalid navbar visibility.');
  if(parsed.custom!==undefined&&(!Array.isArray(parsed.custom)||parsed.custom.length>10))throw new Error('Use up to 10 custom menu links.');
  for(const link of parsed.custom||[])if(link?.label_ta!=null&&(typeof link.label_ta!=='string'||link.label_ta.length>50))throw new Error('Tamil menu names can contain up to 50 characters.');
  for(const link of parsed.custom||[])if(link?.label_si!=null&&(typeof link.label_si!=='string'||link.label_si.length>50))throw new Error('Sinhala menu names can contain up to 50 characters.');
  for(const link of parsed.custom||[])if(!link||typeof link.label!=='string'||!link.label.trim()||link.label.trim().length>50||!safePublicLink(link.url))throw new Error('Each custom link needs a name and an http(s) URL or public /shop path.');
  return parsePublicNavigation(parsed);
}
export function publicNavItems(raw,language='en'){
  const config=parsePublicNavigation(raw);
  return [...config.order.filter(key=>config.builtin[key]).map(key=>{const page=PUBLIC_NAV_PAGES.find(page=>page.key===key),translated=config[`labels_${language}`]?.[key],fallback=language==='si'?PUBLIC_NAV_SINHALA[key]:page.label_ta;return {...page,label:['ta','si'].includes(language)?(translated||fallback):config.labels[key]};}),
    ...config.custom.filter(link=>link.visible&&link.label.trim()&&safePublicLink(link.url)).map((link,index)=>({key:`custom-${index}`,label:link[`label_${language}`]?.trim()||link.label.trim(),to:link.url,external:/^https?:\/\//i.test(link.url)}))];
}
