/**
 * Created by jessdotjs on 10/07/17.
 */

"use strict";

/*
 * Server Related
 * */
var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');
var cors = require('cors');

/*
 * API dependencies
 * */
var Web3 = require("web3");
var Wallet = require('./src/Wallet.js');
var TransactionListener = require('./src/TransactionListener.js');
var Database = require('./src/Database.js');



// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Allow CORS Requests
app.use(cors());



/*
* Properties Init
* */


var ETH_NODE = "http://192.168.1.110:8081/"; //NODE URL
var web3 = new Web3(new Web3.providers.HttpProvider(ETH_NODE));

var port = process.env.PORT || 8080;        // set our port


// ROUTES FOR OUR API
var router = express.Router();              // get an instance of the express Router


var database = new Database();
var wallet = new Wallet(web3);
var transactionListener = new TransactionListener(web3);


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
            }).catch(function (err) { res.send(err); });
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
    var privateKey = req.query.privateKey;
    if(privateKey) {
        var decrypt = wallet.decryptWithPrivateKey(privateKey);
        if (decrypt.then !== undefined) {
            decrypt.then(function (walletData) {
                res.send(walletData);
            }).catch(function (err) { res.send(err); });
        }else {
            res.send(false);
        }
    }else {
        res.send(false);
    }
});



/*
 * Transfer Funds
 * */

router.route('/send').post(function(req, res) {
    var from = req.query.from;
    var to = req.query.to;
    var amount = req.query.amount;
    var description = req.query.description;
    var gasLimit = req.query.gasLimit;
    var privateKey = req.query.privateKey;
    if(from && to && amount && privateKey) {
        wallet.sendTransaction(from, to, amount, description, gasLimit, privateKey)
            .then(function (response) {
                res.send(response);
            })
            .catch(function (err) { res.send(false); });
    }else {
        res.send(false);
    }
});



/*
 * Get Address Data - For refreshing purposes
 * Params - address: string
 * */

router.route('/getRefreshData').post(function(req, res) {
    var address = req.query.address;
    if(address) {
        wallet.getRefreshData(address)
            .then(function (addressData) {
                res.send(addressData);
            })
            .catch(function (err) { res.send(false); });
    }else {
        res.send(false);
    }
});


/*
 * Get Estimated Fee
 * Params - address: string, amount: number
 * */

router.route('/getEstimatedFee').post(function(req,res){
    var address = req.query.address;
    var amount = req.query.amount;
    if(address && amount){
        res.send({estimateFee: wallet.estimateFee(address,amount)});
    }else {
        res.send(false);
    }
});



/*
 * validAddress
 * Params - address: string
 * */

router.route('/validAddress').post(function(req,res){
    var address = req.query.address;
    if(address){
        res.send({valid: wallet.isValidAddress(address)});
    }else {
        res.send(false);
    }
});



/*
 * Initialize Database & App
 * */

database.init()
    .then(function (initialized){
        if (initialized) {
            // Initialize contract event listener
            transactionListener.listenToEvent(); //Transaction Listener

            // Register routes and add api prefix
            app.use('/api', router);

            // Start the server
            app.listen(port);
            console.log('Server Initialized on Port: ' + port);

         }else {
            return false;
        }
    })
    .catch(function(err) {
        console.log(err);
    });
