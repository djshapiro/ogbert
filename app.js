const http         = require('http'),
      https        = require('https'),
      fs           = require('fs'),
      path         = require('path'),
      contentTypes = require('./utils/content-types'),
      sysInfo      = require('./utils/sys-info'),
      request      = require('request'),
      mongo        = require('mongodb'),
      bodyParser   = require('body-parser'),
      env          = process.env;

const db_url = process.env.OPENSHIFT_MONGODB_DB_URL || 'mongodb://localhost:27017';
mongo.MongoClient.connect(db_url, (err, connection) => {
    const priceCollection = connection.db('prices').collection('btc');
    //Create function for getting BTC data
    const getBTCData = () => {
        request('https://api.bitfinex.com/v1/pubticker/btcusd', (err, result, body) => {
            priceCollection.insertOne(JSON.parse(body), function(err, result) {
            });
        });
        setTimeout(getBTCData, 5000);
    }

    //Get BTC data
    getBTCData();

    let server = http.createServer(function (req, res) {
      let url = req.url;
      if (url == '/') {
        url += 'index.html';
      }

      // IMPORTANT: Your application HAS to respond to GET /health with status 200
      //            for OpenShift health monitoring

      if (url == '/health') {
        res.writeHead(200);
        res.end();
      } else if (url == '/btc') {
        priceCollection.find().toArray((err, result) => {
          return res.end(JSON.stringify({result: result}));
        });
      } else {
        fs.readFile('./static' + url, function (err, data) {
          if (err) {
            res.writeHead(404);
            res.end('Not found');
          } else {
            let ext = path.extname(url).slice(1);
            if (contentTypes[ext]) {
              res.setHeader('Content-Type', contentTypes[ext]);
            }
            if (ext === 'html') {
              res.setHeader('Cache-Control', 'no-cache, no-store');
            }
            res.end(data);
          }
        });
      }
    });

    server.listen(env.NODE_PORT || 3000, env.NODE_IP || 'localhost', function () {
      console.log(`Application worker ${process.pid} started on port ${env.NODE_PORT || 3000}`);
    });
});



