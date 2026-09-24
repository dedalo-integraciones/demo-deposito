import fs from 'node:fs';

const rawData = fs.readFileSync('articulos.json', 'utf8');
let data = JSON.parse(rawData);

function clean(obj) {
  if (Array.isArray(obj)) return obj.map(clean);
  if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = key.trim();
      let newValue = typeof value === 'string' ? value.trim() : value;
      if (newValue === ' ') newValue = ''; 
      newObj[newKey] = clean(newValue);
    }
    return newObj;
  }
  return obj;
}

fs.writeFileSync('articulos_limpios.json', JSON.stringify(clean(data), null, 2));
console.log('✅ Listo: articulos_limpios.json generado con éxito.');