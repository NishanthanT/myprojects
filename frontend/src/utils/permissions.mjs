export const PAGE_PERMISSIONS = [
  {key:'dashboard',label:'Dashboard',path:'/'}, {key:'pos',label:'POS Billing',path:'/pos'},
  {key:'today-sales',label:"Today's Sales",path:'/today-sales'}, {key:'products',label:'Products',path:'/products'},
  {key:'barcode-print',label:'Barcode Printer',path:'/barcode-print'}, {key:'bill-import',label:'Bill Import',path:'/bill-import'},
  {key:'sales',label:'Sales History',path:'/sales'}, {key:'customers',label:'Customers',path:'/customers'},
  {key:'orders',label:'Orders',path:'/orders'}, {key:'suppliers',label:'Suppliers',path:'/suppliers'},
  {key:'offers',label:'Offers / Discounts',path:'/offers'}, {key:'website',label:'Website',path:'/website'},
  {key:'reports',label:'Reports',path:'/reports'}, {key:'users',label:'Users & Staff',path:'/users'},
  {key:'settings',label:'Settings',path:'/settings'}
];
export const DEFAULT_STAFF_PERMISSIONS=['pos','today-sales','customers','orders','offers','website'];
export function permissionsFor(user) {
  if(!user)return [];
  if(user.role==='admin')return PAGE_PERMISSIONS.map(page=>page.key);
  let value=user.permissions;
  if(typeof value==='string'){try{value=JSON.parse(value);}catch{return [];}}
  if(value==null)return [...DEFAULT_STAFF_PERMISSIONS];
  return Array.isArray(value)?value.filter(key=>PAGE_PERMISSIONS.some(page=>page.key===key)):[];
}
export const hasPermission=(user,key)=>permissionsFor(user).includes(key);
export const homeFor=user=>PAGE_PERMISSIONS.find(page=>hasPermission(user,page.key))?.path||'/no-access';
export function validatePermissions(value,role){
  if(!['admin','cashier'].includes(role))throw new Error('Select a valid role.');
  if(value===undefined||value===null)return null;
  if(!Array.isArray(value)||value.some(key=>typeof key!=='string'||!PAGE_PERMISSIONS.some(page=>page.key===key)))throw new Error('Invalid page permissions.');
  return [...new Set(value)];
}
