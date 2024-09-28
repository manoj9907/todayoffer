const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Define user schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/\S+@\S+\.\S+/, "is invalid"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters long"],
  },
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: [3, "Name must be at least 3 characters long"],
    maxlength: [50, "Name must be less than 50 characters"],
  },
  role: {
    type: String,
    enum: ["SUPERADMIN", "USER", "ADMIN", "CLIENT"], // Example roles, adjust as needed
    default: "USER",
  },
  profilePicture: {
    type: String, // You can store the URL or file path of the image
    default: "default_profile_picture.png", // Optional default profile picture
  },
});

// Hash the password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// Export the model
const User = mongoose.model("User", userSchema);
module.exports = User;
