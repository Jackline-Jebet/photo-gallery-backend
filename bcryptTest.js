const bcrypt = require('bcrypt');



const saltRounds = 10;
bcrypt.hash('password123', saltRounds, function(err, hash) {
  console.log("Generated hash for password123:", hash);
});

const hardcodedHash = '$2b$10$X0bLg9icMA19u5iIt.vYjeozDCKQHLEUheshUWc43fBUsbmgKnKd2'; // This should be the hash in your users array
const isMatch = bcrypt.compareSync('password123', hardcodedHash);
console.log("Does password123 match the hardcoded hash?", isMatch);  // Should log 'true' if the password matches the hash
