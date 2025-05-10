import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import { melodyPreviewer } from './actions/melodyPreviewer'

export default defineConfig({
  name: 'default',
  title: 'Midies',

  projectId: 's425b8qg',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],

  document: {
      actions: [melodyPreviewer],
  },

  schema: {
    types: schemaTypes,
  },
})
