/**
 * Run with: node server/seedCourses.js
 * Seeds the 6 default courses into MongoDB
 */
require('dotenv').config();
const mongoose = require('mongoose');

// Fallback if .env is missing
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vettri_academy';
const Course = require('./models/Course');

const COURSES = [
  {
    title: 'CBSE Tuition',
    category: 'CBSE',
    grades: ['6th', '7th', '8th', '9th', '10th', '11th', '12th'],
    subjects: ['Mathematics', 'Science', 'English', 'Social Science'],
    description: 'Comprehensive CBSE tuition from 6th to 12th standard with daily live classes.',
    icon: '📘',
    isActive: true,
    duration: '1 Year',
  },
  {
    title: 'Matriculation / State Board',
    category: 'State Board',
    grades: ['6th', '7th', '8th', '9th', '10th', '11th', '12th'],
    subjects: ['Mathematics', 'Science', 'Tamil', 'English', 'Social Science'],
    description: 'State Board tuition covering all major subjects for Tamil Nadu students.',
    icon: '📗',
    isActive: true,
    duration: '1 Year',
  },
  {
    title: 'Engineering Tuition',
    category: 'Engineering',
    grades: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    subjects: ['Engineering Maths', 'Physics', 'Chemistry', 'Coding'],
    description: 'Expert tuition for B.E / B.Tech students covering core engineering subjects.',
    icon: '⚙️',
    isActive: true,
    duration: '1 Semester',
  },
  {
    title: 'Arts & Science College',
    category: 'Arts & Science',
    grades: ['UG', 'PG'],
    subjects: ['B.Sc', 'M.Sc', 'B.Com', 'M.Com', 'B.A', 'M.A'],
    description: 'Undergraduate and postgraduate tuition for Arts & Science college students.',
    icon: '🎨',
    isActive: true,
    duration: '1 Semester',
  },
  {
    title: 'Language Courses',
    category: 'Language',
    grades: ['All Ages'],
    subjects: ['Tamil (beginners to advanced)', 'English Communication', 'Spoken English'],
    description: 'Language courses for all ages — Tamil and English communication skills.',
    icon: '🗣️',
    isActive: true,
    duration: 'Flexible',
  },
  {
    title: 'Competitive Exams',
    category: 'Competitive',
    grades: ['All Levels'],
    subjects: ['TNPSC (Group 1-4)', 'TRB Exam Prep', 'TET (Primary & Upper)'],
    description: 'Structured preparation for Tamil Nadu competitive examinations.',
    icon: '🏆',
    isActive: true,
    duration: '6 Months',
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await Course.countDocuments();
    if (existing > 0) {
      console.log(`ℹ️  ${existing} courses already exist. Deleting and re-seeding...`);
      await Course.deleteMany({});
    }

    const inserted = await Course.insertMany(COURSES);
    console.log(`✅ Successfully seeded ${inserted.length} courses!`);
    inserted.forEach(c => console.log(`   • ${c.icon} ${c.title} (${c.category})`));

    await mongoose.disconnect();
    console.log('🔌 Disconnected. Done!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
