"use strict";

var Schema = function() {

};


Schema.prototype.createdWallet = function(walletInstance, walletFileName, walletFile) {
    return {
        privateKey: walletInstance.getPrivateKey(),
        publicKey: walletInstance.getPublicKey(),
        address: walletInstance.getAddress(),
        privateKeyString: walletInstance.getPrivateKeyString(),
        publicKeyString: walletInstance.getPublicKeyString(),
        addressString: walletInstance.getAddressString(),
        checksumAddress: walletInstance.getChecksumAddressString(),
        walletFileName: walletFileName,
        walletFile: 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(walletFile))
    };
};



Schema.prototype.decryptedWallet = function(walletInstance, addressData, generalData) {
    return {
        privateKey: walletInstance.getPrivateKey(),
        publicKey: walletInstance.getPublicKey(),
        address: walletInstance.getAddress(),
        privateKeyString: walletInstance.getPrivateKeyString(),
        publicKeyString: walletInstance.getPublicKeyString(),
        addressString: walletInstance.getAddressString(),
        checksumAddress: walletInstance.getChecksumAddressString(),
        balance: addressData.balance,
        ethBalance: addressData.ethBalance,
        transactions: addressData.transactions,
        generalData: generalData
    };
};


Schema.prototype.transaction = function(type, from, to, amount, description, txTS, blockNumber, status) {
    return {
        type: type,
        from: from,
        to: to,
        amount: amount,
        description: description || null,
        txTS: txTS || new Date().getTime(),
        blockNumber: blockNumber,
        status: status
    };
};

module.exports = Schema;