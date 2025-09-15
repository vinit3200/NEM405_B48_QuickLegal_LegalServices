let mongoose = require('mongoose');

let UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true }, 
  role: { type: String, enum: ['user', 'advocate', 'admin'], default: 'user' },
  phone: { type: String, trim: true, default: '' },
  avatarUrl: { type: String, default: '' },
  bio: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
