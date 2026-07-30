const mongoose = require('mongoose');
require('dotenv').config();
const StudyMaterial = require('../models/StudyMaterial');
const MaterialFolder = require('../models/MaterialFolder');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    const grades = await StudyMaterial.distinct('grade', { grade: { $nin: [null, '', 'all'] } });
    console.log(`Found ${grades.length} distinct grades to backfill.`);

    let foldersCreated = 0;
    let materialsUpdated = 0;

    for (const grade of grades) {
      const parsedGrade = grade.trim();
      if (!parsedGrade) continue;

      let folder = await MaterialFolder.findOne({ grade: parsedGrade });
      if (!folder) {
        folder = await MaterialFolder.create({ name: `Class ${parsedGrade}`, grade: parsedGrade });
        foldersCreated++;
      }

      const res = await StudyMaterial.updateMany(
        { grade: parsedGrade, folder: { $exists: false } }, 
        { folder: folder._id }
      );
      materialsUpdated += res.modifiedCount;
    }

    console.log(`Migration complete. Created ${foldersCreated} new folders and updated ${materialsUpdated} materials.`);
    process.exit(0);
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
};

run();
