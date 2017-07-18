/**
 * Created by jessdotjs on 10/07/17.
 */


/*
 * Server Related
 * */
var express    = require('express');
var app        = express();
var jwt = require('express-jwt');
var jwks = require('jwks-rsa');
var bodyParser = require('body-parser');
var cors = require('cors');

/*
 * API dependencies
 * */
var Web3 = require("web3");
var Wallet = require('./src/Wallet.js');
var TransactionListener = require('./src/TransactionListener.js');
var Database = require('./src/Database.js');
const ETH_NODE = ""; //NODE URL
var web3 = new Web3(new Web3.providers.HttpProvider(ETH_NODE));
// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Allow CORS Requests
app.use(cors());


// Security
var jwtCheck = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: "https://amc.auth0.com/.well-known/jwks.json"
    }),
    audience: 'https://amcapi.herokuapp.com/api',
    issuer: "https://amc.auth0.com/",
    algorithms: ['RS256']
});

app.use(jwtCheck);


var port = process.env.PORT || 8080;        // set our port


// ROUTES FOR OUR API
var router = express.Router();              // get an instance of the express Router


const database = new Database();
const wallet = new Wallet(web3);
const transactionListener = new TransactionListener(web3);


// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json({ message: "Welcome to AmericanCoin's Api" });
});


/*
 * Create
 * Params - password: string
 * */
router.route('/create').post(function(req, res) {
    var password = req.query.password;
    if(password) {
        res.send(wallet.create(password));
    }else {
        res.send({});
    }
});


/*
 * Decrypt with File
 * Params - password: string, file: tbd
 * */
router.route('/decryptWithFile').post(function(req, res) {
    var file = req.query.file;
    var password = req.query.password;
    if(file && password) {
        var decrypt = wallet.decryptWithFile(file, password);
        if (decrypt.then !== undefined) {
            decrypt.then(function (walletData) {
                res.send(walletData);
            }).catch(function (err) { res.send(err) });
        }else {
            res.send(false);
        }
    }else {
        res.send(false);
    }
});


/*
 * Decrypt with Key
 * Params - password: string
 * */

router.route('/decryptWithPrivateKey').post(function(req, res) {
    const privateKey = req.query.privateKey;
    if(privateKey) {
        var decrypt = wallet.decryptWithPrivateKey(privateKey);
        if (decrypt.then !== undefined) {
            decrypt.then(function (walletData) {
                res.send(walletData);
            }).catch(function (err) { res.send(err) });
        }else {
            res.send(false);
        }
    }else {
        res.send(false);
    }
});


/*
 * Get Address Data - For refreshing purposes
 * Params - address: string
 * */

router.route('/getAddressData').post(function(req, res) {
    const address = req.query.address;
    if(address) {
        wallet.getAddressData(address)
            .then(function (addressData) {
                res.send(addressData)
            })
            .catch(function (err) { res.send(false) })
    }else {
        res.send(false);
    }
});



transactionListener.listenToEvent(); //Transaction Listener
/*
 * Initialize Database & App
 * */

database.init()
    .then(function (initialized){
        if (initialized) {
            // REGISTER OUR ROUTES
            // all of our routes will be prefixed with /api
            app.use('/api', router);

            // START THE SERVER
            app.listen(port);
            console.log('Server Initialized on Port: ' + port);

        }else {
            return false;
        }
    })
    .catch(function(err) {
        console.log(err);
    });

