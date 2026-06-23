/**
 * Trust reverse-proxy headers so session cookies work behind HTTPS terminators.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const forwardedProto = getRequestHeader(event, 'x-forwarded-proto')
    if (forwardedProto === 'https') {
      event.node.req.headers['x-forwarded-proto'] = 'https'
    }
  })
})
