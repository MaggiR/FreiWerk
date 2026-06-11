import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
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

// Formal ballot choices (no "undecided" — a cast ballot is a definite position).
export const ballotChoiceEnum = pgEnum('ballot_choice', [
  'approve',
  'reject',
  'abstain',
])

// Final decision outcome stored on the motion once a ballot is finalized.
export const motionOutcomeEnum = pgEnum('motion_outcome', [
  'accepted',
  'rejected',
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
  // Public profile image stored under /uploads/.
  avatarUrl: text('avatar_url'),
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
    // Formal ballot window (set when the author opens the ballot phase).
    ballotStartedAt: timestamp('ballot_started_at', { withTimezone: true }),
    ballotEndsAt: timestamp('ballot_ends_at', { withTimezone: true }),
    // Final decision once the ballot is finalized (status -> 'decided').
    outcome: motionOutcomeEnum('outcome'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    // Set when the motion is archived (withdrawn/closed); null while active.
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    // When true the author is hidden from public views (authorId remains for auth).
    isAnonymous: boolean('is_anonymous').notNull().default(false),
    // 0 while draft; 1 once published (v1 snapshot); incremented when the author
    // saves accepted suggestions as a new version.
    currentVersion: integer('current_version').notNull().default(0),
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

// Motions a user watches/favorites to follow their progress.
export const motionWatches = pgTable(
  'motion_watches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('motion_watches_motion_user_idx').on(
      table.motionId,
      table.userId,
    ),
    index('motion_watches_user_idx').on(table.userId),
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

// Immutable snapshot of a motion's content at a point in time.
// v1 is captured on publish; each saved set of accepted suggestions appends one.
export const motionVersions = pgTable(
  'motion_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    // Sanitized TipTap HTML output captured at snapshot time.
    bodyHtml: text('body_html').notNull(),
    // User who triggered the snapshot (author on publish/save).
    createdById: uuid('created_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('motion_versions_motion_number_idx').on(
      table.motionId,
      table.versionNumber,
    ),
    index('motion_versions_motion_idx').on(table.motionId),
  ],
)

// One shared working document per motion (Google-Docs-style suggestion mode).
// Holds ProseMirror JSON whose insertion/deletion/modification marks are the
// open change suggestions. The author accepts/rejects them into a new version.
export const motionWorkingDocs = pgTable('motion_working_docs', {
  id: uuid('id').defaultRandom().primaryKey(),
  motionId: uuid('motion_id')
    .notNull()
    .unique()
    .references(() => motions.id, { onDelete: 'cascade' }),
  // Motion version number this working document is based on.
  baseVersion: integer('base_version').notNull(),
  // ProseMirror document JSON including suggestion marks.
  docJson: jsonb('doc_json').notNull(),
  // Optimistic concurrency token; bumped on every successful write.
  revision: integer('revision').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Secret ballot: anonymous vote records. Deliberately has NO user reference so a
// choice can never be linked back to a member (vote/profile separation).
export const ballots = pgTable(
  'ballots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    choice: ballotChoiceEnum('choice').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('ballots_motion_idx').on(table.motionId)],
)

// Participation log: records WHO has voted (to prevent double voting) without
// storing their choice. Kept separate from `ballots` so the two cannot be joined.
export const ballotParticipants = pgTable(
  'ballot_participants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('ballot_participants_motion_user_idx').on(
      table.motionId,
      table.userId,
    ),
    index('ballot_participants_user_idx').on(table.userId),
  ],
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
  watches: many(motionWatches),
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
  watches: many(motionWatches),
  versions: many(motionVersions),
  workingDoc: one(motionWorkingDocs),
  ballots: many(ballots),
  ballotParticipants: many(ballotParticipants),
}))

export const ballotsRelations = relations(ballots, ({ one }) => ({
  motion: one(motions, {
    fields: [ballots.motionId],
    references: [motions.id],
  }),
}))

export const ballotParticipantsRelations = relations(
  ballotParticipants,
  ({ one }) => ({
    motion: one(motions, {
      fields: [ballotParticipants.motionId],
      references: [motions.id],
    }),
    user: one(users, {
      fields: [ballotParticipants.userId],
      references: [users.id],
    }),
  }),
)

export const motionWatchesRelations = relations(motionWatches, ({ one }) => ({
  motion: one(motions, {
    fields: [motionWatches.motionId],
    references: [motions.id],
  }),
  user: one(users, {
    fields: [motionWatches.userId],
    references: [users.id],
  }),
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

export const motionVersionsRelations = relations(motionVersions, ({ one }) => ({
  motion: one(motions, {
    fields: [motionVersions.motionId],
    references: [motions.id],
  }),
  createdBy: one(users, {
    fields: [motionVersions.createdById],
    references: [users.id],
  }),
}))

export const motionWorkingDocsRelations = relations(
  motionWorkingDocs,
  ({ one }) => ({
    motion: one(motions, {
      fields: [motionWorkingDocs.motionId],
      references: [motions.id],
    }),
  }),
)

// ---------- Inferred types ----------

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Division = typeof divisions.$inferSelect
export type Motion = typeof motions.$inferSelect
export type NewMotion = typeof motions.$inferInsert
export type Post = typeof posts.$inferSelect
export type MoodVote = typeof moodVotes.$inferSelect
export type MotionWatch = typeof motionWatches.$inferSelect
export type MotionVersion = typeof motionVersions.$inferSelect
export type NewMotionVersion = typeof motionVersions.$inferInsert
export type MotionWorkingDoc = typeof motionWorkingDocs.$inferSelect
export type NewMotionWorkingDoc = typeof motionWorkingDocs.$inferInsert
export type Ballot = typeof ballots.$inferSelect
export type NewBallot = typeof ballots.$inferInsert
export type BallotParticipant = typeof ballotParticipants.$inferSelect
export type NewBallotParticipant = typeof ballotParticipants.$inferInsert
export type MoodChoice = (typeof moodChoiceEnum.enumValues)[number]
export type BallotChoice = (typeof ballotChoiceEnum.enumValues)[number]
export type MotionOutcome = (typeof motionOutcomeEnum.enumValues)[number]
export type MotionStatus = (typeof motionStatusEnum.enumValues)[number]
export type UserRole = (typeof userRoleEnum.enumValues)[number]
