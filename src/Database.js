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

    this.rootRef = null;
};


Database.prototype.init = function () {
    const self = this;
    return new Promise(function (resolve, reject){
        firebase.initializeApp(this.config);
        self.rootRef = firebase.database().ref();
        // Authenticate API
        firebase.auth()
            .signInWithEmailAndPassword(this.email, this.password)
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
        self.rootRef.update(fanoutObj)
            .then(function(response) {
                resolve(response);
            }).catch(function(err){reject(err)});
    });
};

module.exports = Database;