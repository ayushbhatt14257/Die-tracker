const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const users = [
    { username: 'owner', password: 'owner123', name: 'Owner', role: 'owner' },
    { username: 'admin', password: 'admin123', name: 'Admin', role: 'admin' },
    { username: 'designer1', password: 'pass123', name: 'Arjun Designer', role: 'designer' },
    { username: 'programmer1', password: 'pass123', name: 'Sunil Programmer', role: 'programmer' },
    { username: 'vmc_m01', password: 'pass123', name: 'Suresh Kumar', role: 'vmc_operator', assignedMachine: 'M-01' },
    { username: 'vmc_m02', password: 'pass123', name: 'Ravi Sharma', role: 'vmc_operator', assignedMachine: 'M-02' },
    { username: 'vmc_m03', password: 'pass123', name: 'Manoj Patel', role: 'vmc_operator', assignedMachine: 'M-03' },
    { username: 'vmc_m04', password: 'pass123', name: 'Dinesh Yadav', role: 'vmc_operator', assignedMachine: 'M-04' },
    { username: 'vmc_m05', password: 'pass123', name: 'Ramesh Singh', role: 'vmc_operator', assignedMachine: 'M-05' },
    { username: 'wirecut1', password: 'pass123', name: 'Farhan Wirecut', role: 'wirecut_operator' },
    { username: 'toolroom1', password: 'pass123', name: 'Priya Tool Room', role: 'toolroom_head' },
    { username: 'gr1_receiver1', password: 'pass123', name: 'GR1 Moulding Receiver', role: 'gr1_receiver' },
  ];

  for (const u of users) {
    const exists = await User.findOne({ username: u.username });
    if (!exists) {
      await User.create(u);
      console.log(`Created: ${u.username} (${u.role})`);
    } else {
      console.log(`Exists: ${u.username}`);
    }
  }

  console.log('\nSeeding complete!');
  console.log('GR1 Receiver: gr1_receiver1 / pass123');
  await mongoose.disconnect();
};

seed().catch(console.error);
