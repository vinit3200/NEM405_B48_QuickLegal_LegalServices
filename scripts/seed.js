let bcrypt = require('bcryptjs');
let { connectDB, disconnectDB } = require('../src/db/mongoose');
let User = require('../src/models/User.model');
let Advocate = require('../src/models/Advocate.model');
let Template = require('../src/models/Template.model');
let CaseModel = require('../src/models/Case.model');
let Booking = require('../src/models/Booking.model');
let PaymentRecord = require('../src/models/PaymentRecord.model');
let fs = require('fs');
let path = require('path');

async function createUsers() {
  let password = 'password123';
  let hashed = await bcrypt.hash(password, 10);

  let users = [
    {
      name: 'Alice User',
      email: 'user@quicklegal.test',
      password: hashed,
      role: 'user',
      phone: '+911234567890',
      bio: 'I am a demo user.'
    },
    {
      name: 'Bob Advocate',
      email: 'advocate@quicklegal.test',
      password: hashed,
      role: 'advocate',
      phone: '+911112223334',
      bio: 'Practising tenancy and family law.'
    },
    {
      name: 'Admin User',
      email: 'admin@quicklegal.test',
      password: hashed,
      role: 'admin',
      phone: '+919999888877',
      bio: 'Platform administrator.'
    }
  ];

  let created = [];
  for (let u of users) {
    let doc = await User.findOne({ email: u.email }).exec();
    if (!doc) doc = await User.create(u);
    else {
      doc.name = u.name;
      doc.role = u.role;
      doc.phone = u.phone;
      doc.bio = u.bio;
      doc.password = u.password; 
      await doc.save();
    }
    created.push(doc);
  }

  return { user: created[0], advocateUser: created[1], admin: created[2], plainPassword: password };
}

async function createAdvocateProfile(advocateUser) {
  let adv = await Advocate.findOne({ userId: advocateUser._id }).exec();
  if (!adv) {
    adv = await Advocate.create({
      userId: advocateUser._id,
      expertise: ['tenancy', 'family law'],
      practiceAreas: ['Tenancy', 'Family'],
      languages: ['English', 'Hindi'],
      consultationFee: 500, 
      rating: 4.6,
      availability: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, 
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }  
      ],
      bio: 'Experienced tenancy lawyer with 8 years practice in civil courts.',
      address: 'Mumbai, India',
      isActive: true
    });
  } else {
    adv.expertise = ['tenancy', 'family law'];
    adv.consultationFee = 500;
    adv.languages = ['English', 'Hindi'];
    adv.isActive = true;
    adv.bio = 'Experienced tenancy lawyer with 8 years practice in civil courts.';
    await adv.save();
  }
  return adv;
}

async function createTemplates(adminUser) {
  let templates = [
    {
      title: 'Basic Tenancy Agreement',
      description: 'Simple tenancy agreement between landlord and tenant',
      fields: [
        { name: 'landlordName', label: 'Landlord Name', type: 'string', required: true },
        { name: 'tenantName', label: 'Tenant Name', type: 'string', required: true },
        { name: 'startDate', label: 'Start Date', type: 'date' },
        { name: 'rent', label: 'Monthly Rent', type: 'number' }
      ],
      templateBody:
        'This Tenancy Agreement is made between {{ landlordName }} (Landlord) and {{ tenantName }} (Tenant). The tenancy starts on {{ startDate }} and the monthly rent is {{ rent }}.',
      tags: ['tenancy', 'agreement'],
      createdBy: adminUser._id,
      isPublic: true
    },
    {
      title: 'Simple Non-Disclosure Agreement (NDA)',
      description: 'Short NDA template',
      fields: [
        { name: 'partyA', label: 'Party A', type: 'string' },
        { name: 'partyB', label: 'Party B', type: 'string' },
        { name: 'effectiveDate', label: 'Effective Date', type: 'date' }
      ],
      templateBody:
        'This NDA is entered into by {{ partyA }} and {{ partyB }} on {{ effectiveDate }}. The parties agree to keep confidential information secret.',
      tags: ['nda', 'business'],
      createdBy: adminUser._id,
      isPublic: true
    }
  ];

  let created = [];
  for (let t of templates) {
    let doc = await Template.findOne({ title: t.title }).exec();
    if (!doc) doc = await Template.create(t);
    else {
      doc.description = t.description;
      doc.fields = t.fields;
      doc.templateBody = t.templateBody;
      doc.tags = t.tags;
      doc.createdBy = t.createdBy;
      doc.isPublic = t.isPublic;
      await doc.save();
    }
    created.push(doc);
  }
  return created;
}

async function createCases(user) {
  let cases = [
    {
      userId: user._id,
      title: 'Tenant not paying rent',
      description: 'Tenant has not paid rent for 3 months. Need initial advice about eviction process.',
      tags: ['tenancy', 'eviction'],
      caseType: 'tenancy',
      status: 'open'
    },
    {
      userId: user._id,
      title: 'Neighbor dispute',
      description: 'Property boundary dispute with neighbor.',
      tags: ['property', 'dispute'],
      caseType: 'property',
      status: 'open'
    }
  ];

  let created = [];
  for (let c of cases) {
    let doc = await CaseModel.findOne({ title: c.title }).exec();
    if (!doc) doc = await CaseModel.create(c);
    else {
      doc.description = c.description;
      doc.tags = c.tags;
      doc.caseType = c.caseType;
      doc.status = c.status;
      await doc.save();
    }
    created.push(doc);
  }
  return created;
}

async function createSampleBooking(user, adv) {
  let now = new Date();
  let tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(10, 0, 0, 0);
  let start = new Date(tomorrow);
  let end = new Date(tomorrow.getTime() + 30 * 60 * 1000);

  let existing = await Booking.findOne({
    advocateId: adv._id,
    'slot.start': start
  }).exec();

  if (existing) {
    console.log('Sample booking already exists, skipping');
    return existing;
  }

  let booking = await Booking.create({
    userId: user._id,
    advocateId: adv._id,
    slot: { start, end },
    status: 'pending',
    amount: adv.consultationFee || 0,
    currency: 'INR'
  });

  let payment = await PaymentRecord.create({
    bookingId: booking._id,
    userId: user._id,
    amount: booking.amount,
    currency: booking.currency,
    provider: 'simulated',
    status: 'pending'
  });

  booking.paymentId = payment._id;
  await booking.save();

  return booking;
}

async function ensureUploadsDir() {
  let uploads = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploads)) {
    fs.mkdirSync(uploads, { recursive: true });
    console.log('Created uploads/ directory');
  }
}

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    console.log('Ensuring uploads directory exists...');
    await ensureUploadsDir();

    console.log('Seeding users...');
    let { user, advocateUser, admin, plainPassword } = await createUsers();
    console.log('Users seeded:');
    console.log('  user:', user.email, 'password:', plainPassword);
    console.log('  advocate:', advocateUser.email, 'password:', plainPassword);
    console.log('  admin:', admin.email, 'password:', plainPassword);

    console.log('Seeding advocate profile...');
    let adv = await createAdvocateProfile(advocateUser);
    console.log('Advocate:', adv._id.toString(), 'expertise:', adv.expertise);

    console.log('Seeding templates...');
    let templates = await createTemplates(admin);
    console.log('Templates created:', templates.map(t => t.title).join(', '));

    console.log('Seeding sample cases...');
    let cases = await createCases(user);
    console.log('Cases created:', cases.map(c => c.title).join(', '));

    console.log('Seeding sample booking...');
    let booking = await createSampleBooking(user, adv);
    console.log('Booking created:', booking._id?.toString());

    console.log('Seed complete. Disconnecting...');
    await disconnectDB();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error', err);
    try { await disconnectDB(); } catch (e) { console.error('Error disconnecting DB', e); }
    process.exit(1);
  }
}

run();
