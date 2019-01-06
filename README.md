# @amortaza/acewallet

BCH Wallet API (Node Module)

This library exposes one class `Wallet` which provides basic functions for a Bitcoin wallet.

## Install

```
$ npm install @amortaza/acewallet
```

## Usage

### Constructing a Wallet Object

```js
const Wallet = require('@amortaza/acewallet/wallet.js').Wallet;

let wallet = new Wallet();

// 'wallet' is our wallet object!
```


### wallet.generateMnemonic() 

```
Generates a 256-bit BIP-39 (24-word) seed phrase.

Returns a string.

```

##### example:

```js
const Wallet = require('@amortaza/acewallet/wallet.js').Wallet;

let wallet = new Wallet();

console.log( wallet.generateMnemonic() );

// example: "mad tell hobby stomach inner focus practice aunt upon few simple improve curtain man erupt inch allow story mechanic soldier eight avoid sausage gym"
```

### wallet.load( mnemonic, starting_ChangeAccount_Index, onWalletLoaded, onError )

```
Loads a wallet with a given mnemonic (24-word BIP-39 seed phrase).
This function *must* be called before any other function.
```

#### inputs

`mnemonic` 
> A string which is a 24-word BIP-39 seed phrase.  Such a mnemonic can be generated with `wallet.generateMnemonic()`

`starting_ChangeAccount_Index`
> To speed up loading the wallet, we can skip `change address` that have 0 satoshi values.  During the course of usage, the wallet will message the application about up to which index can be safely skipped.

`onWalletLoaded( first_change_utxo_index )`
> A callback function for when the wallet has finished loading.  The `first_change_utxo_index` value that is passed in tells the application the index of the first funded `change utxo` - by skipping previous indexes during wallet loads, we save significant time.  This is the value the application can pass in as `starting_ChangeAccount_Index` the next time the wallet needs to be loaded.

`onError( msg )`
> A callback function to handle errors.

#### example:

```js
const Wallet = require('@amortaza/acewallet/wallet.js').Wallet

let wallet = new Wallet();

let mnemonic = ''; // Read mnemonic from storage, or generate it.  Any BIP-39 24-word passphrase will do.
let index = 0;     // Start reading every wallet address from index 0.

wallet.load( 
	mnemonic, 
    index, 
    (first_index) => { 
    	// Save first_index and use next time application starts. Use first_index instead of 0 to speed things up!
    }, 
    (err) => { /* handle error */ }
);
```

### wallet.reload( onWalletLoaded, onError )

```
Reloads a wallet with same parameters as original wallet.
This function should be called after everytime the wallet is funded.  Since we do not know when a wallet may be funded, many applications might reload a wallet based on a timer.  Also whenever a payment is sent from the wallet, it should be reloaded.
```

#### inputs

`onWalletLoaded( first_change_utxo_index )`
> A callback function for when the wallet has finished loading.  The `first_change_utxo_index` value that is passed in tells the application the index of the first funded `change utxo` - by skipping previous indexes during wallet loads, we save significant time.  This is the value the application can pass in as `starting_ChangeAccount_Index` the next time the wallet needs to be loaded.

`onError( msg )`
> A callback function to handle errors.

#### example:

```js
const Wallet = require('@amortaza/acewallet/wallet.js').Wallet

let wallet = new Wallet();

let mnemonic = ''; // Read mnemonic from storage, or generate it.  Any BIP-39 24-word passphrase will do.
let index = 0;     // Start reading every wallet address from index 0.

wallet.load( 
	mnemonic, 
    index, 
    (first_index) => { 
    	
        // here we reload immediately after the wallet has loaded successfully for demonstration.
        wallet.reload( ()=>{}, ()=>{} );
        
    }, 
    (err) => { /* handle error */ }
);
```

### wallet.getBalance()

```
Returns the number of satoshis in the balance of the wallet.  It includes both confirmed and unconfirmed satoshis.
```

#### example:

```js
const Wallet = require('@amortaza/acewallet/wallet.js').Wallet

let wallet = new Wallet();

console.log( 'Wallet balance is ' + wallet.getBalance() );

```

### wallet.send( to_cashaddress, satoshis, onSuccess, onError )

```
Send `satoshis` number of satoshis from wallet to the BCH CashAddress format `to_cashaddress`. 
```

#### inputs

`to_cashaddress` 
> A string which is the BCH CashAddress format of the destination address to receive the funds.

`satoshis`
> The number of satoshis to be sent.

`onSuccess( send_result )`
> A callback function for when the fund has been successfully sent.  The `send_result` is taken directly from Bitbox's results.

`onError( msg )`
> A callback function to handle errors.  Most common error will be insufficient funds.  Currently the `msg` is a human readable message instead of an error-code.

#### example:

```js
const Wallet = require('@amortaza/acewallet/wallet.js').Wallet

let wallet = new Wallet();

wallet.load( 
	'', 
    0, 
    (first_index) => { 
    	// Lets send 1000 satoshis
        wallet.send( 'bitcoincash:pqkh9ahfj069qv8l6eysyufazpe4fdjq3u4hna323j', 1000, ()=>{}, ()=>{} );
    }, 
    (err) => { /* handle error */ }
);
```

### wallet.fetch_ReceiveCashAddress( onSuccess( cashaddress ), onError )

```
Fetches the next `cashaddress` that can be used to fund the wallet.  Note the function does not return any values. The address is accessed via `onSuccess()` callback.
```

#### inputs

`onSuccess( cashaddress )`
> A callback function for when the next receive address has been successfully determined.  

`onError( msg )`
> A callback function to handle errors.  Most common error will be insufficient funds.  Currently the `msg` is a human readable message instead of an error-code.

#### example:

```js
const Wallet = require('@amortaza/acewallet/wallet.js').Wallet

let wallet = new Wallet();

wallet.load( 
	'', 
    0, 
    (first_index) => { 
    	
        wallet.fetch_ReceiveCashAddress( 
        	(cashaddress)=>{
            	console.log('please fund this wallet by sending to ' + cashaddress);
        	}, 
            ()=>{} 
        );
    }, 
    (err) => { /* handle error */ }
);
```