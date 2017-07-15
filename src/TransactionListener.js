/**
 * Created by jessdotjs on 15/07/17.
 */
var Web3 = require("web3");


function TransactionListener(web3Node) {
    var err;
    if(web3Node.isConnected()){
        this.web3 = web3Node;
    }
    else {
        err = new Error("A web3 valid instance must be provided");
        err.name = "NoWeb3InstanceError";
        throw err;
    }

    this.eventIndex = {};
}

TransactionListener.prototype.loadContract = function(contractObject,address){
    const addrRegex = /^0x[0-9A-Fa-f]{40}$/;
    var err;
    var contract;
    if(!contractObject){
        err = new Error("Not given contract");
        err.msg = "NoContractGiven";
        throw err;
    }
    if(contractObject.abi){
        contract = this.web3.eth.contract(contractObject.abi);
    };
    if(address){
        if(addrRegex.test(address)){
            this.contract = contract.at(address);
        } else {
            err = new Error("Address is not a string or is not a valid hex");
            err.message = "AddressNotValidError";
            throw err;
        }

    }
};

TransactionListener.prototype.setAddressContract = function(address){
    var err;
    const addrRegex = /^0x[0-9A-Fa-f]{40}$/;
    if(!this.contract){
        eerr = new Error("Cotract attribute undefined");
        err.message = "UndefinedContractError";
        throw err;
    }
    if(addrRegex.test(address)){
        this.contract = contract.at(address);
    } else {
        err = new Error("Address is not a string or is not a valid hex");
        err.message = "AddressNotValidError";
        throw err;
    }
};

TransactionListener.prototype.listenToEvent = function(eventName,customName,callback) {
    var err;
    var eventFuntion;
    var eventObject;
    if(!this.contract){
        err = new Error("Cotract attribute undefined");
        err.message = "UndefinedContractError";
        throw err;
    }
    if(!eventName){
        err = new Error("Event name not given");
        err.message = "NoEventNameGiven";
        throw err;
    } else if (typeof eventName !== 'string'){
        err = new Error("Event name must be string");
        err.message = "EventNameNotString";
        throw err;
    }

    eventFuntion = this.contract[eventName];
    eventObject = eventFuntion();
    eventObject.watch(callback);


    if(customName && typeof customName !== 'string'){
        err = new Error("Custom name must be string and not empty");
        err.message = "EventNameNotString";
        throw err;
    }
    this.eventIndex[(customName) ? customName : eventName] = eventObject;
};

TransactionListener.prototype.stopListening = function(eventName) {
    var err;
    var returnValue;

    if(eventName && typeof eventName !== 'string'){
        err = new Error("Custom name must be string and not empty");
        err.message = "EventNameNotString";
        throw err;
    }
    try{
        this.eventIndex[eventName].stopWatching();
        returnValue = true;
    } catch(err) {
        returnValue = false;
    }
    return returnValue;
};

module.exports = TransactionListener;