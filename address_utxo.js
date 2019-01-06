let BITBOXSDK = require("bitbox-sdk/lib/bitbox-sdk").default;
let BITBOX = new BITBOXSDK();

let WAIT_MS = 100;

exports.AddressUTXO = function() {

	// public methods
	// load( account, address_index_into_account, onSuccess <see _load>, onError )
	this.load = _load;
};

// Definition of struct Address_IO - struct used to keep track of transaction Inputs and Outputs for an address.
// { cashaddress, txid, vout_n, satoshis, confirmed }

// onSuccess( utxo, tx_appearances_confirmed_and_not, satoshis_confirmed_and_not ) - "utxo" is of type struct Address_IO[].
function _load( account, address_index_into_account, onSuccess, onError ) {

	let address_node = account.derivePath(`${address_index_into_account}`);
	let cashaddress = BITBOX.HDNode.toCashAddress( address_node );
	let keypair = BITBOX.HDNode.toKeyPair( address_node );

    BITBOX.Address.details( cashaddress ).then(

    	(result) => {

    		console.log( result );

    		let appearances_ConfirmedOrNot = result.txApperances + result.unconfirmedTxApperances;
    		let satoshis_ConfirmedOrNot = result.balanceSat + result.unconfirmedBalanceSat;

    		// we have reached an unused address.  stop!
        	if ( result.txApperances === 0 && result.unconfirmedTxApperances === 0 ) {

        		onSuccess( [], appearances_ConfirmedOrNot, satoshis_ConfirmedOrNot );

        		return;
        	}

    		Load_AddressResult_input_outputs( 

    			result, 

    			keypair,

    			function( address_txoutput_list, address_txinput_list ) {

    				let unspent_tx_outputs = Filter_UnspentOutputs( address_txoutput_list, 
    																address_txinput_list );

    				console.log( unspent_tx_outputs );

    				onSuccess(	unspent_tx_outputs, 
    							appearances_ConfirmedOrNot, 
    							satoshis_ConfirmedOrNot ); 
	        	}, 

	        	onError 
	        );
		},

      	onError
	);
}

// onSuccess( address_txoutput_list, address_txinput_list ) - both parameters are of type struct Address_IO[].
function Load_AddressResult_input_outputs( addressResult, keypair, onSuccess, onError ) {

	// these are the "return values" - parameters to onSuccess.
	let address_txoutput_list = []; // type of struct Address_IO[].
	let address_txinput_list  = []; // type of struct Address_IO[].

	let legacy = addressResult.legacyAddress;
	let txs = addressResult.transactions;

	loadTx_input_outputs( 0 );

	function loadTx_input_outputs( txIndex ) {

		if ( txIndex >= txs.length ) {

			let msg = 'Error: vout of address not found.';
			console.log( msg );

			onError( msg );

			return;
		}

		let txid = txs[ txIndex ];

		BITBOX.Transaction.details( txid ).then(

			(result) => {

				console.log( result );

	    		let confirmed = result.confirmations > 0;

	    		filterVouts( result.vout, confirmed );
	    		filterVins( result.vin, confirmed );

	    		if ( txIndex < txs.length - 1 ) {

	    			setTimeout( function() {        			

	        			loadTx_input_outputs( txIndex + 1 );

	        		}, WAIT_MS );
	    		}

	    		if ( txIndex === txs.length - 1 ) {
	    			
	    			onSuccess( address_txoutput_list, address_txinput_list );
	    		}
	  		}, 

	  		onError
	  	);

	  	function filterVouts( vouts, confirmed ) {

			for ( let i = 0; i < vouts.length; i++ ) {

				let vout = vouts[ i ];

				if ( hasAddress_vout( vout, legacy ) ) {

					address_txoutput_list.push( {
						cashaddress: addressResult.cashAddress,
						txid,
						vout_n: vout.n,
						satoshis: BITBOX.BitcoinCash.toSatoshi( vout.value ), 
						confirmed,
						keypair
					});

					// console.log( addressResult.cashAddress + ' ( vout ' + vout.n + ' )' );
				}
			}
	  	}

	  	function hasAddress_vout( vout, legacy ) {

	  		if ( !vout.scriptPubKey ) return false;
	  		if ( !vout.scriptPubKey.addresses ) return false;

	  		let addresses = vout.scriptPubKey.addresses;

	  		for ( var i = 0; i < addresses.length; i++ ) {

	  			let address = addresses[ i ];

	  			if ( address === legacy ) return true;
	  		}

	  		return false;
	  	}

	  	function filterVins( vins, confirmed ) {

			for ( let i = 0; i < vins.length; i++ ) {

				let vin = vins[ i ];

				if ( vin.legacyAddress === legacy ) {

					address_txinput_list.push( {
						cashaddress: addressResult.cashAddress,
						txid,
						vout_n: vin.vout,
						satoshis: vin.value, 
						confirmed
					});
				}
			}
	  	}

	}
}

function Filter_UnspentOutputs( outputs, inputs ) {

	let utxo = [];

	for ( let i = 0; i < outputs.length; i++ ) {

		let output = outputs[ i ];

		if ( !isSpent( output, inputs ) ) utxo.push( output );
	}

	return utxo;

	function isSpent( output, inputs ) {

		for ( let i = 0; i < inputs.length; i++ ) {

			let input = inputs[ i ];

			if ( input.cashaddress !== output.cashaddress ) continue;
			if ( input.vout_n !== output.vout_n ) continue;

			return true;
	  	}

	  	return false;
	}
}

