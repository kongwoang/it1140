export function emailAddress(value,domains){
  if(typeof value!=='string'||value.length>254)return null;
  const email=value.trim().toLowerCase();const match=email.match(/^([a-z0-9.!#$%&'*+/=?^_`{|}~-]+)@([a-z0-9.-]+)$/);
  return match&&(!domains||domains.includes(match[2]))?email:null;
}
