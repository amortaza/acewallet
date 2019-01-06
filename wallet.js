let BITBOXSDK = require("bitbox-sdk/lib/bitbox-sdk").default;
let BITBOX = new BITBOXSDK();

var AccountUTXO = require('./account_utxo.js').AccountUTXO;
var AddressGenerator = require('./address_generator.js').AddressGenerator;
var TransactionSender = require('./transaction_sender.js').TransactionSender;

exports.Wallet = function() {
            
    // public methods
    this.generateMnemonic = _generateMnemonic;

    // load( mnemonic, starting_ChangeAccount_Index, onWalletLoaded, onError )
    this.load = _loadWallet;

    // reload( onWalletLoaded, onError )    
    this.reload = _reloadWallet;

    this.getBalance = _getBalance;

    // send ( to_cashaddress, satoshis, onSuccess, onError )
    this.send = _send;

    // fetch_ReceiveCashAddress( onSuccess( cashaddress ), onError )
    this.fetch_ReceiveCashAddress = _fetch_ReceiveCashAddress;

    // public attributes
    this.mnemonic = null;

    // private attributes
    this.wallet_utxo_list = null; // array of { cashaddress, txid, vout_n, satoshis, confirmed }
    this.first_change_utxo_index = -1;
    this.transaction_sender = new TransactionSender();

    this.change_addressGenerator = null;
    this.receive_addressGenerator = null;
};

function _send( to_cashaddress, satoshis, onSuccess, onError ) {

    this.transaction_sender.send( 
        to_cashaddress, 
        satoshis, 
        this.wallet_utxo_list, 
        this.change_addressGenerator,
        onSuccess, 
        onError 
    );
}

// callback definitions:
//     onWalletLoaded( first_change_utxo_index )
//     onError( string )
function _loadWallet( mnemonic, starting_ChangeAccount_Index, onWalletLoaded, onError ) {

    if ( starting_ChangeAccount_Index < 0 ) starting_ChangeAccount_Index = 0;

    this.mnemonic = mnemonic;
    this.first_change_utxo_index = starting_ChangeAccount_Index;

    this.reload( onWalletLoaded, onError );
}

function _reloadWallet( onWalletLoaded, onError ) {

    this.wallet_utxo_list = [];    

    this.change_addressGenerator = new AddressGenerator();
    this.change_addressGenerator.init( this.mnemonic, '0' );

    this.receive_addressGenerator = new AddressGenerator();
    this.receive_addressGenerator.init( this.mnemonic, '1' );

    let that = this;

    let accountUTXO = new AccountUTXO();

    console.log('****** Loading Change Addresses');

    // load the account UTXO's for "change" address accounts
    accountUTXO.load( 

        that.change_addressGenerator.account, 

        that.first_change_utxo_index, 

        function( change_utxo_list, first_change_utxo_index, next_empty_slot_index ) {

            console.log('****** Loading Receive Addresses');

            that.wallet_utxo_list = change_utxo_list;
            that.first_change_utxo_index = first_change_utxo_index;
            that.change_addressGenerator.next_index = next_empty_slot_index;

            accountUTXO.load( 

                that.receive_addressGenerator.account, 

                0,  // for receiving addresses, we always start at index 0 because we never know
                    // when an address will be replenished with more BCH!

                function( receive_utxo_list, dont_care, next_empty_slot_index ) {

                    that.receive_addressGenerator.next_index = next_empty_slot_index;

                    for ( let i = 0; i < receive_utxo_list.length; i++ ) {
                        that.wallet_utxo_list.push( receive_utxo_list[ i ] );
                    }

                    console.log('****** Finished Loading Wallet');

                    // Let caller know that next time they can pass in first_utxo_index as starting_ChangeAccount_Index to save time.
                    // It is assumed no BCH will be sent to CHANGE addresses once their UTXO is used up, so no point in querying
                    // for UTXO of early CHANGE addresses that have been spent.
                    onWalletLoaded( first_change_utxo_index );
                }, 

                onError 
            );
        },

        onError 
    );
}

function _fetch_ReceiveCashAddress( onSuccess, onError ) {

    this.receive_addressGenerator.fetch_NextCashAddress( onSuccess, onError );
}

function _generateMnemonic() {

    let language = 'english';    
    let wordlist = BITBOX.Mnemonic.wordLists()[ language ];
    let mnemonic = BITBOX.Mnemonic.generate( 256, wordlist );

    return mnemonic;
}

function _getBalance() {

    let satoshis = 0;

    for ( let i = 0; i < this.wallet_utxo_list.length; i++ ) {

        let utxo = this.wallet_utxo_list[ i ];

        satoshis += utxo.satoshis;
    }

    return satoshis;
}