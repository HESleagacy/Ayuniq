// FHIR R4 ConceptMap Model for Translation Mappings
const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema({
  code: String,
  display: String,
  equivalence: {
    type: String,
    enum: ['relatedto', 'equivalent', 'equal', 'wider', 'subsumes', 'narrower', 'specializes', 'inexact', 'unmatched', 'disjoint'],
    required: true
  },
  comment: String,
  dependsOn: [{
    property: {
      type: String,
      required: true
    },
    system: String,
    value: {
      type: String,
      required: true
    },
    display: String
  }],
  product: [{
    property: {
      type: String,
      required: true
    },
    system: String,
    value: {
      type: String,
      required: true
    },
    display: String
  }]
}, { _id: false });

const elementSchema = new mongoose.Schema({
  code: String,
  display: String,
  target: [targetSchema]
}, { _id: false });

const unmappedSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ['provided', 'fixed', 'other-map'],
    required: true
  },
  code: String,
  display: String,
  url: String
}, { _id: false });

const groupSchema = new mongoose.Schema({
  source: String,
  sourceVersion: String,
  target: String,
  targetVersion: String,
  element: [elementSchema],
  unmapped: unmappedSchema
}, { _id: false });

const conceptMapSchema = new mongoose.Schema({
  resourceType: {
    type: String,
    default: 'ConceptMap',
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
    profile: [String]
  },
  implicitRules: String,
  language: {
    type: String,
    default: 'en'
  },
  text: {
    status: {
      type: String,
      enum: ['generated', 'extensions', 'additional', 'empty']
    },
    div: String
  },
  url: {
    type: String,
    index: true
  },
  identifier: [{
    use: String,
    system: String,
    value: String
  }],
  version: {
    type: String,
    default: '1.0.0'
  },
  name: String,
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
      system: String,
      value: String,
      use: String
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
  sourceUri: String,
  sourceCanonical: String,
  targetUri: String,
  targetCanonical: String,
  group: [groupSchema]
}, {
  timestamps: true,
  collection: 'conceptmaps'
});

// Indexes for performance
conceptMapSchema.index({ 'group.source': 1, 'group.target': 1 });
conceptMapSchema.index({ 'group.element.code': 1 });
conceptMapSchema.index({ status: 1 });

// Methods
conceptMapSchema.methods.toFHIR = function() {
  const obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
};

conceptMapSchema.methods.translate = function(sourceCode, sourceSystem, targetSystem) {
  for (const group of this.group) {
    if (group.source === sourceSystem && group.target === targetSystem) {
      const element = group.element.find(e => e.code === sourceCode);
      if (element && element.target.length > 0) {
        return {
          result: true,
          match: element.target.map(target => ({
            equivalence: target.equivalence,
            concept: {
              system: targetSystem,
              code: target.code,
              display: target.display
            },
            comment: target.comment
          }))
        };
      }
    }
  }
  
  return {
    result: false,
    message: 'No translation found'
  };
};

// Static methods
conceptMapSchema.statics.findBySourceTarget = function(sourceSystem, targetSystem) {
  return this.findOne({
    'group.source': sourceSystem,
    'group.target': targetSystem,
    status: 'active'
  });
};

conceptMapSchema.statics.createNAMASTEToICD11Map = function() {
  return this.create({
    id: 'namaste-to-icd11',
    url: 'https://ayushbridge.in/fhir/ConceptMap/namaste-to-icd11',
    name: 'NAMASTEToICD11ConceptMap',
    title: 'NAMASTE to ICD-11 TM2 Concept Map',
    status: 'active',
    description: 'Mapping from NAMASTE codes to WHO ICD-11 Traditional Medicine Module 2',
    sourceCanonical: 'https://ayush.gov.in/fhir/CodeSystem/namaste',
    targetCanonical: 'http://id.who.int/icd/release/11/mms',
    group: [{
      source: 'https://ayush.gov.in/fhir/CodeSystem/namaste',
      target: 'http://id.who.int/icd/release/11/mms',
      element: []
    }]
  });
};

module.exports = mongoose.model('ConceptMap', conceptMapSchema);