var httpProxy = require('http-proxy');
var WebSocket = require('faye-websocket');
var http = require('http');

// ****************************
// CONFIGURATION (ports and IP)
// ****************************

var serverPort = 8000;
var proxyPort = 8001;
// If the logic below doesn't figure out the right IP for you, just put it
// here. It should be an IP that the second computer can use to contact you on.
var myIp = '';

if (!myIp) {
  var interfaces = require('os').networkInterfaces();
  for (var interfaceName in interfaces) {
    interfaces[interfaceName].some(function (iface) {
      if (iface.family === 'IPv4' && !iface.internal) {
        myIp = iface.address;
        return true;
      }
    });
    if (myIp)
      break;
  }
  if (!myIp) {
    console.log('Manually set myIp to an IP that another computer can resolve');
    process.exit(1);
  }
}

// ***********************
// SET UP THE INNER SERVER
// ***********************

var currentConnections = 0;

var innerServer = http.createServer(function (request, response) {
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.end('<script>w = new WebSocket("ws://' + myIp + ':' + proxyPort +
               '")</script> WebSocket proxy test');
});

innerServer.on('upgrade', function (request, socket, body) {
  if (WebSocket.isWebSocket(request)) {
    var ws = new WebSocket(request, socket, body);

    console.log('OPEN, currently', ++currentConnections);

    // Send a heartbeat, so that there's active stuff that TCP is trying to send
    // to the vanished client.
    var interval = setInterval(function () {
      ws.send('heartbeat');
    }, 1000);

    ws.on('close', function (event) {
      console.log('CLOSE, currently', --currentConnections);
      clearInterval(interval);
      ws = null;
    });
  }
});

innerServer.listen(serverPort);
console.log('Inner server serving at http://' + myIp + ':' + serverPort + '/');

// ***********************
// SET UP THE PROXY SERVER
// ***********************

var proxy = httpProxy.createProxyServer();

var proxyServer = http.createServer(function (req, res) {
  proxy.web(req,res, {target: 'http://127.0.0.1:' + serverPort});
});
proxyServer.on('upgrade', function (req, socket, head) {
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

proxyServer.listen(proxyPort);
console.log('Connect a second device to http://' + myIp + ':' + proxyPort + '/');
