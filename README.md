# Reproduction for [nodejitsu/node-http-proxy#559](https://github.com/nodejitsu/node-http-proxy/issues/559)

When using Node http-proxy 1.0, it is difficult to close the proxy/server socket
in response to an error on the client/proxy socket.

If the client/proxy socket is *closed*, then it's fine: because `socket` is
piped into `proxySocket`, closing the outer socket will close the inner socket.

But connections can fail due to error rather than a normal close; for example,
due to network changes.  This repo demonstrates the issue.

You will need to have two computers, ideally on the same network, where the
second can reach the first by IP. (A phone with a reasonably recent OS works
fine for the second computer.) On the first, run `npm install && node server.js`.
This will run a simple proxy server on port 8001 that forwards to port 8000,
and a websocket server on port 8000 which displays how many clients
are connected. It will tells you the IP to connect the second device.

Open the proxy URL on a second device. You should see the server print
`OPEN, currently 1`.

Turn off the internet connection on the second device.  You should NOT see the
server print `CLOSE, current 0`. If you wait a few minutes, the *proxy* should
print something like:

    got error on incoming socket { [Error: write Unknown system errno 64]
      code: 'Unknown system errno 64',
      errno: 'Unknown system errno 64',
      syscall: 'write' }

This is the error that occurs when it is eventually unable to send its proxied
heartbeats to the clients.

The problem is: the proxy-server socket is still alive! You won't see the server
ever print `CLOSE, current 0` (until you kill the proxy. Even if you destroy the
client-proxy socket! And I know of no "legal" way to close the proxy-server
socket: `proxySocket` is never passed to application code.
