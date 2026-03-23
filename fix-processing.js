const mongoose = require('mongoose');
const Video = require('./src/modules/videos/video.model');
const { processVideo } = require('./src/workers/transcode.worker');

mongoose.connect('mongodb://127.0.0.1:27017/short_video_streaming')
  .then(async () => {
    console.log('🔍 Connexion à MongoDB réussie');
    
    // Trouver les vidéos en processing
    const processingVideos = await Video.find({ status: 'processing' });
    console.log(`📊 Vidéos en processing: ${processingVideos.length}`);
    
    if (processingVideos.length > 0) {
      console.log('\n🔄 Traitement des vidéos bloquées...');
      
      for (let i = 0; i < processingVideos.length; i++) {
        const video = processingVideos[i];
        console.log(`\n🎥 [${i + 1}/${processingVideos.length}] Traitement de: ${video._id}`);
        console.log(`   Caption: ${video.caption}`);
        console.log(`   Created: ${video.createdAt}`);
        
        try {
          const startTime = Date.now();
          console.log(`⚡ Début du transcodage ultra-rapide...`);
          
          await processVideo(video._id);
          
          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000;
          
          console.log(`✅ Transcodage terminé en ${duration.toFixed(2)}s`);
          
          // Vérifier le statut final
          const updatedVideo = await Video.findById(video._id);
          console.log(`📈 Statut final: ${updatedVideo.status}`);
          
        } catch (error) {
          console.error(`❌ Erreur transcodage:`, error.message);
        }
      }
    } else {
      console.log('ℹ️ Aucune vidéo en processing');
    }
    
    // Statistiques finales
    const stats = {
      total: await Video.countDocuments(),
      ready: await Video.countDocuments({ status: 'ready' }),
      processing: await Video.countDocuments({ status: 'processing' }),
      failed: await Video.countDocuments({ status: 'failed' })
    };
    
    console.log(`\n📊 Statistiques finales:`);
    console.log(`   - Total: ${stats.total}`);
    console.log(`   - Prêtes: ${stats.ready}`);
    console.log(`   - En traitement: ${stats.processing}`);
    console.log(`   - Échouées: ${stats.failed}`);
    
    mongoose.connection.close();
  })
  .catch(error => {
    console.error('❌ Erreur de connexion:', error);
    process.exit(1);
  });
