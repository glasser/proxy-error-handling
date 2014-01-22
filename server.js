var WebSocket = require('faye-websocket');
var http = require('http');

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

var currentConnections = 0;

var server = http.createServer();

server.on('request', function (request, response) {
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.end('<script>w = new WebSocket("ws://' + myIp + ':' + proxyPort +
               '")</script> WebSocket proxy test');
});

server.on('upgrade', function (request, socket, body) {
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

console.log('Server listening on http://' + myIp + ':' + serverPort + '/');
console.log('Connect a second device to http://' + myIp + ':' + proxyPort + '/');
server.listen(serverPort);
