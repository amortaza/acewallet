let BITBOXSDK = require("bitbox-sdk/lib/bitbox-sdk").default;
let BITBOX = new BITBOXSDK();

let FEE_SAT_PER_BYTE = 1;

exports.TransactionSender = function() {

    // public methods

    // send( to_cashaddress, satoshis, wallet_utxo_list, change_addressGenerator, onSuccess, onError )
    this.send = _send;
};

function _send( 
    to_cashaddress, 
    satoshis,     
    wallet_utxo_list,
    change_addressGenerator,
    onSuccess, 
    onError ) 
{
    // funding is of type { utxo_list, fees, total }
    let funding = Collect_FundingInputs( wallet_utxo_list, satoshis );

    if ( funding.utxo_list.length === 0 ) {

        let msg = 'INSUFFICIENT_FUNDS for ' + satoshis + ' satoshis - we have ' + funding.total + ' satoshis (fees were ' + funding.fees + ')';
        console.log( msg );

        onError( msg, funding );

        return;
    }

    Send( funding, to_cashaddress, satoshis, change_addressGenerator, onSuccess, onError);
}

function Send( funding, to_cashaddress, satoshis, change_addressGenerator, onSuccess, onError ) {

    let transactionBuilder = new BITBOX.TransactionBuilder("bitcoincash");

    let utxo_list = funding.utxo_list;

    for ( let i = 0; i < utxo_list.length; i++ ) {

        let utxo = utxo_list[ i ];

        addInput( utxo );
    }

    transactionBuilder.addOutput( to_cashaddress, satoshis );

    addChange();

    for ( let i = 0; i < utxo_list.length; i++) {

        let utxo = utxo_list[ i ];

        signInput( i, transactionBuilder, utxo );
    }

    let tx = transactionBuilder.build();
    let hex = tx.toHex();

    BITBOX.RawTransactions.sendRawTransaction( hex ).then( onSuccess, onError );

    function signInput(    indexIntoTransaction, transactionBuilder, utxo ) {

        let redeemScript;

        transactionBuilder.sign(
            indexIntoTransaction,
            utxo.keypair,
            redeemScript,
            transactionBuilder.hashTypes.SIGHASH_ALL,
            utxo.satoshis
        );
    }

    function addChange() {

        // calculate change
        let changeSatoshis = funding.total - funding.fees - satoshis;

        if ( changeSatoshis === 0 ) return;

        let change_cashaddress = change_addressGenerator.get_NextCashAddress();

        console.log('Sending change to ' + change_cashaddress + ' ( ' + changeSatoshis + ' )');

        transactionBuilder.addOutput( change_cashaddress, changeSatoshis );
    }

    function addInput( utxo ) {

        let vout_txid = utxo.txid;
        let vout_n    = utxo.vout_n;

        transactionBuilder.addInput( vout_txid, vout_n );
    }
}

function Collect_FundingInputs( wallet_utxo_list, satoshis ) {

    let funding_utxo_list = [];
    let funding_total = 0;

    for ( let i = 0; i < wallet_utxo_list.length; i++ ) {

        // utxo is { cashaddress, txid, vout_n, satoshis, confirmed }
        let utxo = wallet_utxo_list[ i ];

        if ( utxo.satoshis > 0 ) {

            funding_utxo_list.push( utxo );

            funding_total += utxo.satoshis;

            let fees = CalcFees( funding_utxo_list.length );            

            // have we funded enough to cover the satoshis we want to send AND the fees?
            let minimum_funding_needed = satoshis + fees;

            if ( funding_total >= minimum_funding_needed ) break;
        }
    }

    // final check to see if we have enough funding
    let fees = CalcFees( funding_utxo_list.length );            
    let minimum_funding_needed = satoshis + fees;

    if ( funding_total < minimum_funding_needed ) funding_utxo_list = [];

    return { utxo_list: funding_utxo_list, fees, total: funding_total };
}

function CalcFees( inputCount ) {

    let byteCount = BITBOX.BitcoinCash.getByteCount(
          { P2PKH: inputCount },
          { P2PKH: 2 } // for fee purposes, we will always assume there will be change address and destination address
    );

    let fees = FEE_SAT_PER_BYTE * byteCount;

    return fees;
}
