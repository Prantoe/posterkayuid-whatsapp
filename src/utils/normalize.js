
  
  function normalizeNum(num) {
    let n = (num || '').replace(/\D/g, '');
    if(!n.startsWith('0') && !n.startsWith('62')) return n;
    if (n.startsWith('0')) n = '62' + n.slice(1);
    if (!n.endsWith('@s.whatsapp.net')) n = `${n}@s.whatsapp.net`;
    return n;
  }

  function toWaUrl(num) {
    let n = String(num).replace(/\D/g, '');
    if (n.startsWith('0')) n = '62' + n.slice(1); 
    return `wa.me/${n}`;
  }
  
  export { normalizeNum, toWaUrl };