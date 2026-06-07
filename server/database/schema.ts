import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ---------- Enums ----------

export const userRoleEnum = pgEnum('user_role', ['member', 'moderator', 'admin'])

// MVP lifecycle: draft -> debate. ballot/decided reserved for post-MVP.
export const motionStatusEnum = pgEnum('motion_status', [
  'draft',
  'debate',
  'ballot',
  'decided',
])

export const moodChoiceEnum = pgEnum('mood_choice', [
  'approve',
  'reject',
  'abstain',
  'undecided',
])

// ---------- Tables ----------

export const divisions = pgTable('divisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  // Self-referencing hierarchy (Bund -> Landesverband -> Kreis-/Bezirksverband).
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  role: userRoleEnum('role').notNull().default('member'),
  // Optional self-described function (e.g. "Mitglied LFA Wirtschaft").
  fn: text('fn'),
  divisionId: uuid('division_id').references(() => divisions.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const motions = pgTable(
  'motions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    // Sanitized TipTap HTML output.
    bodyHtml: text('body_html').notNull(),
    status: motionStatusEnum('status').notNull().default('draft'),
    topic: text('topic').notNull(),
    divisionId: uuid('division_id').references(() => divisions.id, {
      onDelete: 'set null',
    }),
    debateEndsAt: timestamp('debate_ends_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('motions_status_idx').on(table.status),
    index('motions_author_idx').on(table.authorId),
    index('motions_topic_idx').on(table.topic),
  ],
)

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Sanitized HTML output.
    bodyHtml: text('body_html').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('posts_motion_idx').on(table.motionId)],
)

// Current mood vote per user per motion (drives the ring/doughnut chart).
export const moodVotes = pgTable(
  'mood_votes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    choice: moodChoiceEnum('choice').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('mood_votes_motion_user_idx').on(table.motionId, table.userId),
  ],
)

// Append-only log of every mood vote change (drives the trend/area chart).
export const moodVoteEvents = pgTable(
  'mood_vote_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    choice: moodChoiceEnum('choice').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('mood_vote_events_motion_idx').on(table.motionId)],
)

// ---------- Relations ----------

export const divisionsRelations = relations(divisions, ({ one, many }) => ({
  parent: one(divisions, {
    fields: [divisions.parentId],
    references: [divisions.id],
    relationName: 'division_parent',
  }),
  children: many(divisions, { relationName: 'division_parent' }),
  motions: many(motions),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  division: one(divisions, {
    fields: [users.divisionId],
    references: [divisions.id],
  }),
  motions: many(motions),
  posts: many(posts),
}))

export const motionsRelations = relations(motions, ({ one, many }) => ({
  author: one(users, {
    fields: [motions.authorId],
    references: [users.id],
  }),
  division: one(divisions, {
    fields: [motions.divisionId],
    references: [divisions.id],
  }),
  posts: many(posts),
  moodVotes: many(moodVotes),
}))

export const postsRelations = relations(posts, ({ one }) => ({
  motion: one(motions, {
    fields: [posts.motionId],
    references: [motions.id],
  }),
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))

// ---------- Inferred types ----------

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Division = typeof divisions.$inferSelect
export type Motion = typeof motions.$inferSelect
export type NewMotion = typeof motions.$inferInsert
export type Post = typeof posts.$inferSelect
export type MoodVote = typeof moodVotes.$inferSelect
export type MoodChoice = (typeof moodChoiceEnum.enumValues)[number]
export type MotionStatus = (typeof motionStatusEnum.enumValues)[number]
export type UserRole = (typeof userRoleEnum.enumValues)[number]
