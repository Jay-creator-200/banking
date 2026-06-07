import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Role code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
});

RoleSchema.plugin(baseSchemaPlugin);

const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);

export default Role;
export { Role };
