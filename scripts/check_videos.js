const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const TrainingVideo = require('../models/TrainingVideo');

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const videos = await TrainingVideo.find();
    console.log(`🎬 Found ${videos.length} videos.`);
    videos.forEach(v => {
      console.log(`- Title: ${v.title} | Category: ${v.category} | Mandatory: ${v.isMandatory} | Active: ${v.isActive}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
};

checkDB();
