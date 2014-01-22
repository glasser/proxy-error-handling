var httpProxy = require('http-proxy');
var http = require('http');

var serverPort = 8000;
var proxyPort = 8001;

var proxy = httpProxy.createProxyServer();

var server = http.createServer(function (req, res) {
  proxy.web(req,res, {target: 'http://127.0.0.1:' + serverPort});
});
server.on('upgrade', function (req, socket, head) {
  socket.on('error', function (e) {
    console.log('got error on incoming socket', e);
    // We don't actually have access to proxySocket here, so we can't close it
    // directly.  We can destroy socket but that won't actually do anything to
    // proxySocket (even though socket is still piped to proxySocket).  It will
    // work to run `socket.unshift(null)` since that causes `socket` to emit
    // 'end' which ends proxySocket (via the pipe), but you're really not
    // supposed to unshift anything you didn't just read.
    socket.destroy();
  });

  proxy.ws(req, socket, head, {target: 'http://127.0.0.1:' + serverPort});
});

console.log('Proxy listening on port ' + 8001);
server.listen(proxyPort);
