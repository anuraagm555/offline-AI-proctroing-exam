const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Admin Secret Code Check
        if (role === 'admin') {
            const { secretCode } = req.body;
            const requiredCode = process.env.ADMIN_SECRET_CODE || 'adminadmin';

            if (secretCode !== requiredCode) {
                return res.status(403).json({ message: 'Invalid Admin Secret Code' });
            }
        }

        // Check if user exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create user
        const newUser = await User.create({
            name,
            email,
            password_hash,
            role: role || 'student'
        });

        res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
