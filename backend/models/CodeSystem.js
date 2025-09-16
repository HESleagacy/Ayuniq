// FHIR R4 CodeSystem Model
const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true,
    default: 'en'
  },
  use: {
    system: String,
    code: String,
    display: String
  },
  value: {
    type: String,
    required: true
  }
}, { _id: false });

const propertySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  valueString: String,
  valueCode: String,
  valueInteger: Number,
  valueBoolean: Boolean,
  valueDateTime: Date
}, { _id: false });

const conceptSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    index: true
  },
  display: {
    type: String,
    required: true,
    index: 'text'
  },
  definition: String,
  designation: [designationSchema],
  property: [propertySchema],
  concept: [this] // For hierarchical concepts
}, { _id: false });

const identifierSchema = new mongoose.Schema({
  use: {
    type: String,
    enum: ['usual', 'official', 'temp', 'secondary']
  },
  type: {
    coding: [{
      system: String,
      code: String,
      display: String
    }]
  },
  system: String,
  value: {
    type: String,
    required: true
  }
}, { _id: false });

const codeSystemSchema = new mongoose.Schema({
  resourceType: {
    type: String,
    default: 'CodeSystem',
    required: true
  },
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  meta: {
    versionId: String,
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    source: String,
    profile: [String],
    security: [{
      system: String,
      code: String,
      display: String
    }],
    tag: [{
      system: String,
      code: String,
      display: String
    }]
  },
  implicitRules: String,
  language: {
    type: String,
    default: 'en'
  },
  text: {
    status: {
      type: String,
      enum: ['generated', 'extensions', 'additional', 'empty'],
      required: true
    },
    div: String
  },
  contained: [mongoose.Schema.Types.Mixed],
  extension: [{
    url: String,
    valueString: String,
    valueCode: String,
    valueBoolean: Boolean
  }],
  modifierExtension: [{
    url: String,
    valueString: String
  }],
  url: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  identifier: [identifierSchema],
  version: {
    type: String,
    default: '1.0.0'
  },
  name: {
    type: String,
    required: true
  },
  title: String,
  status: {
    type: String,
    enum: ['draft', 'active', 'retired', 'unknown'],
    default: 'active',
    required: true,
    index: true
  },
  experimental: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: Date.now
  },
  publisher: String,
  contact: [{
    name: String,
    telecom: [{
      system: {
        type: String,
        enum: ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other']
      },
      value: String,
      use: {
        type: String,
        enum: ['home', 'work', 'temp', 'old', 'mobile']
      }
    }]
  }],
  description: String,
  useContext: [{
    code: {
      system: String,
      code: String,
      display: String
    },
    valueCodeableConcept: {
      coding: [{
        system: String,
        code: String,
        display: String
      }],
      text: String
    }
  }],
  jurisdiction: [{
    coding: [{
      system: String,
      code: String,
      display: String
    }],
    text: String
  }],
  purpose: String,
  copyright: String,
  caseSensitive: {
    type: Boolean,
    default: true
  },
  valueSet: String,
  hierarchyMeaning: {
    type: String,
    enum: ['grouped-by', 'is-a', 'part-of', 'classified-with']
  },
  compositional: {
    type: Boolean,
    default: false
  },
  versionNeeded: {
    type: Boolean,
    default: false
  },
  content: {
    type: String,
    enum: ['not-present', 'example', 'fragment', 'complete', 'supplement'],
    default: 'complete',
    required: true
  },
  supplements: String,
  count: {
    type: Number,
    min: 0
  },
  filter: [{
    code: {
      type: String,
      required: true
    },
    description: String,
    operator: [{
      type: String,
      enum: ['=', 'is-a', 'descendent-of', 'is-not-a', 'regex', 'in', 'not-in', 'generalizes', 'exists']
    }],
    value: String
  }],
  property: [{
    code: {
      type: String,
      required: true
    },
    uri: String,
    description: String,
    type: {
      type: String,
      enum: ['code', 'Coding', 'string', 'integer', 'boolean', 'dateTime', 'decimal'],
      required: true
    }
  }],
  concept: [conceptSchema]
}, {
  timestamps: true,
  collection: 'codesystems'
});

// Indexes for performance
codeSystemSchema.index({ 'concept.code': 1 });
codeSystemSchema.index({ 'concept.display': 'text' });
codeSystemSchema.index({ status: 1, date: -1 });

// Methods
codeSystemSchema.methods.toFHIR = function() {
  const obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
};

codeSystemSchema.methods.lookupConcept = function(code) {
  return this.concept.find(c => c.code === code);
};

codeSystemSchema.methods.searchConcepts = function(searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  return this.concept.filter(c => 
    regex.test(c.display) || 
    regex.test(c.code) ||
    c.designation.some(d => regex.test(d.value))
  );
};

// Static methods
codeSystemSchema.statics.findByUrl = function(url) {
  return this.findOne({ url });
};

codeSystemSchema.statics.searchByName = function(name) {
  return this.find({ 
    name: new RegExp(name, 'i'),
    status: 'active' 
  });
};

module.exports = mongoose.model('CodeSystem', codeSystemSchema);