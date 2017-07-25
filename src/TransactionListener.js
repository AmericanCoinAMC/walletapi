/**
 * Created by jessdotjs on 15/07/17.
 */

"use strict";

var ABI = require("./Contract").abi;
var contractAddress = require("./Contract").address; //Modify
var Database = require('./Database');
var Schema = require('./Schema');
var Wallet = require('./Wallet');

function TransactionListener(web3Node) {
    var err;
    if(web3Node.isConnected()){
        this.web3 = web3Node;
        var MyContract = this.web3.eth.contract(ABI);
        this.myContractInstance = MyContract.at(contractAddress);
        this.event = this.myContractInstance.Transfer();
        this.db = new Database();
        this.schema = new Schema();
    }
    else {
        err = new Error("A web3 valid instance must be provided");
        err.name = "NoWeb3InstanceError";
        throw err;
    }

}

TransactionListener.prototype.listenToEvent = function(){
    var self = this;
    this.event.watch(function(error, result){
        if (!error){
            console.log(result.args.t_type);
            self.handleEvent(result.args.from, result.args.to, result.args.value.toNumber(), result.transactionHash, result.blockNumber, true, result.args.t_type);
       }
     });        
};

TransactionListener.prototype.formatAmount = function(amount){
    return amount * Math.pow(10, -8);
};




TransactionListener.prototype.handleEvent = function(from, to, amount, hash, blockNumber, status,autorefill) {
    var self = this;
    var participantRefs = [
        'transactions/' + from.toLowerCase() + '/' + hash, // sender
        'transactions/' + to.toLowerCase() + '/' + hash // receiver
    ];
    var fanoutObj = {};
    var autorefillObj = {};
    if (autorefill) {
        autorefillObj["autorefill"] = true;
        autorefillObj[""]
    }

    return new Promise(function (resolve, reject){

        /*
        * Retrieve the TX the data so you don't
        * lose description & txTS during the fanoutobject processor
        *
        * @TODO
        * Add fee property to transaction object
        * */
        self.db.getTransactionData(from, hash)
            .then(function (snapshot) {
                fanoutObj[participantRefs[0]] = // Sender
                    self.schema.transaction('sent', from, to, self.formatAmount(amount), snapshot.val().description,  snapshot.val().txTS, hash, blockNumber, status, autorefill);

                fanoutObj[participantRefs[1]] = // Receiver
                    self.schema.transaction('received', from, to, self.formatAmount(amount), snapshot.val().description, snapshot.val().txTS, hash, blockNumber, status, autorefill);

                self.db.processFanoutObject(fanoutObj)
                    .then(function(response){
                        resolve(true);
                    })
                    .catch(function (err) { reject(err); });
            })
            .catch(function (err) { reject(err); });
    });
};

TransactionListener.prototype.stopListening = function(){
    this.event.stopWatching();
};

module.exports = TransactionListener;