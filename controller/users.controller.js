const User = require("../modules/user.module");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");

// Multer setup for handling file uploads
// Configure multer to store files in the 'uploads' directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Path where files will be stored
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname); // Unique file name
  },
});

// Filter for image uploads
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("Please upload an image in JPG or PNG format"), false);
  }
};

// Initialize multer middleware with storage and file filter
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 }, // 1MB file size limit
  fileFilter: fileFilter,
});

// Multer middleware to upload a single profile picture
const uploadProfilePicture = upload.single("profilePicture");
console.log("uploadProfilePicture", uploadProfilePicture);

exports.signUp = async (req, res) => {
  console.log("Received signup request");

  try {
    // Ensure email, password, and role are provided
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res
        .status(400)
        .send({ error: "Email, password, and role are required" });
    }

    // Check for valid role
    const allowedRoles = ["ADMIN", "USER", "SUPERADMIN", "CLIENT"]; // Define allowed roles
    if (!allowedRoles.includes(role)) {
      return res.status(400).send({ error: "Invalid role" });
    }

    // Check if user with the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).send({ error: "Email already in use" });
    }

    // Create and save new user with role
    const user = new User(req.body);
    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // Send response with user and token
    res.status(201).send({ user, token });
  } catch (err) {
    console.error("Error during user signup:", err);
    if (err.name === "ValidationError") {
      return res
        .status(400)
        .send({ error: "Invalid data", details: err.message });
    }
    if (err.code === 11000) {
      return res
        .status(409)
        .send({ error: "Duplicate key error", details: err.keyValue });
    }
    res.status(500).send({ error: "An unexpected error occurred" });
  }
};

// Login API
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Ensure email and password are provided
    if (!email || !password) {
      return res.status(400).send({ error: "Email and password are required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    console.log("user", user);

    if (!user) {
      return res.status(401).send({ error: "Invalid email or password" });
    }

    // Compare provided password with stored hashed password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).send({ error: "Invalid email or password" });
    }

    // Create JWT token with user ID and role
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // Send user details and token
    res.status(200).send({
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        UserId: user._id,
      },
      token,
    });
  } catch (err) {
    console.error("Error during user login:", err);
    res.status(500).send({ error: "An unexpected error occurred" });
  }
};

exports.getOneUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    res.send(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).send({ error: "An unexpected error occurred" });
  }
};

// Controller: Get users based on role (Admin, Client, Superadmin, or User)
exports.getAllUsers = async (req, res) => {
  try {
    const role = req.params.role;
    let roleFilter = {};

    // Check the route path to determine what role to filter
    if (role === "users") {
      roleFilter = { role: "USER" }; // Get all users
    } else if (role === "client") {
      roleFilter = { role: "CLIENT" }; // Only clients
    } else if (role === "admin") {
      roleFilter = { role: "ADMIN" }; // Only admins
    }

    const users = await User.find(roleFilter).select("-password"); // Exclude password
    res.send(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send({ error: "An unexpected error occurred" });
  }
};

// Update User API with profile picture handling
exports.updateUser = async (req, res) => {
  console.log("dd");

  const updates = Object.keys(req.body);
  const allowedUpdates = ["name", "password", "profilePicture"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send({ error: "Invalid updates" });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    // Apply updates from request body
    updates.forEach((update) => {
      user[update] = req.body[update];
    });

    // If profilePicture is uploaded, update the profilePicture field
    if (req.file) {
      user.profilePicture = req.file.path; // Set the uploaded file path
      user.profilePicture = uploadProfilePicture(user.profilePicture);
    }

    // Hash the password if it's being updated
    if (req.body.password) {
      user.password = await bcrypt.hash(user.password, 8);
    }

    await user.save();
    res.send(user);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).send({ error: "An unexpected error occurred" });
  }
};

// Multer middleware for handling profile picture uploads
exports.uploadProfilePicture = uploadProfilePicture;
