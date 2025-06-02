import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { getRouterManifest } from '@tanstack/react-start/router-manifest'

import { createRouter } from './router'

// eslint-disable-next-line prefer-const
// let streamHandler = defaultStreamHandler

// eslint-disable-next-line react-refresh/only-export-components
export default createStartHandler({
  createRouter,
  getRouterManifest,
})(defaultStreamHandler)
