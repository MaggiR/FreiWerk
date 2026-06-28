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
  type AnyPgColumn,
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

// What a member report points at (Phase 5 moderation).
export const reportTargetTypeEnum = pgEnum('report_target_type', [
  'motion',
  'post',
])

// Lifecycle of a member report as handled by moderators.
export const reportStatusEnum = pgEnum('report_status', [
  'open',
  'resolved',
  'dismissed',
])

// Distinct moderative/administrative actions captured in the audit log.
export const moderationActionEnum = pgEnum('moderation_action', [
  'post_removed',
  'user_banned',
  'user_unbanned',
  'report_resolved',
  'report_dismissed',
  'motion_archived',
  'motion_unarchived',
  'ballot_finalized',
])

// What an audit-log entry refers to. Never references ballots (vote secrecy).
export const moderationTargetTypeEnum = pgEnum('moderation_target_type', [
  'motion',
  'post',
  'user',
  'report',
])

// ---------- Phase 6: deliberation ----------

// Whether an argument speaks for or against the motion.
export const argumentStanceEnum = pgEnum('argument_stance', ['pro', 'con'])

// Moderation/approval status shared by author-moderated elements (arguments,
// resources). Author-authored items start 'accepted'; member proposals 'proposed'.
export const proposalStatusEnum = pgEnum('proposal_status', [
  'proposed',
  'accepted',
  'rejected',
])

// Deliberation status of an accepted argument (its standing in the debate).
export const argumentStatusEnum = pgEnum('argument_status', [
  'open',
  'confirmed',
  'refuted',
])

// Lifecycle of a Q&A question.
export const questionStatusEnum = pgEnum('question_status', [
  'open',
  'partially_answered',
  'answered',
])

// A proposed resource is either an external link or an uploaded file.
export const resourceKindEnum = pgEnum('resource_kind', ['link', 'file'])

// Polymorphic target of a generic (single, contextless) upvote.
export const upvoteTargetTypeEnum = pgEnum('upvote_target_type', [
  'argument',
  'question',
  'answer',
  'resource',
  'post',
])

// What kind of element contains an inline reference (the referencing message).
export const referenceSourceTypeEnum = pgEnum('reference_source_type', [
  'post',
  'answer',
  'argument',
])

// What a reference points at. 'motion_excerpt' anchors a marked passage of the
// motion text (targetId = motionId, plus excerptText/excerptVersion).
export const referenceTargetTypeEnum = pgEnum('reference_target_type', [
  'argument',
  'question',
  'answer',
  'resource',
  'post',
  'motion_excerpt',
])

// Kinds of events recorded in a motion's deliberation activity feed.
export const activityTypeEnum = pgEnum('activity_type', [
  'motion_published',
  'debate_started',
  'motion_version',
  'argument_proposed',
  'argument_accepted',
  'argument_rejected',
  'argument_status_changed',
  'question_asked',
  'question_answered',
  'answer_accepted',
  'resource_proposed',
  'resource_accepted',
  'resource_rejected',
])

// ---------- Tables ----------

export const divisions = pgTable('divisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  // Self-referencing hierarchy (Bund → Bundesland → Kreis-/Bezirksverband).
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  // Nullable since passwordless (magic-link) accounts never set a password.
  // Retained for the seeded demo/admin accounts and potential future use.
  passwordHash: text('password_hash'),
  displayName: text('display_name').notNull(),
  // Public profile image stored under /uploads/.
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('member'),
  // Optional self-described function (e.g. "Mitglied LFA Wirtschaft").
  fn: text('fn'),
  divisionId: uuid('division_id').references(() => divisions.id, {
    onDelete: 'set null',
  }),
  // Set once a member completes the initial profile setup (Stammdaten). Null
  // means the account still needs onboarding after its first magic-link login.
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
  // Moderation ban: set when a moderator/admin blocks the account (Phase 5).
  bannedAt: timestamp('banned_at', { withTimezone: true }),
  banReason: text('ban_reason'),
  bannedById: uuid('banned_by_id').references((): AnyPgColumn => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Single-use, time-limited tokens for passwordless (magic-link) login. Only a
// SHA-256 hash of the token is stored; the raw token lives solely in the email
// link. A row is consumed (consumedAt set) the moment a link is redeemed.
export const magicLinkTokens = pgTable(
  'magic_link_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    // Optional post-login redirect captured when the link was requested.
    redirectPath: text('redirect_path'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('magic_link_tokens_token_hash_idx').on(
      table.tokenHash,
    ),
    emailIdx: index('magic_link_tokens_email_idx').on(table.email),
  }),
)

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
    // Self-reference for threaded replies (arbitrary depth); null = top-level.
    parentId: uuid('parent_id').references((): AnyPgColumn => posts.id, {
      onDelete: 'cascade',
    }),
    // Sanitized HTML output.
    bodyHtml: text('body_html').notNull(),
    // Moderation soft-delete: body is hidden but the node stays so replies survive.
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedById: uuid('deleted_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    deletedReason: text('deleted_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Set only when the author edits post body content. */
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [
    index('posts_motion_idx').on(table.motionId),
    index('posts_parent_idx').on(table.parentId),
  ],
)

// Personal bookmarks for debate posts ("Merken").
export const postSaves = pgTable(
  'post_saves',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('post_saves_post_user_idx').on(table.postId, table.userId),
    index('post_saves_user_idx').on(table.userId),
  ],
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

// Member reports about a motion or a debate post; triaged by moderators with a
// mandatory resolution note. targetId is a loose reference (no FK) because the
// underlying motion/post may be removed while the report stays for the record.
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: reportTargetTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    reason: text('reason').notNull(),
    status: reportStatusEnum('status').notNull().default('open'),
    resolvedById: uuid('resolved_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    resolutionNote: text('resolution_note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    index('reports_status_idx').on(table.status),
    index('reports_target_idx').on(table.targetType, table.targetId),
  ],
)

// Append-only audit log of moderative/administrative actions. Deliberately never
// references ballots/ballot_participants so it cannot break vote/profile secrecy.
export const moderationActions = pgTable(
  'moderation_actions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: moderationActionEnum('action').notNull(),
    targetType: moderationTargetTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    reason: text('reason'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('moderation_actions_actor_idx').on(table.actorId),
    index('moderation_actions_created_idx').on(table.createdAt),
  ],
)

// ---------- Phase 6: deliberation tables ----------

// Pro/contra arguments authored or proposed by members. Author-authored ones are
// immediately 'accepted'; member proposals start 'proposed' and the motion author
// (or a moderator) accepts/rejects them. deliberationStatus tracks their standing.
export const motionArguments = pgTable(
  'arguments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stance: argumentStanceEnum('stance').notNull(),
    title: text('title').notNull(),
    // Sanitized TipTap HTML output.
    bodyHtml: text('body_html').notNull(),
    status: proposalStatusEnum('status').notNull().default('proposed'),
    deliberationStatus: argumentStatusEnum('deliberation_status')
      .notNull()
      .default('open'),
    reviewedById: uuid('reviewed_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('arguments_motion_idx').on(table.motionId),
    index('arguments_author_idx').on(table.authorId),
  ],
)

// Q&A questions under a motion. Questions need no approval. acceptedAnswerId marks
// the answer the asker/author accepted (Stack-Overflow style).
export const questions = pgTable(
  'questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    // Sanitized TipTap HTML output.
    bodyHtml: text('body_html').notNull(),
    status: questionStatusEnum('status').notNull().default('open'),
    acceptedAnswerId: uuid('accepted_answer_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('questions_motion_idx').on(table.motionId)],
)

// Answers to Q&A questions.
export const answers = pgTable(
  'answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    // Denormalized for motion-scoped queries (upvotes, activity, references).
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Sanitized TipTap HTML output.
    bodyHtml: text('body_html').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('answers_question_idx').on(table.questionId),
    index('answers_motion_idx').on(table.motionId),
  ],
)

// Proposed resources (links/files) backing a motion. Author-moderated like arguments.
export const resources = pgTable(
  'resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    kind: resourceKindEnum('kind').notNull(),
    // External URL (kind=link) or uploaded file URL under /uploads/ (kind=file).
    url: text('url').notNull(),
    status: proposalStatusEnum('status').notNull().default('proposed'),
    reviewedById: uuid('reviewed_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('resources_motion_idx').on(table.motionId)],
)

// Generic single upvote (no downvotes). Polymorphic: targetId is a loose
// reference to the upvoted element identified by targetType. One row per user.
export const elementUpvotes = pgTable(
  'element_upvotes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    targetType: upvoteTargetTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('element_upvotes_target_user_idx').on(
      table.targetType,
      table.targetId,
      table.userId,
    ),
    index('element_upvotes_target_idx').on(table.targetType, table.targetId),
  ],
)

// Inline references from a message (post/answer/argument) to one or more
// deliberation elements. Drives multi-reference "Textbausteine" and implicit,
// bidirectionally traversable threads. For 'motion_excerpt' targets, targetId is
// the motionId and the marked passage is kept in excerptText/excerptVersion.
export const elementReferences = pgTable(
  'element_references',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    sourceType: referenceSourceTypeEnum('source_type').notNull(),
    sourceId: uuid('source_id').notNull(),
    targetType: referenceTargetTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    // Only set for 'motion_excerpt': the marked passage and the version it came from.
    excerptText: text('excerpt_text'),
    excerptVersion: integer('excerpt_version'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('element_references_source_idx').on(table.sourceType, table.sourceId),
    index('element_references_target_idx').on(table.targetType, table.targetId),
    index('element_references_motion_idx').on(table.motionId),
  ],
)

// Append-only activity feed per motion: a human-readable log of deliberation and
// motion changes (argument proposed/accepted, question asked/answered, …).
export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    motionId: uuid('motion_id')
      .notNull()
      .references(() => motions.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    type: activityTypeEnum('type').notNull(),
    // Loose reference to the element the event is about (no FK; element may be gone).
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('activity_events_motion_idx').on(table.motionId, table.createdAt)],
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
  arguments: many(motionArguments),
  questions: many(questions),
  resources: many(resources),
  activityEvents: many(activityEvents),
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

export const postsRelations = relations(posts, ({ one, many }) => ({
  motion: one(motions, {
    fields: [posts.motionId],
    references: [motions.id],
  }),
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  parent: one(posts, {
    fields: [posts.parentId],
    references: [posts.id],
    relationName: 'post_parent',
  }),
  replies: many(posts, { relationName: 'post_parent' }),
}))

export const motionArgumentsRelations = relations(
  motionArguments,
  ({ one }) => ({
    motion: one(motions, {
      fields: [motionArguments.motionId],
      references: [motions.id],
    }),
    author: one(users, {
      fields: [motionArguments.authorId],
      references: [users.id],
    }),
  }),
)

export const questionsRelations = relations(questions, ({ one, many }) => ({
  motion: one(motions, {
    fields: [questions.motionId],
    references: [motions.id],
  }),
  author: one(users, {
    fields: [questions.authorId],
    references: [users.id],
  }),
  answers: many(answers),
}))

export const answersRelations = relations(answers, ({ one }) => ({
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
  motion: one(motions, {
    fields: [answers.motionId],
    references: [motions.id],
  }),
  author: one(users, {
    fields: [answers.authorId],
    references: [users.id],
  }),
}))

export const resourcesRelations = relations(resources, ({ one }) => ({
  motion: one(motions, {
    fields: [resources.motionId],
    references: [motions.id],
  }),
  author: one(users, {
    fields: [resources.authorId],
    references: [users.id],
  }),
}))

export const elementUpvotesRelations = relations(elementUpvotes, ({ one }) => ({
  user: one(users, {
    fields: [elementUpvotes.userId],
    references: [users.id],
  }),
}))

export const elementReferencesRelations = relations(
  elementReferences,
  ({ one }) => ({
    motion: one(motions, {
      fields: [elementReferences.motionId],
      references: [motions.id],
    }),
  }),
)

export const activityEventsRelations = relations(activityEvents, ({ one }) => ({
  motion: one(motions, {
    fields: [activityEvents.motionId],
    references: [motions.id],
  }),
  actor: one(users, {
    fields: [activityEvents.actorId],
    references: [users.id],
  }),
}))

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
  }),
  resolvedBy: one(users, {
    fields: [reports.resolvedById],
    references: [users.id],
  }),
}))

export const moderationActionsRelations = relations(
  moderationActions,
  ({ one }) => ({
    actor: one(users, {
      fields: [moderationActions.actorId],
      references: [users.id],
    }),
  }),
)

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
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect
export type NewMagicLinkToken = typeof magicLinkTokens.$inferInsert
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
export type Report = typeof reports.$inferSelect
export type NewReport = typeof reports.$inferInsert
export type ModerationAction = typeof moderationActions.$inferSelect
export type NewModerationAction = typeof moderationActions.$inferInsert
export type MoodChoice = (typeof moodChoiceEnum.enumValues)[number]
export type BallotChoice = (typeof ballotChoiceEnum.enumValues)[number]
export type MotionOutcome = (typeof motionOutcomeEnum.enumValues)[number]
export type MotionStatus = (typeof motionStatusEnum.enumValues)[number]
export type UserRole = (typeof userRoleEnum.enumValues)[number]
export type ReportTargetType = (typeof reportTargetTypeEnum.enumValues)[number]
export type ReportStatus = (typeof reportStatusEnum.enumValues)[number]
export type ModerationActionType =
  (typeof moderationActionEnum.enumValues)[number]
export type ModerationTargetType =
  (typeof moderationTargetTypeEnum.enumValues)[number]

export type MotionArgument = typeof motionArguments.$inferSelect
export type NewMotionArgument = typeof motionArguments.$inferInsert
export type Question = typeof questions.$inferSelect
export type NewQuestion = typeof questions.$inferInsert
export type Answer = typeof answers.$inferSelect
export type NewAnswer = typeof answers.$inferInsert
export type Resource = typeof resources.$inferSelect
export type NewResource = typeof resources.$inferInsert
export type ElementUpvote = typeof elementUpvotes.$inferSelect
export type NewElementUpvote = typeof elementUpvotes.$inferInsert
export type PostSave = typeof postSaves.$inferSelect
export type NewPostSave = typeof postSaves.$inferInsert
export type ElementReference = typeof elementReferences.$inferSelect
export type NewElementReference = typeof elementReferences.$inferInsert
export type ActivityEvent = typeof activityEvents.$inferSelect
export type NewActivityEvent = typeof activityEvents.$inferInsert
export type ArgumentStance = (typeof argumentStanceEnum.enumValues)[number]
export type ProposalStatus = (typeof proposalStatusEnum.enumValues)[number]
export type ArgumentStatus = (typeof argumentStatusEnum.enumValues)[number]
export type QuestionStatus = (typeof questionStatusEnum.enumValues)[number]
export type ResourceKind = (typeof resourceKindEnum.enumValues)[number]
export type UpvoteTargetType = (typeof upvoteTargetTypeEnum.enumValues)[number]
export type ReferenceSourceType =
  (typeof referenceSourceTypeEnum.enumValues)[number]
export type ReferenceTargetType =
  (typeof referenceTargetTypeEnum.enumValues)[number]
export type ActivityType = (typeof activityTypeEnum.enumValues)[number]
