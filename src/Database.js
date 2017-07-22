/**
 * Created by jessdotjs on 15/07/17.
 */
"use strict";

var firebase = require("firebase");

function Database() {
    this.config = {
        apiKey: "AIzaSyDkbUvURJTxHHc8nAw9Hifis_L9VWjZkAM",
        authDomain: "americancoin-47230.firebaseapp.com",
        databaseURL: "https://americancoin-47230.firebaseio.com",
        projectId: "americancoin-47230",
        storageBucket: "americancoin-47230.appspot.com",
        messagingSenderId: "59474180269"
    };

    this.email = 'americancoin.amc@gmail.com';
    this.password = 'Am$C.F.CO1n-';
}


Database.prototype.init = function () {
    var self = this;
    firebase.initializeApp(this.config);
    return new Promise(function (resolve, reject){
        // Authenticate API
        firebase.auth()
            .signInWithEmailAndPassword(self.email, self.password)
            .then(function (response) {
                resolve(true);
            })
            .catch(function(err) {
                reject(err);
            });
    });
};


Database.prototype.processFanoutObject = function(fanoutObj) {
    var self = this;
    return new Promise(function(resolve, reject) {
        self.rootRef = firebase.database().ref();
        self.rootRef.update(fanoutObj)
            .then(function(response) {
                resolve(response);
            }).catch(function(err){ reject(err); });
    });
};



Database.prototype.getTransactions = function (address) {
    var self = this;
    return new Promise(function (resolve, reject) {
        firebase.database().ref().child('transactions/' + address)
            .once('value')
            .then(function(snapshot){
                resolve(snapshot);
            }).catch(function (err) { reject(err); });
    });
};


Database.prototype.getTransactionData = function (address, hash) {
    var self = this;
    return new Promise(function (resolve, reject) {
        firebase.database().ref().child('transactions/' + address.toLowerCase() + '/' + hash)
            .once('value')
            .then(function(snapshot){
                resolve(snapshot);
            }).catch(function (err) { reject(err); });
    });
};



Database.prototype.transactionExists = function(ref){
    var self = this;
    return new Promise(function (resolve, reject){
        firebase.database().ref().child(ref)
                .once('value')
                .then(function(snapshot){
                    resolve(snapshot.exists());
                });
    });
};


module.exports = Database;