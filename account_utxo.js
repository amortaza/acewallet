let BITBOXSDK = require("bitbox-sdk/lib/bitbox-sdk").default;
let BITBOX = new BITBOXSDK();

var AddressUTXO = require('./address_utxo.js').AddressUTXO;

let WAIT_MS = 100;

exports.AccountUTXO = function() {

	this.load = _load;
};

// callback definitions:
// 	onAccountLoaded( utxo_list,
//	                 first_utxo_index, - Can be used as the next starting_account_index in load().
//										 Do NOT use for "receive" accounts.  "receive" accounts should always start
//										 at index 0 because we never know when BCH is sent to a receive address that
//										 was previously spent.
//                   next_empty_slot_index ) 
//  	
//
// 	onError( string )
function _load( account, starting_account_index, onAccountLoaded, onError ) {

	let addressUTXO = new AddressUTXO();

	let account_utxo_list = []; // array of { cashaddress, txid, vout_n, satoshis, keypair, confirmed }

	let first_utxo_index = starting_account_index;
	let next_empty_slot_index = 0; 

	loadAccount_UTXO( 

		account, 
		starting_account_index, 

		function() {

			onAccountLoaded( account_utxo_list, 
							 first_utxo_index, 
							 next_empty_slot_index );
		}, 

		onError 
	);

	// onSuccess()
	function loadAccount_UTXO( account, index, onSuccess, onError ) {

		let cashaddress = Get_CashAddress_forAccount_atIndex( account, index );

		console.log( '( ' + index + 'th address) ' + cashaddress );

		addressUTXO.load( 

			account, 

			index,

			function( address_utxo_list, tx_appearances_confirmed_and_not, satoshis_confirmed_and_not ) {

				console.log('Address info -> confirmed or not -> tx appearances = ' + tx_appearances_confirmed_and_not + ', satoshis = ' + satoshis_confirmed_and_not);

				if ( tx_appearances_confirmed_and_not > 0 && satoshis_confirmed_and_not === 0 ) 
					first_utxo_index = index + 1;

				if ( tx_appearances_confirmed_and_not === 0 ) {

					next_empty_slot_index = index;

					onSuccess();

					return;
				}

				for ( let i = 0; i < address_utxo_list.length; i++ ) {

					let utxo = address_utxo_list[ i ];

					account_utxo_list.push( utxo );
				}

        		setTimeout( function() {  

        			loadAccount_UTXO( account, index + 1, onSuccess, onError );

        		}, WAIT_MS );
			},

			onError
		);
	}
}

function Get_CashAddress_forAccount_atIndex( account, index ) {

	let address_node = account.derivePath(`${index}`);

	return BITBOX.HDNode.toCashAddress( address_node );
}
