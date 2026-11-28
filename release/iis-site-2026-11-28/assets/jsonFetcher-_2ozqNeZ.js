const o=s=>async r=>{const t=await fetch(`${s}${r}`);if(!t.ok)throw new Error(`تعذّر تحميل ${r} (${t.status})`);return t.json()};export{o as h};
