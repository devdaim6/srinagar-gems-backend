const mongoose = require('mongoose');

/**
 * Location schema for gem coordinates and address
 */
const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: [true, 'Latitude is required'],
    min: [-90, 'Latitude must be between -90 and 90'],
    max: [90, 'Latitude must be between -90 and 90'],
    validate: {
      validator: function(value) {
        return !isNaN(value) && isFinite(value);
      },
      message: 'Latitude must be a valid number'
    }
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required'],
    min: [-180, 'Longitude must be between -180 and 180'],
    max: [180, 'Longitude must be between -180 and 180'],
    validate: {
      validator: function(value) {
        return !isNaN(value) && isFinite(value);
      },
      message: 'Longitude must be a valid number'
    }
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    minlength: [5, 'Address must be at least 5 characters long'],
    maxlength: [200, 'Address cannot exceed 200 characters']
  }
}, { _id: false });

/**
 * Image schema for gem photos
 */
const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true,
    validate: {
      validator: function(value) {
        // Basic URL validation
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        return urlPattern.test(value);
      },
      message: 'Please provide a valid image URL'
    }
  },
  thumbnail: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        if (!value) return true; // Optional field
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        return urlPattern.test(value);
      },
      message: 'Please provide a valid thumbnail URL'
    }
  },
  alt: {
    type: String,
    required: [true, 'Image alt text is required'],
    trim: true,
    minlength: [3, 'Alt text must be at least 3 characters long'],
    maxlength: [100, 'Alt text cannot exceed 100 characters']
  }
}, { _id: false });

/**
 * Contact schema for gem contact information
 */
const contactSchema = new mongoose.Schema({
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        if (!value) return true; // Optional field
        // Basic phone number validation (supports various formats)
        const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
        return phonePattern.test(value.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Please provide a valid phone number'
    }
  },
  whatsapp: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        if (!value) return true; // Optional field
        // WhatsApp number validation (similar to phone)
        const whatsappPattern = /^[\+]?[1-9][\d]{0,15}$/;
        return whatsappPattern.test(value.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Please provide a valid WhatsApp number'
    }
  }
}, { _id: false });

/**
 * Main Gem schema
 */
const gemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Gem name is required'],
    trim: true,
    minlength: [2, 'Gem name must be at least 2 characters long'],
    maxlength: [100, 'Gem name cannot exceed 100 characters'],
    index: true // Index for text searches
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Food', 'Craft', 'Viewpoint', 'Shopping', 'Experience'],
      message: 'Category must be one of: Food, Craft, Viewpoint, Shopping, Experience'
    },
    index: true // Index for category filtering
  },
  location: {
    type: locationSchema,
    required: [true, 'Location is required']
  },
  image: {
    type: imageSchema,
    required: [true, 'Image is required']
  },
  contact: {
    type: contactSchema,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true // Index for filtering active gems
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Create compound index for location-based queries (2dsphere for geospatial queries)
gemSchema.index({ 
  'location.latitude': 1, 
  'location.longitude': 1 
});

// Create compound index for category and active status filtering
gemSchema.index({ 
  category: 1, 
  isActive: 1 
});

// Create text index for search functionality
gemSchema.index({ 
  name: 'text', 
  description: 'text' 
});

/**
 * Virtual for getting gem coordinates as GeoJSON point
 */
gemSchema.virtual('geoLocation').get(function() {
  return {
    type: 'Point',
    coordinates: [this.location.longitude, this.location.latitude]
  };
});

/**
 * Static method to find gems by category
 */
gemSchema.statics.findByCategory = function(category) {
  return this.find({ 
    category: category, 
    isActive: true 
  });
};

/**
 * Static method to find active gems
 */
gemSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

/**
 * Static method to find gems near a location
 */
gemSchema.statics.findNearLocation = function(latitude, longitude, maxDistance = 10000) {
  return this.find({
    isActive: true,
    'location.latitude': {
      $gte: latitude - (maxDistance / 111000), // Rough conversion: 1 degree ≈ 111km
      $lte: latitude + (maxDistance / 111000)
    },
    'location.longitude': {
      $gte: longitude - (maxDistance / (111000 * Math.cos(latitude * Math.PI / 180))),
      $lte: longitude + (maxDistance / (111000 * Math.cos(latitude * Math.PI / 180)))
    }
  });
};

/**
 * Instance method to toggle active status
 */
gemSchema.methods.toggleActive = function() {
  this.isActive = !this.isActive;
  return this.save();
};

/**
 * Pre-validate middleware to ensure data consistency
 */
gemSchema.pre('validate', function(next) {
  // Ensure category is properly capitalized before validation
  if (this.category) {
    this.category = this.category.charAt(0).toUpperCase() + this.category.slice(1).toLowerCase();
  }
  
  // Trim whitespace from string fields
  if (this.name) this.name = this.name.trim();
  if (this.description) this.description = this.description.trim();
  
  next();
});

/**
 * Pre-find middleware to exclude inactive gems by default
 */
gemSchema.pre(/^find/, function(next) {
  // Only apply this filter if isActive is not explicitly set in the query
  if (!this.getQuery().hasOwnProperty('isActive')) {
    this.find({ isActive: { $ne: false } });
  }
  next();
});

const Gem = mongoose.model('Gem', gemSchema);

module.exports = Gem;