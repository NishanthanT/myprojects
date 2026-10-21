import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel.js';
import {publicUser} from '../services/userPermissions.js';
import {validatePermissions} from '../../frontend/src/utils/permissions.mjs';
import {authSecret} from '../config/authSecret.js';

const JWT_SECRET = authSecret();

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
      user: publicUser(user)
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
    const permissions=validatePermissions(req.body.permissions,role);
    if(!['active','inactive'].includes(req.body.status||'active'))return res.status(400).json({success:false,message:'Invalid status.'});
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      role,
      status:req.body.status||'active',
      permissions
    });

    // Remove password from response
    delete newUser.password;

    return res.status(201).json({ success: true, message: 'User created successfully.', user: newUser });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Email address already registered.' });
    }
    return res.status(error.code?500:400).json({ success: false, message: error.code?'Server error creating user.':error.message });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status } = req.body;
  
  if (!name || !email || !role || !status) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const permissions=validatePermissions(req.body.permissions,role);
    if(!['active','inactive'].includes(status))return res.status(400).json({success:false,message:'Invalid status.'});
    if(Number(id)===req.user.id&&(role!=='admin'||status!=='active'))return res.status(400).json({success:false,message:'You cannot remove your own active admin access.'});
    const existing=await UserModel.findById(id);
    if(!existing)return res.status(404).json({success:false,message:'User not found.'});
    const password=req.body.password?await bcrypt.hash(req.body.password,10):undefined;
    const updated = await UserModel.update(id, { name,email,role,status,permissions: req.body.permissions===undefined?existing.permissions:permissions,password });
    return res.json({ success: true, message: 'User updated successfully.', user: updated });
  } catch (error) {
    return res.status(error.code&&error.code!=='ER_DUP_ENTRY'?500:400).json({ success: false, message: error.code==='ER_DUP_ENTRY'?'Email address already registered.':error.code?'Server error updating user.':error.message });
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

// Lets the signed-in user change their own password (any role).
export const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
  }
  if (String(new_password).length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
  }
  if (current_password === new_password) {
    return res.status(400).json({ success: false, message: 'New password must be different from your current password.' });
  }

  try {
    const user = await UserModel.findByIdWithPassword(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Your current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await UserModel.updatePassword(user.id, hashed);

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Server error changing password.' });
  }
};
