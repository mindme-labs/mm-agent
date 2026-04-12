import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { UploadedFiles } from './collections/UploadedFiles'
import { Recommendations } from './collections/Recommendations'
import { RecommendationFeedback } from './collections/RecommendationFeedback'
import { AnalysisResults } from './collections/AnalysisResults'
import { AIPrompts } from './collections/AIPrompts'
import { AIUsageLogs } from './collections/AIUsageLogs'
import { EventLog } from './collections/EventLog'
import { InviteCodes } from './collections/InviteCodes'
import { AccessRequests } from './collections/AccessRequests'
import { GlobalSettings } from './globals/GlobalSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || '',
  cors: [process.env.PAYLOAD_PUBLIC_SERVER_URL || ''].filter(Boolean),
  csrf: [process.env.PAYLOAD_PUBLIC_SERVER_URL || ''].filter(Boolean),
  routes: {
    admin: '/8ca90f70',
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Media,
    UploadedFiles,
    Recommendations,
    RecommendationFeedback,
    AnalysisResults,
    AIPrompts,
    AIUsageLogs,
    EventLog,
    InviteCodes,
    AccessRequests,
  ],
  globals: [GlobalSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || '',
  }),
  sharp,
  plugins: [],
})
