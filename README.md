# TRY lottery: an nfT lotterRY based on the Ethereum blockchain

This dapp allows users to open and participate to *poweball* lotteries having ERC721 tokens as prizes.
The user can choose to be a lottery operator or a lottery player.

## Operator

An operator can start a new lottery by choosing the number of blocks for which the lottery will last (thus, the round period is expressed in number of blocks), the ticket price that the players have to pay for each ticket, and the account address where all the lottery's revenue will be sent at the end of a round. Furthermore, the operator can specify the address of an already-existing TRYNFT contract's address, which will be used to mint the tokens; in the case if the operator doesn't specify an existing address, then a new TRYNFT contract will be created and attached (ownership-wise) to the lottery's contract address to-be-deployed.

Instead of deploying, an operator can also connect to an existing lottery for which he is the owner.

Once on the management interface (once the lottery has been deployed or the operator connected to an existing lottery he owns), the operator can:
- Start a new round
- Draw the winning numbers
- Assign the prizes
- Mint a new token
- Deactivate the contract

### Starting a new round

This operation can be performed iff there are no other active rounds in the lottery and the previous (if any) prizes have been distributed. 

Once a new round is started, the users can start participating by buying tickets. A lottery round creation is notified to all the users of this web app.

### Drawing the winning numbers

Once the round is closed (when the specified amount of blocks has been mined), the operator can select to draw the numbers, picking 5 random numbers from `1 - 69` and the sixth from `1 - 26`.

### Assigning the prizes

Once the winning numbers have been extraced, the operator sends the prizes (which have been assigned to eight different classes, based on the nummber of guesses), if any, to the winners. If the token, assigned to a specific prize-class, is sent to a user and the prize-class remains empty, then a new identical (in terms of metadata, the ID is different in order to respect ERC721 uniqueness) token is automatically minted by the lottery contract.

### Minting a new token

The operator can specify the URI of a new token (i.e. its metadata) and mint it. If the token is already assigned to one of the eight prize-classes (that is, a similar token is already assigned), then it will assigned to the same class for consistency, otherwise, it will be assigned randomly to one of the empty classes. 

For this reason, the operator should consider populating each one of these eight classes before starting a new round, in order to achieve a logically constistent lottery.

### Deactivating the contract

The user can deactivate (i.e. `selfdestruct()` function in Solidity) the contract, refunding the players if an active round is running in the lottery.

The contract will now be unresponsive.


## The player

The players have to specify the address of a lottery contract (having an open round, otherwise they won't be allowed play) in order to obtain the playing interface.

Once they are connected to a lottery, they can specify their six lucky numbers and send the transaction, paying the ticket's price specified by the operator (+ gas fees).

If a user wins, it will be notified by the dapp.


## Known issues

- The used randomness source is not secure (as it comes from the blockchain and is thus vulnerable to miner-attacks), but was a projectual request.
- The notification system notifies some events multiple times: although this has been partially fixed Metamask-wise, the point is that *Web3*'s `subscribe` function exploits a bloom filter, thus each time it queries it, it also notifies the old events. This is solvable by hashing the events and, for each incoming event, check if it has already occurred in the hashtable.


## Testing environment

I've used *Metamask* wallet connected to a local *Ganache* session in order to simulate accounts and the blockchain in general.
The application can be tested in a local environment through `npx start`.
