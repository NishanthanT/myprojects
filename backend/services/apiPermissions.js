import {hasPermission} from '../../frontend/src/utils/permissions.mjs';
const catalog=['products','pos','barcode-print','bill-import','orders','website','customers','sales','suppliers'];
export function requiredPages(method,path){
  path=path.split('?')[0].replace(/^\/api/,'').replace(/\/$/,'')||'/';
  const read=method==='GET'||method==='HEAD';
  if(path==='/auth/users')return read?['users']:[];
  if(path.startsWith('/products')){
    if(read)return catalog;
    if(path==='/products/publish')return ['website'];
    if(/^\/products\/\d+\/barcode$/.test(path))return ['products','barcode-print'];
    return ['products'];
  }
  if(path.startsWith('/customers')){
    if(read&&/^\/customers\/\d+(\/history)?$/.test(path))return ['customers'];
    if(read)return ['customers','pos','reports'];
    if(method==='POST'&&path==='/customers')return ['customers','pos'];
    return ['customers'];
  }
  if(path.startsWith('/sales')){
    if(path==='/sales/bill-no')return ['pos'];
    if(path==='/sales/today')return ['today-sales','sales'];
    if(read)return ['sales','customers'];
    if(method==='POST'&&path==='/sales')return ['pos'];
    return ['sales','customers'];
  }
  if(path.startsWith('/reports')){
    if(path==='/reports/low-stock')return ['dashboard','reports','pos','products','orders'];
    if(path==='/reports/dashboard-stats'||path==='/reports/daily')return ['dashboard','reports'];
    return ['reports'];
  }
  if(path.startsWith('/suppliers')){
    if(path.includes('/account'))return ['suppliers'];
    return read?['suppliers','products','bill-import']:['suppliers'];
  }
  if(path.startsWith('/orders'))return ['orders'];
  if(path.startsWith('/bill-imports'))return ['bill-import'];
  if(path.startsWith('/offers'))return read?['offers','pos']:['offers'];
  if(path.startsWith('/site-settings')||path.startsWith('/vehicle-listings')||path.startsWith('/mechanical-services'))return ['website'];
  if(path.startsWith('/sms'))return ['settings'];
  return [];
}
export function canAccessApi(user,method,path){
  if(!user)return false;
  if(user.role==='admin')return true;
  return requiredPages(method,path).some(key=>hasPermission(user,key));
}
