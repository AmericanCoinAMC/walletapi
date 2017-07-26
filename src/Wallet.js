/**
 * Created by jessdotjs on 10/07/17.
 */

"use strict";

var ethereumjsWallet = require('ethereumjs-wallet');
var Tx = require('ethereumjs-tx');
var Database = require('./Database');
var Schema = require('./Schema');
var ABI = require("./Contract").abi;
var contractAddress = require("./Contract").address; //Modify

function Wallet (web3Node) {
    if(web3Node.isConnected()) {
        this.web3 = web3Node;
        var MyContract = this.web3.eth.contract(ABI);
        this.myContractInstance = MyContract.at(contractAddress);
    }

    this.db = new Database();
    this.schema = new Schema();
}


/*
* Wallet Creation
* */

Wallet.prototype.create = function(password) {
    var generatedWallet = ethereumjsWallet.generate([true]);
    if(generatedWallet) {
        var walletFile = generatedWallet.toV3String(password);
        return this.schema.createdWallet(generatedWallet, this.generateWalletName(), walletFile);
    }else {
        return false;
    }
};

Wallet.prototype.generateWalletName = function () {
    var todayDate = new Date();
    var dd = todayDate.getDate();
    var mm = todayDate.getMonth() + 1; //January is 0!

    var yyyy = todayDate.getFullYear();
    if(dd < 10){
        dd = '0' + dd;
    }
    if(mm < 10){
        mm = '0' + mm;
    }
    return 'amc_wallet_' + mm +'-'+ dd + '-' + yyyy + '.json';
};


/*
* Wallet Decryption
* */

Wallet.prototype.decryptWithFile = function (file, password) {
    var self = this;
    var parsedResult = JSON.parse(file);
    var walletInstance = ethereumjsWallet.fromV3(parsedResult, password);
    if(walletInstance) {
        return new Promise(function (resolve, reject) {
            self.getAddressData(walletInstance.getAddressString())
                .then(function (addressData){
                    resolve(self.schema.decryptedWallet(walletInstance, addressData, self.getGeneralData()));
                })
                .catch(function (err) { reject(err); });
        });
    }else {
        return false;
    }
};


Wallet.prototype.decryptWithPrivateKey = function (privateKey) {
    var self = this;
    var cleanPrivateKey = self.cleanPrefix(privateKey);
    var privateKeyBuffer = Buffer.from(cleanPrivateKey, 'hex');
    var walletInstance = ethereumjsWallet.fromPrivateKey(privateKeyBuffer);
    if(walletInstance) {
        return new Promise(function (resolve, reject) {
            self.getAddressData(walletInstance.getAddressString())
                .then(function (addressData){
                    resolve(self.schema.decryptedWallet(walletInstance, addressData, self.getGeneralData()));
                })
                .catch(function (err) { reject(err); });
        });
    }else {
        return false;
    }
};


/*
 * Getters
 * */

Wallet.prototype.getAddressData = function (address) {
    var self = this;
    var walletDataObj = {};
    return new Promise(function (resolve, reject) {
        self.getTransactions(address)
            .then(function (txs) {
                resolve({
                    balance: self.getBalance(address),
                    ethBalance: self.getEthereumBalance(address),
                    transactions: txs
                });
            })
            .catch(function(err){ reject(err); });
    });
};

Wallet.prototype.getGeneralData = function () {
    return {
        autorefillStatus: this.autorefillActive(),
        gasPrice: this.getGasPrice(),
        buyPrice: this.buyPrice(),
        sellPrice: this.sellPrice()
    };
};

Wallet.prototype.getRefreshData = function (address) {
    var self = this;
    return new Promise(function (resolve, reject){
        self.getAddressData(address)
            .then(function(addressData) {
                resolve(self.schema.refresh(addressData, self.getGeneralData()));
            })
            .catch(function (err) { reject(err); });
    });
};

Wallet.prototype.getBalance = function (address) {
    return this.formatBalance( this.myContractInstance.balanceOf(address).toNumber() );
};

Wallet.prototype.getEthereumBalance = function (address) {
    var balance = this.web3.eth.getBalance(address);
    return this.web3.fromWei(balance.toNumber(),"ether");
};

Wallet.prototype.estimateFee = function(toAddress, amount) {
    var estimateGas = this.web3.eth.estimateGas({
        to: contractAddress,
        data: this.myContractInstance.transfer.getData(toAddress, this.formatAmount(amount))
    });
    var gasPrice = this.web3.fromWei(this.web3.eth.gasPrice.toNumber(),"ether");
    return (estimateGas * gasPrice) * 2;
};

Wallet.prototype.getGasPrice = function () {
    return this.web3.fromWei(this.web3.eth.gasPrice.toNumber(),"ether");
};


/*
* Contract Properties
* @TODO
* */

Wallet.prototype.autorefillActive = function () {
    return this.myContractInstance.autorefill(); // To be completed
};

Wallet.prototype.buyPrice = function () {
    return this.formatPrice(this.myContractInstance.buyPrice().toNumber()); // To be completed
};

Wallet.prototype.sellPrice = function () {
    return this.formatPrice(this.myContractInstance.sellPrice().toNumber()); // To be completed
};


/*
* Get Transactions Array
* */

Wallet.prototype.getTransactions = function (address) {
    var self = this;

    return new Promise(function (resolve, reject) {
        self.db.getTransactions(address)
            .then(function(snapshot){
                resolve(self.formatTransactions(snapshot));
            }).catch(function (err) { reject(err); });
    });
};


Wallet.prototype.formatTransactions = function (transactionsSnapshot) {
    var formattedTransactions = [];
    transactionsSnapshot.forEach(function(snapshot){
        formattedTransactions.push({
            $key: snapshot.key,
            type: snapshot.val().type,
            from: snapshot.val().from,
            to: snapshot.val().to,
            amount: snapshot.val().amount,
            description: snapshot.val().description,
            txTS: snapshot.val().txTS,
            blockNumber: snapshot.val().blockNumber,
            status: snapshot.val().status,
            $priority: snapshot.getPriority()
        });
    });
    return formattedTransactions;
};



/*
* Transfer Methods
* */

Wallet.prototype.sendTransaction = function(fromAddress, toAddress, amount, description, gasLimit, privateKey) {
    var self = this;
    return new Promise(function(resolve, reject) {
        // Properties Init
        var nonceHex = self.web3.toHex(self.web3.eth.getTransactionCount(fromAddress));
        var gasPriceHex = self.web3.toHex(self.web3.eth.gasPrice);
        var gasLimitHex = self.web3.toHex(gasLimit);
        var payloadData = self.myContractInstance.transfer.getData(toAddress,self.formatAmount(amount));

        var rawTx = {
            nonce: nonceHex,
            gasPrice: gasPriceHex,
            gasLimit: gasLimitHex,
            to: contractAddress,
            value: '0x00',
            data: payloadData
        };
        // Generate tx
        var tx = new Tx(rawTx);
        tx.sign(privateKey); //Sign transaction
        var serializedTx = '0x'+ tx.serialize().toString('hex');


        if(amount > self.getBalance(fromAddress) || self.formatAmount(amount) < 1) {
            reject(false);
        }
        else {
            self.web3.eth.sendRawTransaction(serializedTx, function(err, hash) {
                if(!err){
                    // Save unconfirmed transaction
                    self.handleTransaction(fromAddress, toAddress, amount, description, new Date().getTime(), hash, -1, false)
                        .then(function() {
                            resolve(true);
                        })
                        .catch(function (err) { reject(err); });
                }else{ reject(err); }
            });
        }
    });
};


/*
* Save transaction shortcuts into the DB
* */

Wallet.prototype.handleTransaction = function(from, to, amount, description, txTS, hash, blockNumber, status) {
    var self = this;
    var participantRefs = [
        'transactions/' + from.toLowerCase() + '/' + hash, // sender
        'transactions/' + to.toLowerCase() + '/' + hash // receiver
    ];
    var fanoutObj = {};

    fanoutObj[participantRefs[0]] = // Sender
        this.schema.transaction('sent', from, to, amount, description, txTS, hash, blockNumber, status, null);

    fanoutObj[participantRefs[1]] = // Receiver
        this.schema.transaction('received', from, to, amount, description, txTS, hash, blockNumber, status, null);

    return new Promise(function (resolve, reject){
        self.db.transactionExists(participantRefs[0])
            .then(function(exists){
                if (exists) {
                    /*
                    * Transaction was confirmed really fast and
                    * it has been recorded by the event listener
                    * */
                    resolve(true);
                }else {
                    self.db.processFanoutObject(fanoutObj)
                        .then(function(response){
                            resolve(true);
                        })
                        .catch(function (err) { reject(err); });
                }
        }).catch(function (confirmed) { resolve(true); });

    });
};




/*
 * Utilities
 * */

Wallet.prototype.cleanPrefix = function(key) {
    if(key[0] === '0' && key[1] === 'x'){
        return key.substring(2);
    }else{
        return key;
    }
};

Wallet.prototype.isValidAddress = function(address) {
    return this.web3.isAddress(address);
};


Wallet.prototype.formatAmount = function(amount){
    return amount * Math.pow(10, 8);
};

Wallet.prototype.formatBalance = function(balance){
    return balance * Math.pow(10, -8);
};

Wallet.prototype.formatPrice = function(price){
    return price * Math.pow(10, -10);
};

// export the class
module.exports = Wallet;