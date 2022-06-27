import './index.css'
import './notifications.css'
import './settings.css'
import React from 'react'
import OperatorInterface from './OperatorInterface'
import PlayerInterface from './PlayerInterface'
import Web3 from 'web3/dist/web3.min.js'
import TRYlottery from './build/contracts/TRYlottery.json'

const WEB3PROVIDERFALLBACK = 'http://localhost:8545'

class UserView extends React.Component {
  constructor() {
    super()
    this.state = {
      userType: '',
      contractDeployed: false,
      connectionActivated: false,
      lotteryContract: null,
      account: '0x0',
      gasVal: 0,
      gasLimit: 0,
      suggestedAddress: '0x0',
      beginningBlockNumber: 0,
    }

    this.changeUser = this.changeUser.bind(this)
    this.init_web3 = this.init_web3.bind(this)
    this.handleContractState = this.handleContractState.bind(this)
    this.handleAccountChange = this.handleAccountChange.bind(this)
    this.setSettings = this.setSettings.bind(this)
    this.dispatchEvent = this.dispatchEvent.bind(this)
  }

  async componentDidMount() {
    this.init_web3()
    window.ethereum.on('accountsChanged', (accounts) => {
      this.handleAccountChange(accounts[0])
    })
    const blockNum = await window.web3.eth.getBlockNumber()
    this.setState({ beginningBlockNumber: blockNum })
    window.web3.eth.subscribe('logs', this.dispatchEvent)
  }

  // Notifies lottery creation and the start of a round using 'logs' subscription
  dispatchEvent(err, res) {
    if (!err) {
      let decodedLog
      try {
        decodedLog = window.web3.eth.abi.decodeLog(
          TRYlottery.abi[2].inputs,
          res.data,
        )
        if (
          decodedLog.hasOwnProperty('atAddress') &&
          decodedLog.hasOwnProperty('atBlock') &&
          // Workaround for Metamask's restarting from block 1 when changing account
          this.state.beginningBlockNumber - decodedLog.atBlock < 0
        ) {
          this.handleNotification({
            type: 'success',
            text: `A new lottery has been created at address ${decodedLog.atAddress} (residing at block ${decodedLog.atBlock})`,
          })
        }
      } catch (_) {
        decodedLog = window.web3.eth.abi.decodeLog(
          TRYlottery.abi[3].inputs,
          res.data,
        )
        if (decodedLog.hasOwnProperty('roundClosesAtBlock'))
          this.handleNotification({
            type: 'success',
            text: `A new round started in ${res.address} and closes at block ${decodedLog.roundClosesAtBlock}`,
          })
      }
    }
  }

  changeUser(evt) {
    const selectedVal = evt.target.value
    this.setState({ userType: selectedVal })
  }

  // Inits web3 for the app
  init_web3() {
    if (typeof window.web3 !== 'undefined') {
      window.web3 = new Web3(window.ethereum)
      window.ethereum
        .request({ method: 'eth_requestAccounts' }) // New spec
        .then((acc) => {
          this.setState({ connectionActivated: true })
          this.setState({ account: acc[0] })
        })
        .catch((error) => {
          if (error.code === 4001) alert('Please connect to MetaMask.')
          else console.error(error)
        })
    } else {
      // If no web3 injected use Ganache or anything similar
      const web3Provider = new Web3.providers.HttpProvider(WEB3PROVIDERFALLBACK)
      window.web3 = new Web3(web3Provider)
    }
  }

  // Function used by child components to set this component's contract and subscribe to its events
  handleContractState(newContractState) {
    this.setState(newContractState)
    if (newContractState.lotteryContract !== null)
      this.setState({
        suggestedAddress: newContractState.lotteryContract.options.address,
      })
    else this.setState({ suggestedAddress: '0x0' })
    if (newContractState['lotteryContract'] !== null) {
      // Not needed as there is already a subscription to these events that can be caught without an actual contract instance
      /*
      newContractState['lotteryContract'].events.LotteryOpened((err, evt) => {
        if (!err) {
          this.handleNotification({
            type: 'success',
            text: `A new lottery has been opened at address ${evt.returnValues[0]} (mined in block ${evt.returnValues[1]})`,
          })
        }
      })
      newContractState['lotteryContract'].events.NewRoundStarted((err, evt) => {
        if (!err) {
          this.handleNotification({
            type: 'success',
            text: `A new lottery round has started. Ends at block ${evt.returnValues[0]}`,
          })
        }
      })
      */
      newContractState['lotteryContract'].events.TicketBought(
        { fromBlock: 'latest' },
        (err, evt) => {
          if (!err) {
            this.handleNotification({
              type: 'success',
              text: `A new ticket with numbers ${evt.returnValues[1]} has been bought by ${evt.returnValues[0]}`,
            })
          }
        },
      )
      newContractState['lotteryContract'].events.NumbersDrawn(
        { fromBlock: 'latest' },
        (err, evt) => {
          if (!err) {
            this.handleNotification({
              type: 'success',
              text: `The winning numbers have been drawn: ${evt.returnValues[0]}`,
            })
          }
        },
      )
      newContractState['lotteryContract'].events.WinningTicket(
        { fromBlock: 'latest' },
        (err, evt) => {
          if (!err) {
            this.handleNotification({
              type: 'success',
              text: `A new prize of ${evt.returnValues[0]} class has been assigned: ${evt.returnValues[1]} (${evt.returnValues[2]}), URI: ${evt.returnValues[3]}`,
            })
            if (evt.returnValues[4] === this.state.account)
              this.handleNotification({
                type: 'success',
                text: 'Congratulations, you won!',
              })
          }
        },
      )
      newContractState['lotteryContract'].events.TokenMinted(
        { fromBlock: 'latest' },
        (err, evt) => {
          if (!err) {
            this.handleNotification({
              type: 'success',
              text: `A new token with id ${evt.returnValues[0]} has been minted and assigned to class ${evt.returnValues[1]}`,
            })
          }
        },
      )
      newContractState['lotteryContract'].events.LotteryClosed(
        { fromBlock: 'latest' },
        (err, evt) => {
          if (!err) {
            this.handleNotification({
              type: 'success',
              text: `The lottery contract has been dismissed`,
            })
          }
        },
      )
    }
  }

  // Shows notifications of different types on top of the screen
  handleNotification(notificationData) {
    const notContainer = document.querySelector('#notification-container')
    const notification = document.createElement('template')
    notification.innerHTML = `<div class="notification show ${notificationData.type}">${notificationData.text}</div>`
    notContainer.append(notification.content.firstChild)
    setTimeout(() => {
      notContainer.removeChild(notContainer.firstChild)
    }, 5000)
  }

  // Handles the account change, automatically changing current state's userType
  async handleAccountChange(account) {
    this.setState({ account: account })
    if (this.state.lotteryContract) {
      const contractDeployer = await this.state.lotteryContract.methods
        .getOperator()
        .call()
      if (account.toLowerCase() !== contractDeployer.toLowerCase()) {
        this.setState({ userType: 'player' })
        document.querySelector('#user-type').options[2].selected = true
      }
    }
  }

  // Shows gas settings popup
  openSettings() {
    document.querySelector('#options').classList.add('show')
  }

  // Hides gas settings popup
  closeSettings() {
    document.querySelector('#options').classList.remove('show')
  }

  // Sets the current component's state properties 'gasVal' and 'gasLimit' with user-provided values
  setSettings() {
    let gasVal = document.querySelector('#gas-value').value
    let gasLimit = document.querySelector('#gas-limit').value
    if (!gasVal) gasVal = 0 // Ganache default param
    if (!gasLimit) gasLimit = 0 // Ganache default param
    this.setState({ gasVal: gasVal, gasLimit: gasLimit })
    this.closeSettings()
  }

  render() {
    return (
      <main>
        {/* Invisible container used for notifications */}
        <div className="toast-container" id="notification-container"></div>
        {/* Settings popup */}
        <div id="options">
          <div className="optionsContent">
            <span className="close" onClick={this.closeSettings}>
              &times;
            </span>
            <label htmlFor="gasValue">
              Gas value:
              <input
                id="gas-value"
                type="number"
                className="optionsInput"
                name="gasValue"
                min="1"
                placeholder="20000000000 wei"
              ></input>
            </label>
            <label htmlFor="gasLimit">
              Gas limit:
              <input
                id="gas-limit"
                type="number"
                className="optionsInput"
                name="gasLimit"
                min="1"
                placeholder="6721975"
              ></input>
            </label>
            <input
              type="submit"
              value="Apply"
              onClick={this.setSettings}
              id="optionsSubmit"
            ></input>
          </div>
        </div>
        <header id="site-title">
          <h1>TRY lottery</h1>
          <h4>A distributed lottery app</h4>
        </header>
        <hr className="separator" />
        <div id="user-selection">
          <label htmlFor="user-type">Choose a type of user:</label>
          <select name="user-type" id="user-type" onChange={this.changeUser}>
            <option value="" disabled selected hidden></option>
            <option value="operator">Lottery operator</option>
            <option value="player">Player</option>
          </select>
          <button id="btn-options" onClick={this.openSettings}>
            <i className="fa-solid fa-gears"></i>
          </button>
        </div>
        <p className="address">
          {this.state.userType === '' ? (
            <i>Please select a type of user</i>
          ) : (
            <span>
              Your address: <i>{this.state.account}</i>
            </span>
          )}
        </p>
        {this.state.userType === 'operator' &&
        this.state.connectionActivated ? (
          <OperatorInterface
            isDeployed={this.state.contractDeployed}
            account={this.state.account}
            lotteryContract={this.state.lotteryContract}
            changeParentContractState={this.handleContractState}
            notify={this.handleNotification}
            gasLimit={this.state.gasLimit}
            gasVal={this.state.gasVal}
          />
        ) : this.state.userType === 'player' ? (
          <PlayerInterface
            account={this.state.account}
            notify={this.handleNotification}
            gasLimit={this.state.gasLimit}
            gasVal={this.state.gasVal}
            suggestedAddress={this.state.suggestedAddress}
          />
        ) : null}
      </main>
    )
  }
}

export default UserView
