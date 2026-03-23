const mongoose = require('mongoose');
const Video = require('./src/modules/videos/video.model');

mongoose.connect('mongodb://127.0.0.1:27017/short_video_streaming')
  .then(async () => {
    console.log('🔍 Connexion à MongoDB réussie');
    
    // Trouver toutes les vidéos sans filtre
    const allVideos = await Video.find({}).sort({ createdAt: -1 });
    console.log(`📊 Total de vidéos dans la base: ${allVideos.length}`);
    
    if (allVideos.length === 0) {
      console.log('ℹ️ Aucune vidéo trouvée dans la base de données');
      console.log('💡 Tu dois uploader des vidéos via http://localhost:4000');
    } else {
      console.log('\n📹 Liste des vidéos:');
      allVideos.forEach((video, index) => {
        console.log(`\n🎥 Vidéo ${index + 1}:`);
        console.log(`   ID: ${video._id}`);
        console.log(`   Caption: ${video.caption || '(sans caption)'}`);
        console.log(`   Status: ${video.status}`);
        console.log(`   Created: ${video.createdAt}`);
        console.log(`   Original: ${video.originalFilename}`);
        console.log(`   HLS: ${video.hlsMasterPath || 'N/A'}`);
        console.log(`   Thumbnail: ${video.thumbnailPath || 'N/A'}`);
        console.log(`   Duration: ${video.duration || 'N/A'}s`);
        console.log(`   Size: ${video.width}x${video.height || 'N/A'}`);
        console.log(`   Error: ${video.errorMessage || 'N/A'}`);
      });
      
      // Statistiques par statut
      const stats = {
        uploaded: allVideos.filter(v => v.status === 'uploaded').length,
        processing: allVideos.filter(v => v.status === 'processing').length,
        ready: allVideos.filter(v => v.status === 'ready').length,
        failed: allVideos.filter(v => v.status === 'failed').length
      };
      
      console.log(`\n📈 Statistiques par statut:`);
      console.log(`   - Uploadées: ${stats.uploaded}`);
      console.log(`   - En traitement: ${stats.processing}`);
      console.log(`   - Prêtes: ${stats.ready}`);
      console.log(`   - Échouées: ${stats.failed}`);
    }
    
    mongoose.connection.close();
  })
  .catch(error => {
    console.error('❌ Erreur de connexion:', error);
    process.exit(1);
  });
