import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role?: string
      orgId?: string
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId: string
    role?: string
    orgId?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            hashedPassword: true,
          },
        })

        if (!user || !user.hashedPassword) return null

        const isValid = await bcrypt.compare(password, user.hashedPassword)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, persist the user id on the token
      if (user?.id) {
        token.userId = user.id
      }

      // Resolve the user's active membership for role + org context.
      // This runs on every token refresh so role changes take effect
      // without requiring a new sign-in.
      if (token.userId) {
        const membership = await prisma.membership.findFirst({
          where: {
            userId: token.userId,
            status: 'ACTIVE',
          },
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            organizationId: true,
          },
        })

        if (membership) {
          token.role = membership.role
          token.orgId = membership.organizationId
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId
        session.user.role = token.role
        session.user.orgId = token.orgId
      }
      return session
    },
  },
})
