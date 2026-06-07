import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { sendVerificationEmail } from '../services/emailService';

const generateToken = (id: string, email: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');

  return jwt.sign({ id, email }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => e.msg),
      });
      return;
    }

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      if (existingUser.isVerified) {
        res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        });
        return;
      }

      // Resend OTP for unverified users
      const otp = existingUser.generateVerificationToken();
      await existingUser.save({ validateBeforeSave: false });

      try {
        await sendVerificationEmail(email, existingUser.name, otp);
      } catch {
        console.error('Failed to send verification email');
      }

      res.status(200).json({
        success: true,
        message: 'An account already exists with this email. A new verification OTP has been sent.',
      });
      return;
    }

    const user = await User.create({ name, email, password });
    const otp = user.generateVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendVerificationEmail(email, name, otp);
    } catch {
      console.error('Failed to send verification email');
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for the verification OTP.',
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => e.msg),
      });
      return;
    }

    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+verificationToken +verificationExpires');

    if (!user) {
      res.status(404).json({ success: false, message: 'No account found with this email.' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ success: false, message: 'This email is already verified.' });
      return;
    }

    if (!user.verificationToken || !user.verificationExpires) {
      res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
      return;
    }

    if (new Date() > user.verificationExpires) {
      res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
      return;
    }

    if (user.verificationToken !== otp) {
      res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
      return;
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id.toString(), user.email);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! Welcome to FashionZone.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resendOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => e.msg),
      });
      return;
    }

    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(404).json({ success: false, message: 'No account found with this email.' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ success: false, message: 'This email is already verified.' });
      return;
    }

    const otp = user.generateVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendVerificationEmail(email, user.name, otp);
    } catch {
      res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Verification OTP has been resent to your email.',
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => e.msg),
      });
      return;
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email,
      });
      return;
    }

    const token = generateToken(user._id.toString(), user.email);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => e.msg),
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { name } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => e.msg),
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
