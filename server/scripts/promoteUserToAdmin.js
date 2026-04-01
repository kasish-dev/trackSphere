require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/promoteUserToAdmin.js <email>');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    user.role = 'admin';
    if (!user.accountType || user.accountType === 'individual') {
      user.accountType = 'business_owner';
    }
    if (!user.subscriptionTier || user.subscriptionTier === 'FREE') {
      user.subscriptionTier = 'ENTERPRISE';
    }

    await user.save();

    console.log(`Promoted ${user.email} to admin`);
    console.log(`role=${user.role}`);
    console.log(`accountType=${user.accountType}`);
    console.log(`subscriptionTier=${user.subscriptionTier}`);
  } catch (err) {
    console.error(err.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
