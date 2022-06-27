import React from 'react'
import './index.css'
import TRYlottery from './build/contracts/TRYlottery.json'

class PlayerInterface extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      ticketPrice: 0,
      isRoundOpen: false,
      lotteryContract: null,
    }

    this.buyTicket = this.buyTicket.bind(this)
    this.connectToLottery = this.connectToLottery.bind(this)
  }

  componentDidMount() {
    if (this.props.suggestedAddress !== '0x0') {
      document.querySelector(
        '#connection-input',
      ).value = this.props.suggestedAddress
    }
  }

  // Calls buy() function of TRYlottery's contract
  buyTicket(evt) {
    evt.preventDefault()

    const formData = Object.fromEntries(
      new FormData(document.querySelector('#player-form')),
    )
    this.state.lotteryContract.methods
      .buy(
        formData.firstNumber,
        formData.secondNumber,
        formData.thirdNumber,
        formData.fourthNumber,
        formData.fifthNumber,
        formData.powerball,
      )
      .send(
        {
          from: this.props.account,
          value: this.state.ticketPrice,
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

  // Connects to a lottery contract once its address is provided by the user
  async connectToLottery(evt) {
    evt.preventDefault()
    const contractAddress = Object.fromEntries(
      new FormData(document.querySelector('#connection-form')),
    ).lotteryAddress
    try {
      const lotteryContract = new window.web3.eth.Contract(
        TRYlottery.abi,
        contractAddress,
      )
      // Check if the contract is an instance of TRYlottery
      if (
        JSON.stringify(lotteryContract.options.jsonInterface) !==
        JSON.stringify(TRYlottery.abi)
      )
        this.props.notify({
          type: 'error',
          text: 'The referenced address is not a TRYlottery contract',
        })
      else {
        this.props.notify({
          type: 'success',
          text: 'Correctly connected to lottery',
        })
        const ticketPrice = await lotteryContract.methods.ticketPrice
          .call()
          .call()
        const currBlockNum = await window.web3.eth.getBlockNumber()
        const lotteryRoundClosing = await lotteryContract.methods.currentRoundClosing
          .call()
          .call()

        this.setState({
          lotteryContract: lotteryContract,
          ticketPrice: ticketPrice,
          isRoundOpen: lotteryRoundClosing > currBlockNum ? true : false,
        })
      }
    } catch (err) {
      this.props.notify({
        type: 'error',
        text: 'The provided address is non-existing or malformed',
      })
    }
  }

  render() {
    return (
      <div id="user-section">
        {this.state.lotteryContract === null ? (
          /* Connection interface */
          <form id="connection-form" onSubmit={this.connectToLottery}>
            <label htmlFor="lotteryAddress" className="input-lbl">
              Lottery address:
              <input
                id="connection-input"
                type="text"
                name="lotteryAddress"
                className="simple-input"
                pattern="0x.{40}"
                placeholder="Contract address"
              ></input>
            </label>
            <input type="submit" value="Connect" className="btn"></input>
          </form>
        ) : this.state.isRoundOpen ? (
          /* Buyer interface */
          <form id="player-form" onSubmit={this.buyTicket}>
            <p id="ticket-price">
              A ticket costs {this.state.ticketPrice / 10 ** 9} gwei
            </p>
            <p className="info">Pick your numbers</p>
            <label htmlFor="firstNumber" className="input-lbl">
              Number 1:
              <input
                type="number"
                min="1"
                max="69"
                name="firstNumber"
                className="number-input"
                placeholder="1 - 69"
                required
              ></input>
            </label>
            <label htmlFor="secondNumber" className="input-lbl">
              Number 2:
              <input
                type="number"
                min="1"
                max="69"
                name="secondNumber"
                className="number-input"
                placeholder="1 - 69"
                required
              ></input>
            </label>
            <label htmlFor="thirdNumber" className="input-lbl">
              Number 3:
              <input
                type="number"
                min="1"
                max="69"
                name="thirdNumber"
                className="number-input"
                placeholder="1 - 69"
                required
              ></input>
            </label>
            <label htmlFor="fourthNumber" className="input-lbl">
              Number 4:
              <input
                type="number"
                min="1"
                max="69"
                name="fourthNumber"
                className="number-input"
                placeholder="1 - 69"
                required
              ></input>
            </label>
            <label htmlFor="fifthNumber" className="input-lbl">
              Number 5:
              <input
                type="number"
                min="1"
                max="69"
                name="fifthNumber"
                className="number-input"
                placeholder="1 - 69"
                required
              ></input>
            </label>
            <label htmlFor="powerball" className="input-lbl">
              Powerball:
              <input
                type="number"
                min="1"
                max="26"
                name="powerball"
                className="number-input"
                placeholder="1 - 26"
                required
              ></input>
            </label>
            <button value="submit" className="btn">
              Buy
            </button>
          </form>
        ) : (
          /* Warning if the lottery has no open rounds */
          <p className="info red">There is no active round at the moment</p>
        )}
      </div>
    )
  }
}

export default PlayerInterface
