import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'stn_motors_super_secret_token_key_2026';

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password.' });
  }

  try {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching profile.' });
  }
};

// Admin only user management
export const getUsers = async (req, res) => {
  try {
    const users = await UserModel.getAll();
    return res.json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error listing users.' });
  }
};

export const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    // Remove password from response
    delete newUser.password;

    return res.status(201).json({ success: true, message: 'User created successfully.', user: newUser });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Email address already registered.' });
    }
    return res.status(500).json({ success: false, message: 'Server error creating user.' });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status } = req.body;
  
  if (!name || !email || !role || !status) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const updated = await UserModel.update(id, { name, email, role, status });
    return res.json({ success: true, message: 'User updated successfully.', user: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating user.' });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  // Prevent self deletion
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
  }

  try {
    await UserModel.delete(id);
    return res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting user.' });
  }
};
