import Head from "next/head"
import Web3Modal from "web3modal"
import { BigNumber, Contract, providers, utils } from "ethers"
import styles from "../styles/Home.module.css"
import { useEffect, useState, useRef } from "react"
import { APE_GODDESS_CONTRACT_ADDRESS, APE_GODDESS_CONTRACT_ABI } from "../constants"
import { merkleTree, rootHash } from "../merkleProof"
import { MerkleTree } from "merkletreejs"
import { keccak256 } from "ethers/lib/utils"

export default function Home() {
  const one = BigNumber.from(1)
  const [walletConnected, setWalletConnected] = useState(false)
  const web3ModalRef = useRef()
  const [mintAmount, setMintAmount] = useState(one)
  const [mintStage, setMintStage] = useState("")
  const [merkleRoot, setMerkleRoot] = useState(rootHash)
  const [loading, setLoading] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const [userAddress, setUserAddress] = useState("")
  const [merkleProof, setMerkleProof] = useState([])
  const [totalAmountMinted, setTotalAmountMinted] = useState(0)
  const [maxSupply, setMaxSupply] = useState(0)

  const onPageLoad = async() => {
    setInterval(async() => {
      await getTotalAndMaxSupply()
      await getReveal()
      await getMintStatus()
    }, 5 * 1000)
    getProof()
  }

  const getProof = async() => {
    const signer = await getProviderOrSigner(true)
    const _userAddress = await signer.getAddress()
    const _leaf = keccak256(_userAddress)
    const _merkleProof = merkleTree.getHexProof(_leaf)
    setUserAddress(_userAddress)
    setMerkleProof(_merkleProof)
  }

  useEffect(() => {
    web3ModalRef.current = new Web3Modal({
      network: "rinkeby",
      providerOptions: {},
      disableInjectedProvider: false
    })
    onPageLoad()
  }, [walletConnected])


  const getProviderOrSigner = async(isSigner = false) => {
    const provider = await web3ModalRef.current.connect()
    const web3Provider = new providers.Web3Provider(provider)

    const { chainId } = await web3Provider.getNetwork()

    if(chainId != 4) {
      window.alert("Incorrect network, please connect to rinkeby")
      throw new Error("Connect to rinkeby")
    }

    if(isSigner) {
      const signer = web3Provider.getSigner()
      return signer
    }
    return web3Provider
  }

  const connectWallet = async() => {
    try {
      await getProviderOrSigner()
      setWalletConnected(true)
    } catch (error) {
      console.error(error)
    }
  }

  const handleIncrement = () => {
    if(mintAmount < 3){
      return(
        setMintAmount(mintAmount.add(1))
      )
    }
  }

  const handleDecrement = () => {
    if(mintAmount > 1){
      return(
        setMintAmount(mintAmount.sub(1))
      )
    }
  }

  const getMintStatus = async() => {
    try {  
      const provider = await getProviderOrSigner()
      const apeGoddessContract = new Contract(
        APE_GODDESS_CONTRACT_ADDRESS,
        APE_GODDESS_CONTRACT_ABI,
        provider
      )
      const _mintStage = await apeGoddessContract.mintStatus()
      setMintStage(_mintStage.toString())
    } catch (error) {
      console.error(error)
    }
  }

  const callWhitelistMint = async() => {
    try {
      const signer = await getProviderOrSigner(true)
      const apeGoddessContract = new Contract(
        APE_GODDESS_CONTRACT_ADDRESS,
        APE_GODDESS_CONTRACT_ABI,
        signer
      )
      const mintPrice = (utils.parseEther("0.01").mul(mintAmount))
      const tx = await apeGoddessContract.whitelistMint(
        mintAmount,
        merkleProof,
        {
          value: mintPrice
        }
      )
      setLoading(true)
      await tx.wait()
      setLoading(false)
      window.alert("Mint successful!")
    } catch (error) {
      console.error(error)
    }
  }

  const callPublicMint = async() => {
    try {
      const signer = await getProviderOrSigner(true)
      const apeGoddessContract = new Contract(
        APE_GODDESS_CONTRACT_ADDRESS,
        APE_GODDESS_CONTRACT_ABI,
        signer
      )
      
      const mintPrice = (utils.parseEther("0.01").mul(mintAmount))
      const tx = await apeGoddessContract.publicMint(
        mintAmount,
        {
          value: mintPrice
        }
      )
      setLoading(true)
      await tx.wait()
      setLoading(false)
      window.alert("Mint successful!")
    } catch (error) {
      console.error(error)
    }
  }

  const getReveal = async() => {
    try {
      const provider = await getProviderOrSigner()
      const apeGoddessContract = new Contract(
        APE_GODDESS_CONTRACT_ADDRESS,
        APE_GODDESS_CONTRACT_ABI,
        provider
      )
      const revealStatus = await apeGoddessContract.revealed()
      setIsRevealed(revealStatus)
    } catch (error) {
      console.error(error)
    }
  }

  const getTotalAndMaxSupply = async() => {
    try {
      const provider = await getProviderOrSigner()
      const apeGoddessContract = new Contract(
        APE_GODDESS_CONTRACT_ADDRESS,
        APE_GODDESS_CONTRACT_ABI,
        provider
      )

      const _totalSupply = await apeGoddessContract.totalSupply()
      const _maxSupply = await apeGoddessContract.maxSupply()
      setMaxSupply(_maxSupply.toNumber())
      setTotalAmountMinted(_totalSupply.toNumber())
    } catch (error) {
      console.log(error)
    }
  }

  function renderReveal() {
    if(isRevealed) {
      return(
        <button className={styles.button} disabled={true}>REVEALED</button>
      )
    }
    return(
      <button className={styles.button} disabled={true}>NOT REVEALED</button>
    )
  }

  function renderMint() {
    if(mintStage == "1") {
      if(merkleProof.length > 0) {
        return (
          <div>
            <div className={styles.input_div}>
              <button className={styles.button} onClick={handleDecrement}>-</button>
              <input
                className={styles.input}
                type="number"
                value={mintAmount}
                disabled="disabled"
              />
              <button className={styles.button} onClick={handleIncrement}>+</button>
            </div>
            {}
            <button className={styles.mint_button} onClick={callWhitelistMint}>Mint</button>
            <div>
              Congrats! Your Wallet
              <br/>
              <span className={styles.address}>{userAddress}</span> 
              <br/>
              Is Whitelisted
            </div>
          </div>
        )
      }else {
        return(
          <div>
            Sorry! Your Wallet
            <br/>
            <span className={styles.address}>{userAddress}</span>
            <br/>
            Is NOT Whitelisted
            <br/>
            You can get one on Secondary Market
          </div>
        )
      }
    }

    if(mintStage == "2") {
      return(
        <div>
            <div className={styles.input_div}>
              <button className={styles.button} onClick={handleDecrement}>-</button>
              <input
                className={styles.input}
                type="number"
                value={mintAmount}
                disabled="disabled"
              />
              <button className={styles.button} onClick={handleIncrement}>+</button>
            </div>
            <button className={styles.mint_button} onClick={callPublicMint}>Mint</button>
        </div>
      )
    }
  }

  function renderMintStatus() {
    if(mintStage == "1") {
      return(
        <span className={styles.stage}>WHITELIST MINT</span>
      )
    } else if(mintStage == "2"){
      return(
        <span className={styles.stage}>PUBLIC MINT</span>
      )
    } else {
      <span className={styles.stage}> MINT IS NOT LIVE</span>
    }
  }

  return(
    <div className={styles.container}>
      <Head>
        <title>Ape Goddess NFT</title>
        <meta name="description" content="Ape Goddess Minting dApp"/>
        <link rel="icon" href="./apegoddess.ico"/>
      </Head>
      <div className={styles.navbar}>
        <div className={styles.socials}>
          <div className={styles.icon_div}>
            <img className={styles.icon} src="./twitter.png"/>
            <a href="https://twitter.com/home" target="blank">twitter</a>
          </div>
          <div className={styles.icon_div}>
            <img className={styles.icon} src="./discord.png"/>
            <a href="https://discord.com/" target="blank">discord</a>
          </div>
          <div className={styles.icon_div}>
            <img className={styles.icon} src="./opensea.png"/>
            <a href="https://testnets.opensea.io/collection/ape-goddess" target="blank">opensea</a>
          </div>
        </div>
        {renderReveal()}
        {walletConnected ?
        <p className={styles.connect}>Connected</p>
        : <button className={styles.button} onClick={connectWallet}>Connect Wallet</button>
        }
      </div>

      <div className={styles.main}>
        <div className={styles.main_container}>
          <div className={styles.image}>
            <img className={styles.logo} src="./apegoddess.png"/>
          </div>
          <div className={styles.description}>
            <h1 className={styles.title}>Ape Goddess NFT</h1>
            <p className={styles.description}>
              Ape Goddess NFT is a degen collection made for true degens
            </p>
            <div>
              <p>Mint Stage : {renderMintStatus()} </p>
              <p>{totalAmountMinted} / {maxSupply} have been minted</p>
            </div>
            {renderMint()}
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        Made with 💙 for NFT degens!
      </footer>

    </div>
  )
}