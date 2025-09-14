const mongoose = require('mongoose');

const gemRequestSchema = new mongoose.Schema({
  // Basic gem information
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: ['Food', 'Craft', 'Viewpoint', 'Shopping', 'Experience']
  },
  location: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    address: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 200
    }
  },
  image: {
    url: {
      type: String,
      required: true
    },
    thumbnail: {
      type: String
    },
    alt: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 100
    }
  },
  contact: {
    phone: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\+?[\d\s\-\(\)]+$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    },
    whatsapp: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\+?[\d\s\-\(\)]+$/.test(v);
        },
        message: 'Invalid WhatsApp number format'
      }
    }
  },
  
  // Request metadata
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedBy: {
    type: String,
    default: 'mobile_user' // Could be expanded to include user info
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: String // Admin username who reviewed
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String,
    maxlength: 500
  },
  
  // If approved, reference to created gem
  approvedGemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gem'
  }
}, {
  timestamps: true
});

// Index for efficient queries
gemRequestSchema.index({ status: 1, submittedAt: -1 });
gemRequestSchema.index({ category: 1, status: 1 });

// Add geospatial index for location-based queries
gemRequestSchema.index({ 'location': '2dsphere' });

module.exports = mongoose.model('GemRequest', gemRequestSchema);