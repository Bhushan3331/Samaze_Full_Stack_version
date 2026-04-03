// save this as hashPassword.js and run with node hashPassword.js

const bcrypt = require("bcryptjs");

const plainPassword = "admin@123"; // change this to whatever password you want

bcrypt.genSalt(10, (err, salt) => {
  if (err) throw err;
  bcrypt.hash(plainPassword, salt, (err, hash) => {
    if (err) throw err;
    console.log("Hashed password:", hash);
  });
});