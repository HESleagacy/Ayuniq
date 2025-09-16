// Translation Processing Results Model
const mongoose = require('mongoose');

const translationSourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['WHO_Ayurveda', 'Ayush_Ministry', 'Classical_Texts', 'Modern_Literature', 'Machine_Learning', 'Human_Review']
  },
  translation: String,
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  metadata: {
    whoCode: String,
    reference: String,
    reviewer: String,
    reviewDate: Date,
    notes: String
  }
}, { _id: false });

const translationSchema = new mongoose.Schema({
  // Source information from NAMASTE CSV
  namasteCode: {
    type: String,
    required: true,
    index: true
  },
  sanskritName: {
    type: String,
    required: true,
    index: 'text'
  },
  hindiName: {
    type: String,
    index: 'text'
  },
  system: {
    type: String,
    enum: ['Ayurveda', 'Siddha', 'Unani', 'Yoga', 'Naturopathy', 'Homeopathy'],
    required: true
  },
  category: String,
  
  // Translation results
  englishTranslation: {
    type: String,
    required: true,
    index: 'text'
  },
  finalConfidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  
  // Translation sources and alternatives
  sources: [translationSourceSchema],
  alternatives: [{
    translation: String,
    confidence: Number,
    source: String
  }],
  
  // ICD-11 mappings
  icd11Mappings: [{
    code: String,
    display: String,
    system: {
      type: String,
      enum: ['TM2', 'Biomedicine'],
      default: 'TM2'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    equivalence: {
      type: String,
      enum: ['equivalent', 'equal', 'wider', 'narrower', 'inexact'],
      default: 'equivalent'
    }
  }],
  
  // Processing status
  status: {
    type: String,
    enum: ['pending', 'processed', 'needs_review', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  processingNotes: String,
  
  // Review information
  reviewStatus: {
    type: String,
    enum: ['not_required', 'pending', 'in_progress', 'completed'],
    default: 'not_required'
  },
  reviewer: {
    name: String,
    email: String,
    expertise: [String],
    reviewDate: Date
  },
  reviewNotes: String,
  reviewChanges: [{
    field: String,
    oldValue: String,
    newValue: String,
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Quality metrics
  qualityScore: {
    type: Number,
    min: 0,
    max: 100
  },
  validationChecks: {
    medicalAccuracy: {
      type: String,
      enum: ['passed', 'failed', 'unknown'],
      default: 'unknown'
    },
    linguisticAccuracy: {
      type: String,
      enum: ['passed', 'failed', 'unknown'],
      default: 'unknown'
    },
    contextualRelevance: {
      type: String,
      enum: ['passed', 'failed', 'unknown'],
      default: 'unknown'
    }
  },
  
  // Metadata
  processingTime: Number, // milliseconds
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  collection: 'translations'
});

// Indexes for performance
translationSchema.index({ namasteCode: 1 }, { unique: true });
translationSchema.index({ status: 1, finalConfidence: -1 });
translationSchema.index({ system: 1, category: 1 });
translationSchema.index({ reviewStatus: 1 });
translationSchema.index({ 'icd11Mappings.code': 1 });

// Virtual for display
translationSchema.virtual('displayName').get(function() {
  return this.englishTranslation || this.sanskritName;
});

// Methods
translationSchema.methods.addSource = function(source) {
  this.sources.push(source);
  this.recalculateConfidence();
};

translationSchema.methods.recalculateConfidence = function() {
  if (this.sources.length === 0) {
    this.finalConfidence = 0;
    return;
  }
  
  // Weighted average based on source reliability
  const weights = {
    'WHO_Ayurveda': 0.95,
    'Ayush_Ministry': 0.90,
    'Classical_Texts': 0.85,
    'Modern_Literature': 0.80,
    'Machine_Learning': 0.70,
    'Human_Review': 1.0
  };
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  this.sources.forEach(source => {
    const weight = weights[source.name] || 0.5;
    totalWeight += weight;
    weightedSum += source.confidence * weight;
  });
  
  this.finalConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0;
};

translationSchema.methods.needsReview = function() {
  return this.finalConfidence < 0.85 || this.sources.length < 2;
};

translationSchema.methods.approve = function(reviewer) {
  this.status = 'approved';
  this.reviewStatus = 'completed';
  this.reviewer = reviewer;
  this.reviewer.reviewDate = new Date();
  this.lastUpdated = new Date();
};

translationSchema.methods.reject = function(reviewer, reason) {
  this.status = 'rejected';
  this.reviewStatus = 'completed';
  this.reviewer = reviewer;
  this.reviewer.reviewDate = new Date();
  this.reviewNotes = reason;
  this.lastUpdated = new Date();
};

// Static methods
translationSchema.statics.getProcessingStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$finalConfidence' }
      }
    }
  ]);
};

translationSchema.statics.getPendingReviews = function() {
  return this.find({
    reviewStatus: 'pending',
    status: 'needs_review'
  }).sort({ finalConfidence: 1 });
};

translationSchema.statics.getHighConfidenceTranslations = function() {
  return this.find({
    finalConfidence: { $gte: 0.85 },
    status: { $in: ['processed', 'approved'] }
  });
};

translationSchema.statics.searchTranslations = function(searchTerm) {
  return this.find({
    $text: { $search: searchTerm }
  }).sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Translation', translationSchema);