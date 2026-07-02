// ── Migración localStorage → API ──────────────────────────────────────────────
// Pegar en consola del navegador con el dashboard abierto
// ANTES de migrar: reemplaza API_URL y API_KEY con los valores reales

(async function() {
  const API_URL = 'https://TU-APP.onrender.com'; // <-- reemplazar
  const API_KEY = 'TU_API_KEY';                  // <-- reemplazar

  // Recopilar todos los datos de localStorage
  const payload = {
    ptf_fi_v1:  JSON.parse(localStorage.getItem('ptf_fi_v1')  || '[]'),
    ptf_v3:     JSON.parse(localStorage.getItem('ptf_v3')     || '[]'),
    ptf_chk_v1: JSON.parse(localStorage.getItem('ptf_chk_v1') || '[]'),
    finnhub_key: localStorage.getItem('finnhub_key') || '',
  };

  console.log('📦 Datos a migrar:');
  console.log(`  - Inversiones fijas: ${payload.ptf_fi_v1.length}`);
  console.log(`  - Activos financieros: ${payload.ptf_v3.length}`);
  console.log(`  - Checklist items: ${payload.ptf_chk_v1.length}`);

  const res = await fetch(`${API_URL}/data`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  if (json.ok) {
    console.log('✅ Migración completada. Ya puedes usar el dashboard v19.');
  } else {
    console.error('❌ Error:', json);
  }
})();
