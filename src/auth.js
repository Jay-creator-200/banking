import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';

import { authConfig } from './auth.config.js';
import connectDB from '@/lib/mongodb.js';

// Import all models upfront — registers their schemas with Mongoose so
// .populate() and cross-collection queries work without MissingSchemaError.
import User from '@/models/User.js';
import Branch from '@/models/Branch.js';
import RolePermission from '@/models/RolePermission.js';
import Permission from '@/models/Permission.js';
import LoginLog from '@/models/LoginLog.js';
// Role is registered via User.js populate dependency — import explicitly to be safe
import '@/models/Role.js';
import '@/models/Member.js';
import '@/models/MemberPortalAccount.js';
import '@/models/Notification.js';
import '@/models/NotificationPreference.js';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username or Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          await connectDB();

          const reqHeaders = await headers();
          const ip = reqHeaders.get('x-forwarded-for') || '127.0.0.1';
          const userAgent = reqHeaders.get('user-agent') || 'Unknown';

          const identifier = String(credentials?.username || '').toLowerCase().trim();
          const password = credentials?.password;

          console.log('[AUTH] Login attempt — identifier:', identifier);

          if (!identifier || !password) {
            console.log('[AUTH] Missing credentials fields');
            return null;
          }

          // Direct Mongoose query bypassing the service/repository chain
          const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }],
          })
            .populate('roleId')
            .lean();

          let memberAccount = null;
          if (!user) {
            const MemberPortalAccount = mongoose.model('MemberPortalAccount');
            const Member = mongoose.model('Member');
            
            // Allow logging in by email or mobile as username
            const memberObj = await Member.findOne({
              $or: [{ email: identifier }, { mobile: identifier }],
            }).lean();

            const queryObj = { username: identifier };
            if (memberObj) {
              queryObj.memberId = memberObj._id;
            }

            memberAccount = await MemberPortalAccount.findOne({
              $or: [queryObj, { username: identifier }],
            })
              .populate('memberId')
              .lean();
          }

          if (!user && memberAccount) {
            console.log('[AUTH] Member portal login attempt —', memberAccount.username);
            if (memberAccount.isLocked) {
              try {
                await LoginLog.create({
                  email: identifier,
                  loginStatus: 'FAILED',
                  ipAddress: ip,
                  userAgent,
                });
              } catch (_) {}
              throw new Error('Account is locked. Contact support.');
            }

            const isMatch = await bcrypt.compare(password, memberAccount.password);
            if (!isMatch) {
              try {
                const MemberPortalAccountModel = mongoose.model('MemberPortalAccount');
                const newAttempts = (memberAccount.failedLoginAttempts || 0) + 1;
                const shouldLock = newAttempts >= 5;
                await MemberPortalAccountModel.findByIdAndUpdate(memberAccount._id, {
                  $inc: { failedLoginAttempts: 1 },
                  ...(shouldLock ? { isLocked: true } : {}),
                });
                await LoginLog.create({
                  email: identifier,
                  loginStatus: 'FAILED',
                  ipAddress: ip,
                  userAgent,
                });
                if (shouldLock) {
                  console.warn(`[AUTH] Member account locked after ${newAttempts} failed attempts — ${identifier}`);
                  // Dispatch security alert (non-fatal)
                  try {
                    const { default: ReminderEngineInstance } = await import('./services/ReminderEngine.js');
                    await ReminderEngineInstance.sendSecurityAlert({
                      memberId: memberAccount.memberId._id,
                      action: 'Account Locked — Too Many Failed Login Attempts',
                      ip,
                      userAgent,
                    });
                  } catch (_) {}
                  throw new Error('Account has been locked after too many failed attempts. Contact support.');
                }
              } catch (lockErr) {
                if (lockErr.message?.includes('locked')) throw lockErr;
              }
              return null;
            }

            // Successful member login
            try {
              const MemberPortalAccountModel = mongoose.model('MemberPortalAccount');
              await MemberPortalAccountModel.findByIdAndUpdate(memberAccount._id, {
                lastLoginAt: new Date(),
                lastLoginIp: ip,
                failedLoginAttempts: 0,
              });
              await LoginLog.create({
                email: identifier,
                userId: memberAccount.memberId._id,
                loginStatus: 'SUCCESS',
                ipAddress: ip,
                userAgent,
              });

              // Send security alert for new login
              const { default: ReminderEngineInstance } = await import('./services/ReminderEngine.js');
              await ReminderEngineInstance.sendSecurityAlert({
                memberId: memberAccount.memberId._id,
                action: 'New Login',
                ip,
                userAgent,
              });
            } catch (e) {
              console.warn('[AUTH] Failed post-member-login updates:', e.message);
            }

            return {
              id: memberAccount.memberId._id.toString(),
              fullName: memberAccount.memberId.fullName,
              email: memberAccount.memberId.email || '',
              username: memberAccount.username,
              roleId: null,
              roleCode: 'MEMBER',
              branchId: memberAccount.memberId.branchId ? memberAccount.memberId.branchId.toString() : null,
              branchCode: 'MBR',
              branchName: 'Member Portal',
              permissions: [],
            };
          }

          if (!user) {
            console.log('[AUTH] No user found for identifier:', identifier);
            try {
              await LoginLog.create({
                email: identifier,
                loginStatus: 'FAILED',
                ipAddress: ip,
                userAgent,
              });
            } catch (_) {}
            return null;
          }

          console.log('[AUTH] User found:', user.email, '| locked:', user.isLocked, '| status:', user.status);

          if (user.isLocked) {
            try {
              await LoginLog.create({
                email: user.email,
                userId: user._id,
                loginStatus: 'FAILED',
                ipAddress: ip,
                userAgent,
              });
            } catch (_) {}
            throw new Error('Account is locked. Contact your administrator.');
          }

          if (user.status !== 'ACTIVE') {
            try {
              await LoginLog.create({
                email: user.email,
                userId: user._id,
                loginStatus: 'FAILED',
                ipAddress: ip,
                userAgent,
              });
            } catch (_) {}
            throw new Error('Account is inactive. Contact your administrator.');
          }

          const isMatch = await bcrypt.compare(password, user.password);
          console.log('[AUTH] Password match:', isMatch);

          if (!isMatch) {
            try {
              const newAttempts = (user.failedLoginAttempts || 0) + 1;
              const shouldLock = newAttempts >= 5;
              await User.findByIdAndUpdate(user._id, {
                $inc: { failedLoginAttempts: 1 },
                ...(shouldLock ? { isLocked: true } : {}),
              });
              await LoginLog.create({
                email: user.email,
                userId: user._id,
                loginStatus: 'FAILED',
                ipAddress: ip,
                userAgent,
              });
              if (shouldLock) {
                console.warn(`[AUTH] Employee account locked after ${newAttempts} failed attempts — ${user.email}`);
                throw new Error('Account has been locked after too many failed attempts. Contact your administrator.');
              }
            } catch (lockErr) {
              if (lockErr.message?.includes('locked')) throw lockErr;
            }
            return null;
          }

          // Successful authentication — update login metadata
          try {
            await User.findByIdAndUpdate(user._id, {
              lastLoginAt: new Date(),
              lastLoginIp: ip,
              failedLoginAttempts: 0,
            });
            await LoginLog.create({
              email: user.email,
              userId: user._id,
              loginStatus: 'SUCCESS',
              ipAddress: ip,
              userAgent,
            });
          } catch (e) {
            console.warn('[AUTH] Failed to update post-login metadata:', e.message);
          }

          // Resolve branch details
          let branchCode = 'HO';
          let branchName = 'Head Office';
          try {
            if (user.branchId) {
              const branch = await Branch.findById(user.branchId).lean();
              if (branch) {
                branchCode = branch.branchCode;
                branchName = branch.branchName;
              }
            }
          } catch (e) {
            console.warn('[AUTH] Branch fetch failed (non-fatal):', e.message);
          }

          // Resolve permissions for the role
          let permissionsList = [];
          try {
            const roleObjectId = user.roleId?._id || user.roleId;
            const mappings = await RolePermission.find({ roleId: roleObjectId })
              .populate('permissionId')
              .lean();
            permissionsList = mappings
              .map((m) => m.permissionId?.code)
              .filter(Boolean);
          } catch (e) {
            console.warn('[AUTH] Permissions fetch failed (non-fatal):', e.message);
          }

          const roleId = user.roleId?._id || user.roleId;
          const roleCode = user.roleId?.code || null;

          console.log('[AUTH] ✅ Login successful —', user.email, '| role:', roleCode, '| permissions:', permissionsList.length);

          return {
            id: user._id.toString(),
            fullName: user.fullName,
            email: user.email,
            username: user.username,
            roleId: roleId ? roleId.toString() : null,
            roleCode,
            branchId: user.branchId ? user.branchId.toString() : null,
            branchCode,
            branchName,
            permissions: permissionsList,
          };
        } catch (error) {
          // Re-throw meaningful user-facing errors; suppress internal failures
          if (
            error.message?.includes('locked') ||
            error.message?.includes('inactive')
          ) {
            throw error;
          }
          console.error('[AUTH] ❌ Unexpected error in authorize():', error.message, error.stack);
          return null;
        }
      },
    }),
  ],
});
