import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const PermissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Permission name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Permission code is required'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  module: {
    type: String,
    required: [true, 'Permission module name is required'],
    trim: true,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
});

PermissionSchema.plugin(baseSchemaPlugin);

const Permission = mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);

export default Permission;
export { Permission };
