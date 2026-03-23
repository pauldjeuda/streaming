const fs = require('fs');
const path = require('path');

// Créer un faux fichier vidéo MP4 valide pour le test
const testVideoPath = path.join(__dirname, 'test-upload-video.mp4');

// Créer un fichier MP4 minimal avec un en-tête valide
const mp4Header = Buffer.from([
  0x00, 0x00, 0x00, 0x20, // Box size (32 bytes)
  0x66, 0x74, 0x79, 0x70, // Box type: 'ftyp'
  0x69, 0x73, 0x6F, 0x6D, // Major brand: 'isoM'
  0x00, 0x00, 0x02, 0x00, // Minor version
  0x69, 0x73, 0x6F, 0x6D, // Compatible brand: 'isoM'
  0x69, 0x73, 0x6F, 0x32, // Compatible brand: 'iso2'
  0x61, 0x76, 0x63, 0x31, // Compatible brand: 'avc1'
  0x6D, 0x70, 0x34, 0x31  // Compatible brand: 'mp41'
]);

if (!fs.existsSync(testVideoPath)) {
  console.log('📹 Création d une vidéo MP4 de test...');
  fs.writeFileSync(testVideoPath, mp4Header);
  console.log('✅ Vidéo de test créée');
}

console.log('🚀 Test d upload avec la page corrigée...');
console.log('📁 Fichier de test:', testVideoPath);
console.log('📏 Taille:', fs.statSync(testVideoPath).size, 'bytes');
console.log('\n💡 Instructions:');
console.log('1. Va sur http://localhost:4000');
console.log('2. Sélectionne le fichier test-upload-video.mp4');
console.log('3. Ajoute un caption');
console.log('4. Clique "Upload Vidéo"');
console.log('5. Regarde le monitoring du statut en temps réel');
console.log('\n🔍 Le monitoring devrait montrer:');
console.log('- ✅ Upload terminé');
console.log('- ⏳ Démarrage du transcodage');
console.log('- ⏳ Traitement en cours...');
console.log('- 🎉 Vidéo prête!');
