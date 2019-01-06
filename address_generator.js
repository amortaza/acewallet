let BITBOXSDK = require("bitbox-sdk/lib/bitbox-sdk").default;
let BITBOX = new BITBOXSDK();

let WAIT_MS = 100;

exports.AddressGenerator = function() {

	// public methods
	this.init = _init;
	this.get_NextCashAddress = _get_NextCashAddress;
	this.fetch_NextCashAddress = _fetch_NextCashAddress;

	// private methods
	this._getCashAddress_atIndex  = _getCashAddress_atIndex;

	this.next_index = 0;
};

// account_index: 0 for change account
// 				  1 for receive account
function _init( mnemonic, account_index ) {

	let rootSeed = BITBOX.Mnemonic.toSeed( mnemonic );
	let masterHDNode = BITBOX.HDNode.fromSeed( rootSeed, "bitcoincash" );

	this.account = masterHDNode.derivePath( "m/44'/145'/0'/" + account_index );
}

// onSuccess( cashaddress )
function _fetch_NextCashAddress( onSuccess, onError ) {

	let that = this;

	fetch_NextCashAddress();

	function fetch_NextCashAddress() {
	
		let cashaddress = that._getCashAddress_atIndex( that.next_index );

	    BITBOX.Address.details( cashaddress ).then(

	    	(result) => {

	    		// address is unused - so return address and do not increment index
	        	if ( result.txApperances === 0 ) {

	        		onSuccess( cashaddress );

	        		return;
	        	}

	        	// address was used...so let's increment index and try again...
	       		that.next_index++;

	    		setTimeout( function() {  

	    			fetch_NextCashAddress();

	    		}, WAIT_MS );
			},

	      	onError
		);
	}
}

function _get_NextCashAddress() {

	let address = this._getCashAddress_atIndex( this.next_index );

	this.next_index++;

	return address;
}

function _getCashAddress_atIndex( index ) {

	let address_node = this.account.derivePath(`${index}`);

	return BITBOX.HDNode.toCashAddress( address_node );
}

