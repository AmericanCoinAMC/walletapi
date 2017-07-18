/**
 * Created by jessdotjs on 15/07/17.
 */
const ABI = require("./Contract").abi;
const contractAddress = require("./Contract").address; //Modify
const Database = require('./Database');

function TransactionListener(web3Node) {
    var err;
    if(web3Node.isConnected()){
        this.web3 = web3Node;
        var MyContract = this.web3.eth.contract(ABI);
        this.myContractInstance = MyContract.at(contractAddress);
        this.event = this.myContractInstance.Transfer();
        this.db = new Database();
    }
    else {
        err = new Error("A web3 valid instance must be provided");
        err.name = "NoWeb3InstanceError";
        throw err;
    }

}

TransactionListener.prototype.listenToEvent = function(){
    const self = this;
    this.event.watch(function(error, result){
        if (!error){
            //console.log("NEW TRANSACTION");
            self.handleEvent(result.args.from, result.args.to, result.args.value.toNumber(), result.transactionHash,result.blockNumber, true);
       }
     });        
};

TransactionListener.prototype.formatAmount=function(amount){
    return amount*Math.pow(10,-8);
}




TransactionListener.prototype.handleEvent = function(from, to, amount, hash,blockNumber,status) {
    const self = this;
    const participantRefs = [
        'transactions/' + from.toLowerCase() + '/' + hash, // sender
        'transactions/' + to.toLowerCase() + '/' + hash // receiver
    ];
    const fanoutObj = {};

    fanoutObj[participantRefs[0]] = {
        type: 'sent',
        from: from,
        to: to,
        amount: self.formatAmount(amount),
        status: status,
        blockNumber:blockNumber
    };

    fanoutObj[participantRefs[1]] = {
        type: 'received',
        from: from,
        to: to,
        amount: self.formatAmount(amount),
        status: status,
        blockNumber:blockNumber
    };

    return new Promise(function (resolve, reject){
        self.db.processFanoutObject(fanoutObj)
            .then(function(response){
                resolve(true)
            })
            .catch(function (err) { reject(err) })
    });
};

TransactionListener.prototype.stopListening = function(){
    this.event.stopWatching();
}

module.exports = TransactionListener;