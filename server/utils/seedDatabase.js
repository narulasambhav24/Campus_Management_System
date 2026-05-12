const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Request = require('../models/Request');
const Event = require('../models/Event');
const Policy = require('../models/Policy');

const dataDir = path.join(__dirname, '../data');
const usersFile = path.join(dataDir, 'users.json');
const requestsFile = path.join(dataDir, 'requests.json');

const defaultUsers = [
  { name: 'Alex Johnson', email: 'demo@student.edu', password: 'password123', role: 'student' },
  { name: 'Admin User', email: 'admin@unihelp.edu', password: 'admin123', role: 'admin' },
];

const defaultRequests = [
  {
    id: 'REQ-001',
    studentId: 'demo@student.edu',
    studentName: 'Alex Johnson',
    category: 'IT',
    title: 'Wi-Fi not working in Room 204',
    description: 'Internet connection has been down for 2 days in my dorm room.',
    status: 'Resolved',
    createdAt: '2024-11-01T10:00:00Z',
  },
  {
    id: 'REQ-002',
    studentId: 'demo@student.edu',
    studentName: 'Alex Johnson',
    category: 'Hostel',
    title: 'Broken window latch',
    description: 'The window latch in Room 204 is broken and cannot be secured.',
    status: 'In Progress',
    createdAt: '2024-11-05T14:30:00Z',
  },
  {
    id: 'REQ-003',
    studentId: 'demo@student.edu',
    studentName: 'Alex Johnson',
    category: 'Academic',
    title: 'Grade discrepancy in CS301',
    description: 'My midterm grade appears incorrect. I scored 87 but 72 is recorded.',
    status: 'Pending',
    createdAt: '2024-11-10T09:15:00Z',
  },
  {
    id: 'REQ-004',
    studentId: 'other@student.edu',
    studentName: 'Maria Chen',
    category: 'Administration',
    title: 'ID card replacement',
    description: 'My student ID card was lost and I need a replacement.',
    status: 'Pending',
    createdAt: '2024-11-11T11:00:00Z',
  },
  {
    id: 'REQ-005',
    studentId: 'other@student.edu',
    studentName: 'Maria Chen',
    category: 'IT',
    title: 'Portal login issue',
    description: 'Cannot access the student portal since the password reset.',
    status: 'In Progress',
    createdAt: '2024-11-12T08:45:00Z',
  },
];

const defaultEvents = [
  {
    title: 'Semester Orientation 2026',
    description: 'Orientation for all first-year students covering campus systems and support channels.',
    category: 'academic',
    location: 'Main Auditorium',
    startAt: '2026-05-10T09:30:00Z',
    endAt: '2026-05-10T11:30:00Z',
    registrationDeadline: '2026-05-09T18:00:00Z',
    capacity: 300,
    status: 'Published',
    targetAudience: 'students',
    createdBy: 'seed-admin',
    createdByName: 'Admin User',
    attendees: [],
  },
];

const defaultPolicies = [
  {
    policyCode: 'HOSTEL-ENTRY-001',
    title: 'Hostel Entry Timing Policy',
    category: 'Hostel',
    summary: 'Defines in-time and late-entry escalation workflow for hostel residents.',
    content:
      'Students must return before 9:30 PM on weekdays. Late entry requires gate register and warden approval on next working day.',
    tags: ['hostel', 'timings', 'discipline'],
    effectiveDate: '2026-04-01T00:00:00Z',
    version: 1,
    isActive: true,
    createdBy: 'seed-admin',
    createdByName: 'Admin User',
    updatedBy: 'seed-admin',
    updatedByName: 'Admin User',
    versionHistory: [],
  },
];

const readJsonFile = (filePath, fallback) => {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Failed to read seed file: ${filePath}`, error.message);
    return fallback;
  }
};

const seedDatabase = async () => {
  const [userCount, requestCount, eventCount, policyCount] = await Promise.all([
    User.countDocuments(),
    Request.countDocuments(),
    Event.countDocuments(),
    Policy.countDocuments(),
  ]);

  if (userCount === 0) {
    const users = readJsonFile(usersFile, defaultUsers);
    if (users.length > 0) {
      await User.insertMany(users);
    }
  }

  if (requestCount === 0) {
    const requests = readJsonFile(requestsFile, defaultRequests);
    if (requests.length > 0) {
      await Request.insertMany(requests);
    }
  }

  if (eventCount === 0 && defaultEvents.length > 0) {
    await Event.insertMany(defaultEvents);
  }

  if (policyCount === 0 && defaultPolicies.length > 0) {
    await Policy.insertMany(defaultPolicies);
  }
};

module.exports = seedDatabase;
