import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const cfg = {
  apiKey: process.env.VITE_FIREBASE_API_KEY, authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID, storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: process.env.VITE_FIREBASE_APP_ID
};
if (!cfg.apiKey) { console.error('❌ Faltan variables en .env'); process.exit(1); }

const db = getFirestore(initializeApp(cfg));
const data = JSON.parse(fs.readFileSync('articulos_limpios.json', 'utf8'));

async function run() {
  let batch = writeBatch(db), ops = 0;
  const add = async (ref, d) => {
    batch.set(ref, { ...d, createdAt: new Date() });
    if (++ops >= 400) { await batch.commit(); console.log(`✅ Lote de 400 guardado.`); batch = writeBatch(db); ops = 0; }
  };

  for (const r of data.rubros) {
    const rRef = doc(collection(db, 'rubros'));
    await add(rRef, { descripcion: r.descripcion, activo: r.activo });
    for (const c of r.categorias) {
      const cRef = doc(collection(db, 'categorias'));
      await add(cRef, { descripcion: c.descripcion, idRubro: rRef.id, activo: c.activo });
      for (const p of c.productos) {
        await add(doc(collection(db, 'productos')), {
          codigoOrigen: p.codigoOrigen || "", descripcion: p.descripcion,
          idRubro: rRef.id, idCategoria: cRef.id, unidad: p.unidad,
          precio: p.precio, alicuota: p.alicuota || 21,
          destacado: p.destacado || false, popular: p.popular || false, activo: p.activo
        });
      }
    }
  }
  if (ops > 0) await batch.commit();
  console.log('🎉 ¡Seed completado! Revisá Firebase.');
}
run().catch(console.error);