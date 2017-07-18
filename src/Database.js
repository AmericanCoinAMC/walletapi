/**
 * Created by jessdotjs on 15/07/17.
 */


const firebase = require("firebase");

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
    const self = this;
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
    const self = this;
    return new Promise(function(resolve, reject) {
        self.rootRef = firebase.database().ref();
        self.rootRef.update(fanoutObj)
            .then(function(response) {
                resolve(response);
            }).catch(function(err){reject(err)});
    });
};

Database.prototype.getTransactions = function (address) {
    const self = this;

    return new Promise(function (resolve, reject) {
        firebase.database().ref().child('transactions/' + address)
            .once('value')
            .then(function(snapshot){
                resolve(snapshot);
            }).catch(function (err) {reject(err);})
    });
};

Database.prototype.TransactionConfirmed = function(participantRefs){
    const self = this;
    return new Promise(function (resolve, reject){
        firebase.database().ref().child(participantRefs[0])
                .once('value')
                .then(function(snapshot){
                    if( !snapshot.exists() ){
                        resolve(true);
                    }
                    else{ reject(false) }
                })
    })
};


module.exports = Database;