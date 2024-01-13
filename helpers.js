function getUserByEmail(email, usersDatabase) {
  for (const userId in usersDatabase) {
    if (usersDatabase[userId].email === email) {
      return usersDatabase[userId];
    }
  }
  return;
};

function generateRandomString(database, maxAttempts = 100) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let randomString = "";
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length)
      randomString += characters.charAt(randomIndex);
    }
    // check if the random string is unique
    if (!database[randomString]) {
      return randomString;
    }
  }

  throw new Error("Could not generate a unique string");
};

module.exports = { getUserByEmail, generateRandomString };