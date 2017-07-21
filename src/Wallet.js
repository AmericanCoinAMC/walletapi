/**
 * Created by jessdotjs on 10/07/17.
 */
const ethereumjsWallet = require('ethereumjs-wallet');
const Tx = require('ethereumjs-tx');
const Database = require('./Database');
const ABI = require("./Contract").abi;
const contractAddress = require("./Contract").address; //Modify

function Wallet (web3Node){
    if(web3Node.isConnected()){
        this.web3 = web3Node;
        var MyContract = this.web3.eth.contract(ABI);
        this.myContractInstance = MyContract.at(contractAddress);
    }

    this.db = new Database();
};

Wallet.prototype.create = function(password) {
    const generatedWallet = ethereumjsWallet.generate([true]);
    if(generatedWallet) {
        var walletFile = generatedWallet.toV3String(password);
        return {
            privateKey: generatedWallet.getPrivateKey(),
            publicKey: generatedWallet.getPublicKey(),
            address: generatedWallet.getAddress(),
            privateKeyString: generatedWallet.getPrivateKeyString(),
            publicKeyString: generatedWallet.getPublicKeyString(),
            addressString: generatedWallet.getAddressString(),
            checksumAddress: generatedWallet.getChecksumAddressString(),
            walletFileName: this.generateWalletName(),
            walletFile: 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(walletFile))
        }
    }else {
        return false;
    }
};

Wallet.prototype.generateWalletName = function () {
    const todayDate = new Date();
    var dd = todayDate.getDate();
    var mm = todayDate.getMonth() + 1; //January is 0!

    const yyyy = todayDate.getFullYear();
    if(dd < 10){
        dd = '0' + dd;
    }
    if(mm < 10){
        mm = '0' + mm;
    }
    return 'amc_wallet_' + mm +'-'+ dd + '-' + yyyy + '.json';
};


Wallet.prototype.decryptWithFile = function (file, password) {
    const self = this;
    const parsedResult = JSON.parse(file);
    const walletInstance = ethereumjsWallet.fromV3(parsedResult, password);
    if(walletInstance) {
        return new Promise(function (resolve, reject) {
            self.getAddressData(walletInstance.getAddressString())
                .then(function (addressData){
                    resolve({
                        privateKey: walletInstance.getPrivateKey(),
                        publicKey: walletInstance.getPublicKey(),
                        address: walletInstance.getAddress(),
                        privateKeyString: walletInstance.getPrivateKeyString(),
                        publicKeyString: walletInstance.getPublicKeyString(),
                        addressString: walletInstance.getAddressString(),
                        checksumAddress: walletInstance.getChecksumAddressString(),
                        balance: addressData.balance,
                        transactions: addressData.transactions
                    });
                })
                .catch(function (err) { reject(err) });
        });
    }else {
        return false;
    }
};


Wallet.prototype.decryptWithPrivateKey = function (privateKey) {
    const self = this;
    const cleanPrivateKey = self.cleanPrefix(privateKey);
    const privateKeyBuffer = Buffer.from(cleanPrivateKey, 'hex');
    const walletInstance = ethereumjsWallet.fromPrivateKey(privateKeyBuffer);
    if(walletInstance) {
        return new Promise(function (resolve, reject) {
            self.getAddressData(walletInstance.getAddressString())
                .then(function (addressData){
                    resolve({
                        privateKey: walletInstance.getPrivateKey(),
                        publicKey: walletInstance.getPublicKey(),
                        address: walletInstance.getAddress(),
                        privateKeyString: walletInstance.getPrivateKeyString(),
                        publicKeyString: walletInstance.getPublicKeyString(),
                        addressString: walletInstance.getAddressString(),
                        checksumAddress: walletInstance.getChecksumAddressString(),
                        balance: addressData.balance,
                        transactions: addressData.transactions
                    });
                })
                .catch(function (err) { reject(err) });
        });
    }else {
        return false;
    }
};


/*
 * Getters
 * */

Wallet.prototype.getAddressData = function (address) {
    const self = this;
    const walletDataObj = {};
    return new Promise(function (resolve, reject) {

        self.getTransactions(address)
            .then(function (txs) {
                resolve({
                    balance: self.getBalance(address),
                    transactions: txs
                });
            })
            .catch(function(err){ reject(err) })
    });
};

Wallet.prototype.getBalance = function (address) {
    return this.formatBalance( this.myContractInstance.balanceOf(address).toNumber() );
};

Wallet.prototype.getEthereumBalance = function (address) { //Ethereum balance
    var balance = this.web3.eth.getBalance(address);
    return this.web3.fromWei(balance.toNumber(),"ether");
};

Wallet.prototype.estimateFee = function(toAddress,amount){
    var estimateGas = this.web3.eth.estimateGas({
        to: contractAddress,
        data: this.myContractInstance.transfer.getData(toAddress,this.formatAmount(amount))
    });
    var gasPrice =this.web3.fromWei(this.web3.eth.gasPrice.toNumber(),"ether");
    var estimateFee = estimateGas*gasPrice;
    return estimateFee;

};


Wallet.prototype.getTransactions = function (address) {
    const self = this;

    return new Promise(function (resolve, reject) {
        self.db.getTransactions(address)
            .then(function(snapshot){
                resolve(self.formatTransactions(snapshot));
            }).catch(function (err) {reject(err);})
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
            status: snapshot.val().status,
            $priority: snapshot.getPriority()
        });
    });
    return formattedTransactions;
};



/*
* Transfer Methods
* */

Wallet.prototype.sendTransaction = function(fromAddress, toAddress, amount, gasLimit, PrivateKey) {
    const self = this;

    return new Promise(function(resolve, reject) {
        // Properties Init
        const nonceHex = self.web3.toHex(self.web3.eth.getTransactionCount(fromAddress));
        const gasPriceHex = self.web3.toHex(self.web3.eth.gasPrice);
        const gasLimitHex = self.web3.toHex(gasLimit);
        const payloadData = self.myContractInstance.transfer.getData(toAddress,self.formatAmount(amount));
        const privateKey = PrivateKey; //Buffer
        const rawTx = {
            nonce: nonceHex,
            gasPrice: gasPriceHex,
            gasLimit: gasLimitHex,
            to: contractAddress,
            value: '0x00',
            data: payloadData
        };
        // Generate tx
        const tx = new Tx(rawTx);
        tx.sign(privateKey); //Sign transaction
        const serializedTx = '0x'+ tx.serialize().toString('hex');
        if(amount>self.getBalance(fromAddress) || self.formatAmount(amount)<1){
            reject(false);
        }
        else{

            self.web3.eth.sendRawTransaction(serializedTx, function(err, hash){
                if(!err){

                    /*
                    * I dont think this should be here.
                    *
                    * This function should be called by the Event listener when
                    * 0 confirmations -> status = false
                    * 1 confirmation -> status = true
                    * */
                    self.handleTransaction(fromAddress, toAddress, amount, hash, false)
                        .then(function() {
                            resolve(true)
                        })
                        .catch(function (err) {reject(err)})
                }else{ reject(err) }
            });
        }
    });
};

Wallet.prototype.formatAmount=function(amount){
    return amount*Math.pow(10,8);
}

Wallet.prototype.formatBalance=function(balance){
    return balance*Math.pow(10,-8);
}


Wallet.prototype.handleTransaction = function(from, to, amount, hash, status) {
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
        amount: amount,
        status: status
    };

    fanoutObj[participantRefs[1]] = {
        type: 'received',
        from: from,
        to: to,
        amount: amount,
        status: status
    };

    return new Promise(function (resolve, reject){
        self.db.TransactionConfirmed(participantRefs).then(function(notConfirmed){
            self.db.processFanoutObject(fanoutObj)
                .then(function(response){
                    resolve(true);
                })
                .catch(function (err) { reject(err) })
        }).catch(function (confirmed) { resolve(true) })

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


// export the class
module.exports = Wallet;