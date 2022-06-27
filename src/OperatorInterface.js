import React from 'react'
import './index.css'
import TRYNFT from './build/contracts/TRYNFT.json'
import TRYlottery from './build/contracts/TRYlottery.json'

class OperatorInterface extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isDeployed: props.isDeployed,
    }

    this.deployLottery = this.deployLottery.bind(this)
    this.startNewRound = this.startNewRound.bind(this)
    this.drawNumbers = this.drawNumbers.bind(this)
    this.distributePrizes = this.distributePrizes.bind(this)
    this.mintToken = this.mintToken.bind(this)
    this.deactivateContract = this.deactivateContract.bind(this)
    this.resetInterface = this.resetInterface.bind(this)
    this.addAnimation = this.addAnimation.bind(this)
  }

  componentDidUpdate() {
    this.addAnimation()
  }

  /* Inits animations and resets the deployment interface if the previously created 
    contract has not been deployed by the current user */
  async componentDidMount() {
    this.addAnimation()
    if (this.props.lotteryContract) {
      const contractDeployer = await this.props.lotteryContract.methods
        .getOperator()
        .call()
      if (this.props.account.toLowerCase() !== contractDeployer.toLowerCase())
        this.setState({ isDeployed: false })
    }
  }

  addAnimation() {
    if (this.state.isDeployed) {
      const targetBtn = document.querySelector('#reload')
      const targetIcon = document.querySelector('#reload-spin')
      targetBtn.addEventListener('mouseover', () =>
        targetIcon.classList.add('fa-spin'),
      )
      targetBtn.addEventListener('mouseout', () =>
        targetIcon.classList.remove('fa-spin'),
      )
    }
  }

  // Checks if the contract has the same JSON interface of a given contract
  isContractComplying(contractJsonInterface, correctInterface) {
    return (
      JSON.stringify(contractJsonInterface) === JSON.stringify(correctInterface)
    )
  }

  /* Performs the lottery contract deployment or connection (if it already exists).
    If the user doesn't specify an existing NFT contract address nor an existing lottery contract address,
    then a new NFT contract is created, followed by a new lottery contract and, finally, the former's ownership
    gets assigned to the latter.
    If the user does specify an existing NFT contract, then only a new lottery contract is created, assuming that the user
    will assign the ownership of the former by itself (if he doesn't, the contract will fail to mint new tokens).
    Finally, if the specifies the address of an existing contract, the application connects to it and yields a new interface
    */
  async deployLottery(evt) {
    evt.preventDefault()

    let nftContractInstance
    let lotteryContractInstance
    let isNFTNew = true
    const formData = Object.fromEntries(
      new FormData(document.querySelector('#deploy-form')),
    )

    // If the user hasn't specified an existing lottery address, thus wants to create a new lottery contract
    if (formData.existingAddress === '') {
      // Assigning default values if none
      if (formData.roundDuration === '') formData.roundDuration = 15
      if (formData.ticketPrice === '') formData.ticketPrice = 100
      if (formData.transferAddress === '')
        formData.transferAddress = this.props.account

      // Creates a new NFT and assigns it
      if (formData.nftAddress === '') {
        const nftContract = new window.web3.eth.Contract(TRYNFT.abi)

        this.props.notify({ type: 'info', text: 'Creating NFT contract...' }) // Notifies the user about NFT contract creation

        nftContractInstance = await nftContract
          .deploy({ data: TRYNFT.bytecode })
          .send(
            {
              from: this.props.account,
              gasPrice: this.props.gasVal,
              gas: this.props.gasLimit,
            },
            (err) => {
              if (!err) {
                this.props.notify({
                  type: 'success',
                  text: 'NFT contract successfully created',
                })
              } else if (err.code === 4001) {
                this.props.notify({
                  type: 'error',
                  text: 'Transaction refused by the user',
                })
              } else {
                console.log(err)
                this.props.notify({
                  type: 'error',
                  // Hard-coded workaround
                  text: err.message.slice(
                    err.message.indexOf('"reason":') + 10,
                    err.message.indexOf('"},"stack"'),
                  ),
                })
              }
            },
          )
      } else {
        // Existing NFT contract provided
        try {
          nftContractInstance = new window.web3.eth.Contract(
            TRYNFT.abi,
            formData.nftAddress,
          )
          if (
            !this.isContractComplying(
              nftContractInstance.options.jsonInterface,
              TRYNFT.abi,
            )
          ) {
            this.props.notify({
              type: 'error',
              text: 'The referenced address is not a TRYNFT contract',
            })
            return
          }
        } catch (_) {
          this.props.notify({
            type: 'error',
            text: 'The provided address is non-existing or malformed',
          })
          return
        }
        isNFTNew = false
      }

      // Deploying lottery contract
      console.log(
        'NFT contract deployed at address: ',
        nftContractInstance.options.address,
      )
      const lotteryContract = new window.web3.eth.Contract(TRYlottery.abi)
      this.props.notify({ type: 'info', text: 'Creating lottery contract...' })
      await lotteryContract
        .deploy({
          data: TRYlottery.bytecode,
          arguments: [
            formData.roundDuration,
            formData.ticketPrice,
            formData.transferAddress,
            nftContractInstance.options.address,
          ],
        })
        .send(
          {
            from: this.props.account,
            gasPrice: this.props.gasVal,
            gas: this.props.gasLimit,
          },
          (err) => {
            if (!err) {
              this.props.notify({
                type: 'success',
                text: 'Lottery contract successfully created',
              })
            } else if (err.code === 4001) {
              this.props.notify({
                type: 'error',
                text: 'Transaction refused by the user',
              })
            } else {
              this.props.notify({
                type: 'error',
                text: err.message.slice(
                  err.message.indexOf('"reason":') + 10,
                  err.message.indexOf('"},"stack"'),
                ),
              })
            }
          },
        )
        .on('confirmation', () => {})
        .then((newContractInstance) => {
          console.log(
            'Deployed Lottery Address: ',
            newContractInstance.options.address,
          )
          lotteryContractInstance = newContractInstance
        })
      console.log(lotteryContractInstance.options.address)
      // Passing token ownership to lottery contract, needed only if the NFT contract has just beeen created
      if (isNFTNew) {
        this.props.notify({
          type: 'info',
          text: "Passing NFT contract's ownership to the lottery contract...",
        })
        await nftContractInstance.methods
          .transferOwnership(`${lotteryContractInstance.options.address}`)
          .send(
            {
              from: this.props.account,
              gasPrice: this.props.gasVal,
              gas: this.props.gasLimit,
            },
            (err) => {
              if (!err) {
                this.props.notify({
                  type: 'success',
                  text:
                    "Correctly transfered NFT contract's ownership to the lottery contract",
                })
              } else if (err.code === 4001) {
                this.props.notify({
                  type: 'error',
                  text: 'Transaction refused by the user',
                })
              } else {
                this.props.notify({
                  type: 'error',
                  text: err.message.slice(
                    err.message.indexOf('"reason":') + 10,
                    err.message.indexOf('"},"stack"'),
                  ),
                })
              }
            },
          )
      }

      this.setState({ isDeployed: true })
      this.props.changeParentContractState({
        contractDeployed: true,
        lotteryContract: lotteryContractInstance,
      }) // Changes parent's state
    } else {
      // Existing lottery connection
      try {
        const lotteryContract = new window.web3.eth.Contract(
          TRYlottery.abi,
          formData.existingAddress,
        )
        if (
          !this.isContractComplying(
            lotteryContract.options.jsonInterface,
            TRYlottery.abi,
          )
        ) {
          this.props.notify({
            type: 'error',
            text: 'The referenced address is not a TRYlottery contract',
          })
          return
        }
        const contractDeployer = await lotteryContract.methods
          .getOperator()
          .call()
        if (
          this.props.account.toLowerCase() === contractDeployer.toLowerCase()
        ) {
          lotteryContractInstance = lotteryContract
          this.setState({ isDeployed: true })
          this.props.changeParentContractState({
            contractDeployed: true,
            lotteryContract: lotteryContractInstance,
          }) // Changes parent's state
        } else {
          this.props.notify({
            type: 'error',
            text: 'You are not the owner of this lottery contract',
          })
        }
      } catch (_) {
        this.props.notify({
          type: 'error',
          text: 'The provided address is non-existing or malformed',
        })
      }
    }
  }

  async connectToLottery() {}

  // Calls startNewRound() function of TRYlottery's contract
  startNewRound(evt) {
    evt.preventDefault()
    this.props.lotteryContract.methods.startNewRound().send(
      {
        from: this.props.account,
        gasPrice: this.props.gasVal,
        gas: this.props.gasLimit,
      },
      (err) => {
        if (err) {
          if (err.code === 4001) {
            this.props.notify({
              type: 'error',
              text: 'Transaction refused by the user',
            })
          } else {
            this.props.notify({
              type: 'error',
              text: err.message.slice(
                err.message.indexOf('"reason":') + 10,
                err.message.indexOf('"},"stack"'),
              ),
            })
          }
        }
      },
    )
  }

  // Calls drawNumbers() function of TRYlottery's contract
  drawNumbers(evt) {
    evt.preventDefault()
    this.props.lotteryContract.methods.drawNumbers().send(
      {
        from: this.props.account,
        gasPrice: this.props.gasVal,
        gas: this.props.gasLimit,
      },
      (err) => {
        if (err) {
          if (err.code === 4001) {
            this.props.notify({
              type: 'error',
              text: 'Transaction refused by the user',
            })
          } else {
            this.props.notify({
              type: 'error',
              text: err.message.slice(
                err.message.indexOf('"reason":') + 10,
                err.message.indexOf('"},"stack"'),
              ),
            })
          }
        }
      },
    )
  }

  // Calls givePrizes() function of TRYlottery's contract
  distributePrizes(evt) {
    evt.preventDefault()
    this.props.lotteryContract.methods.givePrizes().send(
      {
        from: this.props.account,
        gasPrice: this.props.gasVal,
        gas: this.props.gasLimit,
      },
      (err) => {
        if (err) {
          if (err.code === 4001) {
            this.props.notify({
              type: 'error',
              text: 'Transaction refused by the user',
            })
          } else {
            this.props.notify({
              type: 'error',
              text: err.message.slice(
                err.message.indexOf('"reason":') + 10,
                err.message.indexOf('"},"stack"'),
              ),
            })
          }
        } else {
          this.props.notify({
            type: 'success',
            text: 'Prizes successfully distributed',
          })
        }
      },
    )
  }

  // Shows a hidden input used by the user to provide a URI and calls mint() function of TRYlottery's contract
  mintToken(evt) {
    evt.preventDefault()
    const uriVal = Object.fromEntries(
      new FormData(document.querySelector('#operations-form')),
    ).tokenURI
    const inp = document.querySelector('#mint-input')
    if (!inp.style.display) {
      inp.style.display = 'block'
      inp.style.animation = 'appearing 2s'
      inp.style.opacity = '1'
    }
    if (uriVal === '') {
      inp.style.border = '2px solid red'
    } else {
      inp.style.border = '2px solid green'
      this.props.lotteryContract.methods.mint(uriVal).send(
        {
          from: this.props.account,
          gasPrice: this.props.gasVal,
          gas: this.props.gasLimit,
        },
        (err) => {
          if (err) {
            if (err.code === 4001) {
              this.props.notify({
                type: 'error',
                text: 'Transaction refused by the user',
              })
            } else {
              this.props.notify({
                type: 'error',
                text: err.message.slice(
                  err.message.indexOf('"reason":') + 10,
                  err.message.indexOf('"},"stack"'),
                ),
              })
            }
          }
        },
      )
    }
  }

  // Calls closeLottery() function of TRYlottery's contract
  async deactivateContract(evt) {
    evt.preventDefault()
    await this.props.lotteryContract.methods.closeLottery().send(
      {
        from: this.props.account,
        gasPrice: this.props.gasVal,
        gas: this.props.gasLimit,
      },
      (err) => {
        if (err) {
          if (err.code === 4001) {
            this.props.notify({
              type: 'error',
              text: 'Transaction refused by the user',
            })
          } else {
            this.props.notify({
              type: 'error',
              text: err.message.slice(
                err.message.indexOf('"reason":') + 10,
                err.message.indexOf('"},"stack"'),
              ),
            })
          }
        } else
          this.props.notify({
            type: 'success',
            text: `The lottery contract has been dismissed`,
          })
      },
    )
    this.resetInterface()
  }

  // Used to reset the interface in order to deploy / connect to a new lottery contract
  resetInterface() {
    this.setState({ isDeployed: false })
    this.props.changeParentContractState({
      contractDeployed: false,
      lotteryContract: null,
    })
  }

  render() {
    return (
      <div id="operator-section">
        {!this.state.isDeployed ? (
          /* Deployment interface */
          <form id="deploy-form" onSubmit={this.deployLottery}>
            <label htmlFor="roundDuration" className="input-lbl">
              Round duration:
              <input
                type="number"
                min="1"
                name="roundDuration"
                className="simple-input"
                placeholder="15"
              ></input>
            </label>
            <label htmlFor="ticketPrice" className="input-lbl">
              Ticket price (in gwei):
              <input
                type="number"
                min="1"
                name="ticketPrice"
                className="simple-input"
                placeholder="100"
              ></input>
            </label>
            <label htmlFor="transferAddress" className="input-lbl">
              Transfer address:
              <input
                type="text"
                name="transferAddress"
                className="simple-input"
                pattern="0x.{40}"
                placeholder={this.props.account}
              ></input>
            </label>
            <label htmlFor="nftAddress" className="input-lbl">
              NFT address:
              <input
                type="text"
                name="nftAddress"
                className="simple-input"
                pattern="0x.{40}"
                placeholder="NFT contract address"
              ></input>
            </label>
            <p id="or">or</p>
            <label htmlFor="existingAddress" className="input-lbl existing">
              Existing lottery address:
              <input
                type="text"
                name="existingAddress"
                className="simple-input"
                pattern="0x.{40}"
                placeholder="Contract address"
              ></input>
            </label>
            <input type="submit" value="Create lottery" className="btn"></input>
          </form>
        ) : (
          /* Operational interface */
          <form id="operations-form">
            <button className="operatorAction" onClick={this.startNewRound}>
              Start new round
            </button>
            <button className="operatorAction" onClick={this.drawNumbers}>
              Draw the winning numbers
            </button>
            <button className="operatorAction" onClick={this.distributePrizes}>
              Distribute prizes
            </button>
            <input
              type="text"
              className="hidden-input"
              id="mint-input"
              placeholder="URI of the token"
              name="tokenURI"
            ></input>
            <button className="operatorAction" onClick={this.mintToken}>
              Mint a new token
            </button>
            <button
              className="operatorAction"
              onClick={this.deactivateContract}
            >
              Deactivate the contract
            </button>
            <button id="reload" onClick={this.resetInterface}>
              <i id="reload-spin" className="fa-solid fa-arrows-rotate"></i>
            </button>
          </form>
        )}
      </div>
    )
  }
}

export default OperatorInterface
