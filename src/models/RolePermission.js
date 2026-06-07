import mongoose from 'mongoose';

const RolePermissionSchema = new mongoose.Schema({
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role ID is required'],
    index: true,
  },
  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: [true, 'Permission ID is required'],
    index: true,
  },
}, {
  timestamps: true, // Native timestamps only for when mappings were established
});

// Enforce compound unique mapping
RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });

const RolePermission = mongoose.models.RolePermission || mongoose.model('RolePermission', RolePermissionSchema);

export default RolePermission;
export { RolePermission };
