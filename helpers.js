function getUserByEmail(email, usersDatabase) {
  for (const userId in usersDatabase) {
    if (usersDatabase[userId].email === email) {
      return usersDatabase[userId];
    }
  }
  return undefined;
};

module.exports = { getUserByEmail };