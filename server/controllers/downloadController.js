const StudyMaterial = require('../models/StudyMaterial');

// ─── NCERT Textbook Data (curated links) ───────────────────────────────────────
const NCERT_BOOKS = [
  // Class 1
  { class: '1', subject: 'English', title: 'Marigold', url: 'https://ncert.nic.in/textbook.php?aemr1=0-10' },
  { class: '1', subject: 'Hindi', title: 'Rimjhim', url: 'https://ncert.nic.in/textbook.php?ahri1=0-23' },
  { class: '1', subject: 'Mathematics', title: 'Math-Magic', url: 'https://ncert.nic.in/textbook.php?aemm1=0-13' },
  // Class 2
  { class: '2', subject: 'English', title: 'Marigold', url: 'https://ncert.nic.in/textbook.php?bemr1=0-15' },
  { class: '2', subject: 'Hindi', title: 'Rimjhim', url: 'https://ncert.nic.in/textbook.php?bhri1=0-15' },
  { class: '2', subject: 'Mathematics', title: 'Math-Magic', url: 'https://ncert.nic.in/textbook.php?bemm1=0-15' },
  // Class 3
  { class: '3', subject: 'English', title: 'Marigold', url: 'https://ncert.nic.in/textbook.php?cemr1=0-15' },
  { class: '3', subject: 'Hindi', title: 'Rimjhim', url: 'https://ncert.nic.in/textbook.php?chri1=0-15' },
  { class: '3', subject: 'Mathematics', title: 'Math-Magic', url: 'https://ncert.nic.in/textbook.php?cemm1=0-15' },
  { class: '3', subject: 'EVS', title: 'Looking Around', url: 'https://ncert.nic.in/textbook.php?ceev1=0-24' },
  // Class 4
  { class: '4', subject: 'English', title: 'Marigold', url: 'https://ncert.nic.in/textbook.php?demr1=0-11' },
  { class: '4', subject: 'Hindi', title: 'Rimjhim', url: 'https://ncert.nic.in/textbook.php?dhri1=0-14' },
  { class: '4', subject: 'Mathematics', title: 'Math-Magic', url: 'https://ncert.nic.in/textbook.php?demm1=0-14' },
  { class: '4', subject: 'EVS', title: 'Looking Around', url: 'https://ncert.nic.in/textbook.php?deev1=0-27' },
  // Class 5
  { class: '5', subject: 'English', title: 'Marigold', url: 'https://ncert.nic.in/textbook.php?eemr1=0-10' },
  { class: '5', subject: 'Hindi', title: 'Rimjhim', url: 'https://ncert.nic.in/textbook.php?ehri1=0-18' },
  { class: '5', subject: 'Mathematics', title: 'Math-Magic', url: 'https://ncert.nic.in/textbook.php?eemm1=0-14' },
  { class: '5', subject: 'EVS', title: 'Looking Around', url: 'https://ncert.nic.in/textbook.php?eeev1=0-22' },
  // Class 6
  { class: '6', subject: 'English', title: 'Honeysuckle', url: 'https://ncert.nic.in/textbook.php?fehl1=0-10' },
  { class: '6', subject: 'Hindi', title: 'Vasant', url: 'https://ncert.nic.in/textbook.php?fhvs1=0-17' },
  { class: '6', subject: 'Mathematics', title: 'Mathematics', url: 'https://ncert.nic.in/textbook.php?femh1=0-14' },
  { class: '6', subject: 'Science', title: 'Science', url: 'https://ncert.nic.in/textbook.php?fesc1=0-16' },
  { class: '6', subject: 'Social Science', title: 'Our Pasts - I', url: 'https://ncert.nic.in/textbook.php?feop1=0-12' },
  // Class 7
  { class: '7', subject: 'English', title: 'Honeycomb', url: 'https://ncert.nic.in/textbook.php?gehc1=0-10' },
  { class: '7', subject: 'Hindi', title: 'Vasant', url: 'https://ncert.nic.in/textbook.php?ghvs1=0-20' },
  { class: '7', subject: 'Mathematics', title: 'Mathematics', url: 'https://ncert.nic.in/textbook.php?gemh1=0-15' },
  { class: '7', subject: 'Science', title: 'Science', url: 'https://ncert.nic.in/textbook.php?gesc1=0-18' },
  { class: '7', subject: 'Social Science', title: 'Our Pasts - II', url: 'https://ncert.nic.in/textbook.php?geop1=0-10' },
  // Class 8
  { class: '8', subject: 'English', title: 'Honeydew', url: 'https://ncert.nic.in/textbook.php?hehd1=0-10' },
  { class: '8', subject: 'Hindi', title: 'Vasant', url: 'https://ncert.nic.in/textbook.php?hhvs1=0-18' },
  { class: '8', subject: 'Mathematics', title: 'Mathematics', url: 'https://ncert.nic.in/textbook.php?hemh1=0-16' },
  { class: '8', subject: 'Science', title: 'Science', url: 'https://ncert.nic.in/textbook.php?hesc1=0-18' },
  { class: '8', subject: 'Social Science', title: 'Our Pasts - III', url: 'https://ncert.nic.in/textbook.php?heop1=0-12' },
  // Class 9
  { class: '9', subject: 'English', title: 'Beehive', url: 'https://ncert.nic.in/textbook.php?iebh1=0-11' },
  { class: '9', subject: 'Hindi', title: 'Kshitij', url: 'https://ncert.nic.in/textbook.php?ihks1=0-17' },
  { class: '9', subject: 'Mathematics', title: 'Mathematics', url: 'https://ncert.nic.in/textbook.php?iemh1=0-15' },
  { class: '9', subject: 'Science', title: 'Science', url: 'https://ncert.nic.in/textbook.php?iesc1=0-15' },
  { class: '9', subject: 'Social Science', title: 'India and the Contemporary World - I', url: 'https://ncert.nic.in/textbook.php?iess1=0-5' },
  // Class 10
  { class: '10', subject: 'English', title: 'First Flight', url: 'https://ncert.nic.in/textbook.php?jeff1=0-11' },
  { class: '10', subject: 'Hindi', title: 'Kshitij', url: 'https://ncert.nic.in/textbook.php?jhks1=0-17' },
  { class: '10', subject: 'Mathematics', title: 'Mathematics', url: 'https://ncert.nic.in/textbook.php?jemh1=0-15' },
  { class: '10', subject: 'Science', title: 'Science', url: 'https://ncert.nic.in/textbook.php?jesc1=0-16' },
  { class: '10', subject: 'Social Science', title: 'India and the Contemporary World - II', url: 'https://ncert.nic.in/textbook.php?jess1=0-8' },
  // Class 11
  { class: '11', subject: 'English', title: 'Hornbill', url: 'https://ncert.nic.in/textbook.php?kehb1=0-8' },
  { class: '11', subject: 'Hindi', title: 'Antra', url: 'https://ncert.nic.in/textbook.php?khat1=0-20' },
  { class: '11', subject: 'Mathematics', title: 'Mathematics', url: 'https://ncert.nic.in/textbook.php?kemh1=0-16' },
  { class: '11', subject: 'Physics', title: 'Physics Part I', url: 'https://ncert.nic.in/textbook.php?keph1=0-8' },
  { class: '11', subject: 'Physics', title: 'Physics Part II', url: 'https://ncert.nic.in/textbook.php?keph2=0-7' },
  { class: '11', subject: 'Chemistry', title: 'Chemistry Part I', url: 'https://ncert.nic.in/textbook.php?kech1=0-7' },
  { class: '11', subject: 'Chemistry', title: 'Chemistry Part II', url: 'https://ncert.nic.in/textbook.php?kech2=0-7' },
  { class: '11', subject: 'Biology', title: 'Biology', url: 'https://ncert.nic.in/textbook.php?kebo1=0-22' },
  { class: '11', subject: 'Accountancy', title: 'Accountancy Part I', url: 'https://ncert.nic.in/textbook.php?keac1=0-12' },
  { class: '11', subject: 'Business Studies', title: 'Business Studies', url: 'https://ncert.nic.in/textbook.php?kebs1=0-10' },
  { class: '11', subject: 'Economics', title: 'Indian Economic Development', url: 'https://ncert.nic.in/textbook.php?keie1=0-10' },
  // Class 12
  { class: '12', subject: 'English', title: 'Flamingo', url: 'https://ncert.nic.in/textbook.php?lefn1=0-8' },
  { class: '12', subject: 'Hindi', title: 'Antra', url: 'https://ncert.nic.in/textbook.php?lhat1=0-20' },
  { class: '12', subject: 'Mathematics', title: 'Mathematics Part I', url: 'https://ncert.nic.in/textbook.php?lemh1=0-6' },
  { class: '12', subject: 'Mathematics', title: 'Mathematics Part II', url: 'https://ncert.nic.in/textbook.php?lemh2=0-7' },
  { class: '12', subject: 'Physics', title: 'Physics Part I', url: 'https://ncert.nic.in/textbook.php?leph1=0-8' },
  { class: '12', subject: 'Physics', title: 'Physics Part II', url: 'https://ncert.nic.in/textbook.php?leph2=0-6' },
  { class: '12', subject: 'Chemistry', title: 'Chemistry Part I', url: 'https://ncert.nic.in/textbook.php?lech1=0-9' },
  { class: '12', subject: 'Chemistry', title: 'Chemistry Part II', url: 'https://ncert.nic.in/textbook.php?lech2=0-7' },
  { class: '12', subject: 'Biology', title: 'Biology', url: 'https://ncert.nic.in/textbook.php?lebo1=0-16' },
  { class: '12', subject: 'Accountancy', title: 'Accountancy Part I', url: 'https://ncert.nic.in/textbook.php?leac1=0-7' },
  { class: '12', subject: 'Business Studies', title: 'Business Studies Part I', url: 'https://ncert.nic.in/textbook.php?lebs1=0-8' },
  { class: '12', subject: 'Economics', title: 'Introductory Microeconomics', url: 'https://ncert.nic.in/textbook.php?leec1=0-6' },
];

// ─── Get Downloadable Study Materials ──────────────────────────────────────────
const getDownloadableResources = async (req, res) => {
  try {
    const { grade, subject, type } = req.query;
    const filter = {};

    // Only show materials that are accessible
    if (req.user.role === 'student') {
      filter.$or = [
        { lockedForAll: false },
        { unlockedFor: req.user._id },
      ];
      // Exclude materials locked specifically for this student
      filter.lockedFor = { $ne: req.user._id };
    }

    if (grade) filter.grade = grade;
    if (subject) filter.subject = { $regex: subject, $options: 'i' };
    if (type) filter.type = type;

    const materials = await StudyMaterial.find(filter)
      .populate('teacher', 'name displayName')
      .populate('course', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Group by grade → subject
    const grouped = {};
    materials.forEach((m) => {
      const g = m.grade || 'General';
      const s = m.subject || 'General';
      if (!grouped[g]) grouped[g] = {};
      if (!grouped[g][s]) grouped[g][s] = [];
      grouped[g][s].push({
        _id: m._id,
        title: m.title,
        description: m.description,
        type: m.type,
        fileUrl: m.fileUrl,
        fileSize: m.fileSize,
        mimeType: m.mimeType,
        originalFilename: m.originalFilename,
        extension: m.extension,
        resourceType: m.resourceType,
        storageType: m.storageType,
        publicId: m.publicId,
        teacher: m.teacher,
        course: m.course,
        createdAt: m.createdAt,
      });
    });

    res.json({
      success: true,
      materials,
      grouped,
      total: materials.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get NCERT Book Links ──────────────────────────────────────────────────────
const getNcertResources = async (req, res) => {
  try {
    const { classNum, subject } = req.query;
    let books = NCERT_BOOKS;

    if (classNum) books = books.filter((b) => b.class === classNum);
    if (subject) books = books.filter((b) => b.subject.toLowerCase().includes(subject.toLowerCase()));

    // Group by class
    const grouped = {};
    books.forEach((b) => {
      if (!grouped[b.class]) grouped[b.class] = [];
      grouped[b.class].push(b);
    });

    // Get unique classes and subjects for filters
    const classes = [...new Set(NCERT_BOOKS.map((b) => b.class))].sort((a, b) => Number(a) - Number(b));
    const subjects = [...new Set(NCERT_BOOKS.map((b) => b.subject))].sort();

    res.json({
      success: true,
      books,
      grouped,
      filters: { classes, subjects },
      total: books.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDownloadableResources,
  getNcertResources,
};
