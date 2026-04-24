require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vettri_academy');
  console.log('✅ MongoDB Connected');
};

const seedCourses = async () => {
  const courses = [
    {
      title: 'CBSE Tuition',
      category: 'CBSE',
      grades: ['6th', '7th', '8th', '9th', '10th', '11th', '12th'],
      subjects: ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi'],
      description: 'Comprehensive CBSE tuition from 6th to 12th grade with experienced teachers.',
      icon: '📘',
    },
    {
      title: 'Matriculation / State Board Tuition',
      category: 'State Board',
      grades: ['6th', '7th', '8th', '9th', '10th', '11th', '12th'],
      subjects: ['Mathematics', 'Science', 'English', 'Tamil', 'Social Science'],
      description: 'Tamil Nadu State Board tuition aligned with latest syllabus.',
      icon: '📗',
    },
    {
      title: 'Engineering Tuition',
      category: 'Engineering',
      grades: ['UG', 'PG'],
      subjects: ['Engineering Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'Coding'],
      description: 'Expert tuition for Engineering students — Maths, Physics, Chemistry & Coding.',
      icon: '⚙️',
    },
    {
      title: 'Arts & Science College Tuition',
      category: 'Arts & Science',
      grades: ['UG', 'PG'],
      subjects: ['B.Sc', 'M.Sc', 'B.Com', 'M.Com', 'B.A', 'M.A'],
      description: 'Specialized tuition for Arts & Science college students across all disciplines.',
      icon: '🎨',
    },
    {
      title: 'Language Courses',
      category: 'Language',
      grades: ['All'],
      subjects: ['Tamil', 'English'],
      description: 'Tamil and English language courses for students and non-students of all ages.',
      icon: '🗣️',
    },
    {
      title: 'Competitive Exams',
      category: 'Competitive',
      grades: ['All'],
      subjects: ['TNPSC', 'TRB', 'TET'],
      description: 'Focused preparation for TNPSC, TRB, and TET competitive examinations.',
      icon: '🏆',
    },
  ];

  await Course.deleteMany({});
  const created = await Course.insertMany(courses);
  console.log(`✅ ${created.length} courses seeded`);
  return created;
};

const seedAdmin = async () => {
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log('ℹ️  Admin already exists:', existingAdmin.email);
    return existingAdmin;
  }

  const admin = await User.create({
    name: process.env.ADMIN_NAME || 'Super Admin',
    mobile: process.env.ADMIN_MOBILE || '9047758389',
    email: process.env.ADMIN_EMAIL || 'admin@no1vettriacademy.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    role: 'admin',
    isActive: true,
    isApproved: true,
  });

  console.log('✅ Admin seeded:');
  console.log(`   Email: ${admin.email}`);
  console.log(`   Mobile: ${admin.mobile}`);
  console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);

  return admin;
};

const seedDemoTeachers = async () => {
  const teachers = [
    {
      name: 'B. Preetha',
      mobile: '9000000001',
      email: 'preetha@no1vettriacademy.com',
      password: 'Teacher@123',
      role: 'teacher',
      qualification: 'B.E Computer Science',
      subjects: ['English', 'Mathematics', 'Computer Science'],
      experience: '3+ years',
      isApproved: true,
      profileImage: 'https://i.pravatar.cc/300?img=1',
    },
    {
      name: 'Farhana B A',
      mobile: '9000000002',
      email: 'farhana@no1vettriacademy.com',
      password: 'Teacher@123',
      role: 'teacher',
      qualification: 'M.Sc, B.Ed Mathematics',
      subjects: ['Mathematics'],
      experience: '5 years',
      isApproved: true,
      profileImage: 'https://i.pravatar.cc/300?img=2',
    },
    {
      name: 'Venkatalakshmi K',
      mobile: '9000000003',
      email: 'venkatalakshmi@no1vettriacademy.com',
      password: 'Teacher@123',
      role: 'teacher',
      qualification: 'M.Sc Mathematics',
      subjects: ['Mathematics'],
      experience: '7 years',
      isApproved: true,
      profileImage: 'https://i.pravatar.cc/300?img=3',
    },
    {
      name: 'S. Srividhya',
      mobile: '9000000004',
      email: 'srividhya@no1vettriacademy.com',
      password: 'Teacher@123',
      role: 'teacher',
      qualification: 'M.Sc, B.Ed',
      subjects: ['Tamil', 'English', 'Science', 'Social Science'],
      experience: '4 years',
      isApproved: true,
      profileImage: 'https://i.pravatar.cc/300?img=4',
    },
    {
      name: 'M. Uthrakalyani',
      mobile: '9000000005',
      email: 'uthrakalyani@no1vettriacademy.com',
      password: 'Teacher@123',
      role: 'teacher',
      qualification: 'M.Sc, B.Ed Chemistry',
      subjects: ['Chemistry', 'Science'],
      experience: '6 years',
      isApproved: true,
      profileImage: 'https://i.pravatar.cc/300?img=5',
    },
  ];

  for (const teacherData of teachers) {
    const exists = await User.findOne({ mobile: teacherData.mobile });
    if (!exists) {
      await User.create(teacherData);
      console.log(`✅ Teacher seeded: ${teacherData.name}`);
    } else {
      console.log(`ℹ️  Teacher already exists: ${teacherData.name}`);
    }
  }
};

const seed = async () => {
  try {
    await connectDB();
    await seedAdmin();
    await seedCourses();
    await seedDemoTeachers();
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Admin:   admin@no1vettriacademy.com / Admin@123');
    console.log('Teacher: preetha@no1vettriacademy.com / Teacher@123');
    console.log('\nVisit http://localhost:5173 to get started.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
