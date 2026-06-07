export const authConfig = {
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours session duration
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.fullName = user.fullName;
        token.email = user.email;
        token.username = user.username;
        token.roleId = user.roleId;
        token.roleCode = user.roleCode;
        token.branchId = user.branchId;
        token.branchCode = user.branchCode;
        token.branchName = user.branchName;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.fullName = token.fullName;
        session.user.email = token.email;
        session.user.username = token.username;
        session.user.roleId = token.roleId;
        session.user.roleCode = token.roleCode;
        session.user.branchId = token.branchId;
        session.user.branchCode = token.branchCode;
        session.user.branchName = token.branchName;
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [], // Empty providers array for Edge runtime compatibility
};

export default authConfig;
