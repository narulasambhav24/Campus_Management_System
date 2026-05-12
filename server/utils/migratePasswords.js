const bcrypt = require('bcryptjs');
const User = require('../models/User');

const BCRYPT_PREFIX = /^\$2[aby]\$/;

const migratePasswords = async () => {
  const users = await User.find();

  await Promise.all(
    users.map(async (user) => {
      if (BCRYPT_PREFIX.test(user.password)) {
        return;
      }

      user.password = await bcrypt.hash(user.password, 10);
      await user.save();
    })
  );
};

module.exports = migratePasswords;
